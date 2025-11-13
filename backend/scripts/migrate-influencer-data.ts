import { DataSource, DataSourceOptions } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

/**
 * 达人数据迁移脚本
 * 将MySQL的daoren_author数据同步到PostgreSQL的influencer_authors表
 */

interface DaorenAuthor {
  star_id: string;
  nick_name: string;
  core_user_id?: string;
  avatar_uri?: string;
  gender?: number;
  city?: string;
  province?: string;
  author_type?: number;
  author_status?: number;
  grade?: number;
  follower?: number;
  fans_increment_within_15d?: number;
  fans_increment_within_30d?: number;
  fans_increment_rate_within_15d?: number;
  interact_rate_within_30d?: number;
  interaction_median_30d?: number;
  play_over_rate_within_30d?: number;
  vv_median_30d?: number;
  star_item_count_within_30d?: number;
  star_video_cnt_90d?: number;
  star_video_interact_rate_90d?: number;
  star_video_finish_vv_rate_90d?: number;
  star_video_median_vv_90d?: number;
  content_theme_labels_180d?: string;
  tags_relation?: string;
  price_1_20?: number;
  price_20_60?: number;
  price_60?: number;
  assign_task_price_list?: string;
  expected_play_num?: number;
  expected_natural_play_num?: number;
  star_index?: number;
  prospective_1_20_cpm?: number;
  prospective_20_60_cpm?: number;
  prospective_60_cpm?: number;
  promotion_prospective_1_20_cpm?: number;
  promotion_prospective_20_60_cpm?: number;
  promotion_prospective_60_cpm?: number;
  promotion_prospective_vv?: number;
  e_commerce_enable?: number;
  author_ecom_level?: string;
  ecom_gmv_30d_range?: string;
  ecom_avg_order_value_30d_range?: string;
  ecom_gpm_30d_range?: string;
  ecom_video_product_num_30d?: number;
  star_ecom_video_num_30d?: number;
  link_convert_index?: number;
  link_convert_index_by_industry?: number;
  link_shopping_index?: number;
  link_spread_index?: number;
  link_spread_index_by_industry?: number;
  link_star_index?: number;
  link_star_index_by_industry?: number;
  link_recommend_index_by_industry?: number;
  search_after_view_index_by_industry?: number;
  is_excellenct_author?: number;
  star_excellent_author?: number;
  author_avatar_frame_icon?: string;
  is_black_horse_author?: number;
  is_cocreate_author?: number;
  is_cpm_project_author?: number;
  is_short_drama?: number;
  star_whispers_author?: number;
  local_lower_threshold_author?: number;
  burst_text_rate?: number;
  brand_boost_vv?: number;
  video_brand_boost?: number;
  video_brand_boost_vv?: number;
  expected_cpa3_level?: number;
  game_type?: string;
  star_component_install_finish_cnt_90d?: number;
  star_component_link_click_cnt_90d?: number;
  star_video_install_ge_1_cnt_90d?: number;
  last_10_items?: string;
  items?: string;
  task_infos?: string;
  crawled_at: Date;
  page_num?: number;
  source_url?: string;
  created_at?: Date;
  updated_at?: Date;
}

/**
 * 创建influencer_authors表结构
 */
