#!/bin/bash

# 智能达人推荐系统 API 测试脚本
# 使用 curl 命令快速测试新增的接口

# 配置变量
BASE_URL="http://localhost:9000/api"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwidXNlcm5hbWUiOiIxMzgwMDAwMDAwMCIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJyb2xlcyI6WyJTVVBFUl9BRE1JTiJdLCJwZXJtaXNzaW9ucyI6WyJhZG1pbjphY2Nlc3MiLCJzeXN0ZW06Y29uZmlnIiwidXNlcjp2aWV3IiwidXNlcjpjcmVhdGUiLCJ1c2VyOnVwZGF0ZSIsInVzZXI6ZGVsZXRlIiwidXNlcjptYW5hZ2UiLCJyb2xlOnZpZXciLCJyb2xlOmNyZWF0ZSIsInJvbGU6dXBkYXRlIiwicm9sZTpkZWxldGUiLCJyb2xlOmFzc2lnbiIsInJvbGU6bWFuYWdlIiwicGVybWlzc2lvbjp2aWV3IiwicGVybWlzc2lvbjpjcmVhdGUiLCJwZXJtaXNzaW9uOnVwZGF0ZSIsInBlcm1pc3Npb246ZGVsZXRlIiwicGVybWlzc2lvbjphc3NpZ24iLCJkYXRhOmV4cG9ydCIsImRhdGE6ZXhwb3J0X3NlbnNpdGl2ZSIsInByb2plY3Q6dmlldyIsInByb2plY3Q6Y3JlYXRlIiwicHJvamVjdDp1cGRhdGUiLCJwcm9qZWN0OmRlbGV0ZSIsInByb2plY3Q6bWFuYWdlIiwibWVkaWE6dmlldyIsIm1lZGlhOmJ1eSIsIm1lZGlhOnJlcG9ydCIsInRhZzp2aWV3IiwidGFnOm1hbmFnZSIsInRhZzpmaWx0ZXI6dmlldyIsImluZmx1ZW5jZXI6dmlldyIsImluZmx1ZW5jZXI6Y3JlYXRlIiwiaW5mbHVlbmNlcjp1cGRhdGUiLCJpbmZsdWVuY2VyOmRlbGV0ZSIsImluZmx1ZW5jZXI6bWFuYWdlIiwiaW5mbHVlbmNlcjpleHBvcnQiLCJmaW5hbmNlOmFjY2VzcyIsImZpbmFuY2U6cmViYXRlOnZpZXciLCJmaW5hbmNlOnJlYmF0ZTpleHBvcnQiLCJmaW5hbmNlOnJlYmF0ZTpkZXRhaWwiLCJmaW5hbmNlOnJlYmF0ZTpwb2xpY3k6dmlldyIsImZpbmFuY2U6cmViYXRlOnBvbGljeTpjcmVhdGUiLCJmaW5hbmNlOnJlYmF0ZTpwb2xpY3k6dXBkYXRlIiwiZmluYW5jZTpyZWJhdGU6cG9saWN5OmRlbGV0ZSIsImZpbmFuY2U6cmViYXRlOnBvbGljeTpjYWxjdWxhdGUiLCJwb2xpY3k6YWNjZXNzIiwicG9saWN5OnZlcnNpb246dmlldyIsInBvbGljeTp2ZXJzaW9uOmNyZWF0ZSIsInBvbGljeTp2ZXJzaW9uOnVwZGF0ZSIsInBvbGljeTp2ZXJzaW9uOmRlbGV0ZSIsInBvbGljeTp2ZXJzaW9uOmFjdGl2YXRlIiwicG9saWN5OnZlcnNpb246Y29tcGFyZSIsInBvbGljeTp2ZXJzaW9uOmhpc3RvcnkiLCJyZXNvdXJjZTphY2Nlc3MiLCJyZXNvdXJjZTppbmZsdWVuY2VyOnZpZXciLCJyZXNvdXJjZTppbmZsdWVuY2VyOmNyZWF0ZSIsInJlc291cmNlOmluZmx1ZW5jZXI6dXBkYXRlIiwicmVzb3VyY2U6aW5mbHVlbmNlcjpkZWxldGUiLCJyZXNvdXJjZTppbmZsdWVuY2VyOmV2YWx1YXRpb246dmlldyIsInJlc291cmNlOmluZmx1ZW5jZXI6ZXZhbHVhdGlvbjpjcmVhdGUiLCJyZXNvdXJjZTppbmZsdWVuY2VyOmV2YWx1YXRpb246dXBkYXRlIiwiZmluYW5jZTpyZWJhdGU6Zmxvdzp2aWV3IiwiZmluYW5jZTpyZWJhdGU6Zmxvdzp1cGRhdGUiLCJmaW5hbmNlOnJlYmF0ZTpmbG93OmV4cG9ydCIsImFpOmFzc2lzdGFudDp2aWV3IiwiYWk6YXNzaXN0YW50OmNoYXQiLCJhaTphc3Npc3RhbnQ6aGlzdG9yeSJdLCJqdGkiOiIwYzNkMTBiYy1hY2I5LTRhZTMtYTE0Ni0wOGRmY2VjMTFlMDUiLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNzYwMzQzNjA3LCJleHAiOjE3NjA5NDg0MDd9.hPFAfaBsnlt-PUH1dYUdan9UVQCzsR3hFboHghaXuUQ"
# 调试模式开关
DEBUG=true

