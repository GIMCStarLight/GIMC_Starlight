import json
import os
import re
from datetime import datetime

BASE_DIR = "/Users/samuel/Desktop/爬虫方案"
CHUNK_CANDIDATES = [
    os.path.join(BASE_DIR, "task_control/har_scripts/automated_discover_out/apis/0097__294.2d8b6862.js.txt"),
    os.path.join(BASE_DIR, "task_control/har_scripts/automated_discover_out/apis/0079__294.2d8b6862.js.txt"),
    os.path.join(BASE_DIR, "task_control/har_scripts/automated_discover_out/resources/0097__294.2d8b6862.js.txt"),
    os.path.join(BASE_DIR, "task_control/har_scripts/automated_discover_out/resources/0079__294.2d8b6862.js.txt"),
    # 兼容废弃目录下的 HAR 输出
    os.path.join(BASE_DIR, "task_control-废弃/har_scripts/automated_discover_out/apis/0097__294.2d8b6862.js.txt"),
    os.path.join(BASE_DIR, "task_control-废弃/har_scripts/automated_discover_out/apis/0079__294.2d8b6862.js.txt"),
    os.path.join(BASE_DIR, "task_control-废弃/har_scripts/automated_discover_out/resources/0097__294.2d8b6862.js.txt"),
    os.path.join(BASE_DIR, "task_control-废弃/har_scripts/automated_discover_out/resources/0079__294.2d8b6862.js.txt"),
]

# 将输出限制在 task_control 目录内
TASK_CONTROL_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_PATH = os.path.join(TASK_CONTROL_DIR, "reports", "region_codes.json")


def find_first_existing(paths):
    for p in paths:
        if os.path.exists(p):
            return p
    return None


def extract_regions(js_text: str):
    # Normalize whitespace to help regex across a single long line
    text = js_text
    # Regex to capture province block: label + children + code
    prov_pattern = re.compile(
        r'label:"(?P<label>[^"]+)",value:"[^"]+",children:\[(?P<children>.*?)\],code:"(?P<code>\d{6})"'
    )
    provinces = []
    for m in prov_pattern.finditer(text):
        label = m.group("label")
        code = m.group("code")
        children_block = m.group("children")
        # Extract child city labels from the children block
        city_labels = re.findall(r'label:"([^"]+)",value:"[^"]+"', children_block)
        provinces.append(
            {
                "name": label,
                "code": code,
                "cities": city_labels,
            }
        )
    return provinces


def main():
    src_path = find_first_existing(CHUNK_CANDIDATES)
    if not src_path:
        raise FileNotFoundError("Region JS chunk not found in expected locations")
    with open(src_path, "r", encoding="utf-8") as f:
        content = f.read()
    provinces = extract_regions(content)
    # Build output structure
    out = {
        "source_file": os.path.relpath(src_path, BASE_DIR),
        "generated_at": datetime.now(datetime.UTC).isoformat(),
        "province_count": len(provinces),
        "provinces": provinces,
        "notes": {
            "city_codes": "Children entries in the chunk do not include numeric city codes; only names present.",
            "usage": "Use province 'code' (e.g., 330000 for 浙江省) for province_id; for city filter, the FE uses names (e.g., 杭州市). If API requires city_id, map via GB/T 2260 or upstream API docs.",
        },
    }
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"Wrote region codes to {OUT_PATH}. Provinces: {len(provinces)}")


if __name__ == "__main__":
    main()
