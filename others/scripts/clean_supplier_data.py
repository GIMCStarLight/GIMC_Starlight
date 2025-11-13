#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
供应商数据清洗脚本
清洗CSV文件中的供应商数据，使其能够导入数据库

主要处理：
1. 处理双行表头
2. 整合平台字段（将多个平台勾选列合并为一个字段）
3. 清理空值和格式
"""

import pandas as pd
import json
import re
from pathlib import Path


def clean_supplier_csv(input_file: str, output_file: str | None = None):
    """
    清洗供应商CSV数据
    
    Args:
        input_file: 输入CSV文件路径
        output_file: 输出CSV文件路径（可选，默认为input_file_cleaned.csv）
    """
    
    # 读取CSV文件，不使用表头
    df_raw = pd.read_csv(input_file, encoding='utf-8', header=None)
    
    print(f"原始数据行数: {len(df_raw)}")
    print(f"原始数据列数: {len(df_raw.columns)}")
    
    # 获取表头信息（第0行和第1行）
    header_row1 = df_raw.iloc[0].values
    header_row2 = df_raw.iloc[1].values
    
    # 数据从第2行开始
    data_rows = df_raw.iloc[2:]
    
    # 初始化清洗后的数据字典
    cleaned_data = {
        # 基本信息
        'supplier_full_name': [],
        'agency_name': [],
        'supplier_type': [],
        'supplier_description': [],
        
        # 政策与财务
        'current_policy_gradient': [],
        'tax_rate_percent': [],
        'payment_term': [],
        'settlement_method': [],
        'billing_entity': [],
        
        # 年度政策
        'policy_2024_gradient': [],
        'cooperation_mode_2024': [],
        'policy_2025_gradient': [],
        'cooperation_mode_2025': [],
        
        # 联系人信息
        'primary_contact_name': [],
        'primary_contact_title': [],
        'primary_contact_email': [],
        'primary_contact_phone_wechat': [],
        'secondary_contact_name': [],
        'secondary_contact_title': [],
        'secondary_contact_phone_wechat': [],
        
        # 合同信息
        'contract_start_date': [],
        'contract_end_date': [],
        'contract_status': [],
        'contract_notes': [],
        'contract_follow_up_person': [],
        
        # 资源信息
        'resource_type': [],
        'resource_attribute': [],
        'main_platform': [],  # 将所有平台整合到这个字段
        'is_proxy_order': [],
        'proxy_order_fee': [],
    }
    
    # 定义列索引映射
    col_map = {
        'supplier_full_name': 1,
        'agency_name': 2,
        'supplier_type': 3,
        'current_policy_gradient': 4,
        'billing_content': 5,
        'billing_info': 6,
        'policy_2024_signed': 7,
        'policy_2024_current': 8,
        'policy_2025_signed': 9,
        'policy_2025_current': 10,
        'cumulative_2024': 11,
        'contract_cumulative_2024': 12,
        'cumulative_2025': 13,
        'contract_cumulative_2025': 14,
        'pre_contract_amount': 15,
        'tax_rate': 16,
        'rebate_term': 17,
        'payment_term': 18,
        'is_proxy_order': 19,
        'proxy_fee': 20,
        'primary_contact_name': 21,
        'primary_contact_title': 22,
        'primary_contact_email': 23,
        'primary_contact_phone': 24,
        'secondary_contact_name': 25,
        'secondary_contact_title': 26,
        'secondary_contact_phone': 27,
        'contract_start': 28,
        'contract_end': 29,
        'contract_expire': 30,
        'contract_progress': 31,
        'contract_notes': 32,
        'contract_time': 33,
        'contract_follow_up': 34,
        'double_seal_contract': 35,
        'resource_type': 36,
        'resource_attribute': 37,
        'platform_header': 38,  # "可合作平台"列
        'platform_douyin': 39,
        'platform_xiaohongshu': 40,
        'platform_wechat_gzh': 41,
        'platform_wechat_sph': 42,
        'platform_weibo': 43,
        'platform_bilibili': 44,
        'platform_zhihu': 45,
        'platform_kuaishou': 46,
        'platform_dongchedi': 47,
        'platform_other': 48,
        'supplier_description': 49,
    }
    
    # 平台映射
    platform_mapping = {
        39: '抖音',
        40: '小红书',
        41: '微信公众号',
        42: '微信视频号',
        43: '微博',
        44: 'B站',
        45: '知乎',
        46: '快手',
        47: '懂车帝',
        48: '其他',  # 如果有值则直接使用该值作为平台名
    }
    
    def safe_get(row, col_idx, default=None):
        """安全获取列值"""
        try:
            if col_idx >= len(row):
                return default
            val = row.iloc[col_idx]
            if pd.isna(val) or str(val).strip() in ['nan', '', '/', 'NaN']:
                return default
            return str(val).strip()
        except:
            return default
    
    def is_checked(value):
        """判断是否勾选"""
        if not value:
            return False
        return value in ['√', '✓', 'v', 'V', 'yes', 'Yes', 'YES', '是', 'true', 'True']
    
    # 遍历每一行数据
    for idx, row in data_rows.iterrows():
        # 跳过空行（供应商全称为空）
        supplier_name = safe_get(row, col_map['supplier_full_name'])
        if not supplier_name:
            continue
        
        # 基本信息
        cleaned_data['supplier_full_name'].append(supplier_name)
        cleaned_data['agency_name'].append(safe_get(row, col_map['agency_name']))
        cleaned_data['supplier_type'].append(safe_get(row, col_map['supplier_type']))
        cleaned_data['supplier_description'].append(safe_get(row, col_map['supplier_description']))
        
        # 政策与财务
        cleaned_data['current_policy_gradient'].append(safe_get(row, col_map['current_policy_gradient']))
        cleaned_data['billing_entity'].append(safe_get(row, col_map['billing_content']))
        
        # 税率
        tax_rate = safe_get(row, col_map['tax_rate'])
        if tax_rate:
            try:
                cleaned_data['tax_rate_percent'].append(float(tax_rate))
            except:
                cleaned_data['tax_rate_percent'].append(None)
        else:
            cleaned_data['tax_rate_percent'].append(None)
        
        # 账期（合并返点账期和支付账期）
        rebate_term = safe_get(row, col_map['rebate_term'])
        payment_term = safe_get(row, col_map['payment_term'])
        terms = []
        if rebate_term:
            terms.append(f"返点账期:{rebate_term}")
        if payment_term:
            terms.append(f"支付账期:{payment_term}")
        cleaned_data['payment_term'].append("; ".join(terms) if terms else None)
        
        # 结算方式（暂时为空）
        cleaned_data['settlement_method'].append(None)
        
        # 2024年政策
        policy_2024_signed = safe_get(row, col_map['policy_2024_signed'])
        policy_2024_current = safe_get(row, col_map['policy_2024_current'])
        cleaned_data['policy_2024_gradient'].append(policy_2024_signed)
        cleaned_data['cooperation_mode_2024'].append(policy_2024_current)
        
        # 2025年政策
        policy_2025_signed = safe_get(row, col_map['policy_2025_signed'])
        policy_2025_current = safe_get(row, col_map['policy_2025_current'])
        cleaned_data['policy_2025_gradient'].append(policy_2025_signed)
        cleaned_data['cooperation_mode_2025'].append(policy_2025_current)
        
        # 联系人信息
        cleaned_data['primary_contact_name'].append(safe_get(row, col_map['primary_contact_name']))
        cleaned_data['primary_contact_title'].append(safe_get(row, col_map['primary_contact_title']))
        cleaned_data['primary_contact_email'].append(safe_get(row, col_map['primary_contact_email']))
        cleaned_data['primary_contact_phone_wechat'].append(safe_get(row, col_map['primary_contact_phone']))
        
        cleaned_data['secondary_contact_name'].append(safe_get(row, col_map['secondary_contact_name']))
        cleaned_data['secondary_contact_title'].append(safe_get(row, col_map['secondary_contact_title']))
        cleaned_data['secondary_contact_phone_wechat'].append(safe_get(row, col_map['secondary_contact_phone']))
        
        # 合同信息
        cleaned_data['contract_start_date'].append(safe_get(row, col_map['contract_start']))
        cleaned_data['contract_end_date'].append(safe_get(row, col_map['contract_end']))
        cleaned_data['contract_status'].append(safe_get(row, col_map['contract_progress']))
        cleaned_data['contract_notes'].append(safe_get(row, col_map['contract_notes']))
        cleaned_data['contract_follow_up_person'].append(safe_get(row, col_map['contract_follow_up']))
        
        # 资源信息
        cleaned_data['resource_type'].append(safe_get(row, col_map['resource_type']))
        cleaned_data['resource_attribute'].append(safe_get(row, col_map['resource_attribute']))
        
        # 处理平台信息
        platforms = []
        for col_idx, platform_name in platform_mapping.items():
            cell_value = safe_get(row, col_idx)
            if col_idx == 48:  # "其他"列
                if cell_value:
                    platforms.append(cell_value)  # 直接使用填写的平台名
            else:
                if is_checked(cell_value):
                    platforms.append(platform_name)
        
        cleaned_data['main_platform'].append(','.join(platforms) if platforms else None)
        
        # 是否代下单
        is_proxy = safe_get(row, col_map['is_proxy_order'])
        cleaned_data['is_proxy_order'].append(is_proxy == '是' if is_proxy else None)
        
        # 代下单服务费
        cleaned_data['proxy_order_fee'].append(safe_get(row, col_map['proxy_fee']))
    
    # 创建清洗后的DataFrame
    cleaned_df = pd.DataFrame(cleaned_data)
    
    print(f"\n清洗后数据行数: {len(cleaned_df)}")
    print(f"清洗后数据列数: {len(cleaned_df.columns)}")
    
    # 输出文件路径
    if output_file is None:
        input_path = Path(input_file)
        output_file = str(input_path.parent / f"{input_path.stem}_cleaned.csv")
    
    # 保存清洗后的数据
    cleaned_df.to_csv(output_file, index=False, encoding='utf-8')
    print(f"\n清洗后的数据已保存到: {output_file}")
    
    # 打印一些统计信息
    print("\n数据统计:")
    print(f"- 总供应商数: {len(cleaned_df)}")
    print(f"- 有平台信息的供应商: {cleaned_df['main_platform'].notna().sum()}")
    print(f"- 有合同信息的供应商: {cleaned_df['contract_start_date'].notna().sum()}")
    proxy_count = int(cleaned_df['is_proxy_order'].sum()) if cleaned_df['is_proxy_order'].notna().sum() > 0 else 0
    print(f"- 代下单供应商: {proxy_count}")
    
    # 打印平台分布
    print("\n平台分布:")
    platform_counts = {}
    for platforms_str in cleaned_df['main_platform'].dropna():
        for platform in platforms_str.split(','):
            platform = platform.strip()
            if platform:
                platform_counts[platform] = platform_counts.get(platform, 0) + 1
    
    for platform, count in sorted(platform_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  {platform}: {count}")
    
    # 打印前3条记录示例
    print("\n前3条记录示例:")
    print(cleaned_df.head(3).to_string())
    
    return cleaned_df


if __name__ == '__main__':
    import sys
    
    # 默认输入文件路径
    default_input = '/Users/samuel/Desktop/爬虫方案/爬虫工程化开发/供应商数据.csv'
    
    # 如果提供了命令行参数，使用参数作为输入文件
    input_file = sys.argv[1] if len(sys.argv) > 1 else default_input
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    try:
        clean_supplier_csv(input_file, output_file)
    except Exception as e:
        print(f"错误: {e}")
        import traceback
        traceback.print_exc()