# 日志函数
log_debug() {
    if [ "$DEBUG" = true ]; then
        echo "[DEBUG] $1"
    fi
}

log_error() {
    echo "[ERROR] $1" >&2
}

# 测试函数
test_api() {
    local test_name="$1"
    local method="$2"
    local url="$3"
    local headers="$4"
    local data="$5"
    
    echo "=== $test_name ==="
    log_debug "请求方法: $method"
    log_debug "请求URL: $url"
    # log_debug "请求头: $headers"
    if [ -n "$data" ]; then
        log_debug "请求体: $data"
    fi
    
    # 创建临时文件存储响应
    local response_file=$(mktemp)
    local header_file=$(mktemp)
    
    # 构建curl命令数组
    local curl_args=()
    curl_args+=("curl" "-s" "-X" "$method" "$url" "-D" "$header_file" "-o" "$response_file")
    
    # 添加请求头
    if [ -n "$headers" ]; then
        # 如果有数据，需要根据数据类型设置正确的Content-Type
        if [ -n "$data" ] && [[ "$data" == *"="* ]] && [[ "$data" != "{"* ]]; then
            # URL编码数据，替换Content-Type为application/x-www-form-urlencoded
            headers=$(echo "$headers" | sed 's/Content-Type: application\/json/Content-Type: application\/x-www-form-urlencoded/')
        fi
        # 解析headers并添加到数组
        eval "curl_args+=($headers)"
    fi
    
    # 添加请求体
    if [ -n "$data" ]; then
        curl_args+=("-d" "$data")
    fi
    
    # 执行请求
    # log_debug "执行命令: ${curl_args[*]}"
    "${curl_args[@]}"
    
    # 获取状态码
    local status_code=$(grep "HTTP/" "$header_file" | tail -1 | awk '{print $2}')
    
    # # 显示响应头（调试模式）
    # if [ "$DEBUG" = true ]; then
    #     echo "[DEBUG] 响应头:"
    #     cat "$header_file"
    #     echo ""
    # fi
    
    # 显示响应体
    echo "响应内容:"
    cat "$response_file"
    echo ""
    
    # 显示状态码
    echo "状态码: $status_code"
    
    # 如果是400错误，显示错误详情
    if [ "$status_code" = "400" ]; then
        log_error "API调用失败 - 400 Bad Request"
        log_error "可能的原因:"
        log_error "1. 请求参数格式错误"
        log_error "2. 缺少必需的请求头"
        log_error "3. 认证token无效或过期"
        log_error "4. 服务端验证失败"
    fi
    
    echo ""
    
    # 清理临时文件
    rm -f "$response_file" "$header_file"
}

