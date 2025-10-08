# 解决 Kiro 403 错误 - 完整解决方案

## 问题诊断

当前状态：
- ✅ 检测到 1 个 token 文件
- ❌ Token 已过期（过期时间：2025-10-08T14:25:15.748Z）
- ❌ RefreshToken 刷新失败（401 错误）
- ❌ API 调用被拒绝（403 错误）

---

## 🚀 推荐方案（按难度排序）

### 方案1：使用其他 Provider（最快，无需 Kiro）⭐⭐⭐

如果您有其他 AI 服务的 API Key，可以立即切换：

#### 1.1 使用 Claude 官方 API
```bash
# 方式1：命令行参数
node src/api-server.js --model-provider claude-custom --claude-api-key sk-ant-xxx

# 方式2：环境变量
set CLAUDE_API_KEY=sk-ant-xxx
node src/api-server.js --model-provider claude-custom
```

#### 1.2 使用 OpenAI API
```bash
set OPENAI_API_KEY=sk-xxx
node src/api-server.js --model-provider openai-custom
```

#### 1.3 配置多 Provider 轮换（号池模式）
编辑 `provider_pools.json`：
```json
{
  "claude-custom": [
    {
      "CLAUDE_API_KEY": "sk-ant-key1",
      "CLAUDE_BASE_URL": "https://api.anthropic.com",
      "uuid": "claude-1",
      "isHealthy": true
    },
    {
      "CLAUDE_API_KEY": "sk-ant-key2",
      "CLAUDE_BASE_URL": "https://api.anthropic.com",
      "uuid": "claude-2",
      "isHealthy": true
    }
  ]
}
```

---

### 方案2：手动获取新的 Kiro Token（中等难度）⭐⭐

#### 2.1 从浏览器获取 Token

**步骤：**
1. 访问 Amazon Q 或 CodeWhisperer Web 界面
   - https://aws.amazon.com/q/
   - 或在 AWS Console 中使用 CodeWhisperer

2. 打开浏览器开发者工具（F12）

3. **方法A：从 Network 标签获取**
   - 进入 Network/网络 标签
   - 刷新页面或进行任何操作
   - 查找请求头中的 `Authorization: Bearer xxx`
   - 复制 Bearer 后面的 token

4. **方法B：从 Application/Storage 获取**
   - 进入 Application/应用 标签
   - 展开 Local Storage 或 Session Storage
   - 查找包含 `token` 的项
   - 复制 accessToken 和 refreshToken

5. **创建 token 文件：**
```json
{
  "accessToken": "从浏览器复制的 accessToken",
  "refreshToken": "从浏览器复制的 refreshToken",
  "expiresAt": "2025-10-10T20:00:00.000Z",
  "region": "us-east-1",
  "authMethod": "social",
  "profileArn": "arn:aws:codewhisperer:us-east-1:..."
}
```

6. **保存到：**
   ```
   C:\Users\Administrator\.aws\sso\cache\kiro-auth-token.json
   ```

7. **验证：**
   ```bash
   node check-tokens.js
   ```

#### 2.2 从 AWS CLI 获取 Token

如果安装了 AWS CLI：
```bash
# 配置 SSO
aws configure sso

# 登录
aws sso login --profile your-profile

# Token 会自动保存到 ~/.aws/sso/cache/
```

---

### 方案3：从其他设备/IDE 复制 Token（简单）⭐

如果您在其他设备或 IDE 中有登录的 Kiro：

1. **查找 token 文件位置：**
   - Windows: `C:\Users\[用户名]\.aws\sso\cache\`
   - macOS: `~/.aws/sso/cache/`
   - Linux: `~/.aws/sso/cache/`
   - VS Code: `%APPDATA%\Code\User\globalStorage\`
   - Cursor: `%APPDATA%\Cursor\User\globalStorage\`

2. **复制所有 .json 文件到当前机器的对应位置**

3. **运行诊断：**
   ```bash
   node check-tokens.js
   ```

---

### 方案4：配置多个 Kiro 账号（高级）⭐⭐⭐

如果您有多个 Kiro/AWS 账号：

1. **为每个账号生成 token 文件**
   - 在不同 IDE 实例中分别登录
   - 或使用不同的 AWS profiles

2. **配置号池 `provider_pools.json`：**
```json
{
  "claude-kiro-oauth": [
    {
      "KIRO_OAUTH_CREDS_FILE_PATH": "C:\\Users\\Administrator\\.aws\\sso\\cache\\kiro-account1.json",
      "uuid": "kiro-1",
      "isHealthy": true
    },
    {
      "KIRO_OAUTH_CREDS_FILE_PATH": "C:\\Users\\Administrator\\.aws\\sso\\cache\\kiro-account2.json",
      "uuid": "kiro-2",
      "isHealthy": true
    }
  ]
}
```

3. **启动服务：**
```bash
node src/api-server.js --model-provider claude-kiro-oauth --provider-pools provider_pools.json
```

系统会自动在账号间轮换。

---

### 方案5：使用 Base64 编码的凭证（Docker/容器）⭐⭐

如果在容器环境中运行：

1. **将 token 文件转为 Base64：**
```powershell
$content = Get-Content "C:\Users\Administrator\.aws\sso\cache\kiro-auth-token.json" -Raw
$bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
$base64 = [Convert]::ToBase64String($bytes)
Write-Host $base64
```

2. **设置环境变量：**
```bash
set KIRO_OAUTH_CREDS_BASE64=<base64 string>
node src/api-server.js --model-provider claude-kiro-oauth
```

---

## 🔧 调试工具

### 检查 Token 状态
```bash
node check-tokens.js
```

### 搜索系统中的所有 Token
```bash
powershell -ExecutionPolicy Bypass -File find-kiro-tokens.ps1
```

### 查看 Provider 选项
```bash
switch-provider.bat
```

---

## 📝 注意事项

1. **Token 有效期**：
   - Kiro tokens 通常 8-12 小时过期
   - RefreshToken 可用于自动刷新（如果没过期）

2. **安全建议**：
   - 不要在公开代码中提交 token 文件
   - 使用 `.gitignore` 排除 token 文件
   - 定期更换 API keys

3. **性能对比**：
   - Kiro (免费): ⭐⭐⭐⭐⭐ 但需要 token 管理
   - Claude API (付费): ⭐⭐⭐⭐ 稳定但收费
   - OpenAI API (付费): ⭐⭐⭐⭐ 稳定但收费

---

## ❓ 常见问题

### Q: RefreshToken 为什么也失效了？
A: RefreshToken 也有过期时间（通常更长），如果太久没刷新就会失效。

### Q: 能否完全自动化 token 刷新？
A: 只要 RefreshToken 有效，系统会自动刷新。但如果都过期了，必须重新获取。

### Q: 号池模式的优势？
A: 
- 自动故障转移
- 负载均衡
- 多账号并发使用

### Q: 最推荐哪个方案？
A: 
- **急用**：方案1（切换 Provider）
- **长期**：方案4（多账号号池）
- **简单**：方案2.2（AWS CLI）

---

## 📞 需要帮助？

如果以上方案都无法解决，请：
1. 检查网络连接
2. 确认 AWS 账号状态
3. 查看完整错误日志
4. 考虑联系 AWS 支持

---

**生成时间**: 2025-10-08  
**文档版本**: 1.0
