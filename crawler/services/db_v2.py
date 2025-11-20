"""
数据库服务 V2 - 支持15表分层写入
适配 crawler_db_v2 新表结构
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple

import psycopg2
import psycopg2.extras


class DatabaseServiceV2:
    """数据库服务V2 - 支持15表分层写入"""
    
    def __init__(
        self,
        db_config: Optional[Dict] = None,
        existing_conn: Optional[Any] = None
    ):
        """初始化数据库连接
        
        Args:
            db_config: 连接配置（可包含 connect_timeout 秒）
            existing_conn: 外部传入的已建立连接（例如连接池借用的连接）
        """
        if db_config is None:
            db_config = {
                'host': os.getenv('POSTGRES_HOST', '192.168.102.168'),
                'port': int(os.getenv('POSTGRES_PORT', 5432)),
                'user': os.getenv('POSTGRES_USERNAME', 'postgres'),
                'password': os.getenv('POSTGRES_PASSWORD', 'postgres'),
                'database': os.getenv('POSTGRES_DATABASE', 'crawler_db_v2'),
                # 可选：连接超时（秒）
                'connect_timeout': int(os.getenv('POSTGRES_CONNECT_TIMEOUT_SEC', 10)),
            }
        
        self._own_conn = existing_conn is None
        if existing_conn is not None:
            self.conn = existing_conn
        else:
            self.conn = psycopg2.connect(**db_config)
        self.conn.autocommit = False
    
    def close(self):
        """关闭数据库连接"""
        if self.conn:
            self.conn.close()
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.conn.rollback()
        # 借用连接时不负责关闭，仅归还方处理
        if self._own_conn:
            self.close()
    
    @staticmethod
    def _safe_int(value, default=None) -> Optional[int]:
        """安全转换为整数"""
        if value is None or value == '':
            return default
        try:
            return int(float(str(value)))
        except (ValueError, TypeError):
            return default
    
    @staticmethod
    def _safe_float(value, default=None) -> Optional[float]:
        """安全转换为浮点数"""
        if value is None or value == '':
            return default
        # 处理布尔值：true -> 1.0, false -> 0.0
        if isinstance(value, bool):
            return 1.0 if value else 0.0
        try:
            return float(str(value))
        except (ValueError, TypeError):
            return default
    
    @staticmethod
    def _safe_bool(value, default=False) -> bool:
        """安全转换为布尔值"""
        if value is None or value == '':
            return default
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.lower() in ('true', '1', 'yes')
        return bool(value)
    
    @staticmethod
    def _safe_json(value) -> Optional[psycopg2.extras.Json]:
        """安全转换为JSONB"""
        if value is None or value == '':
            return None
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                return psycopg2.extras.Json(parsed)
            except json.JSONDecodeError:
                return None
        return psycopg2.extras.Json(value)
    
    def save_authors_batch(
        self,
        run_id: int,
        authors: List[Dict],
        commit: bool = True,
        skip_core: bool = False,
        skip_raw_archive: bool = False
    ) -> Tuple[int, int]:
        """
        批量保存作者数据到15个表
        
        Args:
            run_id: 运行ID
            authors: 作者列表
            commit: 是否提交事务
        
        Returns:
            (成功数量, 失败数量)
        """
        success_count = 0
        failed_count = 0
        
        cur = None
        try:
            cur = self.conn.cursor()
            
            for author in authors:
                try:
                    attr = author.get('attribute_datas', {})
                    if not attr:
                        failed_count += 1
                        continue
                    
                    # 提取基础信息
                    author_id = attr.get('id') or author.get('star_id')
                    if not author_id:
                        failed_count += 1
                        continue
                    
                    author_id = str(author_id)
                    star_id = str(author.get('star_id', author_id))
                    
                    # 1. 保存核心信息
                    if not skip_core:
                        self._save_core(cur, author_id, star_id, attr)
                    
                    # 2. 保存粉丝指标
                    self._save_fans_metrics(cur, author_id, attr)
                    
                    # 3. 保存互动指标
                    self._save_engagement_metrics(cur, author_id, attr)
                    
                    # 4. 保存价格信息
                    self._save_pricing(cur, author_id, attr)
                    
                    # 5. 保存营销指数
                    self._save_marketing_indices(cur, author_id, attr)
                    
                    # 6. 保存内容标签
                    self._save_content_tags(cur, author_id, attr)
                    
                    # 7. 保存电商数据
                    self._save_ecommerce(cur, author_id, attr)
                    
                    # 8. 保存星图视频数据（如果有）
                    if self._safe_int(attr.get('star_video_cnt_90d'), 0) > 0:
                        self._save_star_videos(cur, author_id, attr)
                    
                    # 9. 保存最近作品（如果有）
                    if attr.get('last_10_items'):
                        self._save_recent_works(cur, author_id, attr)
                    
                    # 10. 保存游戏数据（如果有）
                    if self._safe_int(attr.get('game_item_count_90d'), 0) > 0:
                        self._save_game_data(cur, author_id, attr)
                    
                    # 11. 保存内容垂直（如果有）
                    if self._safe_int(attr.get('content_item_count_90d'), 0) > 0:
                        self._save_content_vertical(cur, author_id, attr)
                    
                    # 12. 保存工具垂直（如果有）
                    if self._safe_int(attr.get('tool_item_count_90d'), 0) > 0:
                        self._save_tool_vertical(cur, author_id, attr)
                    
                    # 13. 保存品牌提升（如果有）
                    if attr.get('brand_boost_vv') or attr.get('video_brand_boost'):
                        self._save_brand_boost(cur, author_id, attr)
                    
                    # 14. 保存原始数据归档
                    if not skip_raw_archive:
                        self._save_raw_archive(cur, author_id, run_id, attr)
                    
                    success_count += 1
                
                except Exception as e:
                    print(f"保存作者 {author_id} 失败: {e}")
                    failed_count += 1
                    continue
            
            if commit:
                self.conn.commit()
            
            return success_count, failed_count
        
        except Exception as e:
            self.conn.rollback()
            raise
        finally:
            if cur:
                cur.close()
    
    def _save_core(self, cur, author_id: str, star_id: str, attr: Dict):
        """保存核心信息"""
        cur.execute("""
            INSERT INTO authors_core (
                author_id, star_id, core_user_id, nick_name, avatar_uri,
                gender, city, province, author_type, author_status, grade,
                follower, star_index,
                star_excellent_author, is_black_horse_author, is_cocreate_author,
                is_cpm_project_author, is_short_drama, is_ad_star_cur_high_quality_author,
                star_qianchuan_high_potential,
                author_avatar_frame_icon, province_id, city_id,
                last_crawled_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            ON CONFLICT (author_id) DO UPDATE SET
                nick_name = EXCLUDED.nick_name,
                follower = EXCLUDED.follower,
                star_index = EXCLUDED.star_index,
                city = EXCLUDED.city,
                province = EXCLUDED.province,
                province_id = EXCLUDED.province_id,
                city_id = EXCLUDED.city_id,
                author_avatar_frame_icon = EXCLUDED.author_avatar_frame_icon,
                updated_at = NOW(),
                last_crawled_at = EXCLUDED.last_crawled_at
        """, (
            author_id, star_id,
            self._safe_int(attr.get('core_user_id')),
            attr.get('nick_name', '未知'),
            attr.get('avatar_uri'),
            self._safe_int(attr.get('gender')),
            attr.get('city'),
            attr.get('province'),
            self._safe_int(attr.get('author_type')),
            self._safe_int(attr.get('author_status')),
            self._safe_int(attr.get('grade')),
            self._safe_int(attr.get('follower'), 0),
            self._safe_float(attr.get('star_index')),
            self._safe_bool(attr.get('star_excellent_author')),
            self._safe_bool(attr.get('is_black_horse_author')),
            self._safe_bool(attr.get('is_cocreate_author')),
            self._safe_bool(attr.get('is_cpm_project_author')),
            self._safe_bool(attr.get('is_short_drama')),
            self._safe_bool(attr.get('is_ad_star_cur_high_quality_author')),
            self._safe_bool(attr.get('star_qianchuan_high_potential')),
            attr.get('author_avatar_frame_icon'),
            self._safe_int(attr.get('province_id')),
            self._safe_int(attr.get('city_id')),
            datetime.now()
        ))
    
    def _save_fans_metrics(self, cur, author_id: str, attr: Dict):
        """保存粉丝指标"""
        # 注意: fans_increment_rate_30d 是数据库生成列，不能插入
        # 原始数据中只有 fans_increment_rate_within_15d，没有 30d 的版本
        cur.execute("""
            INSERT INTO authors_fans_metrics (
                author_id, follower,
                fans_increment_15d, fans_increment_rate_15d,
                fans_increment_30d
            ) VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (author_id) DO UPDATE SET
                follower = EXCLUDED.follower,
                fans_increment_15d = EXCLUDED.fans_increment_15d,
                fans_increment_rate_15d = EXCLUDED.fans_increment_rate_15d,
                fans_increment_30d = EXCLUDED.fans_increment_30d,
                updated_at = NOW()
        """, (
            author_id,
            self._safe_int(attr.get('follower'), 0),
            self._safe_int(attr.get('fans_increment_within_15d')),
            self._safe_float(attr.get('fans_increment_rate_within_15d')),
            self._safe_int(attr.get('fans_increment_within_30d'))
        ))
    
    def _save_engagement_metrics(self, cur, author_id: str, attr: Dict):
        """保存互动指标"""
        cur.execute("""
            INSERT INTO authors_engagement_metrics (
                author_id, interact_rate_30d, play_over_rate_30d,
                vv_median_30d, interaction_median_30d,
                sn_interact_rate_30d, sn_play_over_rate_30d,
                avg_search_after_view_rate_30d, burst_text_rate
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (author_id) DO UPDATE SET
                interact_rate_30d = EXCLUDED.interact_rate_30d,
                play_over_rate_30d = EXCLUDED.play_over_rate_30d,
                vv_median_30d = EXCLUDED.vv_median_30d,
                interaction_median_30d = EXCLUDED.interaction_median_30d,
                updated_at = NOW()
        """, (
            author_id,
            self._safe_float(attr.get('interact_rate_within_30d')),
            self._safe_float(attr.get('play_over_rate_within_30d')),
            self._safe_int(attr.get('vv_median_30d')),
            self._safe_int(attr.get('interaction_median_30d')),
            self._safe_float(attr.get('sn_interact_rate_within_30d')),
            self._safe_float(attr.get('sn_play_over_rate_within_30d')),
            self._safe_float(attr.get('avg_search_after_view_rate_30d')),
            self._safe_float(attr.get('burst_text_rate'))
        ))
    
    def _save_pricing(self, cur, author_id: str, attr: Dict):
        """保存价格信息"""
        cur.execute("""
            INSERT INTO authors_pricing (
                author_id, price_1_20, price_20_60, price_60,
                assign_cpm_suggest_price, expected_play_num, expected_natural_play_num,
                promotion_prospective_vv, promotion_prospective_1_20_cpm,
                promotion_prospective_20_60_cpm, promotion_prospective_60_cpm,
                sn_prospective_1_20_cpe, sn_prospective_20_60_cpe, sn_prospective_60_cpe,
                sn_prospective_1_20_cpm, sn_prospective_20_60_cpm, sn_prospective_60_cpm,
                assign_task_price_list, enroll_task_price_list,
                pic_expected_play_num, pic_expected_cpm,
                expected_cpa3_level
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (author_id) DO UPDATE SET
                price_1_20 = EXCLUDED.price_1_20,
                price_20_60 = EXCLUDED.price_20_60,
                price_60 = EXCLUDED.price_60,
                assign_cpm_suggest_price = EXCLUDED.assign_cpm_suggest_price,
                expected_play_num = EXCLUDED.expected_play_num,
                expected_natural_play_num = EXCLUDED.expected_natural_play_num,
                promotion_prospective_vv = EXCLUDED.promotion_prospective_vv,
                sn_prospective_1_20_cpe = EXCLUDED.sn_prospective_1_20_cpe,
                sn_prospective_20_60_cpe = EXCLUDED.sn_prospective_20_60_cpe,
                sn_prospective_60_cpe = EXCLUDED.sn_prospective_60_cpe,
                sn_prospective_1_20_cpm = EXCLUDED.sn_prospective_1_20_cpm,
                sn_prospective_20_60_cpm = EXCLUDED.sn_prospective_20_60_cpm,
                sn_prospective_60_cpm = EXCLUDED.sn_prospective_60_cpm,
                expected_cpa3_level = EXCLUDED.expected_cpa3_level,
                updated_at = NOW()
        """, (
            author_id,
            self._safe_int(attr.get('price_1_20')),
            self._safe_int(attr.get('price_20_60')),
            self._safe_int(attr.get('price_60')),
            self._safe_float(attr.get('assign_cpm_suggest_price')),
            self._safe_int(attr.get('expected_play_num')),
            self._safe_int(attr.get('expected_natural_play_num')),
            self._safe_int(attr.get('promotion_prospective_vv')),
            self._safe_float(attr.get('promotion_prospective_1_20_cpm')),
            self._safe_float(attr.get('promotion_prospective_20_60_cpm')),
            self._safe_float(attr.get('promotion_prospective_60_cpm')),
            self._safe_float(attr.get('sn_prospective_1_20_cpe')),
            self._safe_float(attr.get('sn_prospective_20_60_cpe')),
            self._safe_float(attr.get('sn_prospective_60_cpe')),
            self._safe_float(attr.get('sn_prospective_1_20_cpm')),
            self._safe_float(attr.get('sn_prospective_20_60_cpm')),
            self._safe_float(attr.get('sn_prospective_60_cpm')),
            self._safe_json(attr.get('assign_task_price_list')),
            self._safe_json(attr.get('enroll_task_price_list')),
            self._safe_int(attr.get('pic_expected_play_num')),
            self._safe_float(attr.get('pic_expected_cpm')),
            self._safe_int(attr.get('expected_cpa3_level'))
        ))
    
    def _save_marketing_indices(self, cur, author_id: str, attr: Dict):
        """保存营销指数"""
        cur.execute("""
            INSERT INTO authors_marketing_indices (
                author_id, link_convert_index, link_shopping_index,
                link_spread_index, link_star_index, star_index,
                link_convert_index_by_industry, link_spread_index_by_industry,
                link_star_index_by_industry, link_recommend_index_by_industry,
                search_after_view_index_by_industry
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (author_id) DO UPDATE SET
                link_convert_index = EXCLUDED.link_convert_index,
                link_shopping_index = EXCLUDED.link_shopping_index,
                link_spread_index = EXCLUDED.link_spread_index,
                star_index = EXCLUDED.star_index,
                updated_at = NOW()
        """, (
            author_id,
            self._safe_float(attr.get('link_convert_index')),
            self._safe_float(attr.get('link_shopping_index')),
            self._safe_float(attr.get('link_spread_index')),
            self._safe_float(attr.get('link_star_index')),
            self._safe_float(attr.get('star_index')),
            self._safe_json(attr.get('link_convert_index_by_industry')),
            self._safe_json(attr.get('link_spread_index_by_industry')),
            self._safe_json(attr.get('link_star_index_by_industry')),
            self._safe_json(attr.get('link_recommend_index_by_industry')),
            self._safe_json(attr.get('search_after_view_index_by_industry'))
        ))
    
    def _save_content_tags(self, cur, author_id: str, attr: Dict):
        """保存内容标签"""
        cur.execute("""
            INSERT INTO authors_content_tags (
                author_id, tags_relation, content_theme_labels_180d,
                author_thin_mid_word_association_index
            ) VALUES (%s, %s, %s, %s)
            ON CONFLICT (author_id) DO UPDATE SET
                tags_relation = EXCLUDED.tags_relation,
                content_theme_labels_180d = EXCLUDED.content_theme_labels_180d,
                updated_at = NOW()
        """, (
            author_id,
            self._safe_json(attr.get('tags_relation')),
            self._safe_json(attr.get('content_theme_labels_180d')),
            self._safe_json(attr.get('author_thin_mid_word_association_index'))
        ))
    
    def _save_ecommerce(self, cur, author_id: str, attr: Dict):
        """保存电商数据"""
        cur.execute("""
            INSERT INTO authors_ecommerce (
                author_id, e_commerce_enable, author_ecom_level,
                star_ecom_video_num_30d, ecom_video_product_num_30d,
                star_ecom_video_product_num_30d, ecom_gmv_30d_range,
                ecom_avg_order_value_30d_range, ecom_gpm_30d_range,
                ecom_score, ecom_watch_pv_30d,
                ecom_gpm_30days_range, ecom_video_ctr_30d_range,
                avg_sale_amount_range, star_ecom_main_price_30days
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (author_id) DO UPDATE SET
                e_commerce_enable = EXCLUDED.e_commerce_enable,
                author_ecom_level = EXCLUDED.author_ecom_level,
                ecom_score = EXCLUDED.ecom_score,
                star_ecom_video_num_30d = EXCLUDED.star_ecom_video_num_30d,
                ecom_gmv_30d_range = EXCLUDED.ecom_gmv_30d_range,
                updated_at = NOW()
        """, (
            author_id,
            self._safe_bool(attr.get('e_commerce_enable')),
            attr.get('author_ecom_level'),
            self._safe_int(attr.get('star_ecom_video_num_30d')),
            self._safe_int(attr.get('ecom_video_product_num_30d')),
            self._safe_int(attr.get('star_ecom_video_product_num_30d')),
            self._safe_json(attr.get('ecom_gmv_30d_range')),
            self._safe_json(attr.get('ecom_avg_order_value_30d_range')),
            self._safe_json(attr.get('ecom_gpm_30d_range')),
            self._safe_float(attr.get('ecom_score')),
            self._safe_int(attr.get('ecom_watch_pv_30d')),
            self._safe_json(attr.get('ecom_gpm_30days_range')),
            self._safe_json(attr.get('ecom_video_ctr_30d_range')),
            self._safe_json(attr.get('avg_sale_amount_range')),
            self._safe_json(attr.get('star_ecom_main_price_30days'))
        ))
    
    def _save_star_videos(self, cur, author_id: str, attr: Dict):
        """保存星图视频数据"""
        cur.execute("""
            INSERT INTO authors_star_videos_90d (
                author_id, star_video_cnt_90d, star_video_interact_rate_90d,
                star_video_finish_vv_rate_90d, star_video_median_vv_90d,
                star_video_install_ge_1_cnt_90d, star_item_count_within_30d,
                star_component_link_click_cnt_90d, star_component_install_finish_cnt_90d,
                star_component_download_ctr_90d, star_component_install_cpa_90d,
                star_component_install_pvr_90d
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (author_id) DO UPDATE SET
                star_video_cnt_90d = EXCLUDED.star_video_cnt_90d,
                star_video_interact_rate_90d = EXCLUDED.star_video_interact_rate_90d,
                star_video_finish_vv_rate_90d = EXCLUDED.star_video_finish_vv_rate_90d,
                star_component_link_click_cnt_90d = EXCLUDED.star_component_link_click_cnt_90d,
                updated_at = NOW()
        """, (
            author_id,
            self._safe_int(attr.get('star_video_cnt_90d')),
            self._safe_float(attr.get('star_video_interact_rate_90d')),
            self._safe_float(attr.get('star_video_finish_vv_rate_90d')),
            self._safe_int(attr.get('star_video_median_vv_90d')),
            self._safe_int(attr.get('star_video_install_ge_1_cnt_90d')),
            self._safe_int(attr.get('star_item_count_within_30d')),
            self._safe_int(attr.get('star_component_link_click_cnt_90d')),
            self._safe_int(attr.get('star_component_install_finish_cnt_90d')),
            self._safe_float(attr.get('star_component_download_ctr_90d')),
            self._safe_float(attr.get('star_component_install_cpa_90d')),
            self._safe_float(attr.get('star_component_install_pvr_90d'))
        ))
    
    def _save_recent_works(self, cur, author_id: str, attr: Dict):
        """保存最近作品"""
        cur.execute("""
            INSERT INTO authors_recent_works (author_id, last_10_items)
            VALUES (%s, %s)
            ON CONFLICT (author_id) DO UPDATE SET
                last_10_items = EXCLUDED.last_10_items,
                updated_at = NOW()
        """, (
            author_id,
            self._safe_json(attr.get('last_10_items'))
        ))
    
    def _save_game_data(self, cur, author_id: str, attr: Dict):
        """保存游戏数据"""
        cur.execute("""
            INSERT INTO authors_game_data (
                author_id, game_type, game_item_count_90d
            ) VALUES (%s, %s, %s)
            ON CONFLICT (author_id) DO UPDATE SET
                game_type = EXCLUDED.game_type,
                game_item_count_90d = EXCLUDED.game_item_count_90d,
                updated_at = NOW()
        """, (
            author_id,
            attr.get('game_type'),
            self._safe_int(attr.get('game_item_count_90d'))
        ))
    
    def _save_content_vertical(self, cur, author_id: str, attr: Dict):
        """保存内容垂直"""
        cur.execute("""
            INSERT INTO authors_content_vertical (
                author_id, content_item_count_90d
            ) VALUES (%s, %s)
            ON CONFLICT (author_id) DO UPDATE SET
                content_item_count_90d = EXCLUDED.content_item_count_90d,
                updated_at = NOW()
        """, (
            author_id,
            self._safe_int(attr.get('content_item_count_90d'))
        ))
    
    def _save_tool_vertical(self, cur, author_id: str, attr: Dict):
        """保存工具垂直"""
        cur.execute("""
            INSERT INTO authors_tool_vertical (
                author_id, tool_item_count_90d
            ) VALUES (%s, %s)
            ON CONFLICT (author_id) DO UPDATE SET
                tool_item_count_90d = EXCLUDED.tool_item_count_90d,
                updated_at = NOW()
        """, (
            author_id,
            self._safe_int(attr.get('tool_item_count_90d'))
        ))
    
    def _save_brand_boost(self, cur, author_id: str, attr: Dict):
        """保存品牌提升"""
        cur.execute("""
            INSERT INTO authors_brand_boost (
                author_id, brand_boost_vv, video_brand_boost,
                video_brand_boost_vv, pic_brand_boost, pic_brand_boost_vv
            ) VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (author_id) DO UPDATE SET
                brand_boost_vv = EXCLUDED.brand_boost_vv,
                video_brand_boost = EXCLUDED.video_brand_boost,
                updated_at = NOW()
        """, (
            author_id,
            self._safe_int(attr.get('brand_boost_vv')),
            self._safe_float(attr.get('video_brand_boost')),
            self._safe_int(attr.get('video_brand_boost_vv')),
            self._safe_float(attr.get('pic_brand_boost')),
            self._safe_int(attr.get('pic_brand_boost_vv'))
        ))
    
    def _save_raw_archive(self, cur, author_id: str, run_id: int, attr: Dict):
        """保存原始数据归档"""
        cur.execute("""
            INSERT INTO authors_raw_archive (
                author_id, run_id, raw_attribute_datas, created_at
            ) VALUES (%s, %s, %s, %s)
            ON CONFLICT (run_id, author_id, created_at) DO NOTHING
        """, (
            author_id,
            run_id,
            psycopg2.extras.Json(attr),
            datetime.now()
        ))

    # ==================== 批量优化方法 ====================
    def bulk_upsert_authors_core_from_authors(self, authors: List[Dict], page_size: int = 1000) -> int:
        """使用 execute_values 批量 upsert authors_core。
        返回成功写入的行数（不含冲突更新统计）。
        """
        if not authors:
            return 0
        cur = self.conn.cursor()
        try:
            rows = []
            now_dt = datetime.now()
            for author in authors:
                attr = author.get('attribute_datas', {}) or {}
                author_id = attr.get('id') or author.get('star_id')
                if not author_id:
                    continue
                author_id = str(author_id)
                star_id = str(author.get('star_id', author_id))
                rows.append((
                    author_id,
                    star_id,
                    self._safe_int(attr.get('core_user_id')),
                    attr.get('nick_name', '未知'),
                    attr.get('avatar_uri'),
                    self._safe_int(attr.get('gender')),
                    attr.get('city'),
                    attr.get('province'),
                    self._safe_int(attr.get('author_type')),
                    self._safe_int(attr.get('author_status')),
                    self._safe_int(attr.get('grade')),
                    self._safe_int(attr.get('follower'), 0),
                    self._safe_float(attr.get('star_index')),
                    self._safe_bool(attr.get('star_excellent_author')),
                    self._safe_bool(attr.get('is_black_horse_author')),
                    self._safe_bool(attr.get('is_cocreate_author')),
                    self._safe_bool(attr.get('is_cpm_project_author')),
                    self._safe_bool(attr.get('is_short_drama')),
                    self._safe_bool(attr.get('is_ad_star_cur_high_quality_author')),
                    self._safe_bool(attr.get('star_qianchuan_high_potential')),
                    now_dt,
                ))

            if not rows:
                cur.close()
                return 0

            sql = """
            INSERT INTO authors_core (
                author_id, star_id, core_user_id, nick_name, avatar_uri,
                gender, city, province, author_type, author_status, grade,
                follower, star_index,
                star_excellent_author, is_black_horse_author, is_cocreate_author,
                is_cpm_project_author, is_short_drama, is_ad_star_cur_high_quality_author,
                star_qianchuan_high_potential, last_crawled_at
            ) VALUES %s
            ON CONFLICT (author_id) DO UPDATE SET
                nick_name = EXCLUDED.nick_name,
                follower = EXCLUDED.follower,
                star_index = EXCLUDED.star_index,
                city = EXCLUDED.city,
                province = EXCLUDED.province,
                updated_at = NOW(),
                last_crawled_at = EXCLUDED.last_crawled_at
            """
            psycopg2.extras.execute_values(cur, sql, rows, page_size=page_size)
            return len(rows)
        except Exception:
            self.conn.rollback()
            raise
        finally:
            cur.close()

    def bulk_insert_raw_archive_from_authors(self, run_id: int, authors: List[Dict], page_size: int = 1000) -> int:
        """使用 execute_values 批量插入 authors_raw_archive（幂等，ON CONFLICT DO NOTHING）。
        返回尝试插入的行数。
        """
        if not authors:
            return 0
        cur = self.conn.cursor()
        try:
            now_dt = datetime.now()
            rows = []
            for author in authors:
                attr = author.get('attribute_datas', {}) or {}
                author_id = attr.get('id') or author.get('star_id')
                if not author_id:
                    continue
                author_id = str(author_id)
                rows.append((
                    author_id,
                    run_id,
                    psycopg2.extras.Json(attr),
                    now_dt,
                ))

            if not rows:
                cur.close()
                return 0

            sql = """
            INSERT INTO authors_raw_archive (
                author_id, run_id, raw_attribute_datas, created_at
            ) VALUES %s
            ON CONFLICT (run_id, author_id, created_at) DO NOTHING
            """
            psycopg2.extras.execute_values(cur, sql, rows, page_size=page_size)
            return len(rows)
        except Exception:
            self.conn.rollback()
            raise
        finally:
            cur.close()
    
    # ==================== Run 管理功能 ====================
    
    def create_run(
        self,
        first_label: str,
        second_label: str,
        second_ids: list,
        video_type: str = None,
        page: int = None,
        limit: int = None,
        min_price: int = None,
        x_tt_agw_login: str = None,
        request_payload: dict = None
    ) -> int:
        """
        创建爬取任务记录
        
        Args:
            first_label: 一级标签
            second_label: 二级标签
            second_ids: 二级标签ID列表
            video_type: 视频类型
            page: 页码
            limit: 每页数量
            min_price: 最低价格
            x_tt_agw_login: 登录token
            request_payload: 请求payload
        
        Returns:
            run_id: 任务ID
        """
        import hashlib
        
        cur = self.conn.cursor()
        
        # 计算 payload hash
        payload_hash = None
        if request_payload:
            payload_str = json.dumps(request_payload, sort_keys=True)
            payload_hash = hashlib.md5(payload_str.encode()).hexdigest()
        
        cur.execute(
            """
            INSERT INTO author_square_runs (
                first_label, second_label, second_ids, video_type, page, "limit", 
                min_price, x_tt_agw_login, request_payload, request_payload_hash,
                created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            RETURNING id
            """,
            (
                first_label,
                second_label,
                psycopg2.extras.Json(second_ids) if second_ids else None,
                str(video_type) if video_type is not None else None,
                self._safe_int(page),
                self._safe_int(limit),
                self._safe_int(min_price),
                x_tt_agw_login,
                psycopg2.extras.Json(request_payload) if request_payload else None,
                payload_hash
            )
        )
        
        run_id = cur.fetchone()[0]
        cur.close()
        
        return run_id
    
    def update_run_status(
        self,
        run_id: int,
        status: str = None,
        total_authors: int = None,
        success_count: int = None,
        failed_count: int = None,
        error_message: str = None
    ) -> bool:
        """
        更新任务状态
        
        Args:
            run_id: 任务ID
            status: 状态 (running, completed, failed, partial)
            total_authors: 总作者数
            success_count: 成功数
            failed_count: 失败数
            error_message: 错误信息
        
        Returns:
            是否更新成功
        """
        cur = self.conn.cursor()
        
        updates = []
        params = []
        
        if status:
            updates.append("status = %s")
            params.append(status)
        
        if total_authors is not None:
            updates.append("total_authors = %s")
            params.append(total_authors)
        
        if success_count is not None:
            updates.append("success_count = %s")
            params.append(success_count)
        
        if failed_count is not None:
            updates.append("failed_count = %s")
            params.append(failed_count)
        
        if error_message:
            updates.append("error_message = %s")
            params.append(error_message)
        
        updates.append("updated_at = NOW()")
        
        if not updates:
            return False
        
        params.append(run_id)
        
        cur.execute(
            f"""
            UPDATE author_square_runs
            SET {', '.join(updates)}
            WHERE id = %s
            """,
            params
        )
        
        affected = cur.rowcount
        cur.close()
        
        return affected > 0
    
    def get_run_info(self, run_id: int) -> Optional[Dict]:
        """
        获取任务信息
        
        Args:
            run_id: 任务ID
        
        Returns:
            任务信息字典，不存在返回None
        """
        cur = self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        cur.execute(
            """
            SELECT 
                id, first_label, second_label, second_ids, video_type,
                page, "limit", min_price, status, total_authors,
                success_count, failed_count, error_message,
                created_at, updated_at
            FROM author_square_runs
            WHERE id = %s
            """,
            (run_id,)
        )
        
        row = cur.fetchone()
        cur.close()
        
        return dict(row) if row else None
    
    def save_run_and_authors_v2(
        self,
        first_label: str,
        second_label: str,
        second_ids: list,
        video_type: str,
        page: int,
        limit: int,
        min_price: int,
        x_tt_agw_login: str,
        request_payload: dict,
        response: dict,
        commit: bool = True
    ) -> Tuple[int, int, int]:
        """
        兼容旧接口的一站式保存方法
        
        Args:
            first_label: 一级标签
            second_label: 二级标签
            second_ids: 二级标签ID列表
            video_type: 视频类型
            page: 页码
            limit: 每页数量
            min_price: 最低价格
            x_tt_agw_login: 登录token
            request_payload: 请求payload
            response: API响应数据
            commit: 是否提交事务
        
        Returns:
            (run_id, success_count, failed_count)
        """
        try:
            # 1. 创建 run
            run_id = self.create_run(
                first_label=first_label,
                second_label=second_label,
                second_ids=second_ids,
                video_type=video_type,
                page=page,
                limit=limit,
                min_price=min_price,
                x_tt_agw_login=x_tt_agw_login,
                request_payload=request_payload
            )
            
            # 2. 保存 authors
            authors = response.get('authors', [])
            success, failed = 0, 0
            
            if authors:
                success, failed = self.save_authors_batch(
                    run_id=run_id,
                    authors=authors,
                    commit=False
                )
                
                # 3. 更新 run 状态
                status = 'completed' if failed == 0 else 'partial' if success > 0 else 'failed'
                self.update_run_status(
                    run_id=run_id,
                    status=status,
                    total_authors=len(authors),
                    success_count=success,
                    failed_count=failed
                )
            
            if commit:
                self.conn.commit()
            
            return run_id, success, failed
            
        except Exception as e:
            # 发生错误时回滚事务
            self.conn.rollback()
            raise
