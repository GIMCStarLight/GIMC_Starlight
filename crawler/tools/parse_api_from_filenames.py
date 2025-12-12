#!/usr/bin/env python3
"""
从文件名直接解析API信息
"""
import json
import re
from pathlib import Path
from collections import defaultdict
from urllib.parse import parse_qs, unquote

def parse_filename_to_api(filename):
    """从文件名解析API信息"""
    # 文件名格式: 0850__get_author_video_live_linkage_product_list__star_author_id-xxx_time_period-30.txt
    # 提取API路径和参数
    match = re.match(r'^\d+__(.+?)\.txt$', filename)
    if not match:
        return None
    
    content = match.group(1)
    parts = content.split('__')
    
    if len(parts) < 2:
        return None
    
    api_path = parts[0]
    params_str = '__'.join(parts[1:])
    
    # 解析参数
    params = {}
    for param_pair in params_str.split('_'):
        if '-' in param_pair:
            key, value = param_pair.split('-', 1)
            params[key] = unquote(value)
    
    return {
        'api_path': api_path,
        'params': params
    }

def analyze_api_from_files(data_dir):
    """分析API"""
    data_path = Path(data_dir)
    
    # 统计API
    api_stats = defaultdict(lambda: {'count': 0, 'examples': []})
    
    txt_files = sorted([f for f in data_path.glob("*.txt") if re.match(r'^\d+__', f.name)])
    
    print(f"找到 {len(txt_files)} 个数据文件\n")
    
    for txt_file in txt_files:
        api_info = parse_filename_to_api(txt_file.name)
        if not api_info:
            continue
        
        api_path = api_info['api_path']
        params = api_info['params']
        
        # 读取响应数据
        try:
            with open(txt_file, 'r', encoding='utf-8') as f:
                response_data = f.read()
                try:
                    response_json = json.loads(response_data)
                except:
                    response_json = None
        except:
            response_data = None
            response_json = None
        
        api_stats[api_path]['count'] += 1
        if len(api_stats[api_path]['examples']) < 2:
            api_stats[api_path]['examples'].append({
                'filename': txt_file.name,
                'params': params,
                'response_preview': response_data[:500] if response_data else None,
                'response_json': response_json
            })
    
    # 输出分析结果
    print("=" * 100)
    print(f"API接口分析 (共 {len(api_stats)} 个)")
    print("=" * 100)
    
    for api_path, stats in sorted(api_stats.items(), key=lambda x: -x[1]['count']):
        print(f"\n【{api_path}】")
        print(f"  调用次数: {stats['count']}")
        
        if stats['examples']:
            example = stats['examples'][0]
            print(f"  参数示例: {json.dumps(example['params'], ensure_ascii=False)}")
            
            if example['response_json']:
                # 分析响应结构
                print(f"  响应结构:")
                if isinstance(example['response_json'], dict):
                    for key in list(example['response_json'].keys())[:10]:
                        value = example['response_json'][key]
                        if isinstance(value, (list, dict)):
                            print(f"    - {key}: {type(value).__name__} (长度: {len(value) if hasattr(value, '__len__') else 'N/A'})")
                        else:
                            print(f"    - {key}: {value}")
                
                # 推测API用途
                api_purpose = guess_api_purpose(api_path, example['response_json'])
                if api_purpose:
                    print(f"  推测用途: {api_purpose}")
            
            print(f"  响应预览: {example['response_preview'][:200] if example['response_preview'] else 'N/A'}")
    
    # 生成Markdown报告
    report_md = generate_api_report(api_stats)
    report_file = data_path / 'API_ANALYSIS.md'
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(report_md)
    
    print(f"\n\n完整分析报告已保存: {report_file}")

def guess_api_purpose(api_path, response_json):
    """推测API用途"""
    if 'author' in api_path:
        if 'link_score' in api_path:
            return "获取达人链接得分趋势数据"
        if 'convert_ability' in api_path:
            return "获取达人转化能力数据"
        if 'cp_info' in api_path:
            return "获取达人合作报价信息(CPE/CPM)"
        if 'product_list' in api_path:
            return "获取达人带货商品列表"
        return "达人相关数据"
    
    if 'list' in api_path:
        return "列表查询接口"
    
    if 'search' in api_path:
        return "搜索接口"
    
    return None

def generate_api_report(api_stats):
    """生成Markdown报告"""
    md = "# API接口逆向分析报告\n\n"
    md += f"总计: {len(api_stats)} 个API接口\n\n"
    md += "---\n\n"
    
    for api_path, stats in sorted(api_stats.items()):
        md += f"## {api_path}\n\n"
        md += f"**调用次数**: {stats['count']}\n\n"
        
        if stats['examples']:
            example = stats['examples'][0]
            
            # API用途
            if example['response_json']:
                purpose = guess_api_purpose(api_path, example['response_json'])
                if purpose:
                    md += f"**功能**: {purpose}\n\n"
            
            # 参数
            md += "**请求参数**:\n```json\n"
            md += json.dumps(example['params'], ensure_ascii=False, indent=2)
            md += "\n```\n\n"
            
            # 响应示例
            if example['response_json']:
                md += "**响应示例**:\n```json\n"
                md += json.dumps(example['response_json'], ensure_ascii=False, indent=2)[:1000]
                md += "\n```\n\n"
        
        md += "---\n\n"
    
    return md

if __name__ == '__main__':
    data_dir = Path(__file__).parent.parent / 'captured_data' / 'discover_out'
    analyze_api_from_files(data_dir)
