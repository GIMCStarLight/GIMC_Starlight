#!/usr/bin/env python3
"""
历史JSON数据导入脚本
解析历史数据目录中的JSON文件并导入到 crawler_db_v2
"""

import json
import os
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional
import psycopg2
from psycopg2.extras import Json, execute_batch
from tqdm import tqdm

# 数据库配置（读取环境变量，带默认值）
DB_CONFIG = {
    'host': os.getenv('POSTGRES_HOST', '192.168.102.168'),
    'port': int(os.getenv('POSTGRES_PORT', 5432)),
    'user': os.getenv('POSTGRES_USERNAME', 'postgres'),
    'password': os.getenv('POSTGRES_PASSWORD', 'postgres'),
    'database': os.getenv('POSTGRES_DATABASE', 'crawler_db_v2')
}

# 历史数据目录
HISTORY_DATA_DIR = Path('/Users/samuel/Desktop/爬虫方案/爬虫工程化开发/历史数据')


class HistoricalDataImporter:
    """历史数据导入器"""
    
    def __init__(self):
        self.conn = None
        self.cursor = None
        self.stats = {
            'total_files': 0,
            'processed_files': 0,
            'failed_files': 0,
            'total_authors': 0,
            'new_authors': 0,
            'updated_authors': 0,
            'errors': []
        }
    
    def connect(self):
        """连接数据库"""
        try:
            self.conn = psycopg2.connect(**DB_CONFIG)
            self.cursor = self.conn.cursor()
            print(f"✅ 已连接到数据库: {DB_CONFIG['database']}")
        except Exception as e:
            print(f"❌ 数据库连接失败: {e}")
            sys.exit(1)
    
    def close(self):
        """关闭数据库连接"""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
        print("✅ 数据库连接已关闭")
    
    def find_json_files(self) -> List[Path]:
        """查找所有JSON文件"""
        json_files = []
        
        # 查找所有JSON文件
        for pattern in ['*.json', '**/*.json']:
            json_files.extend(HISTORY_DATA_DIR.glob(pattern))
        
        # 过滤掉非作者数据文件
        author_files = [
            f for f in json_files
            if not f.name.startswith('summary_') 
            and not f.name.startswith('failed_')
            and not f.name.startswith('jobs_')
            and not f.name.startswith('smart_')
            and f.stat().st_size > 1000  # 至少1KB
        ]
        
        self.stats['total_files'] = len(author_files)
        print(f"📁 找到 {len(author_files)} 个作者数据文件")
        return author_files
    
    def parse_json_file(self, file_path: Path) -> Optional[Dict]:
        """解析JSON文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # 验证数据结构
            if not isinstance(data, dict):
                return None
            
            if 'authors' not in data:
                return None
            
            return data
        
        except json.JSONDecodeError as e:
            self.stats['errors'].append(f"{file_path.name}: JSON解析错误 - {e}")
            return None
        except Exception as e:
            self.stats['errors'].append(f"{file_path.name}: 读取错误 - {e}")
            return None
    
    def safe_get(self, data: Dict, key: str, default=None):
        """安全获取字典值"""
        value = data.get(key, default)
        if value == '' or value == 'null':
            return default
        return value
    
    def safe_int(self, value, default=None) -> Optional[int]:
        """安全转换为整数"""
        if value is None or value == '':
            return default
        try:
            return int(float(str(value)))
        except (ValueError, TypeError):
            return default
    
    def safe_float(self, value, default=None) -> Optional[float]:
        """安全转换为浮点数"""
        if value is None or value == '':
            return default
        try:
            return float(str(value))
        except (ValueError, TypeError):
            return default
    
    def safe_bool(self, value, default=False) -> bool:
        """安全转换为布尔值"""
        if value is None or value == '':
            return default
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.lower() in ('true', '1', 'yes')
        return bool(value)
    
    def safe_json(self, value) -> Optional[Json]:
        """安全转换为JSONB"""
        if value is None or value == '':
            return None
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                return Json(parsed)
            except json.JSONDecodeError:
                return None
        return Json(value)
    
    def import_author(self, author_data: Dict, file_name: str) -> bool:
        """导入单个作者数据"""
        try:
            attr = author_data.get('attribute_datas', {})
            
            # 提取基础信息
            author_id = self.safe_get(attr, 'id')
            star_id = author_data.get('star_id') or self.safe_get(attr, 'id')
            
            if not author_id:
                return False
            
            # 1. 插入/更新 authors_core
            core_data = {
                'author_id': author_id,
                'star_id': star_id,
                'core_user_id': self.safe_int(attr.get('core_user_id')),
                'nick_name': self.safe_get(attr, 'nick_name', '未知'),
                'avatar_uri': self.safe_get(attr, 'avatar_uri'),
                'gender': self.safe_int(attr.get('gender')),
                'city': self.safe_get(attr, 'city'),
                'province': self.safe_get(attr, 'province'),
                'author_type': self.safe_int(attr.get('author_type')),
                'author_status': self.safe_int(attr.get('author_status')),
                'grade': self.safe_int(attr.get('grade')),
                'follower': self.safe_int(attr.get('follower'), 0),
                'star_index': self.safe_float(attr.get('star_index')),
                'star_excellent_author': self.safe_bool(attr.get('star_excellent_author')),
                'is_black_horse_author': self.safe_bool(attr.get('is_black_horse_author')),
                'is_cocreate_author': self.safe_bool(attr.get('is_cocreate_author')),
                'is_cpm_project_author': self.safe_bool(attr.get('is_cpm_project_author')),
                'is_short_drama': self.safe_bool(attr.get('is_short_drama')),
                'is_ad_star_cur_high_quality_author': self.safe_bool(attr.get('is_ad_star_cur_high_quality_author')),
                'star_qianchuan_high_potential': self.safe_bool(attr.get('star_qianchuan_high_potential')),
                'last_crawled_at': datetime.now()
            }
            
            self.cursor.execute("""
                INSERT INTO authors_core (
                    author_id, star_id, core_user_id, nick_name, avatar_uri,
                    gender, city, province, author_type, author_status, grade,
                    follower, star_index,
                    star_excellent_author, is_black_horse_author, is_cocreate_author,
                    is_cpm_project_author, is_short_drama, is_ad_star_cur_high_quality_author,
                    star_qianchuan_high_potential, last_crawled_at
                ) VALUES (
                    %(author_id)s, %(star_id)s, %(core_user_id)s, %(nick_name)s, %(avatar_uri)s,
                    %(gender)s, %(city)s, %(province)s, %(author_type)s, %(author_status)s, %(grade)s,
                    %(follower)s, %(star_index)s,
                    %(star_excellent_author)s, %(is_black_horse_author)s, %(is_cocreate_author)s,
                    %(is_cpm_project_author)s, %(is_short_drama)s, %(is_ad_star_cur_high_quality_author)s,
                    %(star_qianchuan_high_potential)s, %(last_crawled_at)s
                )
                ON CONFLICT (author_id) DO UPDATE SET
                    nick_name = EXCLUDED.nick_name,
                    follower = EXCLUDED.follower,
                    star_index = EXCLUDED.star_index,
                    city = EXCLUDED.city,
                    province = EXCLUDED.province,
                    updated_at = NOW(),
                    last_crawled_at = EXCLUDED.last_crawled_at
            """, core_data)
            
            # 2. 插入/更新 authors_fans_metrics
            self.cursor.execute("""
                INSERT INTO authors_fans_metrics (
                    author_id, follower,
                    fans_increment_15d, fans_increment_rate_15d,
                    fans_increment_30d
                ) VALUES (
                    %s, %s, %s, %s, %s
                )
                ON CONFLICT (author_id) DO UPDATE SET
                    follower = EXCLUDED.follower,
                    fans_increment_15d = EXCLUDED.fans_increment_15d,
                    fans_increment_rate_15d = EXCLUDED.fans_increment_rate_15d,
                    fans_increment_30d = EXCLUDED.fans_increment_30d,
                    updated_at = NOW()
            """, (
                author_id,
                self.safe_int(attr.get('follower'), 0),
                self.safe_int(attr.get('fans_increment_within_15d')),
                self.safe_float(attr.get('fans_increment_rate_within_15d')),
                self.safe_int(attr.get('fans_increment_within_30d'))
            ))
            
            # 3. 插入/更新 authors_engagement_metrics
            self.cursor.execute("""
                INSERT INTO authors_engagement_metrics (
                    author_id, interact_rate_30d, play_over_rate_30d,
                    vv_median_30d, interaction_median_30d
                ) VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (author_id) DO UPDATE SET
                    interact_rate_30d = EXCLUDED.interact_rate_30d,
                    play_over_rate_30d = EXCLUDED.play_over_rate_30d,
                    vv_median_30d = EXCLUDED.vv_median_30d,
                    interaction_median_30d = EXCLUDED.interaction_median_30d,
                    updated_at = NOW()
            """, (
                author_id,
                self.safe_float(attr.get('interact_rate_within_30d')),
                self.safe_float(attr.get('play_over_rate_within_30d')),
                self.safe_float(attr.get('vv_median_30d')),
                self.safe_int(attr.get('interaction_median_30d'))
            ))
            
            # 4. 插入/更新 authors_pricing
            self.cursor.execute("""
                INSERT INTO authors_pricing (
                    author_id, price_1_20, price_20_60, price_60,
                    assign_cpm_suggest_price, expected_play_num,
                    assign_task_price_list
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (author_id) DO UPDATE SET
                    price_1_20 = EXCLUDED.price_1_20,
                    price_20_60 = EXCLUDED.price_20_60,
                    price_60 = EXCLUDED.price_60,
                    assign_cpm_suggest_price = EXCLUDED.assign_cpm_suggest_price,
                    expected_play_num = EXCLUDED.expected_play_num,
                    assign_task_price_list = EXCLUDED.assign_task_price_list,
                    updated_at = NOW()
            """, (
                author_id,
                self.safe_int(attr.get('price_1_20')),
                self.safe_int(attr.get('price_20_60')),
                self.safe_int(attr.get('price_60')),
                self.safe_float(attr.get('assign_cpm_suggest_price')),
                self.safe_int(attr.get('expected_play_num')),
                self.safe_json(attr.get('assign_task_price_list'))
            ))
            
            # 5. 插入/更新 authors_marketing_indices
            self.cursor.execute("""
                INSERT INTO authors_marketing_indices (
                    author_id, link_convert_index, link_shopping_index,
                    link_spread_index, link_star_index, star_index
                ) VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (author_id) DO UPDATE SET
                    link_convert_index = EXCLUDED.link_convert_index,
                    link_shopping_index = EXCLUDED.link_shopping_index,
                    link_spread_index = EXCLUDED.link_spread_index,
                    link_star_index = EXCLUDED.link_star_index,
                    star_index = EXCLUDED.star_index,
                    updated_at = NOW()
            """, (
                author_id,
                self.safe_float(attr.get('link_convert_index')),
                self.safe_float(attr.get('link_shopping_index')),
                self.safe_float(attr.get('link_spread_index')),
                self.safe_float(attr.get('link_star_index')),
                self.safe_float(attr.get('star_index'))
            ))
            
            # 6. 插入/更新 authors_content_tags
            tags_relation = self.safe_json(attr.get('tags_relation'))
            if tags_relation:
                self.cursor.execute("""
                    INSERT INTO authors_content_tags (
                        author_id, tags_relation, content_theme_labels_180d
                    ) VALUES (%s, %s, %s)
                    ON CONFLICT (author_id) DO UPDATE SET
                        tags_relation = EXCLUDED.tags_relation,
                        content_theme_labels_180d = EXCLUDED.content_theme_labels_180d,
                        updated_at = NOW()
                """, (
                    author_id,
                    tags_relation,
                    self.safe_json(attr.get('content_theme_labels_180d'))
                ))
            
            # 7. 插入/更新 authors_ecommerce
            self.cursor.execute("""
                INSERT INTO authors_ecommerce (
                    author_id, e_commerce_enable, author_ecom_level,
                    star_ecom_video_num_30d, ecom_score
                ) VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (author_id) DO UPDATE SET
                    e_commerce_enable = EXCLUDED.e_commerce_enable,
                    author_ecom_level = EXCLUDED.author_ecom_level,
                    star_ecom_video_num_30d = EXCLUDED.star_ecom_video_num_30d,
                    ecom_score = EXCLUDED.ecom_score,
                    updated_at = NOW()
            """, (
                author_id,
                self.safe_bool(attr.get('e_commerce_enable')),
                self.safe_get(attr, 'author_ecom_level'),
                self.safe_int(attr.get('star_ecom_video_num_30d')),
                self.safe_float(attr.get('ecom_score'))
            ))
            
            # 8. 插入/更新 authors_raw_archive
            self.cursor.execute("""
                INSERT INTO authors_raw_archive (
                    author_id, run_id, raw_attribute_datas, created_at
                ) VALUES (%s, %s, %s, %s)
                ON CONFLICT (run_id, author_id, created_at) DO NOTHING
            """, (
                author_id,
                0,  # 历史数据没有run_id
                Json(attr),
                datetime.now()
            ))
            
            self.stats['total_authors'] += 1
            return True
            
        except Exception as e:
            self.stats['errors'].append(f"导入作者 {author_id} 失败: {e}")
            return False
    
    def import_file(self, file_path: Path) -> int:
        """导入单个文件"""
        data = self.parse_json_file(file_path)
        if not data:
            self.stats['failed_files'] += 1
            return 0
        
        authors = data.get('authors', [])
        success_count = 0
        
        for author in authors:
            if self.import_author(author, file_path.name):
                success_count += 1
        
        self.stats['processed_files'] += 1
        return success_count
    
    def run(self):
        """执行导入"""
        print("=" * 60)
        print("📦 历史JSON数据导入工具")
        print("=" * 60)
        
        # 连接数据库
        self.connect()
        
        # 查找文件
        json_files = self.find_json_files()
        
        if not json_files:
            print("❌ 没有找到可导入的文件")
            return
        
        # 导入数据
        print(f"\n🚀 开始导入数据...")
        
        with tqdm(total=len(json_files), desc="导入进度") as pbar:
            for file_path in json_files:
                try:
                    count = self.import_file(file_path)
                    pbar.set_postfix({
                        '当前文件': file_path.name[:30],
                        '作者数': count
                    })
                    pbar.update(1)
                    
                    # 每100个文件提交一次
                    if self.stats['processed_files'] % 100 == 0:
                        self.conn.commit()
                
                except Exception as e:
                    self.stats['failed_files'] += 1
                    self.stats['errors'].append(f"{file_path.name}: {e}")
                    pbar.update(1)
        
        # 最终提交
        self.conn.commit()
        
        # 刷新物化视图
        print("\n🔄 刷新物化视图...")
        self.cursor.execute("REFRESH MATERIALIZED VIEW mv_authors_hot")
        self.cursor.execute("REFRESH MATERIALIZED VIEW mv_recently_updated_authors")
        self.conn.commit()
        
        # 打印统计
        self.print_stats()
        
        # 关闭连接
        self.close()
    
    def print_stats(self):
        """打印统计信息"""
        print("\n" + "=" * 60)
        print("📊 导入统计")
        print("=" * 60)
        print(f"总文件数: {self.stats['total_files']}")
        print(f"成功处理: {self.stats['processed_files']}")
        print(f"失败文件: {self.stats['failed_files']}")
        print(f"总作者数: {self.stats['total_authors']}")
        
        if self.stats['errors']:
            print(f"\n⚠️  错误数量: {len(self.stats['errors'])}")
            print("前10个错误:")
            for error in self.stats['errors'][:10]:
                print(f"  - {error}")
        
        print("\n✅ 导入完成！")


if __name__ == '__main__':
    importer = HistoricalDataImporter()
    importer.run()
