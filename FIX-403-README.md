# 🔧 Kiro 403 错误修复工具包

## 快速开始

### 🚀 一键修复（推荐）
```bash
quick-fix.bat
```
运行这个脚本会显示一个菜单，帮您快速诊断和解决问题。

---

## 📦 工具清单

| 工具 | 用途 | 使用方法 |
|------|------|----------|
| `quick-fix.bat` | 一键修复菜单 | 双击运行或 `quick-fix.bat` |
| `check-tokens.js` | 检查 token 状态 | `node check-tokens.js` |
| `find-kiro-tokens.ps1` | 搜索系统中所有 token | `powershell -ExecutionPolicy Bypass -File find-kiro-tokens.ps1` |
| `switch-provider.bat` | 查看切换 Provider 的方法 | `switch-provider.bat` |
| `SOLUTIONS.md` | 完整解决方案文档 | 查看所有可用方案 |

---

## 🎯 典型场景

### 场景1：Token 过期，想快速恢复服务
**方案**：切换到其他 Provider
```bash
# 使用 Claude API
node src/api-server.js --model-provider claude-custom --claude-api-key sk-ant-xxx

# 或使用 OpenAI API
node src/api-server.js --model-provider openai-custom --openai-api-key sk-xxx
```

### 场景2：想继续使用 Kiro，但 token 过期了
**方案**：手动获取新 token
1. 打开 `SOLUTIONS.md`
2. 查看 "方案2：手动获取新的 Kiro Token"
3. 按照步骤从浏览器或 AWS CLI 获取

### 场景3：有多个 Kiro 账号，想自动轮换
**方案**：配置 Provider Pool
1. 编辑 `provider_pools.json`
2. 添加多个账号配置
3. 启动服务时会自动轮换

### 场景4：不确定问题原因，想诊断
**方案**：运行诊断工具
```bash
# 检查 token 状态
node check-tokens.js

# 搜索所有可用 token
powershell -ExecutionPolicy Bypass -File find-kiro-tokens.ps1
```

---

## 📖 工具详细说明

### check-tokens.js
**功能**：扫描 `.aws/sso/cache/` 目录，显示所有 Kiro token 的状态

**输出示例**：
```
=== Kiro Token Status Report ===

Total tokens found: 2
Valid tokens: 1
Expiring soon: 0
Expired tokens: 1

Token Details:
✅ Token 1: kiro-auth-token.json
   Status: valid
   Expires at: 2025-10-09T20:00:00.000Z
   Time remaining: 28h 30m

❌ Token 2: kiro-auth-token-backup.json
   Status: expired
   Expires at: 2025-10-08T14:25:15.748Z
   Expired 1h 44m ago
```

### find-kiro-tokens.ps1
**功能**：在系统中搜索所有可能包含 Kiro token 的文件

**搜索位置**：
- `C:\Users\[用户名]\.aws`
- `%APPDATA%\Code`
- `%APPDATA%\Cursor`
- `%LOCALAPPDATA%\Programs\cursor`
- VS Code 和 Cursor 的配置目录

**输出**：找到的所有 token 文件及其状态

---

## ⚡ 最快解决方案对比

| 方案 | 耗时 | 难度 | 需要 | 推荐度 |
|------|------|------|------|--------|
| 切换到 Claude/OpenAI API | 1分钟 | ⭐ | 其他 API Key | ⭐⭐⭐⭐⭐ |
| 从浏览器获取 token | 5分钟 | ⭐⭐ | 浏览器登录 | ⭐⭐⭐⭐ |
| 使用 AWS CLI 获取 | 3分钟 | ⭐⭐ | AWS CLI | ⭐⭐⭐⭐ |
| 从其他设备复制 | 2分钟 | ⭐ | 其他已登录设备 | ⭐⭐⭐⭐⭐ |
| 配置多账号号池 | 15分钟 | ⭐⭐⭐ | 多个账号 | ⭐⭐⭐ |

---

## 🛠️ 项目中的相关功能

### Token Manager（自动管理）
项目已内置智能 Token 管理器，具有以下功能：

1. **自动扫描**：扫描 `.aws/sso/cache/` 目录中的所有 token 文件
2. **智能选择**：自动选择最新有效的 token
3. **自动刷新**：在 token 即将过期时自动刷新
4. **备用切换**：当前 token 失效时自动切换到备用 token

**触发条件**：
- 收到 403 错误时
- Token 10分钟内过期时
- 手动调用 `smartRefreshToken()` 时

### Provider Pool（号池机制）
支持配置多个账号自动轮换：

**特点**：
- Round-robin 轮询算法
- 健康检查机制
- 自动故障转移
- 使用统计记录

**配置文件**：`provider_pools.json`

---

## 💡 小贴士

1. **预防 token 过期**：
   - 定期运行 `node check-tokens.js` 检查状态
   - 在 token 即将过期前手动刷新
   - 配置多个备用 token

2. **提高可靠性**：
   - 使用号池模式配置多个账号
   - 同时配置多个 Provider（Kiro + Claude + OpenAI）
   - 定期备份 token 文件

3. **安全建议**：
   - 不要在 git 中提交 token 文件
   - 定期更换 API keys
   - 使用环境变量存储敏感信息

---

## ❓ 仍然无法解决？

如果以上所有方案都无法解决您的问题：

1. 查看完整的 `SOLUTIONS.md` 文档
2. 检查网络连接和防火墙设置
3. 确认 AWS 账号状态是否正常
4. 查看完整错误日志：启动服务时添加 `--verbose` 参数
5. 考虑联系 AWS 技术支持

---

**创建日期**: 2025-10-08  
**维护者**: AI Assistant  
**相关文档**: [SOLUTIONS.md](./SOLUTIONS.md)
