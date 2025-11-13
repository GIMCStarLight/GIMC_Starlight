"""
服务集成测试

测试所有抽取的服务模块的集成功能：
- 数据处理与验证服务
- HTTP客户端服务  
- 重试处理服务
- 任务编排服务
- 日志记录服务
"""

import pytest
import json
import time
import tempfile
import os
from unittest.mock import Mock, patch
from typing import Dict, Any, Tuple, Optional

# 导入所有服务
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from services.db_v2 import DatabaseServiceV2
    _safe_int = DatabaseServiceV2._safe_int
    _safe_float = DatabaseServiceV2._safe_float
    _safe_bool = DatabaseServiceV2._safe_bool
    _maybe_json = DatabaseServiceV2._maybe_json
except (ImportError, AttributeError):
    from services.db import _safe_int, _safe_float, _safe_bool, _maybe_json
from services.http_client import create_session, post_json
from services.retry_handler import create_retry_handler, RetryConfig
from services.task_orchestrator import (
    create_qps_limiter, 
    create_time_window_manager,
    create_task_orchestrator,
    TimeWindowQPSLimiter
)
from services.logging_utils import get_json_logger, log_event


class TestServicesIntegration:
    """服务集成测试类"""
    
    def test_data_validation_with_logging(self):
        """测试数据验证服务与日志服务的集成"""
        with tempfile.TemporaryDirectory() as temp_dir:
            logger = get_json_logger('data_validation_test', log_dir=temp_dir)
            
            # 测试数据验证并记录日志
            test_data = {
                'int_field': '123',
                'float_field': '45.67',
                'bool_field': 'true',
                'json_field': '{"key": "value"}'
            }
            
            results = {}
            for field, value in test_data.items():
                if 'int' in field:
                    result = _safe_int(value)
                    results[field] = result
                    log_event(logger, 'info', 'data_validation', 
                             field=field, input=value, output=result, type='int')
                elif 'float' in field:
                    result = _safe_float(value)
                    results[field] = result
                    log_event(logger, 'info', 'data_validation',
                             field=field, input=value, output=result, type='float')
                elif 'bool' in field:
                    result = _safe_bool(value)
                    results[field] = result
                    log_event(logger, 'info', 'data_validation',
                             field=field, input=value, output=result, type='bool')
                elif 'json' in field:
                    result = _maybe_json(value)
                    results[field] = result
                    log_event(logger, 'info', 'data_validation',
                             field=field, input=value, output=str(result), type='json')
            
            # 验证结果
            assert results['int_field'] == 123
            assert results['float_field'] == 45.67
            assert results['bool_field'] is True
            assert results['json_field'] == {"key": "value"}
            
            # 验证日志文件
            log_file = os.path.join(temp_dir, 'data_validation_test.log')
            assert os.path.exists(log_file)
            
            with open(log_file, 'r', encoding='utf-8') as f:
                log_lines = f.readlines()
                assert len(log_lines) == 4  # 4个字段的验证日志
                
                for line in log_lines:
                    log_data = json.loads(line.strip())
                    assert log_data['event'] == 'data_validation'
                    assert 'field' in log_data
                    assert 'input' in log_data
                    assert 'output' in log_data
                    assert 'type' in log_data

    def test_http_client_with_retry_handler(self):
        """测试HTTP客户端与重试处理服务的集成"""
        # 创建重试处理器
        retry_handler = create_retry_handler(
            retry_max=3,
            retry_backoff_ms=100,
            jitter_ratio=0.1
        )
        
        # 模拟HTTP请求函数
        call_count = 0
        def mock_request(headers: dict, payload: dict) -> Tuple[Optional[int], Optional[str], Optional[dict]]:
            nonlocal call_count
            call_count += 1
            
            if call_count <= 2:
                # 前两次请求失败
                return 500, None, None
            else:
                # 第三次请求成功
                return 200, 'success_token', {'data': 'test_response'}
        
        # 执行带重试的请求
        start_time = time.time()
        status, agw_login, data = retry_handler.execute_with_retry(
            mock_request,
            {'User-Agent': 'test'},
            {'test': 'payload'}
        )
        end_time = time.time()
        
        # 验证结果
        assert status == 200
        assert agw_login == 'success_token'
        assert data == {'data': 'test_response'}
        assert call_count == 3  # 重试了3次
        assert end_time - start_time >= 0.1  # 至少等待了退避时间

    def test_qps_limiter_with_logging(self):
        """测试QPS限速器与日志服务的集成"""
        with tempfile.TemporaryDirectory() as temp_dir:
            logger = get_json_logger('qps_test', log_dir=temp_dir)
            limiter = create_qps_limiter(qps=3, window_ms=1000)
            
            # 测试QPS限制
            start_time = time.time()
            request_times = []
            
            for i in range(5):
                request_start = time.time()
                limiter.acquire()
                request_end = time.time()
                request_times.append(request_end - request_start)
                
                log_event(logger, 'info', 'qps_request',
                         request_id=i+1, 
                         wait_time=request_end - request_start,
                         total_time=request_end - start_time)
            
            total_time = time.time() - start_time
            
            # 验证QPS限制生效（5个请求，QPS=3，应该需要至少1秒多的时间）
            assert total_time >= 1.0
            
            # 验证日志记录
            log_file = os.path.join(temp_dir, 'qps_test.log')
            assert os.path.exists(log_file)
            
            with open(log_file, 'r', encoding='utf-8') as f:
                log_lines = f.readlines()
                assert len(log_lines) == 5
                
                for i, line in enumerate(log_lines):
                    log_data = json.loads(line.strip())
                    assert log_data['event'] == 'qps_request'
                    assert log_data['request_id'] == i + 1
                    assert 'wait_time' in log_data
                    assert 'total_time' in log_data

    def test_task_orchestrator_integration(self):
        """测试任务编排服务的集成功能"""
        orchestrator = create_task_orchestrator()
        time_manager = create_time_window_manager()
        
        # 测试时间窗解析
        window = time_manager.parse_time_window('09:00-17:00')
        assert window == (540, 1020)  # 9*60 到 17*60
        
        # 测试跨日时间窗
        night_window = time_manager.parse_time_window('22:00-02:00')
        assert night_window == (1320, 120)  # 22*60 到 2*60
        
        # 测试时间窗检查（这个测试结果取决于运行时间）
        is_in_window = time_manager.is_in_window(window)
        assert isinstance(is_in_window, bool)

    def test_full_service_integration_scenario(self):
        """完整的服务集成场景测试"""
        with tempfile.TemporaryDirectory() as temp_dir:
            # 1. 初始化所有服务
            logger = get_json_logger('integration_test', log_dir=temp_dir)
            limiter = create_qps_limiter(qps=2, window_ms=1000)
            retry_handler = create_retry_handler(
                retry_max=2,
                retry_backoff_ms=50,
                limiter=limiter,
                logger=logger
            )
            
            # 2. 模拟一个完整的数据处理流程
            raw_data = {
                'page': '1',
                'limit': '20',
                'score': '85.5',
                'active': 'true',
                'metadata': '{"source": "api", "version": "1.0"}'
            }
            
            log_event(logger, 'info', 'processing_start', raw_data_keys=list(raw_data.keys()))
            
            # 3. 数据验证和转换
            processed_data = {}
            for key, value in raw_data.items():
                if key in ['page', 'limit']:
                    processed_data[key] = _safe_int(value)
                elif key == 'score':
                    processed_data[key] = _safe_float(value)
                elif key == 'active':
                    processed_data[key] = _safe_bool(value)
                elif key == 'metadata':
                    processed_data[key] = _maybe_json(value)
                else:
                    processed_data[key] = value
            
            log_event(logger, 'info', 'data_processed', 
                     processed_fields=len(processed_data),
                     sample_data={'page': processed_data.get('page')})
            
            # 4. 模拟HTTP请求处理
            request_count = 0
            def mock_api_request(headers: dict, payload: dict) -> Tuple[Optional[int], Optional[str], Optional[dict]]:
                nonlocal request_count
                request_count += 1
                
                # 模拟第一次请求失败，第二次成功
                if request_count == 1:
                    return 429, None, None  # 触发重试
                else:
                    return 200, 'auth_token', {
                        'status': 'success',
                        'data': processed_data,
                        'timestamp': time.time()
                    }
            
            # 5. 执行带重试的请求
            start_time = time.time()
            status, token, response = retry_handler.execute_with_retry(
                mock_api_request,
                {'User-Agent': 'integration-test'},
                processed_data,
                page=processed_data.get('page'),
                log_event=log_event
            )
            end_time = time.time()
            
            # 6. 验证最终结果
            assert status == 200
            assert token == 'auth_token'
            assert response['status'] == 'success'
            assert response['data'] == processed_data
            assert request_count == 2  # 重试了一次
            
            log_event(logger, 'info', 'processing_complete',
                     final_status=status,
                     retry_count=request_count,
                     total_duration=end_time - start_time)
            
            # 7. 验证日志记录
            log_file = os.path.join(temp_dir, 'integration_test.log')
            assert os.path.exists(log_file)
            
            with open(log_file, 'r', encoding='utf-8') as f:
                log_lines = f.readlines()
                assert len(log_lines) >= 4  # 至少有开始、处理、重试、完成日志
                
                # 验证关键事件都被记录
                events = []
                for line in log_lines:
                    log_data = json.loads(line.strip())
                    events.append(log_data.get('event'))
                
                assert 'processing_start' in events
                assert 'data_processed' in events
                assert 'processing_complete' in events

    def test_service_error_handling(self):
        """测试服务的错误处理能力"""
        with tempfile.TemporaryDirectory() as temp_dir:
            logger = get_json_logger('error_test', log_dir=temp_dir)
            
            # 测试数据验证的错误处理
            invalid_data = {
                'invalid_int': 'not_a_number',
                'invalid_float': 'not_a_float',
                'invalid_json': '{"incomplete": json'
            }
            
            results = {}
            for key, value in invalid_data.items():
                try:
                    if 'int' in key:
                        result = _safe_int(value)
                        results[key] = result
                    elif 'float' in key:
                        result = _safe_float(value)
                        results[key] = result
                    elif 'json' in key:
                        result = _maybe_json(value)
                        results[key] = result
                    
                    log_event(logger, 'info', 'error_handled',
                             field=key, input=value, output=str(result))
                except Exception as e:
                    log_event(logger, 'error', 'validation_error',
                             field=key, input=value, error=str(e))
            
            # 验证错误处理结果（应该返回默认值而不是抛出异常）
            assert results.get('invalid_int') is None  # _safe_int 返回 None
            assert results.get('invalid_float') is None  # _safe_float 返回 None
            assert results.get('invalid_json') is None  # _maybe_json 返回 None（无效JSON）

    def test_performance_monitoring(self):
        """测试性能监控集成"""
        with tempfile.TemporaryDirectory() as temp_dir:
            logger = get_json_logger('performance_test', log_dir=temp_dir)
            
            # 模拟性能监控
            def monitor_performance(operation_name: str, func, *args, **kwargs):
                start_time = time.time()
                try:
                    result = func(*args, **kwargs)
                    end_time = time.time()
                    duration = end_time - start_time
                    
                    log_event(logger, 'info', 'performance_metric',
                             operation=operation_name,
                             duration_ms=duration * 1000,
                             status='success')
                    return result
                except Exception as e:
                    end_time = time.time()
                    duration = end_time - start_time
                    
                    log_event(logger, 'error', 'performance_metric',
                             operation=operation_name,
                             duration_ms=duration * 1000,
                             status='error',
                             error=str(e))
                    raise
            
            # 测试各种操作的性能监控
            limiter = create_qps_limiter(qps=10, window_ms=1000)
            
            # 监控QPS限制器性能
            monitor_performance('qps_acquire', limiter.acquire)
            
            # 监控数据验证性能
            test_data = ['123', '45.67', 'true', '{"test": "data"}']
            for i, data in enumerate(test_data):
                if i == 0:
                    monitor_performance('safe_int', _safe_int, data)
                elif i == 1:
                    monitor_performance('safe_float', _safe_float, data)
                elif i == 2:
                    monitor_performance('safe_bool', _safe_bool, data)
                elif i == 3:
                    monitor_performance('maybe_json', _maybe_json, data)
            
            # 验证性能日志
            log_file = os.path.join(temp_dir, 'performance_test.log')
            assert os.path.exists(log_file)
            
            with open(log_file, 'r', encoding='utf-8') as f:
                log_lines = f.readlines()
                assert len(log_lines) >= 5  # 至少5个性能指标
                
                for line in log_lines:
                    log_data = json.loads(line.strip())
                    assert log_data['event'] == 'performance_metric'
                    assert 'operation' in log_data
                    assert 'duration_ms' in log_data
                    assert 'status' in log_data
                    assert log_data['duration_ms'] >= 0


if __name__ == '__main__':
    # 运行集成测试
    test_suite = TestServicesIntegration()
    
    print("=== 服务集成测试开始 ===")
    
    try:
        test_suite.test_data_validation_with_logging()
        print("✅ 数据验证与日志服务集成测试通过")
        
        test_suite.test_http_client_with_retry_handler()
        print("✅ HTTP客户端与重试处理服务集成测试通过")
        
        test_suite.test_qps_limiter_with_logging()
        print("✅ QPS限速器与日志服务集成测试通过")
        
        test_suite.test_task_orchestrator_integration()
        print("✅ 任务编排服务集成测试通过")
        
        test_suite.test_full_service_integration_scenario()
        print("✅ 完整服务集成场景测试通过")
        
        test_suite.test_service_error_handling()
        print("✅ 服务错误处理测试通过")
        
        test_suite.test_performance_monitoring()
        print("✅ 性能监控集成测试通过")
        
        print("\n=== 所有服务集成测试通过 ===")
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()