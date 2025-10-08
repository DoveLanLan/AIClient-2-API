# Kiro API 错误解决指南（中文版）

## 📋 你遇到的错误

### 错误 1: 速率限制
```
[Rate Limit] Blocked request for key claude-kiro-oauth. 1 requests within 1000ms.
```
**含义**：请求速度太快，被限流了（1秒内只允许1个请求）

### 错误 2: 400 请求格式错误（核心问题）
```javascript
[Kiro] API Error 400: {
  status: 400,
  statusText: 'Bad Request',
  data: { message: 'Improperly formed request.', reason: null },
  authMethod: 'IdC',
  hasProfileArn: false
}
```
**含义**：使用 IdC 企业认证时，请求格式不正确

---

## 🔍 问题原因

### 1. 速率限制太严格
- 默认配置：每秒只允许 1 个请求
- 即使正常使用也会被阻止
- **需要放宽或禁用**

### 2. IdC 认证配置不完整（主要原因）
你正在使用 **IdC（Identity Center）企业认证**，但可能：

#### ❌ 缺少必要字段
IdC 认证需要这些字段：
- ✅ `accessToken` - 访问令牌
- ✅ `refreshToken` - 刷新令牌  
- ✅ `clientId` - 客户端 ID（**IdC 必需**）
- ✅ `clientSecret` - 客户端密钥（**IdC 必需**）
- ✅ `authMethod: "IdC"` - 认证方法
- ✅ `region` - 区域（如 "us-east-1"）
- ❌ `profileArn` - **IdC 不需要**（这是 Social 认证才需要的）

#### 认证方法对比

| 项目 | Social 认证<br>（个人账号） | IdC 认证<br>（企业账号） |
|------|----------------------|-------------------|
| 适用对象 | 个人用户 | 企业用户 |
| 登录方式 | Google/GitHub 等 | 公司 AWS SSO |
| `profileArn` | ✅ 必需 | ❌ 不需要 |
| `clientId` | ❌ 不需要 | ✅ **必需** |
| `clientSecret` | ❌ 不需要 | ✅ **必需** |

---

## 🛠️ 解决方案

### 方法 1: 使用自动化工具（推荐）⭐

#### 步骤 1: 运行诊断
```bash
# Windows
quick-fix-kiro.bat

# 或者分步运行
node diagnose-kiro-auth.js
```

诊断工具会检查：
- ✅ Token 文件是否存在
- ✅ 必要字段是否完整
- ✅ Token 是否过期
- ✅ 认证方法是否正确
- ✅ 是否有其他可用的 token

#### 步骤 2: 修复配置
```bash
node fix-kiro-config.js
```

选择修复选项：
1. **放宽速率限制**（推荐）- 每秒允许 10 个请求
2. **禁用速率限制**（开发环境可用）
3. **自定义速率限制**
4. **保持不变**

### 方法 2: 手动修复配置文件

#### 修复 1: 放宽速率限制

编辑 `config.json`：

```json
{
  "RATE_LIMIT_ENABLED": true,
  "RATE_LIMIT_MAX_REQUESTS": 10,
  "RATE_LIMIT_WINDOW_MS": 1000
}
```

或禁用速率限制（仅用于开发）：

```json
{
  "RATE_LIMIT_ENABLED": false
}
```

#### 修复 2: 检查 Token 文件

Token 文件位置：
- Windows: `C:\Users\你的用户名\.aws\sso\cache\kiro-auth-token.json`
- Mac/Linux: `~/.aws/sso/cache/kiro-auth-token.json`

**IdC 认证的正确格式：**

```json
{
  "accessToken": "eyJraWQiOi...",
  "refreshToken": "eyJjdHki...",
  "clientId": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "clientSecret": "yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy",
  "authMethod": "IdC",
  "region": "us-east-1",
  "expiresAt": "2025-10-09T10:00:00.000Z"
}
```

⚠️ **重要提示：**
- 如果你是 IdC 用户，**不要**添加 `profileArn` 字段
- 必须包含 `clientId` 和 `clientSecret`

### 方法 3: 重新获取认证凭证

如果 Token 文件损坏或缺少字段：

#### 步骤 1: 重新登录

```bash
# 使用 AWS CLI 重新登录
aws sso login --profile your-profile

# 或在 Kiro IDE 中重新登录
```

#### 步骤 2: 查找新的认证文件

登录后，在 `.aws/sso/cache/` 目录下会生成新的 JSON 文件。

#### 步骤 3: 确认必要字段

确保新生成的文件包含：
- ✅ `clientId`
- ✅ `clientSecret`
- ✅ `authMethod: "IdC"`

如果没有，需要从以下途径获取：
1. AWS Identity Center 管理控制台
2. 联系公司的 AWS 管理员
3. Kiro IDE 的设置中查看

#### 步骤 4: 复制到主 Token 文件

```bash
# Windows PowerShell
Copy-Item "新的token文件.json" "$env:USERPROFILE\.aws\sso\cache\kiro-auth-token.json"

# Mac/Linux
cp 新的token文件.json ~/.aws/sso/cache/kiro-auth-token.json
```

---

## ✅ 验证修复

### 1. 再次运行诊断

```bash
node diagnose-kiro-auth.js
```

应该看到：
```
✅ Token 文件存在
✅ Access Token: eyJraWQiOi...
✅ Refresh Token: eyJjdHki...
✅ 过期时间: 2025-10-09 18:00:00
✅ 认证方法: IdC
✅ clientId: xxxxxxxxxxxxxxxxxxxxxxxx...
✅ clientSecret: yyyyyyyyyyyyyyyyyyyyyyyy...
✅ Token 有效 (剩余 23 小时 45 分钟)
```

### 2. 测试 API

