#!/usr/bin/env python3
"""
API逆向分析工具
分析捕获的网络请求数据，提取API接口信息
"""
import json
import re
from pathlib import Path
from collections import defaultdict
from urllib.parse import urlparse, parse_qs

def analyze_api_requests(data_dir):
    """分析API请求"""
    data_path = Path(data_dir)
    
    # 分类统计
    api_endpoints = defaultdict(list)
    resource_types = defaultdict(int)
    domains = defaultdict(int)
    
    # 遍历所有meta文件
    meta_files = sorted(data_path.glob("*__meta.json"))
    
    print(f"找到 {len(meta_files)} 个请求记录\n")
    
    for meta_file in meta_files:
        try:
            with open(meta_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            url = data.get('url', '')
            method = data.get('method', 'GET')
            status = data.get('status', 0)
            resource_type = data.get('resource_type', '')
            
            # 统计资源类型
            resource_types[resource_type] += 1
            
            # 解析URL
            parsed = urlparse(url)
            domain = parsed.netloc
            path = parsed.path
            
            # 统计域名
            domains[domain] += 1
            
            # 只关注API请求
            if resource_type in ['xhr', 'fetch'] or '/api/' in path:
                api_info = {
                    'index': data.get('index'),
                    'method': method,
                    'url': url,
                    'path': path,
                    'status': status,
                    'type': resource_type,
                    'query_params': parse_qs(parsed.query),
                    'post_data': data.get('post_data'),
                    'response_file': data.get('saved_body')
                }
                
                # 按路径分类
                api_key = f"{method} {path}"
                api_endpoints[api_key].append(api_info)
        
        except Exception as e:
            print(f"解析失败 {meta_file.name}: {e}")
            continue
    
    # 打印分析结果
    print("=" * 80)
    print("资源类型统计:")
    print("=" * 80)
    for rtype, count in sorted(resource_types.items(), key=lambda x: -x[1]):
        print(f"  {rtype:20s}: {count:4d}")
    
    print("\n" + "=" * 80)
    print("域名统计:")
    print("=" * 80)
    for domain, count in sorted(domains.items(), key=lambda x: -x[1])[:10]:
        print(f"  {domain:50s}: {count:4d}")
    
    print("\n" + "=" * 80)
    print(f"API端点分析 (共 {len(api_endpoints)} 个):")
    print("=" * 80)
    
    for api_key, requests in sorted(api_endpoints.items()):
        print(f"\n【{api_key}】 - 调用次数: {len(requests)}")
        
        # 显示第一个请求的详细信息
        first_req = requests[0]
        print(f"  URL: {first_req['url'][:100]}")
        print(f"  状态码: {first_req['status']}")
        
        if first_req['query_params']:
            print(f"  Query参数: {dict(first_req['query_params'])}")
        
        if first_req['post_data']:
            try:
                post_json = json.loads(first_req['post_data'])
                print(f"  POST数据: {json.dumps(post_json, ensure_ascii=False)[:200]}")
            except:
                print(f"  POST数据: {first_req['post_data'][:100]}")
        
        if first_req['response_file']:
            resp_file = data_path / first_req['response_file']
            if resp_file.exists():
                try:
                    with open(resp_file, 'r', encoding='utf-8') as f:
                        resp_content = f.read()
                        # 尝试解析JSON响应
                        try:
                            resp_json = json.loads(resp_content)
                            print(f"  响应示例: {json.dumps(resp_json, ensure_ascii=False)[:300]}")
                        except:
                            print(f"  响应示例: {resp_content[:200]}")
                except:
                    pass
    
    # 生成分析报告
    report = {
        'total_requests': len(meta_files),
        'resource_types': dict(resource_types),
        'top_domains': dict(sorted(domains.items(), key=lambda x: -x[1])[:10]),
        'api_endpoints': {}
    }
    
    for api_key, requests in api_endpoints.items():
        report['api_endpoints'][api_key] = {
            'count': len(requests),
            'example': {
                'url': requests[0]['url'],
                'method': requests[0]['method'],
                'status': requests[0]['status'],
                'query_params': requests[0]['query_params'],
                'has_post_data': bool(requests[0]['post_data'])
            }
        }
    
    # 保存报告
    report_file = data_path / 'api_analysis_report.json'
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    print(f"\n\n分析报告已保存: {report_file}")

if __name__ == '__main__':
    data_dir = Path(__file__).parent.parent / 'captured_data' / 'discover_out'
    analyze_api_requests(data_dir)
