#!/usr/bin/env python3
"""
RESTful API 测试脚本
用于快速验证 API 功能是否正常
"""

import requests
import json
import time
import sys

# API 基础地址
BASE_URL = "http://localhost:8000/api/v1"


def print_json(data):
    """美化打印 JSON 数据"""
    print(json.dumps(data, ensure_ascii=False, indent=2))


def test_health_check():
    """测试健康检查"""
    print("\n=== 测试健康检查 ===")
    response = requests.get("http://localhost:8000/api/health")
    print(f"状态码: {response.status_code}")
    print_json(response.json())
    return response.status_code == 200


def test_create_single_star_id_job(star_id="7123456789012345678"):
    """测试创建单星图ID搜索任务"""
    print(f"\n=== 测试创建单星图ID搜索任务: {star_id} ===")
    
    payload = {
        "task_type": "single_star_id",
        "target": {
            "star_id": star_id
        },
        "options": {
            "domain_qps": 1,
            "retry_max": 3,
            "limit": 10,
            "cookies_file": "cookies.txt"
        }
    }
    
    response = requests.post(f"{BASE_URL}/crawl-jobs", json=payload)
    print(f"状态码: {response.status_code}")
    data = response.json()
    print_json(data)
    
    if data.get("success"):
        return data["data"]["job_id"]
    return None


def test_create_single_handle_job(handle="test_handle"):
    """测试创建单抖音号搜索任务"""
    print(f"\n=== 测试创建单抖音号搜索任务: {handle} ===")
    
    payload = {
        "task_type": "single_handle",
        "target": {
            "handle": handle
        },
        "options": {
            "domain_qps": 1,
            "retry_max": 3,
            "limit": 10,
            "cookies_file": "cookies.txt"
        }
    }
    
    response = requests.post(f"{BASE_URL}/crawl-jobs", json=payload)
    print(f"状态码: {response.status_code}")
    data = response.json()
    print_json(data)
    
    if data.get("success"):
        return data["data"]["job_id"]
    return None


def test_create_batch_handles_job(handles=None):
    """测试创建批量抖音号搜索任务"""
    if handles is None:
        handles = ["handle1", "handle2", "handle3"]
    
    print(f"\n=== 测试创建批量抖音号搜索任务: {len(handles)}个 ===")
    
    payload = {
        "task_type": "batch_handles",
        "target": {
            "handles": handles,
            "dedup": True
        },
        "options": {
            "sleep_between_keywords_ms": 2000,
            "domain_qps": 1,
            "limit": 5,
            "cookies_file": "cookies.txt"
        }
    }
    
    response = requests.post(f"{BASE_URL}/crawl-jobs", json=payload)
    print(f"状态码: {response.status_code}")
    data = response.json()
    print_json(data)
    
    if data.get("success"):
        return data["data"]["job_id"]
    return None


def test_get_job_status(job_id):
    """测试获取任务状态"""
    print(f"\n=== 测试获取任务状态: {job_id} ===")
    
    response = requests.get(f"{BASE_URL}/crawl-jobs/{job_id}/status")
    print(f"状态码: {response.status_code}")
    data = response.json()
    print_json(data)
    
    if data.get("success"):
        return data["data"]["status"]
    return None


def test_get_job_details(job_id):
    """测试获取任务详情"""
    print(f"\n=== 测试获取任务详情: {job_id} ===")
    
    response = requests.get(f"{BASE_URL}/crawl-jobs/{job_id}")
    print(f"状态码: {response.status_code}")
    data = response.json()
    print_json(data)
    
    return data


def test_get_job_results(job_id):
    """测试获取任务结果"""
    print(f"\n=== 测试获取任务结果: {job_id} ===")
    
    response = requests.get(f"{BASE_URL}/crawl-jobs/{job_id}/results?page=1&limit=10")
    print(f"状态码: {response.status_code}")
    data = response.json()
    print_json(data)
    
    return data


def test_list_jobs():
    """测试获取任务列表"""
    print("\n=== 测试获取任务列表 ===")
    
    response = requests.get(f"{BASE_URL}/crawl-jobs?page=1&limit=10")
    print(f"状态码: {response.status_code}")
    data = response.json()
    print_json(data)
    
    return data


def monitor_job(job_id, max_wait_seconds=300):
    """监控任务执行直到完成"""
    print(f"\n=== 监控任务执行: {job_id} ===")
    
    start_time = time.time()
    last_status = None
    
    while True:
        elapsed = time.time() - start_time
        if elapsed > max_wait_seconds:
            print(f"\n⏰ 超过最大等待时间 {max_wait_seconds}s，停止监控")
            break
        
        status = test_get_job_status(job_id)
        
        if status != last_status:
            print(f"\n📊 任务状态变更: {last_status} -> {status}")
            last_status = status
        
        if status in ["completed", "failed", "cancelled"]:
            print(f"\n✅ 任务已结束，最终状态: {status}")
            test_get_job_details(job_id)
            if status == "completed":
                test_get_job_results(job_id)
            break
        
        print(f"⏳ 等待中... ({elapsed:.1f}s)")
        time.sleep(2)


def main():
    """主测试流程"""
    print("=" * 60)
    print("RESTful API 功能测试")
    print("=" * 60)
    
    # 1. 健康检查
    if not test_health_check():
        print("\n❌ API 服务未启动，请先启动服务")
        print("   python entrypoints/restful_api_server.py --reload")
        sys.exit(1)
    
    # 2. 测试创建单星图ID任务
    print("\n" + "=" * 60)
    print("测试场景 1: 单星图ID搜索")
    print("=" * 60)
    job_id_1 = test_create_single_star_id_job()
    
    if job_id_1:
        # 监控任务执行
        monitor_job(job_id_1)
    
    # 3. 测试创建单抖音号任务
    print("\n" + "=" * 60)
    print("测试场景 2: 单抖音号搜索")
    print("=" * 60)
    job_id_2 = test_create_single_handle_job()
    
    if job_id_2:
        # 简单检查状态
        time.sleep(2)
        test_get_job_status(job_id_2)
    
    # 4. 测试批量抖音号任务（注释掉以节省时间，按需启用）
    # print("\n" + "=" * 60)
    # print("测试场景 3: 批量抖音号搜索")
    # print("=" * 60)
    # job_id_3 = test_create_batch_handles_job()
    
    # if job_id_3:
    #     monitor_job(job_id_3, max_wait_seconds=600)
    
    # 5. 获取任务列表
    print("\n" + "=" * 60)
    print("测试场景 4: 获取任务列表")
    print("=" * 60)
    test_list_jobs()
    
    print("\n" + "=" * 60)
    print("测试完成！")
    print("=" * 60)


if __name__ == "__main__":
    main()
