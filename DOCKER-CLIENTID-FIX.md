# Docker ClientIdHash 路径问题修复

## 🔴 问题描述

在 Docker 容器中运行时，出现以下错误：

```
[Kiro Auth] Skipping directory scan because specific file path is configured: /app/.aws/sso/cache/kiro-auth-token.json
[Kiro Auth] Found clientIdHash, attempting to load client credentials from: /root/.aws/sso/cache/e87895ae36d9539303a0bcd27feb465a60aeb433.json
[Kiro Auth] Credential file not found: /root/.aws/sso/cache/e87895ae36d9539303a0bcd27feb465a60aeb433.json
[Kiro Auth] Could not load client credentials from clientIdHash file: /root/.aws/sso/cache/e87895ae36d9539303a0bcd27feb465a60aeb433.json
```

### 根本原因

代码存在路径不一致问题：
- **主 token 文件路径**：`/app/.aws/sso/cache/kiro-auth-token.json`（通过 `--kiro-oauth-creds-file` 指定）
- **查找 clientIdHash 文件的路径**：`/root/.aws/sso/cache/`（使用默认的 `os.homedir()`）

当代码尝试根据 `clientIdHash` 加载 client 凭证文件时，使用了错误的目录路径。

## ✅ 修复方案

### 1. 代码修复（`src/claude/claude-kiro.js`）

**修改前：**
```javascript
// Priority 4: Load clientId and clientSecret from clientIdHash file if present
if (mergedCredentials.clientIdHash && (!mergedCredentials.clientId || !mergedCredentials.clientSecret)) {
  const clientIdHashFile = path.join(this.credPath, `${mergedCredentials.clientIdHash}.json`);
  // ...
}
```

**修改后：**
```javascript
// Priority 4: Load clientId and clientSecret from clientIdHash file if present
if (mergedCredentials.clientIdHash && (!mergedCredentials.clientId || !mergedCredentials.clientSecret)) {
  // Use the same directory as the main token file if a specific path was configured
  const hashFileDir = this.credsFilePath ? path.dirname(this.credsFilePath) : this.credPath;
  const clientIdHashFile = path.join(hashFileDir, `${mergedCredentials.clientIdHash}.json`);
  // ...
}
```

**改进点：**
- ✅ 当指定了 `credsFilePath` 时，使用该文件所在的目录查找 clientIdHash 文件
- ✅ 保持向后兼容，未指定时仍使用默认的 `credPath`
- ✅ 确保主 token 文件和 clientIdHash 文件在同一目录

### 2. Docker 配置修复（`docker-compose.yml`）

**修改前：**
```yaml
volumes:
  - ${HOME}/.aws/sso/cache/kiro-auth-token.json:/app/.aws/sso/cache/kiro-auth-token.json:rw
  - /etc/localtime:/etc/localtime:ro
```

**修改后：**
```yaml
volumes:
  - ${HOME}/.aws/sso/cache:/app/.aws/sso/cache:rw
  - /etc/localtime:/etc/localtime:ro
```

**改进点：**
- ✅ 挂载整个 SSO cache 目录，而不仅仅是单个文件
- ✅ 确保 clientIdHash 文件（如 `e87895ae36d9539303a0bcd27feb465a60aeb433.json`）也能被访问
- ✅ 支持 token 刷新时的文件写入

## 🚀 使用方法

### 重新构建并启动容器

```bash
# 停止现有容器
docker-compose down

# 重新构建镜像（如果需要）
docker-compose build

# 启动容器
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 验证修复

启动后应该看到类似的日志：

```
[Kiro Auth] Found clientIdHash, attempting to load client credentials from: /app/.aws/sso/cache/e87895ae36d9539303a0bcd27feb465a60aeb433.json
[Kiro Auth] Successfully loaded clientId and clientSecret from e87895ae36d9539303a0bcd27feb465a60aeb433.json
```

## 📝 技术细节

### 文件结构

在宿主机上（`~/.aws/sso/cache/`）：
```
kiro-auth-token.json                              # 主 token 文件
e87895ae36d9539303a0bcd27feb465a60aeb433.json    # clientIdHash 对应的 client 凭证文件
```

在容器中（`/app/.aws/sso/cache/`）：
```
kiro-auth-token.json                              # 主 token 文件
e87895ae36d9539303a0bcd27feb465a60aeb433.json    # clientIdHash 对应的 client 凭证文件
```

### 路径解析逻辑

```javascript
// 确定 clientIdHash 文件的查找目录
const hashFileDir = this.credsFilePath 
  ? path.dirname(this.credsFilePath)  // 使用指定文件的目录
  : this.credPath;                     // 使用默认目录

