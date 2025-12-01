#!/bin/bash

#=============================================================================
# PostgreSQL 数据库备份脚本
# 功能: 备份整个数据库(包括结构和数据)
# 使用方法: ./backup-postgres-db.sh
#=============================================================================

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 数据库连接配置
DB_HOST="192.168.102.168"
DB_PORT="5432"
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_NAME="crawler_db_v2"

# 备份文件配置
BACKUP_DIR="./postgres-backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/crawler_db_v2_backup_${TIMESTAMP}.sql"
BACKUP_FILE_COMPRESSED="${BACKUP_FILE}.gz"

# 创建备份目录
mkdir -p "${BACKUP_DIR}"

echo -e "${GREEN}=== PostgreSQL 数据库备份工具 ===${NC}"
echo -e "${YELLOW}数据库地址:${NC} ${DB_HOST}:${DB_PORT}"
echo -e "${YELLOW}数据库名称:${NC} ${DB_NAME}"
echo -e "${YELLOW}备份目录:${NC} ${BACKUP_DIR}"
echo ""

# 导出密码环境变量
export PGPASSWORD="${DB_PASSWORD}"

echo -e "${GREEN}[1/5] 检查数据库连接...${NC}"
if ! psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}错误: 无法连接到数据库${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 数据库连接成功${NC}"
echo ""

echo -e "${GREEN}[2/5] 获取数据库统计信息...${NC}"
TABLE_COUNT=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
DB_SIZE=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT pg_size_pretty(pg_database_size('${DB_NAME}'));")
echo -e "${YELLOW}数据表数量:${NC} ${TABLE_COUNT}"
echo -e "${YELLOW}数据库大小:${NC} ${DB_SIZE}"
echo ""

echo -e "${GREEN}[3/5] 开始备份数据库...${NC}"
echo -e "${YELLOW}备份文件:${NC} ${BACKUP_FILE}"

# 使用 pg_dump 备份完整数据库
if pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
    --verbose \
    --no-owner \
    --no-acl \
    --format=plain \
    --file="${BACKUP_FILE}"; then
    echo -e "${GREEN}✓ 数据库备份成功${NC}"
else
    echo -e "${RED}错误: 备份失败${NC}"
    exit 1
fi
echo ""

echo -e "${GREEN}[4/5] 压缩备份文件...${NC}"
if gzip -f "${BACKUP_FILE}"; then
    COMPRESSED_SIZE=$(ls -lh "${BACKUP_FILE_COMPRESSED}" | awk '{print $5}')
    echo -e "${GREEN}✓ 压缩完成${NC}"
    echo -e "${YELLOW}压缩后大小:${NC} ${COMPRESSED_SIZE}"
else
    echo -e "${RED}警告: 压缩失败,但原始备份文件已保存${NC}"
fi
echo ""

echo -e "${GREEN}[5/5] 生成备份清单...${NC}"
MANIFEST_FILE="${BACKUP_DIR}/backup_manifest_${TIMESTAMP}.txt"
cat > "${MANIFEST_FILE}" << EOF
PostgreSQL 数据库备份清单
==========================
备份时间: $(date +"%Y-%m-%d %H:%M:%S")
数据库主机: ${DB_HOST}:${DB_PORT}
数据库名称: ${DB_NAME}
数据库大小: ${DB_SIZE}
数据表数量: ${TABLE_COUNT}
备份文件: $(basename ${BACKUP_FILE_COMPRESSED})
备份文件大小: ${COMPRESSED_SIZE}

数据表列表:
-----------
EOF

psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -c \
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" \
    >> "${MANIFEST_FILE}"

echo -e "${GREEN}✓ 备份清单已生成: ${MANIFEST_FILE}${NC}"
echo ""

# 清理环境变量
unset PGPASSWORD

echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}备份完成!${NC}"
echo -e "${YELLOW}备份文件:${NC}"
echo -e "  - ${BACKUP_FILE_COMPRESSED}"
echo -e "  - ${MANIFEST_FILE}"
echo ""
echo -e "${YELLOW}恢复方法:${NC}"
echo -e "  1. 解压备份文件: gunzip ${BACKUP_FILE_COMPRESSED}"
echo -e "  2. 在目标服务器创建数据库: createdb -h <host> -U postgres ${DB_NAME}"
echo -e "  3. 导入数据: psql -h <host> -U postgres -d ${DB_NAME} -f ${BACKUP_FILE}"
echo -e "${GREEN}==================================${NC}"
