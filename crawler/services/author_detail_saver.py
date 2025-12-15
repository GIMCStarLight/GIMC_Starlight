#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
达人详情数据入库服务
复用现有 DatabaseServiceV2 架构，专门处理 get_author_base_info 和 get_author_platform_channel_info_v2 数据
"""

import psycopg2
import psycopg2.extras
from typing import Dict, Optional, List
from datetime import datetime


class AuthorDetailSaver:
    """达人详情数据持久化器
    
    负责将 AuthorInfoClient 抓取的数据写入 authors_core 表的新增字段
    """
    
    def __init__(self, db_config: Optional[Dict] = None):
        """初始化数据库连接
        
        Args:
            db_config: 数据库配置，如果为None则使用默认配置
        """
        self.db_config = db_config or {
            'host': '192.168.102.168',
            'port': 5432,
            'database': 'crawler_db_v2',
            'user': 'postgres',
            'password': 'postgres'
        }
        self.conn = None
    
    def connect(self):
        """建立数据库连接"""
        if not self.conn or self.conn.closed:
            self.conn = psycopg2.connect(**self.db_config)
            self.conn.autocommit = False
    
    def close(self):
        """关闭数据库连接"""
        if self.conn and not self.conn.closed:
            self.conn.close()
    
    def save_author_detail(self, author_data: Dict) -> bool:
        """保存单个达人详情数据
        
        Args:
            author_data: 达人数据字典（由 AuthorInfoClient.get_complete_info 返回）
        
        Returns:
            是否保存成功
        """
        try:
            self.connect()
            cur = self.conn.cursor()
            
            # 提取字段
            author_id = author_data.get('author_id')
            if not author_id:
                print(f"[warn] 缺少 author_id，跳过保存")
                return False
            
            # UPSERT 操作：以 author_id 为主键更新
            sql = """
                INSERT INTO authors_core (
                    author_id, star_id, nick_name, avatar_uri, 
                    follower, gender, city, province,
                    unique_id, sec_uid, short_id, 
                    has_phone, mcn_name, platform, platform_channel, self_intro,
                    core_user_id, updated_at, last_crawled_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                ON CONFLICT (author_id) DO UPDATE SET
                    nick_name = EXCLUDED.nick_name,
                    avatar_uri = EXCLUDED.avatar_uri,
                    follower = EXCLUDED.follower,
                    gender = EXCLUDED.gender,
                    city = EXCLUDED.city,
                    province = EXCLUDED.province,
                    unique_id = EXCLUDED.unique_id,
                    sec_uid = EXCLUDED.sec_uid,
                    short_id = EXCLUDED.short_id,
                    has_phone = EXCLUDED.has_phone,
                    mcn_name = EXCLUDED.mcn_name,
                    platform = EXCLUDED.platform,
                    platform_channel = EXCLUDED.platform_channel,
                    self_intro = EXCLUDED.self_intro,
                    core_user_id = EXCLUDED.core_user_id,
                    updated_at = NOW(),
                    last_crawled_at = NOW()
            """
            
            cur.execute(sql, (
                author_id,
                author_id,  # star_id = author_id
                author_data.get('nick_name'),
                author_data.get('avatar_uri'),
                author_data.get('follower', 0),
                author_data.get('gender'),
                author_data.get('city'),
                author_data.get('province'),
                author_data.get('unique_id'),
                author_data.get('sec_uid'),
                author_data.get('short_id'),
                author_data.get('has_phone', False),
                author_data.get('mcn_name'),
                author_data.get('platform'),  # 数组类型
                author_data.get('platform_channel'),  # 数组类型
                author_data.get('self_intro'),
                author_data.get('core_user_id')
            ))
            
            self.conn.commit()
            cur.close()
            return True
            
        except Exception as e:
            if self.conn:
                self.conn.rollback()
            print(f"[error] 保存达人 {author_data.get('author_id')} 失败: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def batch_save(self, author_list: List[Dict]) -> tuple:
        """批量保存达人数据
        
        Args:
            author_list: 达人数据列表
        
        Returns:
            (成功数, 失败数)
        """
        success_count = 0
        failed_count = 0
        
        for author_data in author_list:
            if self.save_author_detail(author_data):
                success_count += 1
            else:
                failed_count += 1
        
        return success_count, failed_count
    
    def save_from_json_file(self, json_path: str) -> bool:
        """从JSON文件读取并保存
        
        Args:
            json_path: JSON文件路径
        
        Returns:
            是否保存成功
        """
        import json
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                author_data = json.load(f)
            return self.save_author_detail(author_data)
        except Exception as e:
            print(f"[error] 从文件 {json_path} 保存失败: {e}")
            return False


def main():
    """测试示例"""
    saver = AuthorDetailSaver()
    
    # 测试单个保存
    test_data = {
        "author_id": "6629722292110753806",
        "nick_name": "陈翔六点半",
        "follower": 57259062,
        "unique_id": "cxldb001",
        "self_intro": "擅长将客户的诉求以剧情推动方式定制推广方案，以幽默风趣的手法促进品牌认知和传播。",
        "has_phone": True,
        "platform": [1, 2, 3, 5],
        "platform_channel": [21, 2, 1, 10, 3]
    }
    
    success = saver.save_author_detail(test_data)
    print(f"保存结果: {'成功' if success else '失败'}")
    
    saver.close()


if __name__ == "__main__":
    main()