async function createInfluencerAuthorsTable(dataSource: DataSource) {
  const queryRunner = dataSource.createQueryRunner();
  
  try {
    // 检查表是否存在
    const tableExists = await queryRunner.hasTable('influencer_authors');
    
    if (tableExists) {
      console.log('✅ influencer_authors表已存在');
      return;
    }

    console.log('🔨 创建influencer_authors表...');
    
    // 创建表的SQL语句
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS influencer_authors (
        star_id BIGINT PRIMARY KEY,
        nick_name VARCHAR(500) NOT NULL,
        core_user_id VARCHAR(200),
        avatar_uri TEXT,
        gender SMALLINT,
        city VARCHAR(200),
        province VARCHAR(200),
        author_type SMALLINT,
        account_status SMALLINT,
        author_level SMALLINT DEFAULT 0,
        follower BIGINT DEFAULT 0,
        fans_increment_within_15d BIGINT DEFAULT 0,
        fans_increment_within_30d BIGINT DEFAULT 0,
        fans_increment_rate_within_15d DECIMAL(20,10) DEFAULT 0,
        interact_rate_within_30d DECIMAL(20,10) DEFAULT 0,
        interaction_median_30d BIGINT DEFAULT 0,
        play_over_rate_within_30d DECIMAL(20,10) DEFAULT 0,
        vv_median_30d BIGINT DEFAULT 0,
        star_item_count_within_30d BIGINT DEFAULT 0,
        star_video_cnt_90d BIGINT DEFAULT 0,
        star_video_interact_rate_90d DECIMAL(20,10) DEFAULT 0,
        star_video_finish_vv_rate_90d DECIMAL(20,10) DEFAULT 0,
        star_video_median_vv_90d BIGINT DEFAULT 0,
        content_theme_labels_180d TEXT,
        tags_relation TEXT,
        price_1_20 DECIMAL(20,4) DEFAULT 0,
        price_20_60 DECIMAL(20,4) DEFAULT 0,
        price_60 DECIMAL(20,4) DEFAULT 0,
        assign_task_price_list VARCHAR(1000),
        expected_play_num BIGINT DEFAULT 0,
        expected_natural_play_num BIGINT DEFAULT 0,
        star_index DECIMAL(20,10) DEFAULT 0,
        prospective_1_20_cpm DECIMAL(20,6) DEFAULT 0,
        prospective_20_60_cpm DECIMAL(20,6) DEFAULT 0,
        prospective_60_cpm DECIMAL(20,6) DEFAULT 0,
        promotion_prospective_1_20_cpm DECIMAL(20,6) DEFAULT 0,
        promotion_prospective_20_60_cpm DECIMAL(20,6) DEFAULT 0,
        promotion_prospective_60_cpm DECIMAL(20,6) DEFAULT 0,
        promotion_prospective_vv BIGINT DEFAULT 0,
        e_commerce_enable SMALLINT DEFAULT 0,
        author_ecom_level VARCHAR(50),
        ecom_gmv_30d_range VARCHAR(200),
        ecom_avg_order_value_30d_range VARCHAR(200),
        ecom_gpm_30d_range VARCHAR(200),
        ecom_video_product_num_30d BIGINT DEFAULT 0,
        star_ecom_video_num_30d BIGINT DEFAULT 0,
        link_convert_index DECIMAL(20,6) DEFAULT 0,
        link_convert_index_by_industry DECIMAL(20,6) DEFAULT 0,
        link_shopping_index DECIMAL(20,6) DEFAULT 0,
        link_spread_index DECIMAL(20,6) DEFAULT 0,
        link_spread_index_by_industry DECIMAL(20,6) DEFAULT 0,
        link_star_index DECIMAL(20,6) DEFAULT 0,
        link_star_index_by_industry DECIMAL(20,6) DEFAULT 0,
        link_recommend_index_by_industry DECIMAL(20,6) DEFAULT 0,
        search_after_view_index_by_industry DECIMAL(20,6) DEFAULT 0,
        is_excellenct_author SMALLINT DEFAULT 0,
        star_excellent_author SMALLINT DEFAULT 0,
        author_avatar_frame_icon VARCHAR(100),
        is_black_horse_author SMALLINT DEFAULT 0,
        is_cocreate_author SMALLINT DEFAULT 0,
        is_cpm_project_author SMALLINT DEFAULT 0,
        is_short_drama SMALLINT DEFAULT 0,
        star_whispers_author SMALLINT DEFAULT 0,
        local_lower_threshold_author SMALLINT DEFAULT 0,
        burst_text_rate DECIMAL(20,10) DEFAULT 0,
        brand_boost_vv BIGINT DEFAULT 0,
        video_brand_boost SMALLINT DEFAULT 0,
        video_brand_boost_vv BIGINT DEFAULT 0,
        expected_cpa3_level SMALLINT DEFAULT 0,
        game_type VARCHAR(500),
        star_component_install_finish_cnt_90d BIGINT DEFAULT 0,
        star_component_link_click_cnt_90d BIGINT DEFAULT 0,
        star_video_install_ge_1_cnt_90d BIGINT DEFAULT 0,
        last_10_items TEXT,
        items TEXT,
        task_infos TEXT,
        crawled_at DATE NOT NULL,
        page_num BIGINT DEFAULT 0,
        source_url VARCHAR(2000),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await queryRunner.query(createTableSQL);
    
    // 创建索引
    console.log('🔨 创建索引...');
    const createIndexesSQL = [
      'CREATE INDEX IF NOT EXISTS IDX_INFLUENCER_NICK_NAME ON influencer_authors (nick_name);',
      'CREATE INDEX IF NOT EXISTS IDX_INFLUENCER_FOLLOWER ON influencer_authors (follower);',
      'CREATE INDEX IF NOT EXISTS IDX_INFLUENCER_STAR_INDEX ON influencer_authors (star_index);',
      'CREATE INDEX IF NOT EXISTS IDX_INFLUENCER_LOCATION ON influencer_authors (city, province);',
      'CREATE INDEX IF NOT EXISTS IDX_INFLUENCER_AUTHOR_TYPE ON influencer_authors (author_type);',
      'CREATE INDEX IF NOT EXISTS IDX_INFLUENCER_CRAWLED_AT ON influencer_authors (crawled_at);'
    ];

    for (const indexSQL of createIndexesSQL) {
      await queryRunner.query(indexSQL);
    }

    console.log('✅ influencer_authors表和索引创建完成');
    
  } catch (error) {
    console.error('❌ 创建表结构失败:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

async function migrateInfluencerData() {
  const configService = new ConfigService();
  
  // 创建MySQL连接
  const mysqlDataSource = new DataSource({
    type: 'mysql',
    host: configService.get<string>('MYSQL_HOST', 'localhost'),
    port: configService.get<number>('MYSQL_PORT', 3306),
    username: configService.get<string>('MYSQL_USERNAME', 'root'),
    password: configService.get<string>('MYSQL_PASSWORD'),
    database: configService.get<string>('MYSQL_DATABASE', 'gimcstar_system'),
    name: 'mysql-migration',
    synchronize: false,
    logging: false,
  } as DataSourceOptions);

  // 创建PostgreSQL连接
  const postgresDataSource = new DataSource({
    type: 'postgres',
    host: configService.get<string>('POSTGRES_HOST', 'localhost'),
    port: configService.get<number>('POSTGRES_PORT', 5432),
    username: configService.get<string>('POSTGRES_USERNAME', 'postgres'),
    password: configService.get<string>('POSTGRES_PASSWORD'),
    database: configService.get<string>('POSTGRES_DATABASE', 'gimcstar_analytics'),
    name: 'postgres-migration',
    synchronize: false,
    logging: false,
  } as DataSourceOptions);

  try {
    console.log('🔄 开始数据迁移...');
    
    // 初始化连接
    await mysqlDataSource.initialize();
    await postgresDataSource.initialize();
    console.log('✅ 数据库连接成功');

    // 检查并创建表结构
    console.log('🔧 检查并创建表结构...');
    await createInfluencerAuthorsTable(postgresDataSource);

    // 从MySQL查询所有达人数据
    console.log('📊 从MySQL查询达人数据...');
    const mysqlData = await mysqlDataSource.query(`
      SELECT * FROM influencer_authors ORDER BY star_id
    `);
    console.log(`📈 找到 ${mysqlData.length} 条达人数据`);

    if (mysqlData.length === 0) {
      console.log('⚠️ MySQL中没有找到达人数据');
      return;
    }

    // 清空PostgreSQL中的现有数据（可选）
    console.log('🗑️ 清空PostgreSQL中的现有数据...');
    await postgresDataSource.query('TRUNCATE TABLE influencer_authors RESTART IDENTITY CASCADE');

    // 批量插入数据到PostgreSQL
    console.log('📥 开始批量插入数据到PostgreSQL...');
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < mysqlData.length; i += batchSize) {
      const batch = mysqlData.slice(i, i + batchSize);
      
      // 构建批量插入SQL
      const values = batch.map((row: DaorenAuthor) => {
        return `(
          ${row.star_id},
          ${row.nick_name ? `'${row.nick_name.replace(/'/g, "''")}'` : 'NULL'},
          ${row.core_user_id ? `'${row.core_user_id}'` : 'NULL'},
          ${row.avatar_uri ? `'${row.avatar_uri.replace(/'/g, "''")}'` : 'NULL'},
          ${row.gender || 'NULL'},
          ${row.city ? `'${row.city.replace(/'/g, "''")}'` : 'NULL'},
          ${row.province ? `'${row.province.replace(/'/g, "''")}'` : 'NULL'},
          ${row.author_type || 'NULL'},
          ${row.author_status || 'NULL'},
          ${row.grade || 0},
          ${row.follower || 0},
          ${row.fans_increment_within_15d || 0},
          ${row.fans_increment_within_30d || 0},
          ${row.fans_increment_rate_within_15d || 0},
          ${row.interact_rate_within_30d || 0},
          ${row.interaction_median_30d || 0},
          ${row.play_over_rate_within_30d || 0},
          ${row.vv_median_30d || 0},
          ${row.star_item_count_within_30d || 0},
          ${row.star_video_cnt_90d || 0},
          ${row.star_video_interact_rate_90d || 0},
          ${row.star_video_finish_vv_rate_90d || 0},
          ${row.star_video_median_vv_90d || 0},
          ${row.content_theme_labels_180d ? `'${row.content_theme_labels_180d.replace(/'/g, "''")}'` : 'NULL'},
          ${row.tags_relation ? `'${row.tags_relation.replace(/'/g, "''")}'` : 'NULL'},
          ${row.price_1_20 || 0},
          ${row.price_20_60 || 0},
          ${row.price_60 || 0},
          ${row.assign_task_price_list ? `'${row.assign_task_price_list.replace(/'/g, "''")}'` : 'NULL'},
          ${row.expected_play_num || 0},
          ${row.expected_natural_play_num || 0},
          ${row.star_index || 0},
          ${row.prospective_1_20_cpm || 0},
          ${row.prospective_20_60_cpm || 0},
          ${row.prospective_60_cpm || 0},
          ${row.promotion_prospective_1_20_cpm || 0},
          ${row.promotion_prospective_20_60_cpm || 0},
          ${row.promotion_prospective_60_cpm || 0},
          ${row.promotion_prospective_vv || 0},
          ${row.e_commerce_enable || 0},
          ${row.author_ecom_level ? `'${row.author_ecom_level}'` : 'NULL'},
          ${row.ecom_gmv_30d_range ? `'${row.ecom_gmv_30d_range}'` : 'NULL'},
          ${row.ecom_avg_order_value_30d_range ? `'${row.ecom_avg_order_value_30d_range}'` : 'NULL'},
          ${row.ecom_gpm_30d_range ? `'${row.ecom_gpm_30d_range}'` : 'NULL'},
          ${row.ecom_video_product_num_30d || 0},
          ${row.star_ecom_video_num_30d || 0},
          ${row.link_convert_index || 0},
          ${row.link_convert_index_by_industry || 0},
          ${row.link_shopping_index || 0},
          ${row.link_spread_index || 0},
          ${row.link_spread_index_by_industry || 0},
          ${row.link_star_index || 0},
          ${row.link_star_index_by_industry || 0},
          ${row.link_recommend_index_by_industry || 0},
          ${row.search_after_view_index_by_industry || 0},
          ${row.is_excellenct_author || 0},
          ${row.star_excellent_author || 0},
          ${row.author_avatar_frame_icon ? `'${row.author_avatar_frame_icon}'` : 'NULL'},
          ${row.is_black_horse_author || 0},
          ${row.is_cocreate_author || 0},
          ${row.is_cpm_project_author || 0},
          ${row.is_short_drama || 0},
          ${row.star_whispers_author || 0},
          ${row.local_lower_threshold_author || 0},
          ${row.burst_text_rate || 0},
          ${row.brand_boost_vv || 0},
          ${row.video_brand_boost || 0},
          ${row.video_brand_boost_vv || 0},
          ${row.expected_cpa3_level || 0},
          ${row.game_type ? `'${row.game_type.replace(/'/g, "''")}'` : 'NULL'},
          ${row.star_component_install_finish_cnt_90d || 0},
          ${row.star_component_link_click_cnt_90d || 0},
          ${row.star_video_install_ge_1_cnt_90d || 0},
          ${row.last_10_items ? `'${row.last_10_items.replace(/'/g, "''")}'` : 'NULL'},
          ${row.items ? `'${row.items.replace(/'/g, "''")}'` : 'NULL'},
          ${row.task_infos ? `'${row.task_infos.replace(/'/g, "''")}'` : 'NULL'},
          ${row.crawled_at ? `'${new Date(row.crawled_at).toISOString()}'` : 'NULL'},
          ${row.page_num || 0},
          ${row.source_url ? `'${row.source_url.replace(/'/g, "''")}'` : 'NULL'},
          NOW(),
          NOW()
        )`;
      }).join(',');

      const insertSQL = `
        INSERT INTO influencer_authors (
          star_id, nick_name, core_user_id, avatar_uri, gender, city, province,
          author_type, account_status, author_level, follower, fans_increment_within_15d,
          fans_increment_within_30d, fans_increment_rate_within_15d, interact_rate_within_30d,
          interaction_median_30d, play_over_rate_within_30d, vv_median_30d, star_item_count_within_30d,
          star_video_cnt_90d, star_video_interact_rate_90d, star_video_finish_vv_rate_90d,
          star_video_median_vv_90d, content_theme_labels_180d, tags_relation, price_1_20,
          price_20_60, price_60, assign_task_price_list, expected_play_num, expected_natural_play_num,
          star_index, prospective_1_20_cpm, prospective_20_60_cpm, prospective_60_cpm,
          promotion_prospective_1_20_cpm, promotion_prospective_20_60_cpm, promotion_prospective_60_cpm,
          promotion_prospective_vv, e_commerce_enable, author_ecom_level, ecom_gmv_30d_range,
          ecom_avg_order_value_30d_range, ecom_gpm_30d_range, ecom_video_product_num_30d,
          star_ecom_video_num_30d, link_convert_index, link_convert_index_by_industry,
          link_shopping_index, link_spread_index, link_spread_index_by_industry, link_star_index,
          link_star_index_by_industry, link_recommend_index_by_industry, search_after_view_index_by_industry,
          is_excellenct_author, star_excellent_author, author_avatar_frame_icon, is_black_horse_author,
          is_cocreate_author, is_cpm_project_author, is_short_drama, star_whispers_author,
          local_lower_threshold_author, burst_text_rate, brand_boost_vv, video_brand_boost,
          video_brand_boost_vv, expected_cpa3_level, game_type, star_component_install_finish_cnt_90d,
          star_component_link_click_cnt_90d, star_video_install_ge_1_cnt_90d, last_10_items,
          items, task_infos, crawled_at, page_num, source_url, created_at, updated_at
        ) VALUES ${values}
        ON CONFLICT (star_id) DO UPDATE SET
          nick_name = EXCLUDED.nick_name,
          updated_at = NOW()
      `;

      await postgresDataSource.query(insertSQL);
      insertedCount += batch.length;
      console.log(`📊 已插入 ${insertedCount}/${mysqlData.length} 条数据`);
    }

    console.log('✅ 数据迁移完成！');
    console.log(`📈 总共迁移了 ${insertedCount} 条达人数据`);

    // 验证数据
    const postgresCount = await postgresDataSource.query('SELECT COUNT(*) as count FROM influencer_authors');
    console.log(`🔍 PostgreSQL中现有数据量: ${postgresCount[0].count}`);

  } catch (error) {
    console.error('❌ 数据迁移失败:', error);
    throw error;
  } finally {
    // 关闭连接
    if (mysqlDataSource.isInitialized) {
      await mysqlDataSource.destroy();
    }
    if (postgresDataSource.isInitialized) {
      await postgresDataSource.destroy();
    }
    console.log('🔌 数据库连接已关闭');
  }
}

// 执行迁移
if (require.main === module) {
  migrateInfluencerData()
    .then(() => {
      console.log('🎉 迁移脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 迁移脚本执行失败:', error);
      process.exit(1);
    });
}

export { migrateInfluencerData };