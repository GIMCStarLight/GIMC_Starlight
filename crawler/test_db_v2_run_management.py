#!/usr/bin/env python3
"""测试 db_v2 的 run 管理功能"""

from services.db_v2 import DatabaseServiceV2


def test_create_run():
    """测试创建 run"""
    print("\n" + "="*60)
    print("测试1: 创建 run 记录")
    print("="*60)
    
    with DatabaseServiceV2() as db:
        run_id = db.create_run(
            first_label="测试",
            second_label="单元测试",
            second_ids=[1, 2, 3],
            video_type="1",
            page=1,
            limit=20,
            min_price=0,
            request_payload={"test": "data"}
        )
        
        assert run_id > 0
        print(f"✅ 创建 run 成功: {run_id}")
        
        # 验证 run 信息
        info = db.get_run_info(run_id)
        assert info is not None
        assert info['first_label'] == "测试"
        assert info['second_label'] == "单元测试"
        print(f"✅ run 信息验证通过")
        print(f"   - first_label: {info['first_label']}")
        print(f"   - second_label: {info['second_label']}")
        print(f"   - page: {info['page']}")
        print(f"   - limit: {info['limit']}")
        
        # 清理测试数据
        cur = db.conn.cursor()
        cur.execute("DELETE FROM author_square_runs WHERE id = %s", (run_id,))
        db.conn.commit()
        print(f"✅ 清理测试数据")


def test_update_run_status():
    """测试更新 run 状态"""
    print("\n" + "="*60)
    print("测试2: 更新 run 状态")
    print("="*60)
    
    with DatabaseServiceV2() as db:
        # 创建测试 run
        run_id = db.create_run(
            first_label="测试",
            second_label="状态更新",
            second_ids=[]
        )
        
        # 更新状态
        success = db.update_run_status(
            run_id=run_id,
            status='completed',
            total_authors=100,
            success_count=95,
            failed_count=5
        )
        
        assert success
        print(f"✅ 更新状态成功")
        
        # 验证更新
        info = db.get_run_info(run_id)
        assert info['status'] == 'completed'
        assert info['total_authors'] == 100
        assert info['success_count'] == 95
        assert info['failed_count'] == 5
        print(f"✅ 状态验证通过")
        print(f"   - status: {info['status']}")
        print(f"   - total_authors: {info['total_authors']}")
        print(f"   - success_count: {info['success_count']}")
        print(f"   - failed_count: {info['failed_count']}")
        
        # 清理
        cur = db.conn.cursor()
        cur.execute("DELETE FROM author_square_runs WHERE id = %s", (run_id,))
        db.conn.commit()
        print(f"✅ 清理测试数据")


def test_save_run_and_authors_v2():
    """测试兼容接口"""
    print("\n" + "="*60)
    print("测试3: 兼容接口 save_run_and_authors_v2")
    print("="*60)
    
    response = {
        'authors': [{
            'star_id': 'test_run_999',
            'attribute_datas': {
                'id': 'test_run_999',
                'nick_name': '测试作者Run',
                'follower': 100000,
                'star_index': 75.5,
                'city': '北京市',
                'province': '北京',
                'fans_increment_30d': 5000,
                'interact_rate_30d': 0.08,
                'price_20_60': 80000
            }
        }]
    }
    
    with DatabaseServiceV2() as db:
        run_id, success, failed = db.save_run_and_authors_v2(
            first_label="测试",
            second_label="兼容接口",
            second_ids=[],
            video_type="1",
            page=1,
            limit=20,
            min_price=0,
            x_tt_agw_login=None,
            request_payload={},
            response=response
        )
        
        assert run_id > 0
        assert success == 1
        assert failed == 0
        print(f"✅ 保存成功: run_id={run_id}, 成功={success}, 失败={failed}")
        
        # 验证 run 状态
        info = db.get_run_info(run_id)
        print(f"✅ Run 状态:")
        print(f"   - status: {info['status']}")
        print(f"   - total_authors: {info['total_authors']}")
        print(f"   - success_count: {info['success_count']}")
        print(f"   - failed_count: {info['failed_count']}")
        
        # 验证作者数据
        cur = db.conn.cursor()
        cur.execute("SELECT nick_name, follower FROM authors_core WHERE author_id = 'test_run_999'")
        author = cur.fetchone()
        if author:
            print(f"✅ 作者数据验证:")
            print(f"   - nick_name: {author[0]}")
            print(f"   - follower: {author[1]}")
        
        # 清理
        cur.execute("DELETE FROM authors_core WHERE author_id = 'test_run_999'")
        cur.execute("DELETE FROM author_square_runs WHERE id = %s", (run_id,))
        db.conn.commit()
        print(f"✅ 清理测试数据")


if __name__ == '__main__':
    print("\n" + "="*60)
    print("🧪 DatabaseServiceV2 Run 管理功能测试")
    print("="*60)
    
    try:
        test_create_run()
        test_update_run_status()
        test_save_run_and_authors_v2()
        
        print("\n" + "="*60)
        print("🎉 所有测试通过!")
        print("="*60)
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
