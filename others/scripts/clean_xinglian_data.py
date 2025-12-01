#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
清洗星链达人ID数据
提取昵称和主页链接中的ID
"""

import csv
import re
from urllib.parse import urlparse


def extract_id_from_url(url):
    """
    从不同平台的URL中提取ID
    
    支持的平台：
    - 抖音星图 (xingtu.cn)
    - B站花火 (bilibili.com)
    - 小红书蒲公英 (xiaohongshu.com)
    """
    if not url or url.strip() == '':
        return ''
    
    url = url.strip()
    
    # 抖音星图: https://www.xingtu.cn/ad/creator/author-homepage/douyin-video/6794751155218939912?...
    if 'xingtu.cn' in url:
        match = re.search(r'/douyin-video/(\d+)', url)
        if match:
            return match.group(1)
    
    # B站花火: https://huahuo.bilibili.com/#/upper/page/497525820?...
    elif 'bilibili.com' in url:
        match = re.search(r'/upper/page/(\d+)', url)
        if match:
            return match.group(1)
    
    # 小红书蒲公英: https://pgy.xiaohongshu.com/solar/pre-trade/blogger-detail/5928f62c50c4b417b0feead6?...
    elif 'xiaohongshu.com' in url:
        match = re.search(r'/blogger-detail/([a-f0-9]+)', url)
        if match:
            return match.group(1)
    
    return ''


def clean_data(input_file, output_file):
    """
    清洗数据并输出到新文件
    """
    cleaned_data = []
    
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        
        # 跳过表头
        header = next(reader)
        
        for row in reader:
            if len(row) < 2:
                continue
            
            nickname = row[0].strip()
            url = row[1].strip() if len(row) > 1 else ''
            
            # 跳过空行
            if not nickname and not url:
                continue
            
            # 提取ID
            user_id = extract_id_from_url(url)
            
            # 判断平台类型
            platform = ''
            if url:
                if 'xingtu.cn' in url:
                    platform = '抖音星图'
                elif 'bilibili.com' in url:
                    platform = 'B站花火'
                elif 'xiaohongshu.com' in url:
                    platform = '小红书蒲公英'
            
            cleaned_data.append({
                '昵称': nickname,
                '平台': platform,
                '用户ID': user_id,
                '原始链接': url
            })
    
    # 写入清洗后的数据
    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        fieldnames = ['昵称', '平台', '用户ID', '原始链接']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        
        writer.writeheader()
        writer.writerows(cleaned_data)
    
    return cleaned_data


if __name__ == '__main__':
    input_file = '/Users/samuel/Desktop/系统开发/others/data/星链达人ID.csv'
    output_file = '/Users/samuel/Desktop/系统开发/others/data/星链达人ID_已清洗.csv'
    
    print('开始清洗数据...')
    cleaned_data = clean_data(input_file, output_file)
    
    print(f'\n清洗完成！')
    print(f'总计处理: {len(cleaned_data)} 条数据')
    print(f'输出文件: {output_file}')
    
    # 统计信息
    total = len(cleaned_data)
    with_id = sum(1 for item in cleaned_data if item['用户ID'])
    without_id = total - with_id
    
    print(f'\n统计信息:')
    print(f'- 成功提取ID: {with_id} 条')
    print(f'- 未提取到ID: {without_id} 条')
    
    # 按平台统计
    platforms = {}
    for item in cleaned_data:
        platform = item['平台'] if item['平台'] else '未知平台'
        platforms[platform] = platforms.get(platform, 0) + 1
    
    print(f'\n平台分布:')
    for platform, count in sorted(platforms.items(), key=lambda x: x[1], reverse=True):
        print(f'- {platform}: {count} 条')
    
    # 显示前几条示例
    print(f'\n前5条数据示例:')
    for i, item in enumerate(cleaned_data[:5], 1):
        print(f"{i}. 昵称: {item['昵称']}, 平台: {item['平台']}, ID: {item['用户ID']}")
