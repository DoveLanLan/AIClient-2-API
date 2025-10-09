# Docker 快速启动指南

## 🚀 快速开始

### 前置要求

- Docker 和 Docker Compose 已安装
- 已有有效的 Kiro 认证凭证（`~/.aws/sso/cache/kiro-auth-token.json`）

### 一键启动

```bash
# 启动容器
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止容器
docker-compose down
```

## 📝 配置说明

### 1. 基本配置（`docker-compose.yml`）

```yaml
services:
  aiclient2api:
    build: .
    container_name: aiclient2api
    restart: always
    ports:
      - "3000:3000"
    environment:
      - TZ=Asia/Shanghai
      - ARGS=--model-provider claude-kiro-oauth --api-key 123456 --host 0.0.0.0 --port 3000 --kiro-oauth-creds-file /app/.aws/sso/cache/kiro-auth-token.json
    volumes:
      - ${HOME}/.aws/sso/cache:/app/.aws/sso/cache:rw
      - /etc/localtime:/etc/localtime:ro
```

### 2. 环境变量说明

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `TZ` | 时区设置 | `Asia/Shanghai` |
| `ARGS` | 服务器启动参数 | 见下方说明 |

### 3. 启动参数说明（`ARGS`）

| 参数 | 说明 | 示例 |
|------|------|------|
| `--model-provider` | 模型提供商 | `claude-kiro-oauth` |
| `--api-key` | API 密钥 | `123456` |
| `--host` | 监听地址 | `0.0.0.0` |
| `--port` | 监听端口 | `3000` |
| `--kiro-oauth-creds-file` | Kiro 凭证文件路径 | `/app/.aws/sso/cache/kiro-auth-token.json` |

### 4. 卷挂载说明

```yaml
volumes:
  # Kiro 认证凭证目录（包含 token 和 clientIdHash 文件）
  - ${HOME}/.aws/sso/cache:/app/.aws/sso/cache:rw
  
  # 系统时间同步（可选）
  - /etc/localtime:/etc/localtime:ro
```

**重要：** 挂载整个 `~/.aws/sso/cache` 目录，而不仅仅是单个文件，以支持 `clientIdHash` 机制。

## 🔧 常见问题

### 问题 1：容器启动后提示找不到 clientIdHash 文件

**错误日志：**
```
[Kiro Auth] Could not load client credentials from clientIdHash file: /root/.aws/sso/cache/xxx.json
```

**解决方案：**

1. **检查 docker-compose.yml 配置**（推荐）
   
   确保挂载了整个目录：
   ```yaml
   volumes:
     - ${HOME}/.aws/sso/cache:/app/.aws/sso/cache:rw
   ```

2. **或者合并 token 文件**
   
   ```bash
   # 在宿主机上运行
   node merge-kiro-tokens.js
   ```

3. **验证修复**
   
   ```bash
   # 运行验证脚本
   ./test-docker-clientid.sh
   ```

详细说明请参考：[DOCKER-CLIENTID-FIX.md](./DOCKER-CLIENTID-FIX.md)

### 问题 2：容器无法访问宿主机的凭证文件

**检查步骤：**

```bash
# 1. 检查宿主机文件是否存在
ls -la ~/.aws/sso/cache/

# 2. 检查容器内的文件
docker exec aiclient2api ls -la /app/.aws/sso/cache/

# 3. 检查文件权限
ls -l ~/.aws/sso/cache/kiro-auth-token.json
```

**解决方案：**
- 确保文件存在且有读权限
- 检查 Docker 是否有权限访问宿主机目录
- 在 Windows 上，确保 Docker Desktop 有访问该目录的权限

### 问题 3：Token 过期或刷新失败

**检查：**
```bash
# 查看 token 过期时间
cat ~/.aws/sso/cache/kiro-auth-token.json | grep expiresAt
```

**解决方案：**
```bash
# 重新登录 AWS SSO / Kiro
aws sso login --profile your-profile

# 或使用 Kiro CLI 重新认证
# 然后重启容器
docker-compose restart
```

### 问题 4：端口冲突

**错误：**
```
Error starting userland proxy: listen tcp4 0.0.0.0:3000: bind: address already in use
```

**解决方案：**

