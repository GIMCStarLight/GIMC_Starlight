#!/bin/bash

#=============================================================================
# 作品投放数据库初始化脚本
# 功能: 在PostgreSQL中创建作品投放数据相关表
# 使用方法: ./init_item_delivery_db.sh
#=============================================================================

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 数据库连接配置
DB_HOST="${POSTGRES_HOST:-192.168.102.168}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_USER="${POSTGRES_USERNAME:-postgres}"
DB_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
DB_NAME="${POSTGRES_DATABASE:-crawler_db_v2}"

# SQL文件路径
SQL_FILE="../backend/migrations/create_item_delivery_tables.sql"

echo -e "${GREEN}=== 作品投放数据库初始化工具 ===${NC}"
echo -e "${YELLOW}数据库地址:${NC} ${DB_HOST}:${DB_PORT}"
echo -e "${YELLOW}数据库名称:${NC} ${DB_NAME}"
echo -e "${YELLOW}SQL文件:${NC} ${SQL_FILE}"
echo ""

# 检查SQL文件是否存在
if [ ! -f "${SQL_FILE}" ]; then
    echo -e "${RED}错误: SQL文件不存在: ${SQL_FILE}${NC}"
    exit 1
fi

# 导出密码环境变量
export PGPASSWORD="${DB_PASSWORD}"

echo -e "${GREEN}[1/3] 检查数据库连接...${NC}"
if ! psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}错误: 无法连接到数据库${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 数据库连接成功${NC}"
echo ""

echo -e "${GREEN}[2/3] 执行SQL迁移脚本...${NC}"
if psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -f "${SQL_FILE}"; then
    echo -e "${GREEN}✓ 表结构创建成功${NC}"
else
    echo -e "${RED}错误: SQL执行失败${NC}"
    exit 1
fi
echo ""

echo -e "${GREEN}[3/3] 验证表结构...${NC}"
TABLE_COUNT=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -c "
    SELECT COUNT(*) 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE 'item_delivery%';
")

echo -e "${YELLOW}作品投放相关表数量:${NC} ${TABLE_COUNT}"

# 显示表列表
echo -e "${YELLOW}表列表:${NC}"
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "
    SELECT table_name, 
           pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE 'item_delivery%'
    ORDER BY table_name;
"

# 清理环境变量
unset PGPASSWORD

echo ""
echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}数据库初始化完成!${NC}"
echo -e "${YELLOW}已创建的表:${NC}"
echo -e "  - item_delivery_runs (运行记录)"
echo -e "  - item_delivery_data (结构化数据)"
echo -e "  - item_delivery_trends (趋势数据)"
echo -e "  - item_delivery_raw_archive (原始数据归档)"
echo -e "  - item_delivery_summary (作品汇总)"
echo ""
echo -e "${YELLOW}下一步:${NC}"
echo -e "  测试数据采集并保存到数据库:"
echo -e "  ${GREEN}python tools/fetch_item_delivery_data.py \\${NC}"
echo -e "    ${GREEN}--item-id 7584864709501832494 \\${NC}"
echo -e "    ${GREEN}--account item_account_1 \\${NC}"
echo -e "    ${GREEN}--save-db \\${NC}"
echo -e "    ${GREEN}--run-name \"测试运行\" \\${NC}"
echo -e "    ${GREEN}--pretty${NC}"
echo -e "${GREEN}==================================${NC}"
