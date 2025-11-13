#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CSV数据清洗脚本
用途：清洗【社会化-内部】社会化达人资源总表，使其符合项目导入格式
保持文本内容语义不变，只做格式转换
"""

import csv
import re
import sys
from pathlib import Path


def clean_number(value):
    """
    清洗数字字段，移除千位分隔符、货币符号等
    例如：￥23,800 -> 23800
    """
    if not value or value == '-':
        return ''
    
    # 移除货币符号、逗号、空格
    cleaned = re.sub(r'[￥¥,\s]', '', str(value))
    
    # 如果是空或者只有符号，返回空
    if not cleaned or cleaned == '-':
        return ''
    
    return cleaned


def clean_boolean(value):
    """
    清洗布尔字段
    - -> 否
    """
    if not value or value == '-':
        return '否'
    return value


def clean_text(value):
    """
    清洗文本字段，保持语义不变
    - 移除首尾空格
    - 将 - 转为空字符串
    """
    if not value or value == '-':
        return ''
    return str(value).strip()


def map_column_names(row):
    """
    映射列名到项目标准格式
    """
    # 原始列名 -> 标准列名（支持多种可能的列名）
    column_mapping = {
        '序号': '_序号',  # 不导入
        '账号平台': '平台',
        '账号名称': '达人昵称',
        '账号ID': '账号',
        '主页链接': '主页链接',
        '主页链接\n': '主页链接',  # 处理换行
        '粉丝量(万)': '粉丝数(万)',
        '粉丝量\n（w）': '粉丝数(万)',  # 处理换行和不同格式
        '所属机构': '机构名称',
        '所属机构名': '机构名称',
        '达人类目': '类目',
        '账号类型/（如美妆/母婴/汽车等）': '类目',
        '星图报价21-60s': '星图报价21-60s',
        '星图报价21/60s': '星图报价21-60s',
        '星图报价60s+': '星图报价60s+',
        '是否独家': '是否独家',
        '达人属性（独家/非独家）': '是否独家',
        '返点政策': '返点政策',
        '返点范围': '返点范围',
        '返点区间': '返点范围',
        '政策等级': '政策等级',
        '返点周期': '返点周期',
        '返点账期': '返点周期',
        '结算周期': '结算周期',
        '支付账期': '结算周期',
        '备注': '备注',
    }
    
    mapped_row = {}
    for old_name, new_name in column_mapping.items():
        if old_name in row:
            mapped_row[new_name] = row[old_name]
    
    return mapped_row


def clean_row(row):
    """
    清洗单行数据
    """
    cleaned = {}
    
    # 平台
    cleaned['平台'] = clean_text(row.get('平台', ''))
    
    # 达人昵称
    cleaned['达人昵称'] = clean_text(row.get('达人昵称', ''))
    
    # 账号
    cleaned['账号'] = clean_text(row.get('账号', ''))
    
    # 主页链接
    cleaned['主页链接'] = clean_text(row.get('主页链接', ''))
    
    # 粉丝数(万) - 清洗数字
    cleaned['粉丝数(万)'] = clean_number(row.get('粉丝数(万)', ''))
    
    # 机构名称
    cleaned['机构名称'] = clean_text(row.get('机构名称', ''))
    
    # 类目
    cleaned['类目'] = clean_text(row.get('类目', ''))
    
    # 星图报价21-60s - 清洗数字
    cleaned['星图报价21-60s'] = clean_number(row.get('星图报价21-60s', ''))
    
    # 星图报价60s+ - 清洗数字
    cleaned['星图报价60s+'] = clean_number(row.get('星图报价60s+', ''))
    
    # 是否独家 - 清洗布尔值
    cleaned['是否独家'] = clean_boolean(row.get('是否独家', ''))
    
    # 返点政策 - 保持原文，不做语义修改
    cleaned['返点政策'] = clean_text(row.get('返点政策', ''))
    
    # 返点范围
    cleaned['返点范围'] = clean_text(row.get('返点范围', ''))
    
    # 政策等级
    cleaned['政策等级'] = clean_text(row.get('政策等级', ''))
    
    # 返点周期
    cleaned['返点周期'] = clean_text(row.get('返点周期', ''))
    
    # 结算周期
    cleaned['结算周期'] = clean_text(row.get('结算周期', ''))
    
    # 备注
    cleaned['备注'] = clean_text(row.get('备注', ''))
    
    return cleaned


def validate_row(row, row_num):
    """
    验证行数据的必填字段
    """
    errors = []
    
    # 必填字段
    # 注意：账号ID可以为空，因为有些达人可能没有账号ID
    # 账号ID为空时，保持为空，不要用达人昵称填充
    required_fields = ['达人昵称', '平台']
    
    for field in required_fields:
        if not row.get(field):
            errors.append(f"行{row_num}: {field}不能为空")
    
    # 移除了错误的逻辑：不再用达人昵称填充账号字段
    # 账号ID为空就保持为空
    
    return errors


def clean_csv_file(input_file, output_file):
    """
    清洗CSV文件
    """
    print(f"开始清洗文件: {input_file}")
    print(f"输出文件: {output_file}")
    
    input_path = Path(input_file)
    if not input_path.exists():
        print(f"错误: 输入文件不存在: {input_file}")
        return False
    
    total_rows = 0
    cleaned_rows = 0
    error_rows = 0
    all_errors = []
    
    try:
        # 读取原始文件
        with open(input_file, 'r', encoding='utf-8-sig') as infile:
            reader = csv.DictReader(infile)
            
            # 准备输出文件
            output_path = Path(output_file)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_file, 'w', encoding='utf-8-sig', newline='') as outfile:
                # 定义输出列
                fieldnames = [
                    '达人昵称', '平台', '账号', '主页链接', '粉丝数(万)',
                    '机构名称', '类目', '星图报价21-60s', '星图报价60s+',
                    '是否独家', '返点政策', '返点范围', '政策等级',
                    '返点周期', '结算周期', '备注'
                ]
                
                writer = csv.DictWriter(outfile, fieldnames=fieldnames)
                writer.writeheader()
                
                # 处理每一行
                for row_num, row in enumerate(reader, start=2):  # 从第2行开始（第1行是表头）
                    total_rows += 1
                    
                    # 映射列名
                    mapped_row = map_column_names(row)
                    
                    # 清洗数据
                    cleaned_row = clean_row(mapped_row)
                    
                    # 验证数据
                    errors = validate_row(cleaned_row, row_num)
                    if errors:
                        error_rows += 1
                        all_errors.extend(errors)
                        # 跳过有错误的行
                        continue
                    
                    # 写入清洗后的数据
                    writer.writerow(cleaned_row)
                    cleaned_rows += 1
                    
                    # 每1000行显示进度
                    if total_rows % 1000 == 0:
                        print(f"已处理 {total_rows} 行...")
        
        # 输出统计信息
        print("\n" + "="*60)
        print("清洗完成！")
        print("="*60)
        print(f"总行数: {total_rows}")
        print(f"成功清洗: {cleaned_rows} 行")
        print(f"错误行数: {error_rows} 行")
        print(f"成功率: {cleaned_rows/total_rows*100:.2f}%")
        
        # 显示错误信息（最多显示前10个）
        if all_errors:
            print("\n错误信息（前10个）:")
            for error in all_errors[:10]:
                print(f"  - {error}")
            if len(all_errors) > 10:
                print(f"  ... 还有 {len(all_errors)-10} 个错误")
        
        print(f"\n清洗后的文件已保存到: {output_file}")
        return True
        
    except Exception as e:
        print(f"错误: 清洗过程中出现异常: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """
    主函数
    """
    # 默认输入输出文件
    input_file = "【社会化-内部】社会化达人资源总表250603 - 抖音.csv"
    output_file = "私域达人导入模板_已清洗.csv"
    
    # 如果提供了命令行参数
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    if len(sys.argv) > 2:
        output_file = sys.argv[2]
    
    # 执行清洗
    success = clean_csv_file(input_file, output_file)
    
    if success:
        print("\n✅ 清洗成功！可以使用清洗后的文件进行导入。")
        sys.exit(0)
    else:
        print("\n❌ 清洗失败！请检查错误信息。")
        sys.exit(1)


if __name__ == "__main__":
    main()
