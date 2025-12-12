"""星图API端点定义"""

# API网关路径前缀
GW_PREFIX = "/star/mirror/gw/api"


class XingtuEndpoints:
    """端点常量
    
    所有达人相关接口都需要经过网关：/star/mirror/gw/api/
    """

    # 达人基础信息
    GET_AUTHOR_BASE_INFO = f"{GW_PREFIX}/author/get_author_base_info"
    GET_AUTHOR_PLATFORM_CHANNEL_INFO_V2 = f"{GW_PREFIX}/author/get_author_platform_channel_info_v2"
    GET_AUTHOR_SIDE_BASE_INFO = f"{GW_PREFIX}/author/get_author_side_base_info"

    # 达人名片
    AUTHOR_GET_BUSINESS_CARD_INFO = f"{GW_PREFIX}/gauthor/author_get_business_card_info"

    # 链接指数
    GET_AUTHOR_LINK_INFO = f"{GW_PREFIX}/data_sp/get_author_link_info"
    AUTHOR_LINK_STRUCT = f"{GW_PREFIX}/data_sp/author_link_struct"

    # 内容数据
    GET_AUTHOR_HOMEPAGE_VIDEOS = f"{GW_PREFIX}/author/get_author_homepage_videos"
    GET_AUTHOR_SHOW_ITEMS_V2 = f"{GW_PREFIX}/author/get_author_show_items_v2"

    # 营销信息
    GET_AUTHOR_MARKETING_INFO = f"{GW_PREFIX}/author/get_author_marketing_info"

    # 粉丝画像
    AUTHOR_PORTRAIT_FANS = f"{GW_PREFIX}/data_sp/author_portrait_fans"
    GET_AUTHOR_FANS_PORTRAIT_NEW = f"{GW_PREFIX}/data_sp/get_author_fans_portrait_new"


class PlatformSource:
    """平台来源枚举"""

    DOUYIN = 1  # 抖音
    KUAISHOU = 2  # 快手


class PlatformChannel:
    """平台渠道枚举"""

    COMMON = 1  # 通用渠道
    SHOP_FOLLOW = 2  # 小店随心推
    QIANCHUAN = 3  # 千川
    GIANT_ENGINE = 10  # 巨量引擎
    XINGTU = 21  # 星图