// 构建完整路径
const clientIdHashFile = path.join(hashFileDir, `${mergedCredentials.clientIdHash}.json`);
```

**示例：**
- `this.credsFilePath` = `/app/.aws/sso/cache/kiro-auth-token.json`
- `path.dirname(this.credsFilePath)` = `/app/.aws/sso/cache`
- `clientIdHashFile` = `/app/.aws/sso/cache/e87895ae36d9539303a0bcd27feb465a60aeb433.json` ✅

## 🔍 故障排查

### 问题 1：仍然提示找不到 clientIdHash 文件

**检查：**
```bash
# 在宿主机上检查文件是否存在
ls -la ~/.aws/sso/cache/

# 在容器中检查挂载是否正确
docker exec -it aiclient2api ls -la /app/.aws/sso/cache/
```

**解决：**
- 确保宿主机上存在 clientIdHash 对应的 JSON 文件
- 确认文件名与 `kiro-auth-token.json` 中的 `clientIdHash` 字段值完全匹配
- 检查文件权限（应该可读）

### 问题 2：Token 刷新失败

**检查：**
```bash
# 查看容器日志
docker-compose logs -f aiclient2api
```

**解决：**
- 确保挂载的目录有写权限（`:rw`）
- 检查宿主机上的文件权限

### 问题 3：合并 token 文件（可选优化）

如果希望简化配置，可以将两个文件合并为一个：

```bash
# 在宿主机上运行合并工具
node merge-kiro-tokens.js

# 或使用一键脚本
./fix-kiro-clientid.bat  # Windows
# 或
bash fix-kiro-clientid.bat  # Linux/Mac
```

合并后的文件包含所有必要字段，无需依赖 clientIdHash 查找。

## 📊 对比

| 方案 | 优点 | 缺点 |
|------|------|------|
| **挂载整个目录**（当前方案） | ✅ 自动支持 clientIdHash<br>✅ 支持多个 token 文件<br>✅ 无需手动合并 | ⚠️ 挂载更多文件 |
| **合并 token 文件** | ✅ 只需挂载单个文件<br>✅ 配置更简单 | ⚠️ 需要手动合并<br>⚠️ Token 刷新时需保持合并 |
| **只挂载单个文件**（旧方案） | ✅ 最小化挂载 | ❌ 无法使用 clientIdHash<br>❌ 必须合并文件 |

## 🎯 推荐配置

### 生产环境推荐

**选项 A：使用目录挂载（当前方案）**
```yaml
volumes:
  - ${HOME}/.aws/sso/cache:/app/.aws/sso/cache:rw
```

**优点：**
- 自动支持 AWS SSO 的文件结构
- 无需额外操作
- 完全兼容 AWS CLI 的行为

**选项 B：合并文件后使用单文件挂载**
```bash
# 1. 先合并文件
node merge-kiro-tokens.js

# 2. 使用单文件挂载
# docker-compose.yml:
volumes:
  - ${HOME}/.aws/sso/cache/kiro-auth-token.json:/app/.aws/sso/cache/kiro-auth-token.json:rw
```

**优点：**
- 更精确的权限控制
- 减少容器可访问的文件

## 📚 相关文档

- [CLIENTID-HASH-解决方案.md](./CLIENTID-HASH-解决方案.md) - ClientIdHash 机制详细说明
- [README-CLIENTID-FIX.md](./README-CLIENTID-FIX.md) - ClientId 问题修复指南
- [ENTERPRISE-IDC-GUIDE.md](./ENTERPRISE-IDC-GUIDE.md) - 企业 IdC 认证指南

---

**最后更新：** 2025-10-09  
**修复版本：** v1.1.0

