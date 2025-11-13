#!/bin/bash

# 测试达人广场V3 API

BASE_URL="http://localhost:3000"

echo "======================================"
echo "测试达人广场V3 API"
echo "======================================"
echo ""

# 1. 测试统计接口
echo "1. 测试统计接口 GET /influencers/v3/stats"
curl -s "${BASE_URL}/influencers/v3/stats" | jq '.'
echo ""
echo ""

# 2. 测试列表接口（无筛选）
echo "2. 测试列表接口（无筛选）GET /influencers/v3/list?page=1&pageSize=5"
curl -s "${BASE_URL}/influencers/v3/list?page=1&pageSize=5" | jq '.'
echo ""
echo ""

# 3. 测试列表接口（达人等级筛选）
echo "3. 测试列表接口（达人等级=macro）GET /influencers/v3/list?tier=macro&pageSize=3"
curl -s "${BASE_URL}/influencers/v3/list?tier=macro&pageSize=3" | jq '.'
echo ""
echo ""

# 4. 测试列表接口（特殊标签筛选）
echo "4. 测试列表接口（优质达人）GET /influencers/v3/list?specialTag=excellent&pageSize=3"
curl -s "${BASE_URL}/influencers/v3/list?specialTag=excellent&pageSize=3" | jq '.'
echo ""
echo ""

# 5. 测试列表接口（电商筛选）
echo "5. 测试列表接口（电商达人）GET /influencers/v3/list?ecommerce=enabled&pageSize=3"
curl -s "${BASE_URL}/influencers/v3/list?ecommerce=enabled&pageSize=3" | jq '.'
echo ""
echo ""

# 6. 测试列表接口（粉丝范围筛选）
echo "6. 测试列表接口（粉丝100万-1000万）GET /influencers/v3/list?followerMin=1000000&followerMax=10000000&pageSize=3"
curl -s "${BASE_URL}/influencers/v3/list?followerMin=1000000&followerMax=10000000&pageSize=3" | jq '.'
echo ""
echo ""

# 7. 测试排序
echo "7. 测试排序（按粉丝数降序）GET /influencers/v3/list?sortBy=follower_desc&pageSize=5"
curl -s "${BASE_URL}/influencers/v3/list?sortBy=follower_desc&pageSize=5" | jq '.'
echo ""
echo ""

echo "======================================"
echo "测试完成"
echo "======================================"
