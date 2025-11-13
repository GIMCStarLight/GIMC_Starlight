"""
配置加载服务模块

提供统一的配置文件加载功能，包括：
- 区域代码加载 (load_region_codes)
- 城市代码加载 (load_city_codes)  
- Cookie 文件读取 (read_cookie_file)
- 内容标签加载 (load_content_tags)
"""

import json


def load_region_codes(path: str):
    """加载区域代码配置文件"""
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return None
    provinces = data.get("provinces") or []
    name_to_code = {}
    for p in provinces:
        name = p.get("name")
        code = p.get("code")
        if name and code is not None:
            try:
                name_to_code[str(name)] = int(str(code))
            except Exception:
                continue
    return {"name_to_code": name_to_code, "raw": data}


def load_city_codes(path: str):
    """加载城市代码配置文件"""
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return None
    province_to_city_code = {}
    # 支持两种结构：dict-of-dicts 或 provinces/cities 列表
    if isinstance(data, dict) and "provinces" in data:
        for p in data.get("provinces") or []:
            pname = p.get("name")
            cities = p.get("cities") or []
            if pname:
                province_to_city_code[pname] = {}
                for c in cities:
                    cname = c.get("name")
                    code = c.get("code")
                    if cname and code is not None:
                        try:
                            province_to_city_code[pname][str(cname)] = int(str(code))
                        except Exception:
                            continue
    elif isinstance(data, dict):
        # 假设已是 {省: {市: code}} 形式
        for pname, cmap in data.items():
            if isinstance(cmap, dict):
                province_to_city_code[pname] = {}
                for cname, code in cmap.items():
                    try:
                        province_to_city_code[pname][str(cname)] = int(str(code))
                    except Exception:
                        continue
    return {"province_to_city_code": province_to_city_code, "raw": data}


def read_cookie_file(path: str) -> str:
    """读取 Cookie 文件内容"""
    with open(path, "r", encoding="utf-8") as f:
        return f.read().strip()


def load_content_tags(path: str):
    """加载内容标签配置文件"""
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    # Expect structure: {"content_tag_v2": [ {"first": {...}, "second": [...] }, ... ]}
    return data.get("content_tag_v2", [])