```bash
curl -X POST http://localhost:3000/v1/messages ^
  -H "Content-Type: application/json" ^
  -H "x-api-key: 你的API密钥" ^
  -d "{\"model\":\"claude-3-7-sonnet-20250219\",\"messages\":[{\"role\":\"user\",\"content\":\"你好\"}],\"max_tokens\":100}"
```

### 3. 启动服务器

```bash
node src/api-server.js --model-provider claude-kiro-oauth
```

正常启动应该看到：
```
✅ [Kiro] Initializing Kiro API Service...
✅ [Kiro Auth] Successfully loaded credentials...
✅ [Kiro] Basic initialization completed
```

不应该看到：
```
❌ [Kiro] API Error 400
❌ [Rate Limit] Blocked request
```

---

## 🔧 高级解决方案

### 使用环境变量

如果不想使用配置文件，可以用环境变量：

```powershell
# Windows PowerShell
$env:KIRO_ACCESS_TOKEN="你的访问令牌"
$env:KIRO_REFRESH_TOKEN="你的刷新令牌"
$env:KIRO_CLIENT_ID="你的客户端ID"
$env:KIRO_CLIENT_SECRET="你的客户端密钥"
$env:KIRO_AUTH_METHOD="IdC"
$env:KIRO_REGION="us-east-1"

# 启动服务器
node src/api-server.js --model-provider claude-kiro-oauth
```

```bash
# Mac/Linux
export KIRO_ACCESS_TOKEN="你的访问令牌"
export KIRO_REFRESH_TOKEN="你的刷新令牌"
export KIRO_CLIENT_ID="你的客户端ID"
export KIRO_CLIENT_SECRET="你的客户端密钥"
export KIRO_AUTH_METHOD="IdC"
export KIRO_REGION="us-east-1"

# 启动服务器
node src/api-server.js --model-provider claude-kiro-oauth
```

### 使用 Base64 编码凭证

如果需要更安全的方式：

```powershell
# 1. 创建认证 JSON 文件
@"
{
  "accessToken": "你的访问令牌",
  "refreshToken": "你的刷新令牌",
  "clientId": "你的客户端ID",
  "clientSecret": "你的客户端密钥",
  "authMethod": "IdC",
  "region": "us-east-1",
  "expiresAt": "2025-10-09T10:00:00.000Z"
}
"@ | Out-File -FilePath kiro-creds.json -Encoding UTF8

# 2. Base64 编码
$bytes = [System.IO.File]::ReadAllBytes("kiro-creds.json")
$base64 = [Convert]::ToBase64String($bytes)
Write-Output $base64

# 3. 使用编码后的凭证启动
node src/api-server.js --model-provider claude-kiro-oauth --kiro-oauth-creds-base64 "$base64"
```

---

## ❓ 常见问题

### Q1: 为什么显示 "hasProfileArn: false"？
**答：** 这是正常的！如果你使用 IdC 企业认证，不需要 `profileArn`。只有 Social 个人认证才需要。

### Q2: 如何知道我用的是哪种认证？
**答：** 
- **IdC 企业认证**：通过公司的 AWS SSO 登录，需要 `clientId` 和 `clientSecret`
- **Social 个人认证**：通过 Google/GitHub 登录，需要 `profileArn`

### Q3: clientId 和 clientSecret 在哪里找？
**答：**
1. AWS Identity Center 管理控制台
2. 联系公司的 AWS 管理员
3. 从 `.aws/sso/cache/` 目录下的其他 JSON 文件中查找
4. Kiro IDE 的认证设置中

### Q4: Token 自动刷新失败怎么办？
**答：**
1. 确认 `refreshToken` 有效
2. 确认 `clientId` 和 `clientSecret` 正确
3. 确认网络可以访问 AWS 端点
4. 重新登录获取新凭证

### Q5: 速率限制应该设多少？
**答：**
- **单用户开发**：禁用或设置 20+
- **小团队**：设置 10-20
- **生产环境**：设置 5-10
- **默认建议**：10（每秒 10 个请求）

### Q6: 错误信息显示 403 而不是 400？
**答：** 403 表示认证失败，请查看：
- `FIX-403-README.md` - 403 错误专用指南
- 确认 Token 未过期
- 运行诊断工具检查

---

## 📚 相关文档

- **KIRO-ERROR-GUIDE.md** - 英文详细指南
- **FIX-403-README.md** - 403 错误解决方案
- **ENTERPRISE-IDC-GUIDE.md** - 企业 IdC 配置指南

---

## 📞 获取帮助

如果上述方法都无法解决：

### 1. 收集诊断信息
```bash
node diagnose-kiro-auth.js > diagnosis.log
```

### 2. 检查的内容
- [ ] Token 文件是否存在且完整
- [ ] `clientId` 和 `clientSecret` 是否正确
- [ ] Token 是否过期
- [ ] 网络是否能访问 AWS 端点
- [ ] 速率限制是否已调整

### 3. 联系支持
- AWS / Kiro 技术支持
- 公司的 AWS 管理员
- 项目维护者

---

## 🎯 快速总结

### 核心问题
1. ❌ **速率限制太严格** → 放宽到每秒 10 个请求
2. ❌ **IdC 认证缺少字段** → 添加 `clientId` 和 `clientSecret`

### 快速修复步骤
```bash
# 1. 诊断
node diagnose-kiro-auth.js

# 2. 修复配置
node fix-kiro-config.js

# 3. 验证
node diagnose-kiro-auth.js

# 4. 重启服务器
node src/api-server.js --model-provider claude-kiro-oauth
```

### 必须包含的字段（IdC）
```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "clientId": "...",        ← 必需
  "clientSecret": "...",    ← 必需
  "authMethod": "IdC",      ← 必需
  "region": "us-east-1"
}
```

---

**最后更新**: 2025-10-08