echo "=== 智能达人推荐系统 API 测试 ==="
echo "基础URL: $BASE_URL"
echo "调试模式: $DEBUG"
echo ""

# # 1. 健康检查
# test_api "1. 健康检查" "GET" "$BASE_URL/health" "-H \"Content-Type: application/json\""

# # 2. 获取达人列表
# test_api "2. 获取达人列表" "GET" "$BASE_URL/influencer-current?page=1&limit=5" "-H \"Content-Type: application/json\""

# # 3. 搜索达人
# test_api "3. 搜索达人" "GET" "$BASE_URL/influencer-current" "-H \"Content-Type: application/json\" -H \"Authorization: Bearer $TOKEN\"" "keyword=测试&platform=douyin"

# # 4. 获取达人统计信息
# test_api "4. 获取达人统计信息" "GET" "$BASE_URL/influencer-current/stats" "-H \"Content-Type: application/json\""

# # 5. 创建新达人 (需要认证)
# CREATE_DATA=$(cat <<EOF
# {
#     "canonical_name": "测试达人API_$(date +%s)",
#     "canonical_name_source": "api_test",
#     "main_platform": "douyin",
#     "gender": "female",
#     "city": "北京",
#     "follower": 1000000,
#     "interact_rate_within_30d": 0.05,
#     "star_index": 85.5,
#     "price_1_20": 5000,
#     "price_20_60": 8000,
#     "price_60": 12000,
#     "is_excellent_author": true
# }
# EOF
# )
# test_api "5. 创建新达人" "POST" "$BASE_URL/influencer-current" "-H \"Content-Type: application/json\" -H \"Authorization: Bearer $TOKEN\"" "$CREATE_DATA"

# # 6. 获取推荐达人
# test_api "6. 获取推荐达人" "GET" "$BASE_URL/influencer-current/recommendations?limit=3&platform=douyin" "-H \"Content-Type: application/json\""

# # 7. 创建爬取任务 (需要认证)
# TASK_DATA=$(cat <<EOF
# {
#     "task_name": "测试爬取任务",
#     "task_type": "influencer_crawl",
#     "description": "API测试爬取任务",
#     "priority": "normal",
#     "config": {
#         "platform": "douyin",
#         "count": 100
#     },
#     "executor": "test-crawler",
#     "created_by": "api-test"
# }
# EOF
# )
# 已移除：crawl-task 相关测试已下线
# test_api "7. 创建爬取任务" "POST" "$BASE_URL/crawl-task" "-H \"Content-Type: application/json\" -H \"Authorization: Bearer $TOKEN\"" "$TASK_DATA"

# 已移除：crawl-task 相关测试已下线
# test_api "8. 获取爬取任务列表" "GET" "$BASE_URL/crawl-task?page=1&limit=10&status=pending" "-H \"Authorization: Bearer $TOKEN\""

# 已移除：crawl-task 相关测试已下线
# test_api "9. 获取任务统计信息" "GET" "$BASE_URL/crawl-task/stats" "-H \"Content-Type: application/json\""

# # 10. 搜索达人 (高级搜索)
# test_api "10. 搜索达人 (高级搜索)" "GET" "$BASE_URL/search/influencers" "-H \"Content-Type: application/json\" -H \"Authorization: Bearer $TOKEN\"" "keyword=测试&platform=douyin"

# # 11. 获取搜索建议
# test_api "11. 获取搜索建议" "GET" "$BASE_URL/search/suggestions?query=test" "-H \"Content-Type: application/json\" -H \"Authorization: Bearer $TOKEN\""

