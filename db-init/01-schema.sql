--
-- PostgreSQL database dump
--

-- Dumped from database version 14.18 (Homebrew)
-- Dumped by pg_dump version 14.18 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: permissions_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.permissions_type_enum AS ENUM (
    'API',
    'BUTTON',
    'MENU',
    'FIELD'
);


--
-- Name: work_order_logs_action_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.work_order_logs_action_enum AS ENUM (
    'create',
    'receive',
    'assign',
    'start',
    'update',
    'comment',
    'status_change',
    'complete',
    'reject',
    'cancel'
);


--
-- Name: work_order_logs_new_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.work_order_logs_new_status_enum AS ENUM (
    'pending',
    'received',
    'in_progress',
    'testing',
    'completed',
    'rejected',
    'cancelled'
);


--
-- Name: work_order_logs_old_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.work_order_logs_old_status_enum AS ENUM (
    'pending',
    'received',
    'in_progress',
    'testing',
    'completed',
    'rejected',
    'cancelled'
);


--
-- Name: work_orders_priority_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.work_orders_priority_enum AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);


--
-- Name: work_orders_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.work_orders_status_enum AS ENUM (
    'pending',
    'received',
    'in_progress',
    'testing',
    'completed',
    'rejected',
    'cancelled'
);


--
-- Name: work_orders_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.work_orders_type_enum AS ENUM (
    'new_feature',
    'system_refactor',
    'bug_fix',
    'optimization',
    'requirement_change',
    'other'
);


