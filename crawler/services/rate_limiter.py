"""
限速器服务模块
提供统一的限速功能，包括时间窗口 QPS 限制器
"""
import time
from collections import deque
from threading import Lock
from typing import Optional


class TimeWindowQPSLimiter:
    """时间窗口 QPS 限速器
    
    使用滑动时间窗口来控制请求频率，确保在指定时间窗口内
    不超过设定的 QPS 限制。
    """
    
    def __init__(self, qps: int, window_ms: int = 1000):
        """初始化限速器
        
        Args:
            qps: 每秒允许的请求数
            window_ms: 时间窗口大小（毫秒）
        """
        self.qps = max(1, int(qps))
        self.window_ms = max(1, int(window_ms))
        self._lock = Lock()
        self._times = deque()

    def acquire(self):
        """获取请求许可
        
        如果当前时间窗口内的请求数已达到限制，
        则阻塞等待直到可以发送新请求。
        """
        # 使用循环避免递归导致的栈溢出
        while True:
            now = int(time.time() * 1000)
            with self._lock:
                # 清理窗口外的时间戳
                cutoff = now - self.window_ms
                while self._times and self._times[0] < cutoff:
                    self._times.popleft()
                
                if len(self._times) < self.qps:
                    self._times.append(now)
                    return
                
                # 需要等待到最早时间戳移出窗口
                wait_ms = self._times[0] + self.window_ms - now
            
            if wait_ms > 0:
                time.sleep(wait_ms / 1000.0)
            else:
                # 极端情况下（四舍五入为0ms），让出CPU避免忙循环
                time.sleep(0.001)

    def get_current_qps(self) -> float:
        """获取当前实际 QPS"""
        now = int(time.time() * 1000)
        with self._lock:
            # 清理窗口外的时间戳
            cutoff = now - self.window_ms
            while self._times and self._times[0] < cutoff:
                self._times.popleft()
            
            # 计算当前窗口内的请求数
            return len(self._times) * (1000.0 / self.window_ms)

    def reset(self):
        """重置限速器状态"""
        with self._lock:
            self._times.clear()


def create_qps_limiter(qps: int, window_ms: int = 1000) -> TimeWindowQPSLimiter:
    """创建 QPS 限速器的工厂函数
    
    Args:
        qps: 每秒允许的请求数
        window_ms: 时间窗口大小（毫秒）
        
    Returns:
        TimeWindowQPSLimiter 实例
    """
    return TimeWindowQPSLimiter(qps=qps, window_ms=window_ms)


def calculate_dynamic_sleep_ms(qps: int, floor_ms: int = 0) -> int:
    """根据 QPS 计算动态 sleep 时间
    
    Args:
        qps: 目标 QPS
        floor_ms: 最小 sleep 时间（毫秒）
        
    Returns:
        计算出的 sleep 时间（毫秒）
    """
    if qps <= 0:
        return floor_ms
    
    calculated_ms = int(1000.0 / qps)
    return max(floor_ms, calculated_ms)