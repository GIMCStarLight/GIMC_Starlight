-- PostgreSQL表结构创建脚本
-- 用于创建RBAC系统的PostgreSQL表
-- 执行方式: psql -h 192.168.102.168 -U postgres -d crawler_db_v2 -f scripts/create-postgres-rbac-tables.sql

-- 1. 用户认证表
CREATE TABLE IF NOT EXISTS user_auth (
    id BIGSERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    status SMALLINT DEFAULT 1,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_auth_phone ON user_auth(phone);
CREATE INDEX idx_user_auth_status ON user_auth(status);

COMMENT ON TABLE user_auth IS '用户认证表';
COMMENT ON COLUMN user_auth.phone IS '手机号（唯一）';
COMMENT ON COLUMN user_auth.password_hash IS '密码哈希';
COMMENT ON COLUMN user_auth.status IS '状态：1=正常, 0=禁用';

-- 2. 用户资料表
CREATE TABLE IF NOT EXISTS user_profile (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    nickname VARCHAR(50),
    avatar VARCHAR(500),
    email VARCHAR(100),
    real_name VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_profile_user FOREIGN KEY (user_id) REFERENCES user_auth(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_profile_user_id ON user_profile(user_id);

COMMENT ON TABLE user_profile IS '用户资料表';
COMMENT ON COLUMN user_profile.user_id IS '关联user_auth.id';

-- 3. 角色表
CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(200),
    parent_id BIGINT,
    sort INT DEFAULT 0,
    status SMALLINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_roles_parent FOREIGN KEY (parent_id) REFERENCES roles(id) ON DELETE SET NULL
);

CREATE INDEX idx_roles_code ON roles(code);
CREATE INDEX idx_roles_parent_id ON roles(parent_id);
CREATE INDEX idx_roles_status ON roles(status);

COMMENT ON TABLE roles IS '角色表';
COMMENT ON COLUMN roles.code IS '角色编码（唯一）';
COMMENT ON COLUMN roles.parent_id IS '父角色ID（支持角色层级）';

-- 4. 权限表
CREATE TYPE permission_type AS ENUM ('API', 'BUTTON', 'MENU');

CREATE TABLE IF NOT EXISTS permissions (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    type permission_type DEFAULT 'API',
    description VARCHAR(200),
    parent_id BIGINT,
    resource VARCHAR(200),
    action VARCHAR(50),
    sort INT DEFAULT 0,
    status SMALLINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_permissions_parent FOREIGN KEY (parent_id) REFERENCES permissions(id) ON DELETE SET NULL
);

CREATE INDEX idx_permissions_code ON permissions(code);
CREATE INDEX idx_permissions_type ON permissions(type);
CREATE INDEX idx_permissions_parent_id ON permissions(parent_id);
CREATE INDEX idx_permissions_resource ON permissions(resource);
CREATE INDEX idx_permissions_status ON permissions(status);

COMMENT ON TABLE permissions IS '权限表';
COMMENT ON COLUMN permissions.type IS '权限类型：API/BUTTON/MENU';
COMMENT ON COLUMN permissions.resource IS '资源路径（如API路径）';
COMMENT ON COLUMN permissions.action IS '操作（如GET/POST/PUT/DELETE）';

-- 5. 用户角色关联表
CREATE TABLE IF NOT EXISTS user_roles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES user_auth(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT uk_user_roles UNIQUE (user_id, role_id)
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

COMMENT ON TABLE user_roles IS '用户角色关联表';

-- 6. 角色权限关联表
CREATE TABLE IF NOT EXISTS role_permissions (
    id BIGSERIAL PRIMARY KEY,
    role_id BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    CONSTRAINT uk_role_permissions UNIQUE (role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

COMMENT ON TABLE role_permissions IS '角色权限关联表';

-- 7. 标签表
CREATE TABLE IF NOT EXISTS tags (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(200),
    platform VARCHAR(50),
    level INT DEFAULT 1,
    parent_id BIGINT,
    sort INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tags_parent FOREIGN KEY (parent_id) REFERENCES tags(id) ON DELETE SET NULL
);

CREATE INDEX idx_tags_code ON tags(code);
CREATE INDEX idx_tags_platform ON tags(platform);
CREATE INDEX idx_tags_parent_id ON tags(parent_id);
CREATE INDEX idx_tags_is_active ON tags(is_active);
CREATE INDEX idx_tags_metadata ON tags USING GIN (metadata);

COMMENT ON TABLE tags IS '标签表（支持多级分类）';
COMMENT ON COLUMN tags.platform IS '平台：douyin/kuaishou/xiaohongshu等';
COMMENT ON COLUMN tags.metadata IS 'JSONB格式的扩展信息';

-- 创建更新时间自动触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_auth_updated_at BEFORE UPDATE ON user_auth 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profile_updated_at BEFORE UPDATE ON user_profile 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON permissions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 输出创建结果
SELECT 'RBAC表结构创建完成' AS status;