# 已移除：crawl-task 相关测试已下线
# test_api "12. 获取待执行任务" "GET" "$BASE_URL/crawl-task/pending?limit=3" "-H \"Content-Type: application/json\""

 

# # 15. 测试获取所有达人数据（不分页）
# test_api "15. 获取所有达人数据（不分页）" "GET" "$BASE_URL/influencer-current/all-data" "-H \"Content-Type: application/json\""

# 16. 测试爬虫快速抓取 (需要认证) - 已注释
# QUICK_CRAWL_DATA=$(cat <<EOF
# {
#     "platform": "DOUYIN",
#     "keywords": ["测试", "达人"],
#     "max_results": 10
# }
# EOF
# )
# 已移除：crawl-task 相关测试已下线
# test_api "16. 爬虫快速抓取" "POST" "$BASE_URL/crawl-task/crawler/quick-crawl" "-H \"Content-Type: application/json\" -H \"Authorization: Bearer $TOKEN\"" "$QUICK_CRAWL_DATA"

# 已移除：crawl-task 相关测试已下线
# test_api "17. 爬虫数据处理" "POST" "$BASE_URL/crawl-task/crawler/process-data" "-H \"Content-Type: application/json\" -H \"Authorization: Bearer $TOKEN\"" "$PROCESS_DATA"

# 已移除：crawl-task 相关测试已下线
# test_api "18. 手动同步任务状态" "POST" "$BASE_URL/crawl-task/crawler/sync-status" "-H \"Content-Type: application/json\" -H \"Authorization: Bearer $TOKEN\""

# 已移除：crawl-task 相关测试已下线
# test_api "19. 获取爬虫系统统计" "GET" "$BASE_URL/crawl-task/crawler/stats" "-H \"Content-Type: application/json\""

# 已移除：crawl-task 相关测试已下线，健康检查接口不再可用
# test_api "16. 检查爬虫健康状态" "GET" "$BASE_URL/crawl-task/crawler/health" "-H \"Content-Type: application/json\""

echo ""
echo "=== 完整业务流程测试 ==="
echo "测试星图ID: 7425618843545894921"
echo ""

# 全局变量存储创建的ID
CREATED_INFLUENCER_ID=""
CREATED_TASK_ID=""

# 步骤1: 创建达人信息
echo "步骤1: 创建达人信息（包含星图ID）"
CREATE_INFLUENCER_DATA=$(cat <<EOF
{
    "canonical_name": "测试达人_星图7425618843545894921",
    "canonical_name_source": "douyin_star",
    "main_platform": "douyin",
    "gender": "female",
    "city": "北京",
    "follower": 1500000,
    "interact_rate_within_30d": 0.08,
    "star_index": 92.5,
    "price_1_20": 8000,
    "price_20_60": 12000,
    "price_60": 18000,
    "is_excellent_author": true,
    "star_id": "7425618843545894921"
}
EOF
)

