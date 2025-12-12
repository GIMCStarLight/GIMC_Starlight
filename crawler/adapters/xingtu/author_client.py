"""达人信息采集客户端"""

from typing import Any, Dict, List

from .base_client import XingtuBaseClient
from .endpoints import XingtuEndpoints


class AuthorInfoClient(XingtuBaseClient):
    """达人信息采集客户端

    封装达人相关API：
    - get_author_base_info
    - get_author_platform_channel_info_v2
    - 数据合并与清洗
    """

    def get_base_info(
        self,
        author_id: str,
        platform_source: int = 1,
        platform_channel: int = 1,
        recommend: bool = True,
        need_sec_uid: bool = True,
        need_linkage_info: bool = True,
    ) -> Dict[str, Any]:
        """获取达人基础信息

        Args:
            author_id: 达人ID
            platform_source: 平台来源(1=抖音,2=快手)
            platform_channel: 平台渠道(1=通用,21=星图)
            recommend: 是否返回推荐信息
            need_sec_uid: 是否返回sec_uid
            need_linkage_info: 是否返回联动信息

        Returns:
            达人基础信息字典

        Raises:
            Exception: 请求失败或API返回错误

        示例:
            >>> client = AuthorInfoClient(star_id="xxx", cookie="...")
            >>> info = client.get_base_info("6629722292110753806")
            >>> print(info['nick_name'], info['follower'])
        """
        params = {
            "o_author_id": author_id,
            "platform_source": platform_source,
            "platform_channel": platform_channel,
            "recommend": str(recommend).lower(),
            "need_sec_uid": str(need_sec_uid).lower(),
            "need_linkage_info": str(need_linkage_info).lower(),
        }

        status, agw_login, data = self._request_get(
            endpoint=XingtuEndpoints.GET_AUTHOR_BASE_INFO,
            params=params,
        )

        if status != 200:
            raise Exception(f"请求失败: status={status}, agw_login={agw_login}")

        if not self.check_response(data):
            base_resp = data.get("base_resp", {})
            raise Exception(
                f"API返回错误: code={base_resp.get('status_code')}, "
                f"msg={base_resp.get('status_message')}"
            )

        return data

    def get_platform_channel_info(
        self,
        author_id: str,
        platform_source: int = 1,
        platform_channel: int = 1,
    ) -> Dict[str, Any]:
        """获取平台渠道信息（自我介绍等）

        Args:
            author_id: 达人ID
            platform_source: 平台来源
            platform_channel: 平台渠道

        Returns:
            平台渠道信息字典

        示例:
            >>> info = client.get_platform_channel_info("6629722292110753806")
            >>> print(info['self_intro'])
        """
        params = {
            "o_author_id": author_id,
            "platform_source": platform_source,
            "platform_channel": platform_channel,
        }

        status, agw_login, data = self._request_get(
            endpoint=XingtuEndpoints.GET_AUTHOR_PLATFORM_CHANNEL_INFO_V2,
            params=params,
        )

        if status != 200:
            raise Exception(f"请求失败: status={status}")

        if not self.check_response(data):
            raise Exception(f"API返回错误: {data.get('base_resp')}")

        return data

    def get_complete_info(
        self,
        author_id: str,
        platform_source: int = 1,
        platform_channel: int = 1,
    ) -> Dict[str, Any]:
        """获取达人完整信息（合并两个接口）

        Args:
            author_id: 达人ID
            platform_source: 平台来源
            platform_channel: 平台渠道

        Returns:
            合并后的完整信息字典

        示例:
            >>> info = client.get_complete_info("6629722292110753806")
            >>> print({
            ...     "nick_name": info['nick_name'],
            ...     "follower": info['follower'],
            ...     "self_intro": info['self_intro'],
            ... })
        """
        # 获取基础信息
        base_info = self.get_base_info(
            author_id=author_id,
            platform_source=platform_source,
            platform_channel=platform_channel,
        )

        # 获取平台渠道信息
        try:
            channel_info = self.get_platform_channel_info(
                author_id=author_id,
                platform_source=platform_source,
                platform_channel=platform_channel,
            )
            # 合并self_intro
            base_info["self_intro"] = channel_info.get("self_intro", "")
        except Exception as e:
            # 可选接口失败不影响主流程
            print(f"[warn] 获取平台渠道信息失败: {e}")
            base_info["self_intro"] = ""

        return base_info

    def get_batch_info(
        self,
        author_ids: List[str],
        platform_source: int = 1,
        platform_channel: int = 1,
    ) -> List[Dict[str, Any]]:
        """批量获取达人信息（顺序执行）

        Args:
            author_ids: 达人ID列表
            platform_source: 平台来源
            platform_channel: 平台渠道

        Returns:
            达人信息列表（含成功/失败状态）
        """
        results = []
        for author_id in author_ids:
            try:
                info = self.get_complete_info(
                    author_id=author_id,
                    platform_source=platform_source,
                    platform_channel=platform_channel,
                )
                results.append(
                    {
                        "author_id": author_id,
                        "status": "success",
                        "data": self.extract_essential_fields(info),
                    }
                )
            except Exception as e:
                results.append(
                    {
                        "author_id": author_id,
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
        """
        return {
            # 基本信息
            "author_id": raw_data.get("id"),
            "nick_name": raw_data.get("nick_name"),
            "avatar_uri": raw_data.get("avatar_uri"),
            "unique_id": raw_data.get("unique_id"),
            "sec_uid": raw_data.get("sec_uid"),
            "short_id": raw_data.get("short_id"),
            # 统计数据
            "follower": raw_data.get("follower"),
            "gender": raw_data.get("gender"),
            # 地理信息
            "province": raw_data.get("province"),
            "city": raw_data.get("city"),
            # 分类标签
            "category_id": raw_data.get("category_id"),
            "tags": raw_data.get("tags"),
            "tags_level_two": raw_data.get("tags_level_two"),
            "content_theme_labels": raw_data.get("content_theme_labels", []),
            # 商业信息
            "mcn_name": raw_data.get("mcn_name", ""),
            "lowest_price": raw_data.get("lowest_price"),
            "is_star": raw_data.get("is_star"),
            "e_commerce_enable": raw_data.get("e_commerce_enable"),
            "has_phone": raw_data.get("has_phone"),
            # 附加信息
            "self_intro": raw_data.get("self_intro", ""),
            "platform": raw_data.get("platform", []),
            "platform_channel": raw_data.get("platform_channel", []),
            "core_user_id": raw_data.get("core_user_id"),
        }