--
-- Name: refresh_authors_combined_mv(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_authors_combined_mv() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- 使用CONCURRENTLY避免锁表
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_authors_combined;

    -- 记录刷新时间
    RAISE NOTICE '物化视图 mv_authors_combined 刷新完成: %', NOW();
END;
$$;


--
-- Name: FUNCTION refresh_authors_combined_mv(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.refresh_authors_combined_mv() IS '刷新综合筛选物化视图';


--
-- Name: refresh_authors_core_mv(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_authors_core_mv() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_authors_core_materialized;
END;
$$;


--
-- Name: FUNCTION refresh_authors_core_mv(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.refresh_authors_core_mv() IS '刷新作者核心物化视图';


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: authors_raw_archive; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.authors_raw_archive (
    id bigint NOT NULL,
    author_id text NOT NULL,
    run_id bigint,
    raw_attribute_datas jsonb,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: TABLE authors_raw_archive; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.authors_raw_archive IS '原始数据归档表-保留完整API响应';


--
-- Name: COLUMN authors_raw_archive.raw_attribute_datas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive.raw_attribute_datas IS '完整的attribute_datas JSON';


--
-- Name: authors_raw_archive_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.authors_raw_archive_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: authors_raw_archive_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.authors_raw_archive_id_seq OWNED BY public.authors_raw_archive.id;


--
-- Name: authors_raw_archive_parsed; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.authors_raw_archive_parsed (
    source_archive_id bigint NOT NULL,
    source_author_id text NOT NULL,
    source_run_id bigint,
    source_created_at timestamp without time zone,
    raw_payload_md5 text,
    raw_key_count integer,
    parsed_at timestamp without time zone DEFAULT now() NOT NULL,
    id text,
    author_id text,
    star_id text,
    core_user_id bigint,
    nick_name text,
    avatar_uri text,
    gender integer,
    author_type integer,
    author_status integer,
    grade integer,
    province text,
    city text,
    province_id integer,
    city_id integer,
    follower bigint,
    fans_increment_within_15d bigint,
    fans_increment_within_30d bigint,
    fans_increment_rate_within_15d double precision,
    interact_rate_within_30d double precision,
    play_over_rate_within_30d double precision,
    vv_median_30d double precision,
    interaction_median_30d bigint,
    sn_interact_rate_within_30d double precision,
    sn_play_over_rate_within_30d double precision,
    avg_search_after_view_rate_30d double precision,
    price_1_20 bigint,
    price_20_60 bigint,
    price_60 bigint,
    assign_cpm_suggest_price double precision,
    assign_task_price_list jsonb,
    enroll_task_price_list jsonb,
    expected_play_num bigint,
    expected_natural_play_num bigint,
    expected_cpa3_level integer,
    promotion_prospective_vv bigint,
    promotion_prospective_1_20_cpm double precision,
    promotion_prospective_20_60_cpm double precision,
    promotion_prospective_60_cpm double precision,
    sn_prospective_1_20_cpe double precision,
    sn_prospective_1_20_cpm double precision,
    sn_prospective_20_60_cpe double precision,
    sn_prospective_20_60_cpm double precision,
    sn_prospective_60_cpe double precision,
    sn_prospective_60_cpm double precision,
    pic_expected_play_num bigint,
    pic_expected_cpm double precision,
    link_convert_index double precision,
    link_shopping_index double precision,
    link_spread_index double precision,
    link_star_index double precision,
    star_index double precision,
    link_convert_index_by_industry jsonb,
    link_spread_index_by_industry jsonb,
    link_star_index_by_industry jsonb,
    link_recommend_index_by_industry jsonb,
    search_after_view_index_by_industry jsonb,
    link_user_type_by_industry jsonb,
    e_commerce_enable boolean,
    author_ecom_level text,
    star_ecom_video_num_30d bigint,
    ecom_video_product_num_30d bigint,
    star_ecom_video_product_num_30d bigint,
    ecom_gmv_30d_range jsonb,
    ecom_avg_order_value_30d_range jsonb,
    ecom_gpm_30d_range jsonb,
    ecom_gpm_30days_range jsonb,
    ecom_score double precision,
    ecom_watch_pv_30d bigint,
    ecom_video_ctr_30d_range jsonb,
    ecom_video_mid_click_pv_30d_range jsonb,
    avg_sale_amount_range jsonb,
    star_ecom_main_price_30days jsonb,
    star_component_link_click_cnt_90d bigint,
    star_item_count_within_30d bigint,
    star_video_cnt_90d bigint,
    star_video_finish_vv_rate_90d double precision,
    star_video_install_ge_1_cnt_90d bigint,
    star_video_interact_rate_90d double precision,
    star_video_median_vv_90d bigint,
    star_component_install_finish_cnt_90d bigint,
    star_component_download_ctr_90d double precision,
    star_component_install_cpa_90d double precision,
    star_component_install_pvr_90d double precision,
    brand_boost_vv double precision,
    video_brand_boost double precision,
    video_brand_boost_vv double precision,
    pic_brand_boost double precision,
    pic_brand_boost_vv double precision,
    star_excellent_author boolean,
    is_black_horse_author boolean,
    is_cocreate_author boolean,
    is_cpm_project_author boolean,
    is_short_drama boolean,
    is_ad_star_cur_high_quality_author boolean,
    star_qianchuan_high_potential boolean,
    is_excellenct_author boolean,
    star_whispers_author boolean,
    local_lower_threshold_author boolean,
    tags_relation jsonb,
    content_theme_labels_180d jsonb,
    author_thin_mid_word_association_index jsonb,
    game_type text,
    game_item_count_90d bigint,
    median_game_item_component_click_range jsonb,
    median_game_item_cpc_range jsonb,
    median_game_item_component_click_90_days double precision,
    median_game_item_cpc_90_days_range jsonb,
    median_game_item_ctr_90_days double precision,
    last_10_items jsonb,
    content_item_count_90d bigint,
    median_content_item_component_click_range jsonb,
    median_content_item_cpc_range jsonb,
    tool_item_count_90d bigint,
    median_tool_item_component_click_range jsonb,
    median_tool_item_cpc_range jsonb,
    burst_text_rate double precision,
    author_avatar_frame_icon text,
    link_i_cnt_by_industry jsonb,
    link_k_cnt_by_industry jsonb,
    link_l_cnt_by_industry jsonb,
    link_link_cnt_by_industry jsonb,
    link_n_cnt_by_industry jsonb,
    prospective_1_20_cpm double precision,
    prospective_20_60_cpm double precision,
    prospective_60_cpm double precision,
    sn_expected_play_num bigint
);


--
-- Name: TABLE authors_raw_archive_parsed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.authors_raw_archive_parsed IS 'authors_raw_archive.raw_attribute_datas 的类型化展开表；一条归档记录对应一行';


--
-- Name: COLUMN authors_raw_archive_parsed.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.id IS '作者唯一标识（JSON内字段）';


--
-- Name: COLUMN authors_raw_archive_parsed.author_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.author_id IS '作者ID（JSON内字段）';


--
-- Name: COLUMN authors_raw_archive_parsed.star_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.star_id IS '星图ID';


--
-- Name: COLUMN authors_raw_archive_parsed.core_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.core_user_id IS '核心用户ID';


--
-- Name: COLUMN authors_raw_archive_parsed.nick_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.nick_name IS '昵称';


--
-- Name: COLUMN authors_raw_archive_parsed.avatar_uri; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.avatar_uri IS '头像URI';


--
-- Name: COLUMN authors_raw_archive_parsed.gender; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.gender IS '性别枚举';


--
-- Name: COLUMN authors_raw_archive_parsed.author_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.author_type IS '作者类型枚举';


--
-- Name: COLUMN authors_raw_archive_parsed.author_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.author_status IS '作者状态枚举';


--
-- Name: COLUMN authors_raw_archive_parsed.grade; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.grade IS '作者等级';


--
-- Name: COLUMN authors_raw_archive_parsed.province; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.province IS '省份';


--
-- Name: COLUMN authors_raw_archive_parsed.city; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.city IS '城市';


--
-- Name: COLUMN authors_raw_archive_parsed.province_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.province_id IS '省份ID';


--
-- Name: COLUMN authors_raw_archive_parsed.city_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.city_id IS '城市ID';


--
-- Name: COLUMN authors_raw_archive_parsed.follower; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.follower IS '粉丝总数';


--
-- Name: COLUMN authors_raw_archive_parsed.fans_increment_within_15d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.fans_increment_within_15d IS '15天粉丝增量';


--
-- Name: COLUMN authors_raw_archive_parsed.fans_increment_within_30d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.fans_increment_within_30d IS '30天粉丝增量';


--
-- Name: COLUMN authors_raw_archive_parsed.fans_increment_rate_within_15d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.fans_increment_rate_within_15d IS '15天粉丝增长率';


--
-- Name: COLUMN authors_raw_archive_parsed.interact_rate_within_30d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.interact_rate_within_30d IS '30天互动率';


--
-- Name: COLUMN authors_raw_archive_parsed.play_over_rate_within_30d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.play_over_rate_within_30d IS '30天完播率';


--
-- Name: COLUMN authors_raw_archive_parsed.vv_median_30d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.vv_median_30d IS '30天播放量中位数';


--
-- Name: COLUMN authors_raw_archive_parsed.interaction_median_30d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.interaction_median_30d IS '30天互动量中位数';


--
-- Name: COLUMN authors_raw_archive_parsed.sn_interact_rate_within_30d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.sn_interact_rate_within_30d IS '短视频30天互动率';


--
-- Name: COLUMN authors_raw_archive_parsed.sn_play_over_rate_within_30d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.sn_play_over_rate_within_30d IS '短视频30天完播率';


--
-- Name: COLUMN authors_raw_archive_parsed.avg_search_after_view_rate_30d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.avg_search_after_view_rate_30d IS '30天平均搜后观看率';


--
-- Name: COLUMN authors_raw_archive_parsed.price_1_20; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.price_1_20 IS '1-20秒视频报价';


--
-- Name: COLUMN authors_raw_archive_parsed.price_20_60; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.price_20_60 IS '20-60秒视频报价';


--
-- Name: COLUMN authors_raw_archive_parsed.price_60; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.price_60 IS '60秒以上视频报价';


--
-- Name: COLUMN authors_raw_archive_parsed.assign_cpm_suggest_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.assign_cpm_suggest_price IS '指派CPM建议价格';


--
-- Name: COLUMN authors_raw_archive_parsed.assign_task_price_list; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.assign_task_price_list IS '指派任务价格列表';


--
-- Name: COLUMN authors_raw_archive_parsed.enroll_task_price_list; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.enroll_task_price_list IS '报名任务价格列表';


--
-- Name: COLUMN authors_raw_archive_parsed.expected_play_num; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.expected_play_num IS '预期播放量';


--
-- Name: COLUMN authors_raw_archive_parsed.expected_natural_play_num; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.expected_natural_play_num IS '预期自然播放量';


--
-- Name: COLUMN authors_raw_archive_parsed.expected_cpa3_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.expected_cpa3_level IS '预期CPA3等级';


--
-- Name: COLUMN authors_raw_archive_parsed.promotion_prospective_vv; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.promotion_prospective_vv IS '推广预期播放量';


--
-- Name: COLUMN authors_raw_archive_parsed.promotion_prospective_1_20_cpm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.promotion_prospective_1_20_cpm IS '1-20秒推广预期CPM';


--
-- Name: COLUMN authors_raw_archive_parsed.promotion_prospective_20_60_cpm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.promotion_prospective_20_60_cpm IS '20-60秒推广预期CPM';


--
-- Name: COLUMN authors_raw_archive_parsed.promotion_prospective_60_cpm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.promotion_prospective_60_cpm IS '60秒以上推广预期CPM';


--
-- Name: COLUMN authors_raw_archive_parsed.sn_prospective_1_20_cpe; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.sn_prospective_1_20_cpe IS '短视频1-20秒预期CPE';


--
-- Name: COLUMN authors_raw_archive_parsed.sn_prospective_1_20_cpm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.sn_prospective_1_20_cpm IS '短视频1-20秒预期CPM';


--
-- Name: COLUMN authors_raw_archive_parsed.sn_prospective_20_60_cpe; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.sn_prospective_20_60_cpe IS '短视频20-60秒预期CPE';


--
-- Name: COLUMN authors_raw_archive_parsed.sn_prospective_20_60_cpm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.sn_prospective_20_60_cpm IS '短视频20-60秒预期CPM';


--
-- Name: COLUMN authors_raw_archive_parsed.sn_prospective_60_cpe; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.sn_prospective_60_cpe IS '短视频60秒以上预期CPE';


--
-- Name: COLUMN authors_raw_archive_parsed.sn_prospective_60_cpm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.sn_prospective_60_cpm IS '短视频60秒以上预期CPM';


--
-- Name: COLUMN authors_raw_archive_parsed.pic_expected_play_num; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.pic_expected_play_num IS '图片预期播放量';


--
-- Name: COLUMN authors_raw_archive_parsed.pic_expected_cpm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.pic_expected_cpm IS '图片预期CPM';


--
-- Name: COLUMN authors_raw_archive_parsed.link_convert_index; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.link_convert_index IS '链接转化指数';


--
-- Name: COLUMN authors_raw_archive_parsed.link_shopping_index; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.link_shopping_index IS '链接购物指数';


--
-- Name: COLUMN authors_raw_archive_parsed.link_spread_index; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.link_spread_index IS '链接传播指数';


--
-- Name: COLUMN authors_raw_archive_parsed.link_star_index; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.link_star_index IS '链接星图指数';


--
-- Name: COLUMN authors_raw_archive_parsed.star_index; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.star_index IS '星图综合指数';


--
-- Name: COLUMN authors_raw_archive_parsed.link_convert_index_by_industry; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.link_convert_index_by_industry IS '分行业链接转化指数';


--
-- Name: COLUMN authors_raw_archive_parsed.link_spread_index_by_industry; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.link_spread_index_by_industry IS '分行业链接传播指数';


--
-- Name: COLUMN authors_raw_archive_parsed.link_star_index_by_industry; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.link_star_index_by_industry IS '分行业链接星图指数';


--
-- Name: COLUMN authors_raw_archive_parsed.link_recommend_index_by_industry; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.link_recommend_index_by_industry IS '分行业推荐指数';


--
-- Name: COLUMN authors_raw_archive_parsed.search_after_view_index_by_industry; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.search_after_view_index_by_industry IS '分行业搜后观看指数';


--
-- Name: COLUMN authors_raw_archive_parsed.link_user_type_by_industry; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.link_user_type_by_industry IS '分行业用户类型';


--
-- Name: COLUMN authors_raw_archive_parsed.e_commerce_enable; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.e_commerce_enable IS '是否开通电商';


--
-- Name: COLUMN authors_raw_archive_parsed.author_ecom_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.author_ecom_level IS '电商等级';


--
-- Name: COLUMN authors_raw_archive_parsed.star_ecom_video_num_30d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.star_ecom_video_num_30d IS '30天星图电商视频数';


--
-- Name: COLUMN authors_raw_archive_parsed.ecom_video_product_num_30d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.ecom_video_product_num_30d IS '30天电商视频商品数';


--
-- Name: COLUMN authors_raw_archive_parsed.star_ecom_video_product_num_30d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.star_ecom_video_product_num_30d IS '30天星图电商视频商品数';


--
-- Name: COLUMN authors_raw_archive_parsed.ecom_gmv_30d_range; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.ecom_gmv_30d_range IS '30天GMV区间';


--
-- Name: COLUMN authors_raw_archive_parsed.ecom_avg_order_value_30d_range; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.ecom_avg_order_value_30d_range IS '30天平均客单价区间';


--
-- Name: COLUMN authors_raw_archive_parsed.ecom_gpm_30d_range; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.ecom_gpm_30d_range IS '30天GPM区间';


--
-- Name: COLUMN authors_raw_archive_parsed.ecom_gpm_30days_range; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.ecom_gpm_30days_range IS '30天GPM区间（另一版本）';


--
-- Name: COLUMN authors_raw_archive_parsed.ecom_score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.ecom_score IS '电商评分';


--
-- Name: COLUMN authors_raw_archive_parsed.ecom_watch_pv_30d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.ecom_watch_pv_30d IS '30天电商观看PV';


--
-- Name: COLUMN authors_raw_archive_parsed.ecom_video_ctr_30d_range; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.ecom_video_ctr_30d_range IS '30天电商视频CTR区间';


--
-- Name: COLUMN authors_raw_archive_parsed.ecom_video_mid_click_pv_30d_range; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.ecom_video_mid_click_pv_30d_range IS '30天电商视频中部点击PV区间';


--
-- Name: COLUMN authors_raw_archive_parsed.avg_sale_amount_range; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.avg_sale_amount_range IS '平均销售额区间';


--
-- Name: COLUMN authors_raw_archive_parsed.star_ecom_main_price_30days; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.star_ecom_main_price_30days IS '30天星图电商主价格';


--
-- Name: COLUMN authors_raw_archive_parsed.star_component_link_click_cnt_90d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.star_component_link_click_cnt_90d IS '90天组件链接点击数';


--
-- Name: COLUMN authors_raw_archive_parsed.star_item_count_within_30d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.star_item_count_within_30d IS '30天星图作品数';


--
-- Name: COLUMN authors_raw_archive_parsed.star_video_cnt_90d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.star_video_cnt_90d IS '90天星图视频数';


--
-- Name: COLUMN authors_raw_archive_parsed.star_video_finish_vv_rate_90d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.star_video_finish_vv_rate_90d IS '90天视频完播率';


--
-- Name: COLUMN authors_raw_archive_parsed.star_video_install_ge_1_cnt_90d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.star_video_install_ge_1_cnt_90d IS '90天安装数至少为1的视频数';


--
-- Name: COLUMN authors_raw_archive_parsed.star_video_interact_rate_90d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.star_video_interact_rate_90d IS '90天视频互动率';


--
-- Name: COLUMN authors_raw_archive_parsed.star_video_median_vv_90d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.star_video_median_vv_90d IS '90天视频播放量中位数';


--
-- Name: COLUMN authors_raw_archive_parsed.star_component_install_finish_cnt_90d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.star_component_install_finish_cnt_90d IS '90天组件安装完成数';


--
-- Name: COLUMN authors_raw_archive_parsed.star_component_download_ctr_90d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.star_component_download_ctr_90d IS '90天组件下载CTR';


--
-- Name: COLUMN authors_raw_archive_parsed.star_component_install_cpa_90d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.star_component_install_cpa_90d IS '90天组件安装CPA';


--
-- Name: COLUMN authors_raw_archive_parsed.star_component_install_pvr_90d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.star_component_install_pvr_90d IS '90天组件安装PVR';


--
-- Name: COLUMN authors_raw_archive_parsed.brand_boost_vv; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.brand_boost_vv IS '品牌提升播放量';


--
-- Name: COLUMN authors_raw_archive_parsed.video_brand_boost; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.video_brand_boost IS '视频品牌提升指标';


--
-- Name: COLUMN authors_raw_archive_parsed.video_brand_boost_vv; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.video_brand_boost_vv IS '视频品牌提升播放量';


--
-- Name: COLUMN authors_raw_archive_parsed.pic_brand_boost; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.pic_brand_boost IS '图片品牌提升指标';


--
-- Name: COLUMN authors_raw_archive_parsed.pic_brand_boost_vv; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.pic_brand_boost_vv IS '图片品牌提升播放量';


--
-- Name: COLUMN authors_raw_archive_parsed.star_excellent_author; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.star_excellent_author IS '星图优质作者';


--
-- Name: COLUMN authors_raw_archive_parsed.is_black_horse_author; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.is_black_horse_author IS '是否黑马作者';


--
-- Name: COLUMN authors_raw_archive_parsed.is_cocreate_author; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.is_cocreate_author IS '是否共创作者';


--
-- Name: COLUMN authors_raw_archive_parsed.is_cpm_project_author; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.is_cpm_project_author IS '是否CPM项目作者';


--
-- Name: COLUMN authors_raw_archive_parsed.is_short_drama; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.is_short_drama IS '是否短剧作者';


--
-- Name: COLUMN authors_raw_archive_parsed.is_ad_star_cur_high_quality_author; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.is_ad_star_cur_high_quality_author IS '是否广告星图高质量作者';


--
-- Name: COLUMN authors_raw_archive_parsed.star_qianchuan_high_potential; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.star_qianchuan_high_potential IS '是否千川高潜作者';


--
-- Name: COLUMN authors_raw_archive_parsed.is_excellenct_author; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.is_excellenct_author IS '是否优秀作者（上游字段原拼写）';


--
-- Name: COLUMN authors_raw_archive_parsed.star_whispers_author; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.star_whispers_author IS '是否星图私语作者';


--
-- Name: COLUMN authors_raw_archive_parsed.local_lower_threshold_author; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.local_lower_threshold_author IS '是否本地低门槛作者';


--
-- Name: COLUMN authors_raw_archive_parsed.tags_relation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.tags_relation IS '标签关系';


--
-- Name: COLUMN authors_raw_archive_parsed.content_theme_labels_180d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.content_theme_labels_180d IS '180天内容主题标签';


--
-- Name: COLUMN authors_raw_archive_parsed.author_thin_mid_word_association_index; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.author_thin_mid_word_association_index IS '作者词关联指数';


--
-- Name: COLUMN authors_raw_archive_parsed.game_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.game_type IS '游戏类型';


--
-- Name: COLUMN authors_raw_archive_parsed.game_item_count_90d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.game_item_count_90d IS '90天游戏作品数';


--
-- Name: COLUMN authors_raw_archive_parsed.median_game_item_component_click_range; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.median_game_item_component_click_range IS '游戏作品组件点击中位数区间';


--
-- Name: COLUMN authors_raw_archive_parsed.median_game_item_cpc_range; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.median_game_item_cpc_range IS '游戏作品CPC中位数区间';


--
-- Name: COLUMN authors_raw_archive_parsed.median_game_item_component_click_90_days; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.median_game_item_component_click_90_days IS '90天游戏作品组件点击中位数';


--
-- Name: COLUMN authors_raw_archive_parsed.median_game_item_cpc_90_days_range; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.median_game_item_cpc_90_days_range IS '90天游戏作品CPC中位数区间';


--
-- Name: COLUMN authors_raw_archive_parsed.median_game_item_ctr_90_days; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.median_game_item_ctr_90_days IS '90天游戏作品CTR中位数';


--
-- Name: COLUMN authors_raw_archive_parsed.last_10_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.last_10_items IS '最近10个作品';


--
-- Name: COLUMN authors_raw_archive_parsed.content_item_count_90d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.content_item_count_90d IS '90天内容作品数';


--
-- Name: COLUMN authors_raw_archive_parsed.median_content_item_component_click_range; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.median_content_item_component_click_range IS '内容作品组件点击中位数区间';


--
-- Name: COLUMN authors_raw_archive_parsed.median_content_item_cpc_range; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.median_content_item_cpc_range IS '内容作品CPC中位数区间';


--
-- Name: COLUMN authors_raw_archive_parsed.tool_item_count_90d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.tool_item_count_90d IS '90天工具作品数';


--
-- Name: COLUMN authors_raw_archive_parsed.median_tool_item_component_click_range; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.median_tool_item_component_click_range IS '工具作品组件点击中位数区间';


--
-- Name: COLUMN authors_raw_archive_parsed.median_tool_item_cpc_range; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.median_tool_item_cpc_range IS '工具作品CPC中位数区间';


--
-- Name: COLUMN authors_raw_archive_parsed.burst_text_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.burst_text_rate IS '爆文率';


--
-- Name: COLUMN authors_raw_archive_parsed.author_avatar_frame_icon; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.author_avatar_frame_icon IS '头像框图标';


--
-- Name: COLUMN authors_raw_archive_parsed.link_i_cnt_by_industry; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.link_i_cnt_by_industry IS '分行业I计数';


--
-- Name: COLUMN authors_raw_archive_parsed.link_k_cnt_by_industry; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.link_k_cnt_by_industry IS '分行业K计数';


--
-- Name: COLUMN authors_raw_archive_parsed.link_l_cnt_by_industry; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.link_l_cnt_by_industry IS '分行业L计数';


--
-- Name: COLUMN authors_raw_archive_parsed.link_link_cnt_by_industry; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.link_link_cnt_by_industry IS '分行业链接计数';


--
-- Name: COLUMN authors_raw_archive_parsed.link_n_cnt_by_industry; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.authors_raw_archive_parsed.link_n_cnt_by_industry IS '分行业N计数';


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id bigint NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(50) NOT NULL,
    type public.permissions_type_enum DEFAULT 'API'::public.permissions_type_enum NOT NULL,
    description character varying(255),
    parent_id bigint,
    resource character varying(100),
    action character varying(100),
    sort integer DEFAULT 0 NOT NULL,
    status smallint DEFAULT '1'::smallint NOT NULL,
    frontend_meta jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: COLUMN permissions.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.permissions.id IS '权限ID';


--
-- Name: COLUMN permissions.code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.permissions.code IS '权限代码 (如: user:create, tag:delete, button:export_sensitive)';


--
-- Name: COLUMN permissions.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.permissions.name IS '权限名称';


--
-- Name: COLUMN permissions.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.permissions.type IS '权限类型';


--
-- Name: COLUMN permissions.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.permissions.description IS '权限描述';


--
-- Name: COLUMN permissions.parent_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.permissions.parent_id IS '上级权限ID (0 表示顶级权限)';


--
-- Name: COLUMN permissions.resource; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.permissions.resource IS '资源标识 (如: user, role, permission)';


--
-- Name: COLUMN permissions.action; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.permissions.action IS '操作标识 (如: create, read, update, delete)';


--
-- Name: COLUMN permissions.sort; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.permissions.sort IS '排序权重';


--
-- Name: COLUMN permissions.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.permissions.status IS '状态: 0=禁用, 1=启用';


--
-- Name: COLUMN permissions.frontend_meta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.permissions.frontend_meta IS '前端映射元数据: {routePath, componentPath, elementLocator, pageLocation, businessModule}';


--
-- Name: COLUMN permissions.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.permissions.created_at IS '创建时间';


--
-- Name: COLUMN permissions.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.permissions.updated_at IS '更新时间';


--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    id bigint NOT NULL,
    role_id bigint NOT NULL,
    permission_id bigint NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: COLUMN role_permissions.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.role_permissions.id IS '关联ID';


--
-- Name: COLUMN role_permissions.role_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.role_permissions.role_id IS '角色ID';


--
-- Name: COLUMN role_permissions.permission_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.role_permissions.permission_id IS '权限ID';


--
-- Name: COLUMN role_permissions.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.role_permissions.created_at IS '创建时间';


--
-- Name: role_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.role_permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: role_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.role_permissions_id_seq OWNED BY public.role_permissions.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id bigint NOT NULL,
    parent_id bigint,
    name character varying(100) NOT NULL,
    code character varying(50) NOT NULL,
    description character varying(255),
    status smallint DEFAULT '1'::smallint NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: COLUMN roles.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.roles.id IS '角色ID';


--
-- Name: COLUMN roles.parent_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.roles.parent_id IS '上级角色ID (null 表示顶级角色)';


--
-- Name: COLUMN roles.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.roles.name IS '角色名称 (如: "项目组", "媒介购买执行")';


--
-- Name: COLUMN roles.code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.roles.code IS '角色代码 (如: PROJECT_GROUP, MEDIA_BUYER)';


--
-- Name: COLUMN roles.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.roles.description IS '角色描述';


--
-- Name: COLUMN roles.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.roles.status IS '状态: 0=禁用, 1=启用';


--
-- Name: COLUMN roles.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.roles.created_at IS '创建时间';


--
-- Name: COLUMN roles.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.roles.updated_at IS '更新时间';


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tags (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50),
    description text,
    platform character varying(20) NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    parent_id integer,
    sort integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    metadata json,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: COLUMN tags.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tags.name IS '标签名称';


--
-- Name: COLUMN tags.code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tags.code IS '标签代码';


--
-- Name: COLUMN tags.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tags.description IS '标签描述';


--
-- Name: COLUMN tags.platform; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tags.platform IS '所属平台';


--
-- Name: COLUMN tags.level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tags.level IS '层级深度';


--
-- Name: COLUMN tags.parent_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tags.parent_id IS '父级标签ID';


--
-- Name: COLUMN tags.sort; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tags.sort IS '排序权重';


--
-- Name: COLUMN tags.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tags.is_active IS '是否启用';


--
-- Name: COLUMN tags.metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tags.metadata IS '扩展属性';


--
-- Name: COLUMN tags.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tags.created_at IS '创建时间';


--
-- Name: COLUMN tags.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tags.updated_at IS '更新时间';


--
-- Name: tags_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tags_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tags_id_seq OWNED BY public.tags.id;


--
-- Name: user_auth; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_auth (
    id bigint NOT NULL,
    phone character varying(20) NOT NULL,
    password_hash character varying(255) NOT NULL,
    status smallint DEFAULT '1'::smallint NOT NULL,
    last_login_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: COLUMN user_auth.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_auth.id IS '用户ID';


--
-- Name: COLUMN user_auth.phone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_auth.phone IS '手机号';


--
-- Name: COLUMN user_auth.password_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_auth.password_hash IS '密码哈希值';


--
-- Name: COLUMN user_auth.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_auth.status IS '状态: 1-启用, 0-禁用';


--
-- Name: COLUMN user_auth.last_login_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_auth.last_login_at IS '最后登录时间';


--
-- Name: COLUMN user_auth.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_auth.created_at IS '创建时间';


--
-- Name: COLUMN user_auth.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_auth.updated_at IS '更新时间';


--
-- Name: user_auth_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_auth_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_auth_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_auth_id_seq OWNED BY public.user_auth.id;


--
-- Name: user_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profile (
    user_id bigint NOT NULL,
    nickname character varying(50),
    avatar character varying(500),
    email character varying(100),
    real_name character varying(50),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: COLUMN user_profile.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profile.user_id IS '用户ID';


--
-- Name: COLUMN user_profile.nickname; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profile.nickname IS '昵称';


--
-- Name: COLUMN user_profile.avatar; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profile.avatar IS '头像URL';


--
-- Name: COLUMN user_profile.email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profile.email IS '邮箱';


--
-- Name: COLUMN user_profile.real_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profile.real_name IS '真实姓名';


--
-- Name: COLUMN user_profile.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profile.created_at IS '创建时间';


--
-- Name: COLUMN user_profile.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profile.updated_at IS '更新时间';


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    role_id bigint NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: COLUMN user_roles.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_roles.id IS '关联ID';


--
-- Name: COLUMN user_roles.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_roles.user_id IS '用户ID';


--
-- Name: COLUMN user_roles.role_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_roles.role_id IS '角色ID';


--
-- Name: COLUMN user_roles.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_roles.created_at IS '创建时间';


--
-- Name: user_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_roles_id_seq OWNED BY public.user_roles.id;


--
-- Name: work_order_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_order_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    work_order_id uuid NOT NULL,
    action public.work_order_logs_action_enum NOT NULL,
    content text,
    old_status public.work_order_logs_old_status_enum,
    new_status public.work_order_logs_new_status_enum,
    old_assignee bigint,
    new_assignee bigint,
    metadata json,
    created_by bigint NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: COLUMN work_order_logs.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_order_logs.id IS '日志ID';


--
-- Name: COLUMN work_order_logs.work_order_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_order_logs.work_order_id IS '工单ID';


--
-- Name: COLUMN work_order_logs.action; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_order_logs.action IS '操作类型';


--
-- Name: COLUMN work_order_logs.content; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_order_logs.content IS '操作说明/备注';


--
-- Name: COLUMN work_order_logs.old_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_order_logs.old_status IS '原状态';


--
-- Name: COLUMN work_order_logs.new_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_order_logs.new_status IS '新状态';


--
-- Name: COLUMN work_order_logs.old_assignee; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_order_logs.old_assignee IS '原处理人ID';


--
-- Name: COLUMN work_order_logs.new_assignee; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_order_logs.new_assignee IS '新处理人ID';


--
-- Name: COLUMN work_order_logs.metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_order_logs.metadata IS '额外数据';


--
-- Name: COLUMN work_order_logs.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_order_logs.created_by IS '操作人ID';


--
-- Name: COLUMN work_order_logs.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_order_logs.created_at IS '操作时间';


--
-- Name: work_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying(100) NOT NULL,
    type public.work_orders_type_enum NOT NULL,
    priority public.work_orders_priority_enum DEFAULT 'medium'::public.work_orders_priority_enum NOT NULL,
    description text NOT NULL,
    modules json,
    attachments json,
    status public.work_orders_status_enum DEFAULT 'pending'::public.work_orders_status_enum NOT NULL,
    created_by bigint NOT NULL,
    assigned_to bigint,
    received_at timestamp without time zone,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    expected_completion_at timestamp without time zone,
    result text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: COLUMN work_orders.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_orders.id IS '工单ID';


--
-- Name: COLUMN work_orders.title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_orders.title IS '工单标题';


--
-- Name: COLUMN work_orders.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_orders.type IS '事务类型';


--
-- Name: COLUMN work_orders.priority; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_orders.priority IS '优先级';


--
-- Name: COLUMN work_orders.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_orders.description IS '需求描述';


--
-- Name: COLUMN work_orders.modules; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_orders.modules IS '涉及的功能模块（从菜单中选择）';


--
-- Name: COLUMN work_orders.attachments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_orders.attachments IS '附件信息';


--
-- Name: COLUMN work_orders.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_orders.status IS '工单状态';


--
-- Name: COLUMN work_orders.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_orders.created_by IS '创建人ID';


--
-- Name: COLUMN work_orders.assigned_to; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_orders.assigned_to IS '分配给（处理人ID）';


--
-- Name: COLUMN work_orders.received_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_orders.received_at IS '接收时间';


--
-- Name: COLUMN work_orders.started_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_orders.started_at IS '开始处理时间';


--
-- Name: COLUMN work_orders.completed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_orders.completed_at IS '完成时间';


--
-- Name: COLUMN work_orders.expected_completion_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_orders.expected_completion_at IS '期望完成时间';


--
-- Name: COLUMN work_orders.result; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_orders.result IS '处理结果/备注';


--
-- Name: COLUMN work_orders.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_orders.created_at IS '创建时间';


--
-- Name: COLUMN work_orders.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_orders.updated_at IS '更新时间';


--
-- Name: authors_raw_archive id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authors_raw_archive ALTER COLUMN id SET DEFAULT nextval('public.authors_raw_archive_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: role_permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions ALTER COLUMN id SET DEFAULT nextval('public.role_permissions_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: tags id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags ALTER COLUMN id SET DEFAULT nextval('public.tags_id_seq'::regclass);


--
-- Name: user_auth id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_auth ALTER COLUMN id SET DEFAULT nextval('public.user_auth_id_seq'::regclass);


--
-- Name: user_roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles ALTER COLUMN id SET DEFAULT nextval('public.user_roles_id_seq'::regclass);


--
-- Name: work_orders PK_29f6c1884082ee6f535aed93660; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT "PK_29f6c1884082ee6f535aed93660" PRIMARY KEY (id);


--
-- Name: user_auth PK_56d00ec31dc3eed1c3f6bff4f58; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_auth
    ADD CONSTRAINT "PK_56d00ec31dc3eed1c3f6bff4f58" PRIMARY KEY (id);


--
-- Name: role_permissions PK_84059017c90bfcb701b8fa42297; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "PK_84059017c90bfcb701b8fa42297" PRIMARY KEY (id);


--
-- Name: user_roles PK_8acd5cf26ebd158416f477de799; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT "PK_8acd5cf26ebd158416f477de799" PRIMARY KEY (id);


--
-- Name: permissions PK_920331560282b8bd21bb02290df; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY (id);


--
-- Name: roles PK_c1433d71a4838793a49dcad46ab; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY (id);


--
-- Name: tags PK_e7dc17249a1148a1970748eda99; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT "PK_e7dc17249a1148a1970748eda99" PRIMARY KEY (id);


--
-- Name: user_profile PK_eee360f3bff24af1b6890765201; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profile
    ADD CONSTRAINT "PK_eee360f3bff24af1b6890765201" PRIMARY KEY (user_id);


--
-- Name: work_order_logs PK_f21127067c91a0b0882e060e616; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_order_logs
    ADD CONSTRAINT "PK_f21127067c91a0b0882e060e616" PRIMARY KEY (id);


--
-- Name: permissions UQ_8dad765629e83229da6feda1c1d; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT "UQ_8dad765629e83229da6feda1c1d" UNIQUE (code);


--
-- Name: user_auth UQ_c4c3558b2231c19f00c88144852; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_auth
    ADD CONSTRAINT "UQ_c4c3558b2231c19f00c88144852" UNIQUE (phone);


--
-- Name: roles UQ_f6d54f95c31b73fb1bdd8e91d0c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT "UQ_f6d54f95c31b73fb1bdd8e91d0c" UNIQUE (code);


--
-- Name: authors_raw_archive_parsed authors_raw_archive_parsed_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authors_raw_archive_parsed
    ADD CONSTRAINT authors_raw_archive_parsed_pkey PRIMARY KEY (source_archive_id);


--
-- Name: authors_raw_archive authors_raw_archive_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authors_raw_archive
    ADD CONSTRAINT authors_raw_archive_pkey PRIMARY KEY (id);


--
-- Name: authors_raw_archive authors_raw_archive_run_id_author_id_created_at_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authors_raw_archive
    ADD CONSTRAINT authors_raw_archive_run_id_author_id_created_at_key UNIQUE (run_id, author_id, created_at);


--
-- Name: role_permissions uk_role_permission; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT uk_role_permission UNIQUE (role_id, permission_id);


--
-- Name: user_roles uk_user_role; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT uk_user_role UNIQUE (user_id, role_id);


--
-- Name: IDX_0cea0e8afc73fd0495856e01e7; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_0cea0e8afc73fd0495856e01e7" ON public.work_orders USING btree (created_at);


--
-- Name: IDX_83f0bab24ae0c51ceff71783d0; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_83f0bab24ae0c51ceff71783d0" ON public.work_order_logs USING btree (work_order_id);


--
-- Name: IDX_84a22e7f4761f9b56f06b48cd6; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_84a22e7f4761f9b56f06b48cd6" ON public.work_orders USING btree (status);


--
-- Name: IDX_96ae95bfa714d0447b641c336b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_96ae95bfa714d0447b641c336b" ON public.tags USING btree (platform, level);


--
-- Name: IDX_b520b436fb6ce9fabb3de65aeb; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_b520b436fb6ce9fabb3de65aeb" ON public.work_orders USING btree (created_by);


--
-- Name: IDX_bd19ddcde86ca1882599dbace1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_bd19ddcde86ca1882599dbace1" ON public.tags USING btree (parent_id);


--
-- Name: IDX_d9ef307adf51be061744af3e1a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_d9ef307adf51be061744af3e1a" ON public.work_order_logs USING btree (created_at);


--
-- Name: IDX_f10ffb04ddc99112db4523117c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_f10ffb04ddc99112db4523117c" ON public.work_orders USING btree (assigned_to);


--
-- Name: idx_authors_raw_archive_parsed_follower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_authors_raw_archive_parsed_follower ON public.authors_raw_archive_parsed USING btree (follower);


--
-- Name: idx_authors_raw_archive_parsed_province_city; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_authors_raw_archive_parsed_province_city ON public.authors_raw_archive_parsed USING btree (province, city);


--
-- Name: idx_authors_raw_archive_parsed_source_author; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_authors_raw_archive_parsed_source_author ON public.authors_raw_archive_parsed USING btree (source_author_id);


--
-- Name: idx_authors_raw_archive_parsed_source_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_authors_raw_archive_parsed_source_created ON public.authors_raw_archive_parsed USING btree (source_created_at);


--
-- Name: idx_authors_raw_archive_parsed_source_run; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_authors_raw_archive_parsed_source_run ON public.authors_raw_archive_parsed USING btree (source_run_id);


--
-- Name: idx_authors_raw_archive_parsed_star_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_authors_raw_archive_parsed_star_index ON public.authors_raw_archive_parsed USING btree (star_index);


--
-- Name: idx_permissions_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_permissions_code ON public.permissions USING btree (code);


--
-- Name: idx_permissions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_permissions_type ON public.permissions USING btree (type);


--
-- Name: idx_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phone ON public.user_auth USING btree (phone);


--
-- Name: idx_raw_archive_author_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_raw_archive_author_id ON public.authors_raw_archive USING btree (author_id);


--
-- Name: idx_raw_archive_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_raw_archive_created_at ON public.authors_raw_archive USING btree (created_at DESC);


--
-- Name: idx_raw_archive_raw_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_raw_archive_raw_data ON public.authors_raw_archive USING gin (raw_attribute_datas);


--
-- Name: idx_raw_archive_run_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_raw_archive_run_id ON public.authors_raw_archive USING btree (run_id);


--
-- Name: idx_role_permissions_permission_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_permissions_permission_id ON public.role_permissions USING btree (permission_id);


--
-- Name: idx_role_permissions_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_permissions_role_id ON public.role_permissions USING btree (role_id);


--
-- Name: idx_roles_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roles_code ON public.roles USING btree (code);


--
-- Name: idx_roles_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roles_parent_id ON public.roles USING btree (parent_id);


--
-- Name: idx_user_roles_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_role_id ON public.user_roles USING btree (role_id);


--
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);


--
-- Name: role_permissions FK_17022daf3f885f7d35423e9971e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "FK_17022daf3f885f7d35423e9971e" FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_permissions FK_178199805b901ccd220ab7740ec; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "FK_178199805b901ccd220ab7740ec" FOREIGN KEY (role_id) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: roles FK_3e97eeaf865aeda0d20c0c5c509; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT "FK_3e97eeaf865aeda0d20c0c5c509" FOREIGN KEY (parent_id) REFERENCES public.roles(id) ON DELETE SET NULL;


--
-- Name: work_order_logs FK_5bbef7800114a316dd426ce04de; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_order_logs
    ADD CONSTRAINT "FK_5bbef7800114a316dd426ce04de" FOREIGN KEY (created_by) REFERENCES public.user_auth(id);


--
-- Name: work_order_logs FK_83f0bab24ae0c51ceff71783d0d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_order_logs
    ADD CONSTRAINT "FK_83f0bab24ae0c51ceff71783d0d" FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id) ON DELETE CASCADE;


--
-- Name: user_roles FK_87b8888186ca9769c960e926870; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT "FK_87b8888186ca9769c960e926870" FOREIGN KEY (user_id) REFERENCES public.user_auth(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_roles FK_b23c65e50a758245a33ee35fda1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT "FK_b23c65e50a758245a33ee35fda1" FOREIGN KEY (role_id) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: work_orders FK_b520b436fb6ce9fabb3de65aeb7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT "FK_b520b436fb6ce9fabb3de65aeb7" FOREIGN KEY (created_by) REFERENCES public.user_auth(id);


--
-- Name: tags FK_bd19ddcde86ca1882599dbace11; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT "FK_bd19ddcde86ca1882599dbace11" FOREIGN KEY (parent_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: permissions FK_e152e0aa9e0df7ed44539db894c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT "FK_e152e0aa9e0df7ed44539db894c" FOREIGN KEY (parent_id) REFERENCES public.permissions(id) ON DELETE SET NULL;


--
-- Name: user_profile FK_eee360f3bff24af1b6890765201; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profile
    ADD CONSTRAINT "FK_eee360f3bff24af1b6890765201" FOREIGN KEY (user_id) REFERENCES public.user_auth(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: work_orders FK_f10ffb04ddc99112db4523117c4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT "FK_f10ffb04ddc99112db4523117c4" FOREIGN KEY (assigned_to) REFERENCES public.user_auth(id);


--
-- PostgreSQL database dump complete
--
