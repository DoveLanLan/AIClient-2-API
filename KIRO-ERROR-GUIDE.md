# Kiro API 错误解决指南

## 问题概述

你遇到的错误有两个：

### 1. 速率限制错误
```
[Rate Limit] Blocked request for key claude-kiro-oauth. 1 requests within 1000ms.
```

### 2. 400 Bad Request 错误（核心问题）
```javascript
{
  status: 400,
  statusText: 'Bad Request',
  data: { message: 'Improperly formed request.', reason: null },
  authMethod: 'IdC',
  hasProfileArn: false
}
```

---

## 问题分析

### 问题 1: 速率限制过于严格

**原因：**
- 默认配置：`RATE_LIMIT_MAX_REQUESTS: 1`（每秒最多1个请求）
- 时间窗口：`RATE_LIMIT_WINDOW_MS: 1000`（1秒）
- 这个限制太严格，即使是正常的单个请求也可能被阻止

**影响：**
- 请求被频繁拒绝
- 返回 429 Too Many Requests 错误
- 无法正常使用 API

### 问题 2: IdC 认证请求格式不正确（关键问题）

**原因：**
使用 **IdC (Identity Center) 企业认证**时，请求可能缺少必要的字段：

1. **缺少 `clientId`** - IdC 认证必需
2. **缺少 `clientSecret`** - IdC 认证必需
3. **Token 已过期** - 需要刷新
4. **Token 文件格式不正确**

**相关代码位置：**
- `src/claude/claude-kiro.js` 第 792-795 行：
  ```javascript
  // Add profileArn for social auth, skip for IdC/Enterprise
  if (this.authMethod === KIRO_CONSTANTS.AUTH_METHOD_SOCIAL && this.profileArn) {
    request.profileArn = this.profileArn;
  }
  ```

- `src/claude/claude-kiro.js` 第 516-521 行：
  ```javascript
  if (this.authMethod !== KIRO_CONSTANTS.AUTH_METHOD_SOCIAL) {
    refreshUrl = this.refreshIDCUrl;
    requestBody.clientId = this.clientId;
    requestBody.clientSecret = this.clientSecret;
    requestBody.grantType = 'refresh_token';
  }
  ```

**IdC vs Social 认证的区别：**

| 字段 | Social 认证 | IdC 认证 |
|------|-------------|----------|
| `accessToken` | ✅ 必需 | ✅ 必需 |
| `refreshToken` | ✅ 必需 | ✅ 必需 |
| `profileArn` | ✅ 必需 | ❌ 不需要 |
| `clientId` | ❌ 不需要 | ✅ 必需 |
| `clientSecret` | ❌ 不需要 | ✅ 必需 |
| `region` | ✅ 必需 | ✅ 必需 |

---

## 解决方案

### 快速诊断

运行诊断工具来检查你的配置：

```bash
node diagnose-kiro-auth.js
```

这个工具会检查：
- ✅ Token 文件是否存在
- ✅ 必要字段是否完整
- ✅ Token 是否过期
- ✅ 认证方法是否正确
- ✅ 其他可用的 token 文件

### 方案 1: 修复速率限制（推荐）

运行配置修复工具：

```bash
node fix-kiro-config.js
```

或手动修改 `config.json`：

```json
{
  "RATE_LIMIT_ENABLED": true,
  "RATE_LIMIT_MAX_REQUESTS": 10,
  "RATE_LIMIT_WINDOW_MS": 1000,
  "RATE_LIMIT_PER_IP": false
}
```

或完全禁用速率限制（不推荐生产环境）：

```json
{
  "RATE_LIMIT_ENABLED": false
}
```

### 方案 2: 修复 IdC 认证问题

#### 步骤 1: 检查 Token 文件

检查你的 token 文件（通常在 `~/.aws/sso/cache/kiro-auth-token.json`）：

```json
{
  "accessToken": "your-access-token",
  "refreshToken": "your-refresh-token",
  "expiresAt": "2025-10-09T10:00:00.000Z",
  "authMethod": "IdC",
  "region": "us-east-1",
  "clientId": "your-client-id",        // IdC 必需
  "clientSecret": "your-client-secret" // IdC 必需
}
```

**IdC 认证必须包含：**
- ✅ `clientId`
- ✅ `clientSecret`
- ✅ `authMethod: "IdC"`

**不应包含（IdC）：**
- ❌ `profileArn`（这是 Social 认证才需要的）

#### 步骤 2: 重新获取认证凭证

如果 Token 文件缺少必要字段或已过期：

1. **重新登录 AWS SSO / Kiro:**
   ```bash
   # 使用 AWS CLI
   aws sso login --profile your-profile
   
   # 或使用 Kiro IDE 重新登录
   ```

2. **确认认证方法:**
   - 企业用户（IdC）：需要 `clientId` 和 `clientSecret`
   - 个人用户（Social）：需要 `profileArn`

3. **复制新的凭证到 token 文件**

#### 步骤 3: 使用环境变量（替代方案）

如果文件配置有问题，可以使用环境变量：

```bash
# 设置 Kiro 认证环境变量
export KIRO_ACCESS_TOKEN="your-access-token"
export KIRO_REFRESH_TOKEN="your-refresh-token"
export KIRO_CLIENT_ID="your-client-id"
export KIRO_CLIENT_SECRET="your-client-secret"
export KIRO_AUTH_METHOD="IdC"
export KIRO_REGION="us-east-1"

# 启动服务器
node src/api-server.js --model-provider claude-kiro-oauth
```