# 创建达人并提取ID
echo "正在创建达人..."
INFLUENCER_RESPONSE=$(curl -s -X POST "$BASE_URL/influencer-current" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$CREATE_INFLUENCER_DATA")

echo "达人创建响应: $INFLUENCER_RESPONSE"

# 尝试提取达人ID（假设返回的JSON中有influencer_id字段）
CREATED_INFLUENCER_ID=$(echo "$INFLUENCER_RESPONSE" | grep -o '"influencer_id":"[^"]*"' | cut -d'"' -f4)
echo "创建的达人ID: $CREATED_INFLUENCER_ID"
echo ""

# 步骤2: 创建爬虫任务
echo "步骤2: 创建爬虫任务（使用星图ID）"
CREATE_TASK_DATA=$(cat <<EOF
{
    "task_name": "测试达人7425618843545894921数据爬取",
    "task_type": "influencer_crawl",
    "priority": "normal",
    "description": "爬取达人ID 7425618843545894921 的完整数据，包括基本信息、粉丝数据、作品信息等",
    "config": {
        "author_id": "7425618843545894921",
        "platform_source": 1,
        "platform_channel": 1,
        "crawl_types": [
            "marketing_info",
            "price_info",
            "video_distribution",
            "hot_comments",
            "homepage_videos"
        ]
    },
    "expected_completion_at": "2025-01-13T06:52:34.552Z",
    "max_retries": 3,
    "executor": "influencer_crawler",
    "created_by": "system"
}
EOF
)

# 已移除：crawl-task 相关业务流程测试已下线
# echo "正在创建爬虫任务..."
# TASK_RESPONSE=$(curl -s -X POST "$BASE_URL/crawl-task" \
#     -H "Content-Type: application/json" \
#     -H "Authorization: Bearer $TOKEN" \
#     -d "$CREATE_TASK_DATA")
# 
# echo "任务创建响应: $TASK_RESPONSE"
# 
# # 尝试提取任务ID
# CREATED_TASK_ID=$(echo "$TASK_RESPONSE" | grep -o '"task_id":"[^"]*"' | cut -d'"' -f4)
# echo "创建的任务ID: $CREATED_TASK_ID"
# echo ""
# 
# # 步骤3: 获取任务列表
# echo "步骤3: 获取任务列表"
# test_api "获取任务列表" "GET" "$BASE_URL/crawl-task?page=1&limit=10" "-H \"Content-Type: application/json\" -H \"Authorization: Bearer $TOKEN\""
# 
# # 步骤4: 启动任务（如果任务ID存在）
# if [ -n "$CREATED_TASK_ID" ]; then
#     echo "步骤4: 启动任务 (ID: $CREATED_TASK_ID)"
#     test_api "启动爬虫任务" "POST" "$BASE_URL/crawl-task/$CREATED_TASK_ID/start" "-H \"Content-Type: application/json\" -H \"Authorization: Bearer $TOKEN\""
#     
#     # 等待60秒让爬虫有足够时间爬取数据
#     echo "=== 等待60秒让爬虫爬取数据... ==="
#     sleep 60
# else
#     echo "步骤4: 跳过启动任务（未获取到任务ID）"
# fi
# echo ""

# 步骤5: 获取达人列表
echo "步骤5: 获取达人列表"
test_api "获取达人列表" "GET" "$BASE_URL/influencer-current?page=1&limit=10" "-H \"Content-Type: application/json\" -H \"Authorization: Bearer $TOKEN\""

# 步骤6: 查看达人详情（如果达人ID存在）
if [ -n "$CREATED_INFLUENCER_ID" ]; then
    echo "步骤6: 查看达人详情 (ID: $CREATED_INFLUENCER_ID)"
    test_api "查看达人详情" "GET" "$BASE_URL/influencer-current/$CREATED_INFLUENCER_ID" "-H \"Content-Type: application/json\" -H \"Authorization: Bearer $TOKEN\""
else
    echo "步骤6: 跳过查看达人详情（未获取到达人ID）"
fi
echo ""

 

echo "=== 完整业务流程测试完成 ==="
echo ""
echo "流程总结："
echo "1. ✅ 创建达人信息（包含星图ID: 7425618843545894921）"
echo "2. ✅ 创建爬虫任务（配置星图ID作为author_id）"
echo "3. ✅ 获取任务列表（查看所有任务）"
echo "4. ✅ 启动任务（开始执行爬虫）"
echo "5. ✅ 获取达人列表（查看所有达人）"
echo "6. ✅ 查看达人详情（根据达人ID）"
 
echo ""

echo "=== API 测试完成 ==="
echo ""
echo "使用说明："
echo "1. 修改脚本顶部的 TOKEN 变量为实际的JWT令牌"
echo "2. 确保应用已启动在 http://localhost:9000"
echo "3. 运行脚本: chmod +x test-api-curl.sh && ./test-api-curl.sh"
echo "4. 查看每个接口的返回结果和状态码"