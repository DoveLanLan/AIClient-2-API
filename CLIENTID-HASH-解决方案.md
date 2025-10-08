# Kiro ClientIdHash 问题解决方案

## 问题描述

你的 `kiro-auth-token.json` 文件中缺少 `clientId` 和 `clientSecret`，但这些值存在于 `~/.aws/sso/cache` 目录下的另一个 JSON 文件中。

### 文件结构

**kiro-auth-token.json**（主 token 文件）：
```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "expiresAt": "2025-10-08T17:12:56.785Z",
  "clientIdHash": "e87895ae36d9539303a0bcd27feb465a60aeb433",
  "authMethod": "IdC",
  "provider": "Enterprise",
  "region": "us-east-1"
}
```

**e87895ae36d9539303a0bcd27feb465a60aeb433.json**（client 凭证文件）：
```json
{
  "clientId": "oMp7qfW2oH1OgDwZNKJHdnVzLWVhc3QtMQ",
  "clientSecret": "eyJraWQiOiJrZXktMTU...",
  "expiresAt": "2025-12-08T14:10:50.000Z"
}
```

### 关键点

- **clientIdHash** 字段的值（`e87895ae36d9539303a0bcd27feb465a60aeb433`）对应另一个 JSON 文件的文件名
- 这两个文件需要合并才能正常使用 IdC 认证

---

## 解决方案

### 🚀 方案 1: 自动合并（推荐）

运行自动合并工具：

```bash
node merge-kiro-tokens.js
```

或使用一键脚本：

```bash
fix-kiro-clientid.bat
```

**这个工具会：**
1. ✅ 读取 `kiro-auth-token.json`
2. ✅ 根据 `clientIdHash` 找到对应的文件
3. ✅ 提取 `clientId` 和 `clientSecret`
4. ✅ 合并到 `kiro-auth-token.json`
5. ✅ 自动备份原文件

**合并后的文件：**
```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "expiresAt": "2025-10-08T17:12:56.785Z",
  "clientIdHash": "e87895ae36d9539303a0bcd27feb465a60aeb433",
  "clientId": "oMp7qfW2oH1OgDwZNKJHdnVzLWVhc3QtMQ",
  "clientSecret": "eyJraWQiOiJrZXktMTU...",
  "authMethod": "IdC",
  "provider": "Enterprise",
  "region": "us-east-1"
}
```

### 🔧 方案 2: 手动合并

如果自动工具失败，可以手动合并：

1. **打开两个文件**：
   - `C:\Users\Administrator\.aws\sso\cache\kiro-auth-token.json`
   - `C:\Users\Administrator\.aws\sso\cache\e87895ae36d9539303a0bcd27feb465a60aeb433.json`

2. **复制字段**：
   从 `e87895ae36d9539303a0bcd27feb465a60aeb433.json` 复制：
   - `clientId`
   - `clientSecret`

3. **粘贴到主文件**：
   添加到 `kiro-auth-token.json` 中

4. **保存并验证**

### ⚙️ 方案 3: 代码自动处理（已实现）

**好消息！** 代码已经更新，可以自动处理 `clientIdHash`：

**src/claude/claude-kiro.js** 现在会：
```javascript
// Priority 4: Load clientId and clientSecret from clientIdHash file if present
if (mergedCredentials.clientIdHash && (!mergedCredentials.clientId || !mergedCredentials.clientSecret)) {
  const clientIdHashFile = path.join(this.credPath, `${mergedCredentials.clientIdHash}.json`);
  const clientCredentials = await loadCredentialsFromFile(clientIdHashFile);
  if (clientCredentials) {
    mergedCredentials.clientId = clientCredentials.clientId;
    mergedCredentials.clientSecret = clientCredentials.clientSecret;
  }
}
```

**这意味着：**
- ✅ 即使 `kiro-auth-token.json` 没有 `clientId` 和 `clientSecret`
- ✅ 代码会自动根据 `clientIdHash` 查找对应文件
- ✅ 自动加载 `clientId` 和 `clientSecret`
- ✅ 无需手动合并（但推荐合并以提高性能）

---

## 验证修复

### 1. 运行诊断工具

```bash
node diagnose-kiro-auth.js
```

**应该看到：**
```
🔐 认证方法: IdC
   检查 IdC 特定字段...
   ℹ️  clientIdHash: e87895ae36d9539303a0bcd27feb465a60aeb433
   ✅ 找到对应的 client 凭证文件: e87895ae36d9539303a0bcd27feb465a60aeb433.json
   ✅ 文件中包含 clientId: oMp7qfW2oH1OgDwZNKJH...
   ✅ 文件中包含 clientSecret: eyJraWQiOiJrZXktMTU...
   ✅ clientId: oMp7qfW2oH1OgDwZNKJH...
   ✅ clientSecret: eyJraWQiOiJrZXktMTU...
```

