"""
作品投放数据持久化服务

功能：
- 保存原始API响应到raw_archive表
- 保存解析后的数据到data表
- 保存趋势数据到trends表
- 更新作品汇总表
- 管理run记录
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple

import psycopg2
import psycopg2.extras


class ItemDeliveryDBService:
    """作品投放数据持久化服务"""

    def __init__(
        self,
        db_config: Optional[Dict] = None,
        existing_conn: Optional[Any] = None,
    ):
        """初始化数据库连接

        Args:
            db_config: 连接配置
            existing_conn: 外部传入的已建立连接
        """
        if db_config is None:
            db_config = {
                "host": os.getenv("POSTGRES_HOST", "192.168.102.168"),
                "port": int(os.getenv("POSTGRES_PORT", 5432)),
                "user": os.getenv("POSTGRES_USERNAME", "postgres"),
                "password": os.getenv("POSTGRES_PASSWORD", "postgres"),
                "database": os.getenv("POSTGRES_DATABASE", "crawler_db_v2"),
                "connect_timeout": int(os.getenv("POSTGRES_CONNECT_TIMEOUT_SEC", 10)),
            }

        self._own_conn = existing_conn is None
        if existing_conn is not None:
            self.conn = existing_conn
        else:
            self.conn = psycopg2.connect(**db_config)
        self.conn.autocommit = False

    def close(self):
        """关闭数据库连接"""
        if self.conn and self._own_conn:
            self.conn.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.conn.rollback()
        if self._own_conn:
            self.close()

    @staticmethod
    def _safe_int(value, default=None) -> Optional[int]:
        """安全转换为整数"""
        if value is None or value == "":
            return default
        try:
            return int(float(str(value)))
        except (ValueError, TypeError):
            return default

    @staticmethod
    def _safe_float(value, default=None) -> Optional[float]:
        """安全转换为浮点数"""
        if value is None or value == "":
            return default
        try:
            return float(str(value))
        except (ValueError, TypeError):
            return default

    @staticmethod
    def _clean_null_chars(obj):
        """递归清理对象中的NULL字符(\u0000)，防止PostgreSQL JSON存储错误"""
        if isinstance(obj, str):
            return obj.replace('\x00', '').replace('\u0000', '')
        elif isinstance(obj, dict):
            return {k: ItemDeliveryDBService._clean_null_chars(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [ItemDeliveryDBService._clean_null_chars(item) for item in obj]
        else:
            return obj

    # ==================== Run 管理功能 ====================

    def create_run(
        self,
        account_id: str,
        star_id: str,
        run_name: Optional[str] = None,
        traffic_type: int = 1,
        user_role: int = 1,
        qps: float = 0.5,
    ) -> int:
        """创建作品投放采集运行记录

        Args:
            account_id: 账号ID（如item_account_1）
            star_id: 星图账户ID
            run_name: 运行名称（可选）
            traffic_type: 流量类型
            user_role: 用户角色
            qps: 采集QPS

        Returns:
            run_id: 任务ID
        """
        cur = self.conn.cursor()

        cur.execute(
            """
            INSERT INTO item_delivery_runs (
                run_name, account_id, star_id, traffic_type, user_role, qps,
                status, started_at, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, 'running', NOW(), NOW())
            RETURNING id
            """,
            (run_name, account_id, star_id, traffic_type, user_role, qps),
        )

        run_id = cur.fetchone()[0]
        cur.close()

        return run_id

    def update_run_status(
        self,
        run_id: int,
        status: Optional[str] = None,
        total_items: Optional[int] = None,
        success_count: Optional[int] = None,
        failed_count: Optional[int] = None,
        error_message: Optional[str] = None,
        finish: bool = False,
    ) -> bool:
        """更新运行状态

        Args:
            run_id: 任务ID
            status: 状态 (running, completed, failed, partial)
            total_items: 总作品数
            success_count: 成功数
            failed_count: 失败数
            error_message: 错误信息
            finish: 是否设置finished_at

        Returns:
            是否更新成功
        """
        cur = self.conn.cursor()

        updates = []
        params = []

        if status:
            updates.append("status = %s")
            params.append(status)

        if total_items is not None:
            updates.append("total_items = %s")
            params.append(total_items)

        if success_count is not None:
            updates.append("success_count = %s")
            params.append(success_count)

        if failed_count is not None:
            updates.append("failed_count = %s")
            params.append(failed_count)

        if error_message:
            updates.append("error_message = %s")
            params.append(error_message)

        if finish:
            updates.append("finished_at = NOW()")

        updates.append("updated_at = NOW()")

        if not updates:
            cur.close()
            return False

        params.append(run_id)

        cur.execute(
            f"""
            UPDATE item_delivery_runs
            SET {', '.join(updates)}
            WHERE id = %s
            """,
            params,
        )

        affected = cur.rowcount
        cur.close()

        return affected > 0

    def get_run_info(self, run_id: int) -> Optional[Dict]:
        """获取运行信息

        Args:
            run_id: 任务ID

        Returns:
            任务信息字典，不存在返回None
        """
        cur = self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute(
            """
            SELECT *
            FROM item_delivery_runs
            WHERE id = %s
            """,
            (run_id,),
        )

        row = cur.fetchone()
        cur.close()

        return dict(row) if row else None

    # ==================== 数据保存功能 ====================

    def save_item_data(
        self,
        run_id: int,
        item_id: str,
        raw_response: Dict[str, Any],
        parsed_data: Optional[Dict[str, Any]] = None,
        traffic_type: int = 1,
        user_role: int = 1,
        api_status: int = 200,
        api_code: Optional[int] = None,
        api_msg: Optional[str] = None,
        commit: bool = True,
    ) -> Tuple[bool, Optional[str]]:
        """保存单个作品的完整数据（原始+解析）

        Args:
            run_id: 运行ID
            item_id: 作品ID
            raw_response: 完整API响应
            parsed_data: 解析后的数据（可选）
            traffic_type: 流量类型
            user_role: 用户角色
            api_status: HTTP状态码
            api_code: API业务代码
            api_msg: API消息
            commit: 是否提交事务

        Returns:
            (成功标志, 错误信息)
        """
        cur = None
        try:
            cur = self.conn.cursor()
            crawled_at = datetime.now()

            # 1. 保存原始数据
            cur.execute(
                """
                INSERT INTO item_delivery_raw_archive (
                    run_id, item_id, raw_response, api_status, api_code, api_msg, crawled_at, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (run_id, item_id, crawled_at) DO NOTHING
                """,
                (
                    run_id,
                    item_id,
                    psycopg2.extras.Json(self._clean_null_chars(raw_response)),
                    api_status,
                    api_code,
                    api_msg,
                    crawled_at,
                ),
            )

            # 2. 保存解析后的数据
            if parsed_data:
                base_stats = parsed_data.get("base_stats", {})
                realtime_stats = parsed_data.get("realtime_stats", {})

                cur.execute(
                    """
                    INSERT INTO item_delivery_data (
                        run_id, item_id,
                        play_count, cpm, cpe, five_sec_rate,
                        finish_count, finish_rate,
                        like_count, like_rate,
                        comment_count, comment_rate,
                        share_count, share_rate,
                        traffic_type, user_role, crawled_at,
                        created_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW()
                    )
                    ON CONFLICT (run_id, item_id) DO UPDATE SET
                        play_count = EXCLUDED.play_count,
                        finish_count = EXCLUDED.finish_count,
                        finish_rate = EXCLUDED.finish_rate,
                        like_count = EXCLUDED.like_count,
                        comment_count = EXCLUDED.comment_count,
                        share_count = EXCLUDED.share_count,
                        cpm = EXCLUDED.cpm,
                        cpe = EXCLUDED.cpe,
                        crawled_at = EXCLUDED.crawled_at,
                        updated_at = NOW()
                    """,
                    (
                        run_id,
                        item_id,
                        self._safe_int(realtime_stats.get("play_count", 0)),
                        self._safe_float(base_stats.get("cpm", 0)),
                        self._safe_float(base_stats.get("cpe", 0)),
                        self._safe_float(base_stats.get("five_sec_rate", 0)),
                        self._safe_int(realtime_stats.get("finish_count", 0)),
                        self._safe_float(realtime_stats.get("finish_rate", 0)),
                        self._safe_int(realtime_stats.get("like_count", 0)),
                        self._safe_float(realtime_stats.get("like_rate", 0)),
                        self._safe_int(realtime_stats.get("comment_count", 0)),
                        self._safe_float(realtime_stats.get("comment_rate", 0)),
                        self._safe_int(realtime_stats.get("share_count", 0)),
                        self._safe_float(realtime_stats.get("share_rate", 0)),
                        traffic_type,
                        user_role,
                        crawled_at,
                    ),
                )

                # 3. 保存趋势数据
                trend_data = parsed_data.get("trend_data")
                if trend_data:
                    cur.execute(
                        """
                        INSERT INTO item_delivery_trends (
                            run_id, item_id, trend_data, created_at
                        ) VALUES (%s, %s, %s, NOW())
                        ON CONFLICT (run_id, item_id) DO UPDATE SET
                            trend_data = EXCLUDED.trend_data
                        """,
                        (run_id, item_id, psycopg2.extras.Json(trend_data)),
                    )

                # 4. 更新汇总表
                self._update_item_summary(
                    cur, item_id, realtime_stats, base_stats, run_id, crawled_at
                )

            if commit:
                self.conn.commit()

            return True, None

        except Exception as e:
            self.conn.rollback()
            error_msg = f"保存作品数据失败: {str(e)}"
            return False, error_msg

        finally:
            if cur:
                cur.close()

    def _update_item_summary(
        self,
        cur,
        item_id: str,
        realtime_stats: Dict,
        base_stats: Dict,
        run_id: int,
        crawled_at: datetime,
    ):
        """更新作品汇总表"""
        cur.execute(
            """
            INSERT INTO item_delivery_summary (
                item_id,
                latest_play_count, latest_finish_count, latest_finish_rate,
                latest_like_count, latest_comment_count, latest_share_count,
                latest_cpm, latest_cpe,
                first_seen_at, last_seen_at, last_seen_run_id, total_crawl_count,
                created_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1, NOW()
            )
            ON CONFLICT (item_id) DO UPDATE SET
                latest_play_count = EXCLUDED.latest_play_count,
                latest_finish_count = EXCLUDED.latest_finish_count,
                latest_finish_rate = EXCLUDED.latest_finish_rate,
                latest_like_count = EXCLUDED.latest_like_count,
                latest_comment_count = EXCLUDED.latest_comment_count,
                latest_share_count = EXCLUDED.latest_share_count,
                latest_cpm = EXCLUDED.latest_cpm,
                latest_cpe = EXCLUDED.latest_cpe,
                last_seen_at = EXCLUDED.last_seen_at,
                last_seen_run_id = EXCLUDED.last_seen_run_id,
                total_crawl_count = item_delivery_summary.total_crawl_count + 1,
                updated_at = NOW()
            """,
            (
                item_id,
                self._safe_int(realtime_stats.get("play_count", 0)),
                self._safe_int(realtime_stats.get("finish_count", 0)),
                self._safe_float(realtime_stats.get("finish_rate", 0)),
                self._safe_int(realtime_stats.get("like_count", 0)),
                self._safe_int(realtime_stats.get("comment_count", 0)),
                self._safe_int(realtime_stats.get("share_count", 0)),
                self._safe_float(base_stats.get("cpm", 0)),
                self._safe_float(base_stats.get("cpe", 0)),
                crawled_at,
                crawled_at,
                run_id,
            ),
        )

    def save_batch_item_data(
        self,
        run_id: int,
        items: List[Dict[str, Any]],
        traffic_type: int = 1,
        user_role: int = 1,
        commit: bool = True,
    ) -> Tuple[int, int]:
        """批量保存作品数据

        Args:
            run_id: 运行ID
            items: 作品数据列表，每个包含：
                - item_id: 作品ID
                - raw_response: 原始响应
                - parsed_data: 解析后数据（可选）
                - api_status: HTTP状态码（可选）
                - api_code: API业务代码（可选）
                - api_msg: API消息（可选）
            traffic_type: 流量类型
            user_role: 用户角色
            commit: 是否提交事务

        Returns:
            (成功数量, 失败数量)
        """
        success_count = 0
        failed_count = 0

        for item in items:
            success, error = self.save_item_data(
                run_id=run_id,
                item_id=item["item_id"],
                raw_response=item.get("raw_response", {}),
                parsed_data=item.get("parsed_data"),
                traffic_type=traffic_type,
                user_role=user_role,
                api_status=item.get("api_status", 200),
                api_code=item.get("api_code"),
                api_msg=item.get("api_msg"),
                commit=False,  # 批量操作时不自动提交
            )

            if success:
                success_count += 1
            else:
                failed_count += 1
                print(f"保存作品 {item['item_id']} 失败: {error}")

        if commit:
            try:
                self.conn.commit()
            except Exception as e:
                self.conn.rollback()
                print(f"批量提交失败: {e}")
                return 0, len(items)

        return success_count, failed_count

    # ==================== 查询功能 ====================

    def get_item_latest_data(self, item_id: str) -> Optional[Dict]:
        """获取作品最新数据

        Args:
            item_id: 作品ID

        Returns:
            最新数据字典
        """
        cur = self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute(
            """
            SELECT *
            FROM item_delivery_summary
            WHERE item_id = %s
            """,
            (item_id,),
        )

        row = cur.fetchone()
        cur.close()

        return dict(row) if row else None

    def get_run_statistics(self, run_id: int) -> Optional[Dict]:
        """获取运行统计信息

        Args:
            run_id: 运行ID

        Returns:
            统计信息字典
        """
        cur = self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute(
            """
            SELECT
                r.*,
                COUNT(d.id) as actual_saved_count,
                AVG(d.play_count) as avg_play_count,
                MAX(d.play_count) as max_play_count
            FROM item_delivery_runs r
            LEFT JOIN item_delivery_data d ON r.id = d.run_id
            WHERE r.id = %s
            GROUP BY r.id
            """,
            (run_id,),
        )

        row = cur.fetchone()
        cur.close()

        return dict(row) if row else None
