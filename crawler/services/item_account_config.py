"""
作品投放数据采集专用账号配置服务

功能:
  - 独立的账号池管理（与达人采集账号隔离）
  - 专门用于GetItemTrendStat等作品投放数据接口
  - Cookie和star_id独立管理
"""

import json
from pathlib import Path
from typing import Optional, Dict, Any, List


def get_item_account_pool_path() -> Path:
    """获取作品数据采集账号池配置文件路径"""
    current_file = Path(__file__)
    project_root = current_file.parent.parent
    return (
        project_root
        / "tools"
        / "account_manager"
        / "config"
        / "item_delivery_account_pool.json"
    )


def load_item_account_pool() -> Dict[str, Any]:
    """加载作品数据采集账号池配置

    Returns:
        账号池配置字典

    Raises:
        FileNotFoundError: 配置文件不存在
        json.JSONDecodeError: 配置文件格式错误
    """
    config_path = get_item_account_pool_path()

    if not config_path.exists():
        raise FileNotFoundError(f"作品数据采集账号池配置文件不存在: {config_path}")

    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)


def get_item_star_id_by_account(account_id: str) -> Optional[str]:
    """根据账号ID获取对应的star_id（作品数据采集专用）

    Args:
        account_id: 账号ID (如 "item_account_1", "item_account_2")

    Returns:
        对应的star_id，如果账号不存在或未配置则返回None

    Examples:
        >>> star_id = get_item_star_id_by_account("item_account_1")
        >>> print(star_id)
        1843934177451019
    """
    try:
        config = load_item_account_pool()
        accounts = config.get("accounts", [])

        for account in accounts:
            if account.get("account_id") == account_id:
                return account.get("star_id")

        return None
    except Exception as e:
        print(f"[警告] 获取作品数据采集star_id失败: {e}")
        return None


def get_item_account_info(account_id: str) -> Optional[Dict[str, Any]]:
    """获取作品数据采集账号的完整配置信息

    Args:
        account_id: 账号ID

    Returns:
        账号配置字典，如果账号不存在则返回None
    """
    try:
        config = load_item_account_pool()
        accounts = config.get("accounts", [])

        for account in accounts:
            if account.get("account_id") == account_id:
                return account

        return None
    except Exception as e:
        print(f"[警告] 获取作品数据采集账号信息失败: {e}")
        return None


def get_item_cookie_file_path(account_id: str) -> Optional[str]:
    """获取作品数据采集账号的Cookie文件路径

    Args:
        account_id: 账号ID

    Returns:
        Cookie文件路径，如果账号不存在则返回None
    """
    account_info = get_item_account_info(account_id)
    if account_info:
        cookie_file = account_info.get("cookie_file")
        if cookie_file:
            # 转换为绝对路径
            current_file = Path(__file__)
            project_root = current_file.parent.parent
            return str(project_root / cookie_file)
    return None


def list_all_item_accounts() -> List[Dict[str, Any]]:
    """列出所有作品数据采集账号及其star_id

    Returns:
        账号列表，每个元素包含 account_id, account_name, star_id等
    """
    try:
        config = load_item_account_pool()
        accounts = config.get("accounts", [])

        result = []
        for account in accounts:
            result.append(
                {
                    "account_id": account.get("account_id"),
                    "account_name": account.get("account_name"),
                    "star_id": account.get("star_id"),
                    "status": account.get("status"),
                    "username": account.get("username"),
                    "cookie_file": account.get("cookie_file"),
                }
            )

        return result
    except Exception as e:
        print(f"[警告] 列出作品数据采集账号失败: {e}")
        return []


def get_available_item_account() -> Optional[Dict[str, Any]]:
    """获取一个可用的作品数据采集账号（根据轮换策略）

    Returns:
        账号信息字典，如果没有可用账号则返回None
    """
    try:
        config = load_item_account_pool()
        accounts = config.get("accounts", [])
        strategy = config.get("rotation_strategy", "least_used")

        # 过滤出活跃账号
        active_accounts = [a for a in accounts if a.get("status") == "active"]

        if not active_accounts:
            return None

        # 根据策略选择账号
        if strategy == "least_used":
            # 使用次数最少的账号
            return min(active_accounts, key=lambda x: x.get("use_count", 0))
        elif strategy == "round_robin":
            # 轮换使用（简化版：选择第一个）
            return active_accounts[0]
        else:
            return active_accounts[0]

    except Exception as e:
        print(f"[警告] 获取可用作品数据采集账号失败: {e}")
        return None


if __name__ == "__main__":
    # 测试代码
    print("=" * 60)
    print("作品投放数据采集账号配置测试")
    print("=" * 60)

    # 列出所有账号
    print("\n所有作品数据采集账号:")
    for acc in list_all_item_accounts():
        print(
            f"  {acc['account_id']}: {acc['account_name']} -> "
            f"star_id={acc['star_id']}, status={acc['status']}"
        )

    # 测试获取star_id
    print("\n测试获取star_id:")
    test_account = "item_account_1"
    star_id = get_item_star_id_by_account(test_account)
    print(f"  {test_account}: {star_id}")

    # 测试获取Cookie文件路径
    print("\n测试获取Cookie文件路径:")
    cookie_path = get_item_cookie_file_path(test_account)
    print(f"  {test_account}: {cookie_path}")

    # 测试获取可用账号
    print("\n测试获取可用账号:")
    available = get_available_item_account()
    if available:
        print(f"  可用账号: {available['account_id']} ({available['account_name']})")
    else:
        print("  没有可用账号")

    print("\n" + "=" * 60)