修改 `docker-compose.yml` 中的端口映射：
```yaml
ports:
  - "3001:3000"  # 使用 3001 端口
```

或停止占用 3000 端口的进程：
```bash
# 查找占用端口的进程
lsof -i :3000

# 停止进程
kill -9 <PID>
```

## 🧪 测试验证

### 1. 健康检查

```bash
# 检查容器状态
docker ps

# 应该看到 STATUS 列显示 "healthy"
```

### 2. API 测试

```bash
# 测试 API 是否正常工作
curl -X POST http://localhost:3000/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: 123456" \
  -d '{
    "model": "claude-3-7-sonnet-20250219",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 100
  }'
```

### 3. 查看日志

```bash
# 实时查看日志
docker-compose logs -f

# 查看最近 100 行日志
docker-compose logs --tail=100

# 只查看错误日志
docker-compose logs | grep -i error
```

### 4. 运行自动验证脚本

```bash
# 运行完整的验证流程
./test-docker-clientid.sh
```

## 📊 性能优化

### 1. 资源限制

在 `docker-compose.yml` 中添加资源限制：

```yaml
services:
  aiclient2api:
    # ... 其他配置 ...
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### 2. 日志管理

限制日志大小：

```yaml
services:
  aiclient2api:
    # ... 其他配置 ...
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 3. 网络优化

使用 host 网络模式（Linux）：

```yaml
services:
  aiclient2api:
    # ... 其他配置 ...
    network_mode: "host"
    # 注意：使用 host 模式时不需要 ports 配置
```

## 🔐 安全建议

### 1. 修改默认 API Key

**不要使用默认的 `123456`！**

修改 `docker-compose.yml`：
```yaml
environment:
  - ARGS=--model-provider claude-kiro-oauth --api-key YOUR_SECURE_KEY --host 0.0.0.0 --port 3000 --kiro-oauth-creds-file /app/.aws/sso/cache/kiro-auth-token.json
```

### 2. 限制访问

只监听本地地址：
```yaml
environment:
  - ARGS=--model-provider claude-kiro-oauth --api-key YOUR_SECURE_KEY --host 127.0.0.1 --port 3000 --kiro-oauth-creds-file /app/.aws/sso/cache/kiro-auth-token.json
ports:
  - "127.0.0.1:3000:3000"
```

### 3. 使用环境变量文件

创建 `.env` 文件：
```env
API_KEY=your_secure_api_key_here
PORT=3000
```

修改 `docker-compose.yml`：
```yaml
environment:
  - ARGS=--model-provider claude-kiro-oauth --api-key ${API_KEY} --host 0.0.0.0 --port ${PORT} --kiro-oauth-creds-file /app/.aws/sso/cache/kiro-auth-token.json
```

**记得将 `.env` 添加到 `.gitignore`！**

## 🛠️ 维护操作

### 更新镜像

```bash
# 拉取最新代码
git pull

# 重新构建镜像
docker-compose build --no-cache

# 重启容器
docker-compose up -d
```

### 清理旧镜像

```bash
# 删除未使用的镜像
docker image prune -a

# 清理所有未使用的资源
docker system prune -a
```

### 备份配置

```bash
# 备份 docker-compose.yml
cp docker-compose.yml docker-compose.yml.backup

# 备份凭证文件
cp ~/.aws/sso/cache/kiro-auth-token.json ~/.aws/sso/cache/kiro-auth-token.json.backup
```

## 📚 相关文档

- [DOCKER-CLIENTID-FIX.md](./DOCKER-CLIENTID-FIX.md) - ClientId 路径问题修复
- [CLIENTID-HASH-解决方案.md](./CLIENTID-HASH-解决方案.md) - ClientIdHash 机制说明
- [README.md](./README.md) - 项目主文档
- [ENTERPRISE-IDC-GUIDE.md](./ENTERPRISE-IDC-GUIDE.md) - 企业 IdC 认证指南

## 🆘 获取帮助

如果遇到问题：

1. 查看日志：`docker-compose logs -f`
2. 运行诊断：`./test-docker-clientid.sh`
3. 查看相关文档
4. 提交 Issue

---

**最后更新：** 2025-10-09  
**Docker 版本要求：** >= 20.10  
**Docker Compose 版本要求：** >= 2.0

