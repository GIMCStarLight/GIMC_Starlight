#!/bin/bash

#=============================================================================
# PostgreSQL 数据库恢复脚本
# 功能: 将备份文件恢复到目标数据库服务器
# 使用方法: ./restore-postgres-db.sh <备份文件.sql.gz> <目标服务器IP>
#=============================================================================

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查参数
if [ $# -lt 2 ]; then
    echo -e "${RED}使用方法: $0 <备份文件.sql.gz> <目标服务器IP>${NC}"
    echo -e "${YELLOW}示例: $0 ./postgres-backups/crawler_db_v2_backup_20251128.sql.gz 192.168.102.169${NC}"
    exit 1
fi

BACKUP_FILE="$1"
TARGET_HOST="$2"
TARGET_PORT="5432"
TARGET_USER="postgres"
TARGET_PASSWORD="postgres"
DB_NAME="crawler_db_v2"

# 检查备份文件是否存在
if [ ! -f "${BACKUP_FILE}" ]; then
    echo -e "${RED}错误: 备份文件不存在: ${BACKUP_FILE}${NC}"
    exit 1
fi

echo -e "${GREEN}=== PostgreSQL 数据库恢复工具 ===${NC}"
echo -e "${YELLOW}备份文件:${NC} ${BACKUP_FILE}"
echo -e "${YELLOW}目标服务器:${NC} ${TARGET_HOST}:${TARGET_PORT}"
echo -e "${YELLOW}数据库名称:${NC} ${DB_NAME}"
echo ""

# 导出密码环境变量
export PGPASSWORD="${TARGET_PASSWORD}"

echo -e "${GREEN}[1/6] 检查目标服务器连接...${NC}"
if ! psql -h "${TARGET_HOST}" -p "${TARGET_PORT}" -U "${TARGET_USER}" -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}错误: 无法连接到目标服务器${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 目标服务器连接成功${NC}"
echo ""

echo -e "${GREEN}[2/6] 检查目标数据库是否存在...${NC}"
DB_EXISTS=$(psql -h "${TARGET_HOST}" -p "${TARGET_PORT}" -U "${TARGET_USER}" -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}';" | xargs)

if [ "${DB_EXISTS}" = "1" ]; then
    echo -e "${YELLOW}警告: 数据库 ${DB_NAME} 已存在${NC}"
    read -p "是否删除并重新创建数据库? (yes/no): " -r
    if [[ $REPLY =~ ^[Yy]([Ee][Ss])?$ ]]; then
        echo -e "${YELLOW}正在删除现有数据库...${NC}"
        psql -h "${TARGET_HOST}" -p "${TARGET_PORT}" -U "${TARGET_USER}" -d postgres -c "DROP DATABASE ${DB_NAME};"
        echo -e "${GREEN}✓ 数据库已删除${NC}"
    else
        echo -e "${RED}操作已取消${NC}"
        exit 1
    fi
fi
echo ""

echo -e "${GREEN}[3/6] 创建新数据库...${NC}"
psql -h "${TARGET_HOST}" -p "${TARGET_PORT}" -U "${TARGET_USER}" -d postgres -c "CREATE DATABASE ${DB_NAME} WITH ENCODING='UTF8';"
echo -e "${GREEN}✓ 数据库创建成功${NC}"
echo ""

echo -e "${GREEN}[4/6] 解压备份文件...${NC}"
TEMP_SQL_FILE="${BACKUP_FILE%.gz}"

# 如果文件已经是 .sql 格式(未压缩)
if [[ "${BACKUP_FILE}" == *.sql ]]; then
    TEMP_SQL_FILE="${BACKUP_FILE}"
    echo -e "${YELLOW}备份文件未压缩,直接使用${NC}"
else
    if [ -f "${TEMP_SQL_FILE}" ]; then
        rm -f "${TEMP_SQL_FILE}"
    fi
    gunzip -k "${BACKUP_FILE}"
    echo -e "${GREEN}✓ 解压完成${NC}"
fi
echo ""

echo -e "${GREEN}[5/6] 导入数据到目标数据库...${NC}"
echo -e "${YELLOW}这可能需要几分钟,请耐心等待...${NC}"

if psql -h "${TARGET_HOST}" -p "${TARGET_PORT}" -U "${TARGET_USER}" -d "${DB_NAME}" -f "${TEMP_SQL_FILE}" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 数据导入成功${NC}"
else
    echo -e "${RED}错误: 数据导入失败${NC}"
    exit 1
fi
echo ""

echo -e "${GREEN}[6/6] 验证数据完整性...${NC}"
TABLE_COUNT=$(psql -h "${TARGET_HOST}" -p "${TARGET_PORT}" -U "${TARGET_USER}" -d "${DB_NAME}" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
DB_SIZE=$(psql -h "${TARGET_HOST}" -p "${TARGET_PORT}" -U "${TARGET_USER}" -d "${DB_NAME}" -t -c "SELECT pg_size_pretty(pg_database_size('${DB_NAME}'));")

echo -e "${YELLOW}恢复后数据表数量:${NC} ${TABLE_COUNT}"
echo -e "${YELLOW}恢复后数据库大小:${NC} ${DB_SIZE}"
echo ""

# 清理临时文件
if [[ "${BACKUP_FILE}" == *.gz ]] && [ -f "${TEMP_SQL_FILE}" ]; then
    echo -e "${YELLOW}清理临时文件...${NC}"
    rm -f "${TEMP_SQL_FILE}"
fi

# 清理环境变量
unset PGPASSWORD

echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}数据库恢复完成!${NC}"
echo -e "${YELLOW}目标服务器:${NC} ${TARGET_HOST}:${TARGET_PORT}"
echo -e "${YELLOW}数据库名称:${NC} ${DB_NAME}"
echo -e "${YELLOW}数据表数量:${NC} ${TABLE_COUNT}"
echo -e "${YELLOW}数据库大小:${NC} ${DB_SIZE}"
echo -e "${GREEN}==================================${NC}"
