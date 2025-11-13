@echo off
REM 省广星芒系统 Windows 部署脚本
REM 使用方法: deploy.bat [操作]

setlocal enabledelayedexpansion

REM 配置
set PROJECT_NAME=gimcstar-light-system
set DOCKER_COMPOSE_FILE=docker-compose.yml
set BACKUP_DIR=.\backups

REM 颜色定义 (Windows 10+ 支持)
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

REM 获取操作参数
set ACTION=%1
if "%ACTION%"=="" set ACTION=help

goto main

:log_info
echo %BLUE%[INFO]%NC% %~1
goto :eof

:log_success
echo %GREEN%[SUCCESS]%NC% %~1
goto :eof

:log_warning
echo %YELLOW%[WARNING]%NC% %~1
goto :eof

:log_error
echo %RED%[ERROR]%NC% %~1
goto :eof

:check_dependencies
call :log_info "检查依赖..."

docker --version >nul 2>&1
if errorlevel 1 (
    call :log_error "Docker 未安装或不在 PATH 中"
    exit /b 1
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    docker compose version >nul 2>&1
    if errorlevel 1 (
        call :log_error "Docker Compose 未安装或不在 PATH 中"
        exit /b 1
    )
)

call :log_success "依赖检查通过"
goto :eof

:create_backup
call :log_info "创建数据备份..."

if not exist %BACKUP_DIR% mkdir %BACKUP_DIR%

REM 获取时间戳
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "TIMESTAMP=%dt:~0,8%_%dt:~8,6%"

REM 备份 MySQL
docker ps | findstr "gimcstar-mysql" >nul 2>&1
if not errorlevel 1 (
    docker exec gimcstar-mysql mysqldump -u gimcstar -pgimcstar123 gimcstar > "%BACKUP_DIR%\mysql_backup_%TIMESTAMP%.sql"
    call :log_success "MySQL 备份完成: %BACKUP_DIR%\mysql_backup_%TIMESTAMP%.sql"
)

REM 备份 PostgreSQL
docker ps | findstr "gimcstar-postgres" >nul 2>&1
if not errorlevel 1 (
    docker exec gimcstar-postgres pg_dump -U postgres gimcstar > "%BACKUP_DIR%\postgres_backup_%TIMESTAMP%.sql"
    call :log_success "PostgreSQL 备份完成: %BACKUP_DIR%\postgres_backup_%TIMESTAMP%.sql"
)

goto :eof

:build_image
call :log_info "构建 Docker 镜像..."
docker-compose -f %DOCKER_COMPOSE_FILE% build --no-cache
if errorlevel 1 (
    call :log_error "镜像构建失败"
    exit /b 1
)
call :log_success "镜像构建完成"
goto :eof

:deploy_services
call :log_info "部署服务..."

REM 创建备份
call :create_backup

REM 停止现有服务
docker-compose -f %DOCKER_COMPOSE_FILE% down

REM 启动服务
docker-compose -f %DOCKER_COMPOSE_FILE% up -d
if errorlevel 1 (
    call :log_error "服务启动失败"
    exit /b 1
)

REM 等待服务启动
call :log_info "等待服务启动..."
timeout /t 30 /nobreak >nul

REM 健康检查
call :health_check
if errorlevel 1 (
    call :log_error "部署失败"
    exit /b 1
)

call :log_success "部署完成"
goto :eof

:health_check
call :log_info "执行健康检查..."

set /a count=0
:health_loop
set /a count+=1
if %count% gtr 10 (
    call :log_error "健康检查失败"
    exit /b 1
)

curl -f http://localhost:9000/health >nul 2>&1
if not errorlevel 1 (
    call :log_success "应用健康检查通过"
    goto :eof
)

call :log_warning "健康检查失败，重试中... (%count%/10)"
timeout /t 10 /nobreak >nul
goto health_loop

:restart_services
call :log_info "重启服务..."
docker-compose -f %DOCKER_COMPOSE_FILE% restart
call :health_check
if not errorlevel 1 call :log_success "服务重启完成"
goto :eof

:show_logs
call :log_info "显示服务日志..."
docker-compose -f %DOCKER_COMPOSE_FILE% logs -f --tail=100
goto :eof

:stop_services
call :log_info "停止服务..."
docker-compose -f %DOCKER_COMPOSE_FILE% down
call :log_success "服务已停止"
goto :eof

:cleanup
call :log_info "清理未使用的 Docker 资源..."
docker system prune -f
docker volume prune -f
call :log_success "清理完成"
goto :eof

:show_help
echo 省广星芒系统 Windows 部署脚本
echo.
echo 使用方法:
echo   %~nx0 [操作]
echo.
echo 操作:
echo   build     - 构建 Docker 镜像
echo   deploy    - 完整部署 (包含备份、构建、启动)
echo   restart   - 重启服务
echo   logs      - 查看服务日志
echo   stop      - 停止服务
echo   health    - 健康检查
echo   backup    - 创建数据备份
echo   cleanup   - 清理 Docker 资源
echo   help      - 显示此帮助信息
echo.
echo 示例:
echo   %~nx0 deploy   # 完整部署
echo   %~nx0 logs     # 查看日志
echo   %~nx0 restart  # 重启服务
goto :eof

:main
if "%ACTION%"=="build" (
    call :check_dependencies
    call :build_image
) else if "%ACTION%"=="deploy" (
    call :check_dependencies
    call :build_image
    call :deploy_services
) else if "%ACTION%"=="restart" (
    call :check_dependencies
    call :restart_services
) else if "%ACTION%"=="logs" (
    call :show_logs
) else if "%ACTION%"=="stop" (
    call :check_dependencies
    call :stop_services
) else if "%ACTION%"=="health" (
    call :health_check
) else if "%ACTION%"=="backup" (
    call :create_backup
) else if "%ACTION%"=="cleanup" (
    call :cleanup
) else if "%ACTION%"=="help" (
    call :show_help
) else (
    call :log_error "未知操作: %ACTION%"
    call :show_help
    exit /b 1
)

endlocal