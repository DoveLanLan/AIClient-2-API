# 🏢 Kiro 企业版 IdC 认证指南

## 检测到的配置

您的账号配置：
```json
{
  "authMethod": "IdC",
  "provider": "Enterprise",
  "region": "us-east-1"
}
```

这是 **AWS 企业版账号**，使用 IdC (Identity Center) 认证方式。

---

## 🔍 当前问题：400 错误

**好消息**：从 403 → 400 说明认证已经通过！✅

**400 错误** 通常表示：
- ❌ 请求参数格式问题
- ❌ 缺少必需字段
- ❌ 参数值不符合 API 要求

---

## 🛠️ 刚刚的修复

我已经对代码做了以下改进：

### 1. 添加 IdC 认证支持
```javascript
AUTH_METHOD_IDC: "IdC"
```

### 2. 改进请求构建逻辑
```javascript
// 企业版账号不需要 profileArn
if (this.authMethod === KIRO_CONSTANTS.AUTH_METHOD_SOCIAL && this.profileArn) {
  request.profileArn = this.profileArn;
}
```

### 3. 增强错误日志
现在会显示详细的错误信息，包括：
- HTTP 状态码
- 错误数据
- 认证方式
- 是否有 profileArn

### 4. Token Manager 支持
支持企业版的额外字段：
- `clientId`
- `clientSecret`
- `clientIdHash`
- `provider`

---

## 🚀 下一步操作

### 立即测试

重启服务并查看详细错误日志：
```bash
node src/api-server.js --model-provider claude-kiro-oauth --kiro-oauth-creds-file "C:\Users\Administrator\.aws\sso\cache\kiro-auth-token.json"
```

现在错误日志会显示更详细的信息，帮助我们找到 400 错误的具体原因。

---

## 🔍 可能的 400 错误原因

### 原因1：企业版需要不同的 API 端点

**问题**：企业版可能需要使用不同的 URL

**解决方案**：检查您的 AWS 管理控制台，确认正确的 CodeWhisperer API 端点

**可能的端点**：
- `https://codewhisperer.us-east-1.amazonaws.com`（当前使用）
- `https://codewhisperer-enterprise.us-east-1.amazonaws.com`（企业版专用）

### 原因2：缺少 clientId 和 clientSecret

**问题**：您的 token 文件只有 `clientIdHash`，没有完整的 `clientId` 和 `clientSecret`

**当前配置**：
```json
{
  "clientIdHash": "e87895ae36d9539303a0bcd27feb465a60aeb433"
}
```

**可能需要**：
```json
{
  "clientId": "your-client-id",
  "clientSecret": "your-client-secret"
}
```

**获取方式**：
1. 检查 AWS IAM Identity Center
2. 或从企业管理员获取
3. 或从 IDE 的完整配置文件中提取

### 原因3：Token 已过期

**您的 token 过期时间**：`2025-10-08T16:09:38.915Z`

如果现在已经过了这个时间，需要刷新 token。

**刷新 token**：
```bash
node check-tokens.js
```

系统会尝试使用 refreshToken 自动刷新。

### 原因4：请求体格式不兼容

企业版 API 可能需要额外的字段或不同的格式。

---

## 📝 诊断步骤

### 步骤1：查看完整错误信息

重启服务后，查看日志中的详细错误：
```
[Kiro] API Error 400: {
  status: 400,
  statusText: "Bad Request",
  data: { ... },  // 这里会显示具体错误原因
  authMethod: "IdC",
  hasProfileArn: false
}
```

### 步骤2：检查 token 是否过期

```bash
node check-tokens.js
```

### 步骤3：尝试刷新 token

如果 token 过期但 refreshToken 有效：
```bash
# 系统会自动尝试刷新
# 查看日志中的 [Kiro Auth] Token refresh response
```

### 步骤4：如果 refreshToken 也失效

需要重新获取 token：
1. 在 AWS Console 重新登录
2. 或在支持的 IDE 中重新认证
3. 或联系企业管理员

---

## 🔧 临时解决方案

如果企业版持续出现问题，可以临时切换到其他 Provider：

### 方案A：使用 Claude 官方 API
```bash
node src/api-server.js --model-provider claude-custom --claude-api-key sk-ant-xxx
```

### 方案B：使用 OpenAI API
```bash
node src/api-server.js --model-provider openai-custom --openai-api-key sk-xxx
```

---

## 📞 获取更多帮助

### 收集诊断信息

1. **完整错误日志**
   ```bash
   node src/api-server.js --model-provider claude-kiro-oauth --kiro-oauth-creds-file "C:\Users\Administrator\.aws\sso\cache\kiro-auth-token.json" > debug.log 2>&1
   ```

2. **Token 状态**
   ```bash
   node check-tokens.js
   ```

3. **Token 文件内容**（脱敏后）
   ```bash
   type "C:\Users\Administrator\.aws\sso\cache\kiro-auth-token.json"
   ```

### 联系支持

如果问题持续：
1. AWS Support（企业版账号）
2. 企业 IT 管理员
3. 查看 AWS CodeWhisperer 企业版文档

---

## 📚 相关资源

- [AWS IAM Identity Center 文档](https://docs.aws.amazon.com/singlesignon/)
- [AWS CodeWhisperer 企业版](https://docs.aws.amazon.com/codewhisperer/latest/userguide/whisper-setup-enterprise.html)
- [SOLUTIONS.md](./SOLUTIONS.md) - 通用解决方案

---

**更新时间**: 2025-10-08  
**状态**: 代码已更新，等待测试结果