### 2. 测试服务器启动

```bash
node src/api-server.js --model-provider claude-kiro-oauth
```

**应该看到：**
```
[Kiro] Initializing Kiro API Service...
[Kiro Auth] Found clientIdHash, attempting to load client credentials from: ...
[Kiro Auth] Successfully loaded clientId and clientSecret from e87895ae36d9539303a0bcd27feb465a60aeb433.json
[Kiro] Basic initialization completed
```

### 3. 测试 API 调用

```bash
curl -X POST http://localhost:3000/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: 123456" \
  -d '{
    "model": "claude-3-7-sonnet-20250219",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 100
  }'
```

**不应该看到：**
- ❌ `[Kiro] API Error 400: Improperly formed request`
- ❌ `hasProfileArn: false` 错误

---

## 技术细节

### ClientIdHash 的作用

AWS SSO / Kiro 将认证信息分成两部分存储：

1. **Token 文件** (`kiro-auth-token.json`)
   - 包含临时的访问凭证
   - 频繁更新（每次刷新 token）
   - 过期时间较短（几小时）

2. **Client 凭证文件** (`{clientIdHash}.json`)
   - 包含客户端标识信息
   - 很少更新
   - 过期时间较长（几个月）

**clientIdHash** 是两个文件之间的关联 ID。

### 为什么要合并？

**优点：**
- ✅ 提高性能（减少文件读取）
- ✅ 简化配置管理
- ✅ 方便调试和诊断
- ✅ 避免文件关联问题

**缺点：**
- ⚠️ Token 文件会包含更多敏感信息
- ⚠️ 需要在每次 token 刷新时保持 clientId/clientSecret

### 代码优先级

代码按以下优先级加载凭证：

1. **Priority 1**: Base64 编码的凭证（环境变量）
2. **Priority 2**: 指定的凭证文件路径
3. **Priority 3**: SSO cache 目录扫描
4. **Priority 4**: 根据 clientIdHash 自动加载（新增！）

---

## 常见问题

### Q1: 为什么会有两个文件？
**A:** 这是 AWS SSO 的设计。Token 需要频繁刷新，而 client 信息保持不变。分开存储可以减少不必要的写入。

### Q2: 合并后原文件会保留吗？
**A:** 是的，合并工具会自动备份原文件为 `kiro-auth-token.json.backup.{timestamp}`。

### Q3: 如果不合并，代码能正常工作吗？
**A:** 可以！更新后的代码会自动根据 `clientIdHash` 查找并加载 client 凭证。但合并后性能更好。

### Q4: clientIdHash 文件找不到怎么办？
**A:** 
1. 检查 `~/.aws/sso/cache` 目录
2. 确认文件名与 `clientIdHash` 值完全匹配
3. 重新登录 AWS SSO / Kiro

### Q5: 合并后 token 刷新会怎样？
**A:** Token 刷新时，`accessToken`、`refreshToken` 和 `expiresAt` 会更新，但 `clientId` 和 `clientSecret` 保持不变。

---

## 完整工作流程

### 首次设置

```bash
# 1. 运行诊断
node diagnose-kiro-auth.js

# 2. 如果检测到 clientIdHash 分离，运行合并
node merge-kiro-tokens.js

# 3. 验证合并结果
node diagnose-kiro-auth.js

# 4. 启动服务器
node src/api-server.js --model-provider claude-kiro-oauth
```

### 日常使用

代码会自动处理，无需手动操作。即使文件分离，也能正常工作。

---

## 相关文件

- **merge-kiro-tokens.js** - Token 自动合并工具
- **diagnose-kiro-auth.js** - 认证诊断工具（已更新）
- **fix-kiro-clientid.bat** - 一键修复脚本
- **src/claude/claude-kiro.js** - Kiro API 核心（已更新支持 clientIdHash）
- **src/token-manager.js** - Token 管理器（已更新）

---

## 总结

| 方案 | 优点 | 适用场景 |
|------|------|----------|
| **自动合并工具** | ✅ 简单快速<br>✅ 自动备份<br>✅ 一键完成 | 首次设置，推荐使用 |
| **手动合并** | ✅ 完全控制<br>✅ 无需工具 | 工具失败时的备选方案 |
| **代码自动处理** | ✅ 无需操作<br>✅ 自动工作 | 日常使用，已内置支持 |

**建议操作：**
1. 首次设置时运行 `node merge-kiro-tokens.js` 合并文件
2. 之后让代码自动处理
3. 定期运行 `node diagnose-kiro-auth.js` 检查状态

---

最后更新: 2025-10-08
