#!/bin/bash

#=============================================================================
# PostgreSQL 数据库远程备份脚本
# 功能: 在服务器上执行备份,然后下载到本地
# 使用方法: ./remote-backup-postgres-db.sh
#=============================================================================

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 服务器连接配置
SERVER_HOST="192.168.102.168"
SERVER_USER="root"
SSH_KEY="/Users/samuel/Desktop/系统开发/others/192.168.102 (8).168_id_ed25519"

# 数据库配置
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_NAME="crawler_db_v2"

# 备份文件配置
LOCAL_BACKUP_DIR="./postgres-backups"
REMOTE_BACKUP_DIR="/tmp/postgres-backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="crawler_db_v2_backup_${TIMESTAMP}.sql.gz"

mkdir -p "${LOCAL_BACKUP_DIR}"

echo -e "${GREEN}=== PostgreSQL 远程数据库备份工具 ===${NC}"
echo -e "${YELLOW}服务器地址:${NC} ${SERVER_HOST}"
echo -e "${YELLOW}数据库名称:${NC} ${DB_NAME}"
echo -e "${YELLOW}本地备份目录:${NC} ${LOCAL_BACKUP_DIR}"
echo ""

echo -e "${GREEN}[1/5] 在服务器上创建备份目录...${NC}"
ssh -i "${SSH_KEY}" ${SERVER_USER}@${SERVER_HOST} "mkdir -p ${REMOTE_BACKUP_DIR}"
echo -e "${GREEN}✓ 备份目录创建成功${NC}"
echo ""

echo -e "${GREEN}[2/5] 在服务器上执行数据库备份...${NC}"
echo -e "${YELLOW}这可能需要几分钟,请耐心等待...${NC}"

ssh -i "${SSH_KEY}" ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'
export PGPASSWORD="postgres"

echo "正在备份数据库..."
if pg_dump -h localhost -p 5432 -U postgres -d crawler_db_v2 \
    --no-owner --no-acl --format=plain \
    --file=/tmp/postgres-backups/crawler_db_v2_backup.sql; then
    echo "✓ 数据库备份成功"
    
    echo "正在压缩备份文件..."
    gzip -f /tmp/postgres-backups/crawler_db_v2_backup.sql
    echo "✓ 压缩完成"
    
    # 显示文件大小
    ls -lh /tmp/postgres-backups/crawler_db_v2_backup.sql.gz | awk '{print "备份文件大小: "$5}'
else
    echo "错误: 备份失败"
    exit 1
fi

# 生成备份信息
echo "正在生成备份信息..."
cat > /tmp/postgres-backups/backup_info.txt << EOF
PostgreSQL 数据库备份信息
========================
备份时间: $(date +"%Y-%m-%d %H:%M:%S")
数据库名称: crawler_db_v2
服务器: 192.168.102.168

数据库统计:
EOF

psql -h localhost -p 5432 -U postgres -d crawler_db_v2 -t -c "
SELECT 
    '数据表数量: ' || COUNT(*) 
FROM information_schema.tables 
WHERE table_schema = 'public';
" >> /tmp/postgres-backups/backup_info.txt

psql -h localhost -p 5432 -U postgres -d crawler_db_v2 -t -c "
SELECT 
    '数据库大小: ' || pg_size_pretty(pg_database_size('crawler_db_v2'));
" >> /tmp/postgres-backups/backup_info.txt

echo "" >> /tmp/postgres-backups/backup_info.txt
echo "数据表列表:" >> /tmp/postgres-backups/backup_info.txt
echo "-----------" >> /tmp/postgres-backups/backup_info.txt

psql -h localhost -p 5432 -U postgres -d crawler_db_v2 -t -c "
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
" >> /tmp/postgres-backups/backup_info.txt

echo "✓ 备份信息已生成"

unset PGPASSWORD
ENDSSH

echo -e "${GREEN}✓ 服务器端备份完成${NC}"
echo ""

echo -e "${GREEN}[3/5] 从服务器下载备份文件...${NC}"
scp -i "${SSH_KEY}" \
    ${SERVER_USER}@${SERVER_HOST}:${REMOTE_BACKUP_DIR}/crawler_db_v2_backup.sql.gz \
    "${LOCAL_BACKUP_DIR}/${BACKUP_FILENAME}"
echo -e "${GREEN}✓ 备份文件下载成功${NC}"
echo ""

echo -e "${GREEN}[4/5] 下载备份信息文件...${NC}"
scp -i "${SSH_KEY}" \
    ${SERVER_USER}@${SERVER_HOST}:${REMOTE_BACKUP_DIR}/backup_info.txt \
    "${LOCAL_BACKUP_DIR}/backup_info_${TIMESTAMP}.txt"
echo -e "${GREEN}✓ 备份信息下载成功${NC}"
echo ""

echo -e "${GREEN}[5/5] 清理服务器临时文件...${NC}"
ssh -i "${SSH_KEY}" ${SERVER_USER}@${SERVER_HOST} \
    "rm -f ${REMOTE_BACKUP_DIR}/crawler_db_v2_backup.sql.gz ${REMOTE_BACKUP_DIR}/backup_info.txt"
echo -e "${GREEN}✓ 临时文件已清理${NC}"
echo ""

# 显示备份信息
echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}备份完成!${NC}"
echo ""
echo -e "${YELLOW}本地备份文件:${NC}"
echo -e "  - ${LOCAL_BACKUP_DIR}/${BACKUP_FILENAME}"
echo -e "  - ${LOCAL_BACKUP_DIR}/backup_info_${TIMESTAMP}.txt"
echo ""

# 显示备份文件大小
BACKUP_SIZE=$(ls -lh "${LOCAL_BACKUP_DIR}/${BACKUP_FILENAME}" | awk '{print $5}')
echo -e "${YELLOW}备份文件大小:${NC} ${BACKUP_SIZE}"
echo ""

echo -e "${YELLOW}查看备份信息:${NC}"
echo -e "  cat ${LOCAL_BACKUP_DIR}/backup_info_${TIMESTAMP}.txt"
echo ""

echo -e "${YELLOW}恢复到其他服务器:${NC}"
echo -e "  ./scripts/restore-postgres-db.sh ${LOCAL_BACKUP_DIR}/${BACKUP_FILENAME} <目标服务器IP>"
echo -e "${GREEN}==================================${NC}"
