"""
自适应QPS策略服务

提供基于任务执行结果的动态QPS调整功能：
- 失败时快速降级（指数退避）
- 成功时缓慢升级（冷却时间）
"""

from dataclasses import dataclass
import math
import time


@dataclass
class AdaptiveQpsConfig:
    """自适应QPS配置"""
    min_qps: float = 0.1  # 支持小数，最小0.1
    max_qps: float = 2.0
    step: float = 0.5  # 支持小数步长
    backoff_base: float = 0.7
    backoff_max_power: int = 3
    success_needed: int = 3
    upgrade_cooldown_sec: int = 300
    failure_rate_threshold: float = 0.2


class AdaptiveQpsPolicy:
    """自适应QPS策略
    
    基于任务执行结果动态调整QPS：
    - 失败时通过指数退避快速降级
    - 连续成功时带冷却时间的缓慢升级
    """

    def __init__(self, current_qps: float, config: AdaptiveQpsConfig):
        self.current_qps = float(max(0.1, current_qps))  # 支持最小0.1 QPS
        self.cfg = config
        self.success_streak = 0
        self.failure_streak = 0
        self.last_upgrade_ts = 0.0

    def adjust(self, pages_done: int, failed_pages: int, authors_total: int) -> float:
        """根据执行结果调整QPS
        
        Args:
            pages_done: 已完成页面数
            failed_pages: 失败页面数
            authors_total: 获取到的作者总数
            
        Returns:
            调整后的QPS值
        """
        pages_done = max(1, int(pages_done))
        failed_pages = int(failed_pages)
        authors_total = int(authors_total)

        fail_rate = failed_pages / float(pages_done)
        fr_threshold = float(self.cfg.failure_rate_threshold)
        now_ts = time.time()

        qps_min = max(0.1, float(self.cfg.min_qps))  # 支持小数
        qps_max = max(qps_min, float(self.cfg.max_qps))
        qps_step = max(0.1, float(self.cfg.step))
        backoff_base = float(self.cfg.backoff_base)
        max_power = max(1, int(self.cfg.backoff_max_power))
        success_needed = max(1, int(self.cfg.success_needed))
        upgrade_cooldown_sec = max(0, int(self.cfg.upgrade_cooldown_sec))

        is_failure_event = (authors_total == 0) or (fail_rate >= fr_threshold)

        if is_failure_event:
            # 失败事件：指数退避，根据严重程度调整
            self.failure_streak += 1
            self.success_streak = 0
            ratio = (fail_rate / fr_threshold) if fr_threshold > 0 else 0.0
            if authors_total == 0 or ratio >= 2.0:
                severity_level = 2
            elif ratio >= 1.5:
                severity_level = 1
            elif ratio >= 1.0:
                severity_level = 0
            else:
                severity_level = 0

            power = min(max_power, self.failure_streak + severity_level)
            target_backoff = float(self.current_qps) * (backoff_base ** power)
            step_backoff = self.current_qps - qps_step
            new_qps = max(qps_min, min(target_backoff, step_backoff))
            if new_qps < self.current_qps:
                print(
                    f"[adaptive-qps] fail_rate={fail_rate:.2f} threshold={fr_threshold:.2f} streak={self.failure_streak} severity={severity_level} backoff_base={backoff_base} => next_qps={new_qps:.2f}"
                )
                self.current_qps = new_qps
            else:
                self.current_qps = max(qps_min, self.current_qps)
        else:
            # 成功事件：带冷却时间的缓慢升级
            self.failure_streak = 0
            self.success_streak += 1
            can_upgrade = (self.success_streak >= success_needed) and (
                (self.last_upgrade_ts == 0.0) or ((now_ts - self.last_upgrade_ts) >= upgrade_cooldown_sec)
            )
            next_qps = min(qps_max, self.current_qps + (qps_step if can_upgrade else 0))
            if can_upgrade and next_qps > self.current_qps:
                print(
                    f"[adaptive-qps] success_streak={self.success_streak} upgrade_cooldown={upgrade_cooldown_sec}s => next_qps={next_qps:.2f}"
                )
                self.current_qps = next_qps
                self.last_upgrade_ts = now_ts
                self.success_streak = 0
            else:
                self.current_qps = next_qps

        return float(self.current_qps)


def create_adaptive_qps_policy(current_qps: float = 2.0, config: AdaptiveQpsConfig = None) -> AdaptiveQpsPolicy:
    """创建自适应QPS策略实例
    
    Args:
        current_qps: 初始QPS值
        config: 自适应QPS配置，如果为None则使用默认配置
        
    Returns:
        AdaptiveQpsPolicy实例
    """
    if config is None:
        config = AdaptiveQpsConfig()
    return AdaptiveQpsPolicy(current_qps, config)


def create_qps_config(
    min_qps: float = 0.1,
    max_qps: float = 2.0,
    step: float = 0.5,
    backoff_base: float = 0.7,
    backoff_max_power: int = 3,
    success_needed: int = 3,
    upgrade_cooldown_sec: int = 300,
    failure_rate_threshold: float = 0.2
) -> AdaptiveQpsConfig:
    """创建QPS配置
    
    Args:
        min_qps: 最小QPS（支持小数）
        max_qps: 最大QPS（支持小数）
        step: QPS调整步长（支持小数）
        backoff_base: 退避基数
        backoff_max_power: 最大退避幂次
        success_needed: 升级所需连续成功次数
        upgrade_cooldown_sec: 升级冷却时间（秒）
        failure_rate_threshold: 失败率阈值
        
    Returns:
        AdaptiveQpsConfig实例
    """
    return AdaptiveQpsConfig(
        min_qps=min_qps,
        max_qps=max_qps,
        step=step,
        backoff_base=backoff_base,
        backoff_max_power=backoff_max_power,
        success_needed=success_needed,
        upgrade_cooldown_sec=upgrade_cooldown_sec,
        failure_rate_threshold=failure_rate_threshold
    )