#### 步骤 4: 使用 Base64 编码的凭证（高级）

创建一个包含所有认证信息的 JSON 文件，然后 Base64 编码：

```bash
# 创建认证 JSON
cat > kiro-creds.json << EOF
{
  "accessToken": "your-access-token",
  "refreshToken": "your-refresh-token",
  "clientId": "your-client-id",
  "clientSecret": "your-client-secret",
  "authMethod": "IdC",
  "region": "us-east-1",
  "expiresAt": "2025-10-09T10:00:00.000Z"
}
EOF

# Base64 编码
cat kiro-creds.json | base64

# 使用编码后的凭证启动
node src/api-server.js --model-provider claude-kiro-oauth --kiro-oauth-creds-base64 "your-base64-string"
```

### 方案 3: 智能 Token 刷新

代码已经包含智能 token 管理功能，但需要确保配置正确：

```json
{
  "CRON_REFRESH_TOKEN": true,
  "CRON_NEAR_MINUTES": 15,
  "REQUEST_MAX_RETRIES": 3,
  "REQUEST_BASE_DELAY": 1000
}
```

这会：
- ✅ 在 token 过期前 15 分钟自动刷新
- ✅ 如果当前 token 失败，自动切换到备用 token
- ✅ 失败时自动重试（最多 3 次）

---

## 验证修复

### 1. 运行诊断工具
```bash
node diagnose-kiro-auth.js
```

应该看到：
- ✅ Token 文件存在
- ✅ 所有必需字段完整
- ✅ Token 未过期
- ✅ 认证方法正确

### 2. 测试 API 调用

```bash
curl -X POST http://localhost:3000/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "model": "claude-3-7-sonnet-20250219",
    "messages": [
      {"role": "user", "content": "Hello"}
    ],
    "max_tokens": 100
  }'
```

### 3. 检查日志

启动服务器并检查日志：
```bash
node src/api-server.js --model-provider claude-kiro-oauth
```

应该看到：
- ✅ `[Kiro] Initializing Kiro API Service...`
- ✅ `[Kiro Auth] Successfully loaded credentials...`
- ✅ `[Kiro] Basic initialization completed`
- ❌ 不应该看到 `[Kiro] API Error 400`

---

## 常见问题 FAQ

### Q1: 为什么显示 "hasProfileArn: false"？
**A:** 如果你使用 IdC 认证，这是正常的。IdC 不需要 `profileArn`，只需要 `clientId` 和 `clientSecret`。

### Q2: 如何知道我应该使用哪种认证方法？
**A:** 
- **IdC (Identity Center)**: 企业用户，通过公司的 AWS Identity Center 登录
- **Social**: 个人用户，通过 Google/GitHub 等社交账号登录

### Q3: Token 自动刷新失败怎么办？
**A:** 
1. 检查 `refreshToken` 是否有效
2. 检查 `clientId` 和 `clientSecret` 是否正确（IdC）
3. 手动重新登录获取新的凭证

### Q4: 速率限制应该设置多少？
**A:** 建议配置：
- 开发环境：`RATE_LIMIT_MAX_REQUESTS: 10-20`
- 生产环境：`RATE_LIMIT_MAX_REQUESTS: 5-10`
- 单用户：可以禁用 `RATE_LIMIT_ENABLED: false`

### Q5: 如何获取 clientId 和 clientSecret？
**A:** 
1. 通过 AWS Identity Center 管理控制台
2. 联系你的 AWS 管理员
3. 从 Kiro IDE 的认证配置中获取

---

## 技术细节

### IdC Token 刷新流程

1. **检查 token 是否过期**
   ```javascript
   isTokenExpired(expiresAt)
   ```

2. **构建刷新请求**
   ```javascript
   {
     refreshToken: this.refreshToken,
     clientId: this.clientId,
     clientSecret: this.clientSecret,
     grantType: 'refresh_token'
   }
   ```

3. **发送到 IdC 刷新端点**
   ```
   https://oidc.{region}.amazonaws.com/token
   ```

4. **更新本地 token**
   ```javascript
   this.accessToken = response.data.accessToken;
   this.refreshToken = response.data.refreshToken;
   this.expiresAt = new Date(Date.now() + expiresIn * 1000);
   ```

### 智能 Token 管理策略

代码实现了三层智能刷新策略（`src/token-manager.js`）：

1. **策略 1**: Token 即将过期时，尝试正常刷新
2. **策略 2**: 如果刷新失败，切换到最佳可用的备用 token
3. **策略 3**: 如果备用 token 也即将过期，尝试刷新它

---

## 相关文件

- `diagnose-kiro-auth.js` - 认证诊断工具
- `fix-kiro-config.js` - 配置修复工具
- `src/claude/claude-kiro.js` - Kiro API 核心实现
- `src/token-manager.js` - Token 管理器
- `config.json` - 服务器配置文件
- `~/.aws/sso/cache/kiro-auth-token.json` - Token 存储文件

---

## 获取帮助

如果以上方案都无法解决问题：

1. 运行诊断工具并保存输出：
   ```bash
   node diagnose-kiro-auth.js > diagnosis.log
   ```

2. 检查完整的错误日志

3. 确认你的 AWS / Kiro 账号状态

4. 联系 AWS / Kiro 技术支持

---

## 更新日志

- **2025-10-08**: 创建文档，添加诊断和修复工具
- 包含 IdC 和 Social 认证的详细说明
- 添加智能 Token 管理策略说明
