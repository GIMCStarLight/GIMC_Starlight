#!/usr/bin/env python3
"""
测试 DatabaseServiceV2
验证15表写入功能
"""

import json
from services.db_v2 import DatabaseServiceV2


def test_basic_save():
    """测试基本保存功能"""
    print("=" * 60)
    print("测试1: 基本保存功能")
    print("=" * 60)
    
    # 模拟API响应数据
    test_authors = [
        {
            "star_id": "test_001",
            "attribute_datas": {
                "id": "test_001",
                "nick_name": "测试达人1",
                "follower": "1000000",
                "star_index": "85.5",
                "city": "北京市",
                "province": "北京市",
                "gender": "1",
                "author_type": "1",
                "author_status": "1",
                "grade": "0",
                "core_user_id": "123456",
                "avatar_uri": "https://example.com/avatar.jpg",
                
                # 粉丝指标
                "fans_increment_within_15d": "5000",
                "fans_increment_rate_within_15d": "0.005",
                "fans_increment_within_30d": "12000",
                "fans_increment_rate_within_30d": "0.012",
                
                # 互动指标
                "interact_rate_within_30d": "0.05",
                "play_over_rate_within_30d": "0.15",
                "vv_median_30d": "500000",
                "interaction_median_30d": "25000",
                
                # 价格
                "price_1_20": "100000",
                "price_20_60": "150000",
                "price_60": "200000",
                "assign_cpm_suggest_price": "50",
                
                # 营销指数
                "link_convert_index": "85.5",
                "link_shopping_index": "78.3",
                "link_spread_index": "92.1",
                "link_star_index": "88.7",
                
                # 标签
                "tags_relation": '{"美妆":["美妆测评","护肤保养"]}',
                "content_theme_labels_180d": '["美妆教程","护肤技巧"]',
                
                # 电商
                "e_commerce_enable": "true",
                "author_ecom_level": "L5",
                "ecom_score": "88",
                
                # 星图视频（会写入 authors_star_videos_90d）
                "star_video_cnt_90d": "5",
                "star_video_interact_rate_90d": "0.08",
                "star_video_median_vv_90d": "800000",
                
                # 最近作品（会写入 authors_recent_works）
                "last_10_items": '[{"item_id":"123","vv":"100000"}]',
            }
        },
        {
            "star_id": "test_002",
            "attribute_datas": {
                "id": "test_002",
                "nick_name": "测试达人2",
                "follower": "500000",
                "star_index": "72.3",
                "city": "上海市",
                "province": "上海市",
                
                # 游戏数据（会写入 authors_game_data）
                "game_type": "手游",
                "game_item_count_90d": "3",
                
                # 工具垂直（会写入 authors_tool_vertical）
                "tool_item_count_90d": "2",
            }
        }
    ]
    
    try:
        with DatabaseServiceV2() as db:
            success, failed = db.save_authors_batch(
                run_id=9999,  # 测试run_id
                authors=test_authors
            )
            
            print(f"\n✅ 保存结果:")
            print(f"   成功: {success}")
            print(f"   失败: {failed}")
            
            # 验证数据
            cur = db.conn.cursor()
            
            # 检查各表数据
            tables = [
                'authors_core',
                'authors_fans_metrics',
                'authors_engagement_metrics',
                'authors_pricing',
                'authors_marketing_indices',
                'authors_content_tags',
                'authors_ecommerce',
                'authors_star_videos_90d',
                'authors_recent_works',
                'authors_game_data',
                'authors_tool_vertical',
                'authors_raw_archive'
            ]
            
            print(f"\n📊 各表记录数:")
            for table in tables:
                cur.execute(f"SELECT COUNT(*) FROM {table} WHERE author_id LIKE 'test_%'")
                count = cur.fetchone()[0]
                print(f"   {table}: {count}")
            
            # 查看详细数据
            print(f"\n📝 测试达人1详细信息:")
            cur.execute("""
                SELECT c.nick_name, c.follower, c.star_index, c.city,
                       f.fans_increment_30d, f.growth_level,
                       e.quality_tier, p.price_tier, m.marketing_tier
                FROM authors_core c
                LEFT JOIN authors_fans_metrics f ON c.author_id = f.author_id
                LEFT JOIN authors_engagement_metrics e ON c.author_id = e.author_id
                LEFT JOIN authors_pricing p ON c.author_id = p.author_id
                LEFT JOIN authors_marketing_indices m ON c.author_id = m.author_id
                WHERE c.author_id = 'test_001'
            """)
            row = cur.fetchone()
            if row:
                print(f"   昵称: {row[0]}")
                print(f"   粉丝: {row[1]}")
                print(f"   星图指数: {row[2]}")
                print(f"   城市: {row[3]}")
                print(f"   30天增长: {row[4]}")
                print(f"   增长等级: {row[5]}")
                print(f"   内容质量: {row[6]}")
                print(f"   价格等级: {row[7]}")
                print(f"   营销等级: {row[8]}")
            
            print(f"\n✅ 测试1通过!")
            return True
            
    except Exception as e:
        print(f"\n❌ 测试1失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_conditional_tables():
    """测试条件写入表"""
    print("\n" + "=" * 60)
    print("测试2: 条件写入表")
    print("=" * 60)
    
    test_authors = [
        {
            "star_id": "test_003",
            "attribute_datas": {
                "id": "test_003",
                "nick_name": "无额外数据达人",
                "follower": "100000",
                # 只有基础数据，没有星图视频、游戏等数据
            }
        }
    ]
    
    try:
        with DatabaseServiceV2() as db:
            success, failed = db.save_authors_batch(
                run_id=9999,
                authors=test_authors
            )
            
            print(f"\n✅ 保存结果: 成功 {success}, 失败 {failed}")
            
            # 验证条件表没有数据
            cur = db.conn.cursor()
            
            conditional_tables = {
                'authors_star_videos_90d': '星图视频',
                'authors_recent_works': '最近作品',
                'authors_game_data': '游戏数据',
                'authors_content_vertical': '内容垂直',
                'authors_tool_vertical': '工具垂直',
                'authors_brand_boost': '品牌提升'
            }
            
            print(f"\n📊 条件表检查:")
            for table, name in conditional_tables.items():
                cur.execute(f"SELECT COUNT(*) FROM {table} WHERE author_id = 'test_003'")
                count = cur.fetchone()[0]
                status = "❌ 未写入（正确）" if count == 0 else "✅ 已写入"
                print(f"   {name} ({table}): {status}")
            
            print(f"\n✅ 测试2通过!")
            return True
            
    except Exception as e:
        print(f"\n❌ 测试2失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_update_existing():
    """测试更新已存在的数据"""
    print("\n" + "=" * 60)
    print("测试3: 更新已存在数据")
    print("=" * 60)
    
    # 第一次保存
    test_authors_v1 = [{
        "star_id": "test_004",
        "attribute_datas": {
            "id": "test_004",
            "nick_name": "测试达人4_v1",
            "follower": "100000",
            "star_index": "70.0"
        }
    }]
    
    # 第二次保存（更新）
    test_authors_v2 = [{
        "star_id": "test_004",
        "attribute_datas": {
            "id": "test_004",
            "nick_name": "测试达人4_v2_更新",
            "follower": "150000",
            "star_index": "75.5"
        }
    }]
    
    try:
        with DatabaseServiceV2() as db:
            # 第一次保存
            print("\n第一次保存...")
            success1, failed1 = db.save_authors_batch(
                run_id=9999,
                authors=test_authors_v1
            )
            print(f"   结果: 成功 {success1}, 失败 {failed1}")
            
            # 查询第一次数据
            cur = db.conn.cursor()
            cur.execute("SELECT nick_name, follower, star_index FROM authors_core WHERE author_id = 'test_004'")
            row1 = cur.fetchone()
            print(f"   数据: {row1}")
            
            # 第二次保存（更新）
            print("\n第二次保存（更新）...")
            success2, failed2 = db.save_authors_batch(
                run_id=9999,
                authors=test_authors_v2
            )
            print(f"   结果: 成功 {success2}, 失败 {failed2}")
            
            # 查询更新后数据
            cur.execute("SELECT nick_name, follower, star_index FROM authors_core WHERE author_id = 'test_004'")
            row2 = cur.fetchone()
            print(f"   数据: {row2}")
            
            # 验证更新
            if row2[0] == "测试达人4_v2_更新" and row2[1] == 150000:
                print(f"\n✅ 数据更新成功!")
                print(f"   昵称: {row1[0]} → {row2[0]}")
                print(f"   粉丝: {row1[1]} → {row2[1]}")
                print(f"   指数: {row1[2]} → {row2[2]}")
            else:
                print(f"\n❌ 数据更新失败!")
                return False
            
            print(f"\n✅ 测试3通过!")
            return True
            
    except Exception as e:
        print(f"\n❌ 测试3失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def cleanup_test_data():
    """清理测试数据"""
    print("\n" + "=" * 60)
    print("清理测试数据")
    print("=" * 60)
    
    try:
        with DatabaseServiceV2() as db:
            cur = db.conn.cursor()
            
            # 删除测试数据（cascade会自动删除关联表）
            cur.execute("DELETE FROM authors_core WHERE author_id LIKE 'test_%'")
            deleted = cur.rowcount
            
            # 删除测试归档数据
            cur.execute("DELETE FROM authors_raw_archive WHERE author_id LIKE 'test_%'")
            
            db.conn.commit()
            
            print(f"\n✅ 已删除 {deleted} 条测试数据")
            return True
            
    except Exception as e:
        print(f"\n❌ 清理失败: {e}")
        return False


def main():
    """运行所有测试"""
    print("\n" + "=" * 60)
    print("🧪 DatabaseServiceV2 测试套件")
    print("=" * 60)
    
    results = []
    
    # 运行测试
    results.append(("基本保存功能", test_basic_save()))
    results.append(("条件写入表", test_conditional_tables()))
    results.append(("更新已存在数据", test_update_existing()))
    
    # 清理测试数据
    cleanup_test_data()
    
    # 输出结果
    print("\n" + "=" * 60)
    print("📊 测试结果汇总")
    print("=" * 60)
    
    for name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"{status} - {name}")
    
    all_passed = all(result for _, result in results)
    
    if all_passed:
        print("\n🎉 所有测试通过!")
    else:
        print("\n⚠️  部分测试失败，请检查错误信息")
    
    return all_passed


if __name__ == '__main__':
    import sys
    success = main()
    sys.exit(0 if success else 1)
