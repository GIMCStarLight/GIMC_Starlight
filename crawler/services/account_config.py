"""
账号配置服务

提供账号相关配置的读取功能，包括：
- 根据账号ID获取star_id
- 读取账号池配置
"""

import json
from pathlib import Path
from typing import Optional, Dict, Any


def get_account_pool_path() -> Path:
    """获取账号池配置文件路径"""
    # 从当前文件向上查找项目根目录
    current_file = Path(__file__)
    project_root = current_file.parent.parent
    return project_root / "tools" / "account_manager" / "config" / "account_pool.json"


def load_account_pool() -> Dict[str, Any]:
    """加载账号池配置
    
    Returns:
        账号池配置字典
        
    Raises:
        FileNotFoundError: 配置文件不存在
        json.JSONDecodeError: 配置文件格式错误
    """
    config_path = get_account_pool_path()
    
    if not config_path.exists():
        raise FileNotFoundError(f"账号池配置文件不存在: {config_path}")
    
    with open(config_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def get_star_id_by_account(account_id: str) -> Optional[str]:
    """根据账号ID获取对应的star_id
    
    Args:
        account_id: 账号ID (如 "account_1", "account_2", "account_3")
        
    Returns:
        对应的star_id，如果账号不存在或未配置则返回None
        
    Examples:
        >>> star_id = get_star_id_by_account("account_1")
        >>> print(star_id)
        1843934177451019
    """
    try:
        config = load_account_pool()
        accounts = config.get("accounts", [])
        
        for account in accounts:
            if account.get("account_id") == account_id:
                return account.get("star_id")
        
        return None
    except Exception as e:
        print(f"[警告] 获取star_id失败: {e}")
        return None


def get_star_id_from_cookie_path(cookie_path: str) -> Optional[str]:
    """从cookie文件路径中提取账号ID，并返回对应的star_id
    
    Args:
        cookie_path: cookie文件路径 (如 "tools/account_manager/config/accounts/account_1/cookies.txt")
        
    Returns:
        对应的star_id，如果无法解析则返回None
        
    Examples:
        >>> star_id = get_star_id_from_cookie_path("tools/account_manager/config/accounts/account_2/cookies.txt")
        >>> print(star_id)
        1849653069603081
    """
    # 从路径中提取账号ID
    path_parts = Path(cookie_path).parts
    
    # 查找 accounts 目录后的账号ID
    try:
        accounts_index = path_parts.index('accounts')
        if accounts_index + 1 < len(path_parts):
            account_id = path_parts[accounts_index + 1]
            return get_star_id_by_account(account_id)
    except (ValueError, IndexError):
        pass
    
    return None


def get_account_info(account_id: str) -> Optional[Dict[str, Any]]:
    """获取账号的完整配置信息
    
    Args:
        account_id: 账号ID
        
    Returns:
        账号配置字典，如果账号不存在则返回None
    """
    try:
        config = load_account_pool()
        accounts = config.get("accounts", [])
        
        for account in accounts:
            if account.get("account_id") == account_id:
                return account
        
        return None
    except Exception as e:
        print(f"[警告] 获取账号信息失败: {e}")
        return None


def list_all_accounts() -> list:
    """列出所有账号及其star_id
    
    Returns:
        账号列表，每个元素包含 account_id, account_name, star_id
    """
    try:
        config = load_account_pool()
        accounts = config.get("accounts", [])
        
        result = []
        for account in accounts:
            result.append({
                "account_id": account.get("account_id"),
                "account_name": account.get("account_name"),
                "star_id": account.get("star_id"),
                "status": account.get("status"),
                "username": account.get("username")
            })
        
        return result
    except Exception as e:
        print(f"[警告] 列出账号失败: {e}")
        return []


if __name__ == "__main__":
    # 测试代码
    print("="*60)
    print("账号配置测试")
    print("="*60)
    
    # 列出所有账号
    print("\n所有账号及star_id:")
    for acc in list_all_accounts():
        print(f"  {acc['account_id']}: {acc['account_name']} -> star_id={acc['star_id']}")
    
    # 测试获取star_id
    print("\n测试获取star_id:")
    for account_id in ["account_1", "account_2", "account_3"]:
        star_id = get_star_id_by_account(account_id)
        print(f"  {account_id}: {star_id}")
    
    # 测试从cookie路径获取star_id
    print("\n测试从cookie路径获取star_id:")
    test_paths = [
        "tools/account_manager/config/accounts/account_1/cookies.txt",
        "tools/account_manager/config/accounts/account_2/cookies.txt"
    ]
    for path in test_paths:
        star_id = get_star_id_from_cookie_path(path)
        print(f"  {path} -> {star_id}")
    
    print("\n" + "="*60)
