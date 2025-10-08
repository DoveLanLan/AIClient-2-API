# Kiro ClientId 问题快速修复指南

## 问题

如果你看到这个错误：
```
[Kiro] API Error 400: {
  status: 400,
  statusText: 'Bad Request',
  data: { message: 'Improperly formed request.' },
  authMethod: 'IdC',
  hasProfileArn: false
}
```

**并且** 你的 `kiro-auth-token.json` 中没有 `clientId` 和 `clientSecret`，但有 `clientIdHash` 字段。

---

## 快速修复（3步）

### 步骤 1: 运行诊断
```bash
node diagnose-kiro-auth.js
```

诊断工具会告诉你：
- ✅ Token 文件是否存在
- ✅ 是否缺少 clientId/clientSecret
- ✅ 是否找到 clientIdHash 对应的文件
- ✅ Token 是否过期

### 步骤 2: 自动合并（推荐）
```bash
node merge-kiro-tokens.js
```

或使用一键脚本：
```bash
fix-kiro-clientid.bat
```

### 步骤 3: 验证并启动
```bash
# 验证修复
node diagnose-kiro-auth.js

# 启动服务器
node src/api-server.js --model-provider claude-kiro-oauth
```

---

## 详细文档

- **CLIENTID-HASH-解决方案.md** - 完整的技术说明和解决方案
- **KIRO-错误解决指南-中文.md** - Kiro 错误完整指南
- **KIRO-ERROR-GUIDE.md** - English version

---

## 重要说明

### ✅ 已自动支持

代码已更新，**即使不合并文件也能工作**！

代码会自动：
1. 检测 `clientIdHash` 字段
2. 查找对应的 JSON 文件
3. 自动加载 `clientId` 和 `clientSecret`

### 🚀 为什么还要合并？

虽然代码能自动处理，但合并文件有这些好处：
- ✅ 性能更好（减少文件读取）
- ✅ 配置更清晰
- ✅ 更容易调试

---

## 故障排除

### 问题 1: 找不到 clientIdHash 文件
```bash
# 检查文件是否存在
dir %USERPROFILE%\.aws\sso\cache\*.json
```

### 问题 2: 合并工具失败
尝试手动合并：
1. 打开 `kiro-auth-token.json`
2. 从 `{clientIdHash}.json` 复制 `clientId` 和 `clientSecret`
3. 粘贴到 `kiro-auth-token.json`

### 问题 3: 速率限制错误
```bash
# 修复配置
node fix-kiro-config.js
```

---

## 获取帮助

如果问题仍未解决：
1. 运行完整诊断并保存输出
2. 查看详细文档
3. 检查是否是其他问题（Token 过期、网络问题等）

---

最后更新: 2025-10-08
