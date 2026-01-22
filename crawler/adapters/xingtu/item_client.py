"""作品投放数据采集客户端"""

import hashlib
import time
from typing import Any, Dict, List, Optional

from .base_client import XingtuBaseClient
from .endpoints import XingtuEndpoints


class ItemDataClient(XingtuBaseClient):
    """作品投放数据采集客户端

    封装作品相关API：
    - GetItemTrendStat (作品趋势统计数据)
    - 数据清洗与结构化
    """

    def _calculate_sign(
        self,
        params: Dict[str, Any],
    ) -> str:
        """计算签名（基于真实算法）

        Args:
            params: 请求参数字典

        Returns:
            MD5签名字符串

        算法说明:
            1. 对所有参数key进行排序
            2. 按照 "key+value" 格式拼接（标量值）或 "key+key" （复杂类型）
            3. 添加固定盐值
            4. MD5哈希
        """
        # 星图签名盐值（从捕获的JS代码中提取）
        SALT = "e9fefef711becf4c3d7bfef829578b0c"

        # 获取所有key并排序
        keys = sorted(params.keys())

        # 构造签名字符串
        parts = []
        for key in keys:
            value = params[key]

            # 处理无效值
            if value is None or (isinstance(value, float) and value != value):
                parts.append("")
                continue

            # 处理标量值 (string, int, float)
            if isinstance(value, (str, int, float)):
                parts.append(f"{key}{value}")
            else:
                # 复杂类型使用key重复
                parts.append(f"{key}{key}")

        # 拼接并添加盐值
        sign_str = "".join(parts) + SALT

        # MD5哈希
        return hashlib.md5(sign_str.encode("utf-8")).hexdigest()

    def get_item_trend_stat(
        self,
        item_id: str,
        traffic_type: int = 1,
        user_role: int = 1,
        sign: Optional[str] = None,
    ) -> Dict[str, Any]:
        """获取作品趋势统计数据
    
        Args:
            item_id: 作品ID (如 7584864709501832494)
            traffic_type: 流量类型 (1=全部, 2=自然, 3=付费)
            user_role: 用户角色 (1=广告主, 2=达人)
            sign: 签名（可选，不提供则自动计算）
    
        Returns:
            作品趋势统计数据字典，包含：
            - base_stats: 基础数据（播放量、CPM、CPE等）
            - realtime_stats: 实时数据（完播量、点赞量等）
            - trend_data: 趋勿图数据
    
        Raises:
            Exception: 请求失败或API返回错误
    
        示例:
            >>> client = ItemDataClient(star_id="xxx", cookie="...")
            >>> data = client.get_item_trend_stat("7584864709501832494")
            >>> print(data['base_stats']['play_count'])
        """
        # 构造参数
        params = {
            "item_id": str(item_id),
            "traffic_type": str(traffic_type),
            "user_role": str(user_role),
            "service_name": "data.AdStarDataService",
            "service_method": "GetItemTrendStat",
            "sign_strict": "1",
        }
    
        # 计算签名（如果未提供）
        if sign is None:
            sign = self._calculate_sign(params)
    
        # 添加签名
        params["sign"] = sign

        status, agw_login, data = self._request_get(
            endpoint=XingtuEndpoints.GET_ITEM_TREND_STAT,
            params=params,
        )

        if status != 200:
            raise Exception(f"请求失败: status={status}, agw_login={agw_login}")

        # 检查业务错误（新的响应结构）
        code = data.get("code")
        msg = data.get("msg")
        
        if code is not None and code != 0:
            raise Exception(
                f"API返回错误: code={code}, msg={msg}"
            )

        return data

    def get_batch_item_stats(
        self,
        item_ids: List[str],
        traffic_type: int = 1,
        user_role: int = 1,
    ) -> List[Dict[str, Any]]:
        """批量获取作品统计数据（顺序执行）

        Args:
            item_ids: 作品ID列表
            traffic_type: 流量类型
            user_role: 用户角色

        Returns:
            作品统计数据列表（含成功/失败状态）

        示例:
            >>> client = ItemDataClient(star_id="xxx", cookie="...")
            >>> results = client.get_batch_item_stats([
            ...     "7584864709501832494",
            ...     "7584864709501832495"
            ... ])
            >>> for result in results:
            ...     if result['status'] == 'success':
            ...         print(result['data'])
        """
        results = []
        for item_id in item_ids:
            try:
                data = self.get_item_trend_stat(
                    item_id=item_id,
                    traffic_type=traffic_type,
                    user_role=user_role,
                )
                results.append(
                    {
                        "item_id": item_id,
                        "status": "success",
                        "data": self.extract_essential_fields(data),
                    }
                )
            except Exception as e:
                results.append(
                    {
                        "item_id": item_id,
                        "status": "failed",
                        "error": str(e),
                    }
                )
        return results

    def extract_essential_fields(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """提取核心字段（数据清洗）

        Args:
            raw_data: 原始API响应

        Returns:
            清洗后的数据字典

        Note:
            实际字段结构需要根据真实API响应调整
        """
        data_payload = raw_data.get("data", {})

        # 基础统计数据
        base_stats = data_payload.get("base_stats", {})

        # 实时统计数据
        realtime_stats = data_payload.get("realtime_stats", {})

        # 趋势数据
        trend_data = data_payload.get("trend_data", [])

        return {
            # 基础数据
            "base_stats": {
                "play_count": base_stats.get("play_count", 0),
                "cpm": base_stats.get("cpm", 0),
                "cpe": base_stats.get("cpe", 0),
                "five_sec_rate": base_stats.get("five_sec_rate", 0),
            },
            # 实时数据
            "realtime_stats": {
                "play_count": realtime_stats.get("play_count", 0),
                "finish_count": realtime_stats.get("finish_count", 0),
                "finish_rate": realtime_stats.get("finish_rate", 0),
                "like_count": realtime_stats.get("like_count", 0),
                "like_rate": realtime_stats.get("like_rate", 0),
                "comment_count": realtime_stats.get("comment_count", 0),
                "comment_rate": realtime_stats.get("comment_rate", 0),
                "share_count": realtime_stats.get("share_count", 0),
                "share_rate": realtime_stats.get("share_rate", 0),
            },
            # 趋势数据（分时数据）
            "trend_data": trend_data,
            # 元数据
            "crawled_at": int(time.time()),
        }

    def get_item_stats_summary(
        self,
        item_id: str,
        traffic_type: int = 1,
    ) -> Dict[str, Any]:
        """获取作品统计摘要（简化版本）

        Args:
            item_id: 作品ID
            traffic_type: 流量类型

        Returns:
            作品核心指标摘要

        示例:
            >>> summary = client.get_item_stats_summary("7584864709501832494")
            >>> print(f"播放量: {summary['play_count']}")
            >>> print(f"完播率: {summary['finish_rate']:.2%}")
        """
        full_data = self.get_item_trend_stat(
            item_id=item_id,
            traffic_type=traffic_type,
        )

        extracted = self.extract_essential_fields(full_data)
        realtime = extracted["realtime_stats"]

        return {
            "item_id": item_id,
            "play_count": realtime["play_count"],
            "finish_count": realtime["finish_count"],
            "finish_rate": realtime["finish_rate"],
            "like_count": realtime["like_count"],
            "like_rate": realtime["like_rate"],
            "comment_count": realtime["comment_count"],
            "share_count": realtime["share_count"],
        }
