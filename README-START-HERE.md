# 🎯 从这里开始 - Kiro 403/400 错误解决

## 📋 当前状态

### 您的配置
- **账号类型**: AWS 企业版
- **认证方式**: IdC (Identity Center)
- **错误历史**: 403 → 400（进步了！✅）
- **Token 状态**: 即将过期或已过期

### 问题分析
1. ✅ **403 已解决** - 认证现在通过了
2. ⚠️ **400 需要诊断** - 请求格式或参数问题
3. 🔧 **代码已更新** - 添加了企业版 IdC 支持

---

## 🚀 快速开始（3种方式）

### 方式1：使用修复后的 Kiro（推荐测试）⭐⭐⭐
```bash
# 运行企业版测试
test-kiro-enterprise.bat
```
这会：
- 检查 token 状态
- 显示详细的错误信息
- 帮助诊断 400 错误的具体原因

### 方式2：使用交互式菜单 ⭐⭐⭐⭐⭐
```bash
# 运行快速修复菜单
quick-fix.bat
```
然后选择：
- `[1]` 检查 token 状态
- `[3]` 测试企业版配置
- `[4]` 切换到 Claude API（如有 API key）

### 方式3：临时切换到其他 Provider ⭐⭐⭐⭐⭐
如果您有其他 AI 服务的 API Key，立即切换：
```bash
# Claude API
node src/api-server.js --model-provider claude-custom --claude-api-key sk-ant-xxx

# OpenAI API
node src/api-server.js --model-provider openai-custom --openai-api-key sk-xxx
```

---

## 📁 重要文档指南

| 文档 | 用途 | 何时查看 |
|------|------|----------|
| **本文件** | 快速开始 | 现在就看 ✅ |
| `FIXES-APPLIED.md` | 查看修复内容 | 了解改了什么 |
| `ENTERPRISE-IDC-GUIDE.md` | 企业版专用指南 | 处理 400 错误 |
| `SOLUTIONS.md` | 完整解决方案集 | 需要其他方案时 |
| `FIX-403-README.md` | 工具使用指南 | 了解所有工具 |

---

## 🔍 诊断 400 错误

### 步骤1：运行测试脚本
```bash
test-kiro-enterprise.bat
```

### 步骤2：查看错误详情
错误日志现在会显示：
```
[Kiro] API Error 400: {
  status: 400,
  statusText: "Bad Request",
  data: { message: "具体错误原因在这里" },
  authMethod: "IdC",
  hasProfileArn: false
}
```

### 步骤3：根据错误信息采取行动

#### 如果提示 "token expired"
```bash
node check-tokens.js
# 系统会尝试自动刷新
```

#### 如果提示缺少 "clientId" 或 "clientSecret"
查看 `ENTERPRISE-IDC-GUIDE.md` 的对应章节

#### 如果提示 "invalid endpoint"
可能需要使用企业版专用 API 端点

#### 如果完全无法解决
使用方式3切换到其他 Provider（见上方）

---

## ✅ 已完成的修复

1. ✅ 添加 IdC 认证方式支持
2. ✅ 修正企业版请求构建逻辑
3. ✅ 增强错误日志（显示详细信息）
4. ✅ Token Manager 支持企业版字段
5. ✅ 所有代码 linting 错误已修复
6. ✅ 创建企业版测试工具

详见：`FIXES-APPLIED.md`

---

## 🛠️ 可用工具

| 工具 | 命令 | 说明 |
|------|------|------|
| 快速修复菜单 | `quick-fix.bat` | 一键式交互菜单 |
| 企业版测试 | `test-kiro-enterprise.bat` | 测试 IdC 配置 |
| Token 检查 | `node check-tokens.js` | 检查 token 状态 |
| Token 搜索 | PowerShell 脚本 | 搜索系统中所有 token |

---

## 💡 推荐行动顺序

### 第1步：快速诊断（5分钟）
```bash
quick-fix.bat
# 选择 [1] 检查 token 状态
```

### 第2步：测试企业版（10分钟）
```bash
test-kiro-enterprise.bat
# 查看详细错误信息
```

### 第3步：根据结果决定
- **如果 400 错误解决了** ✅ 太好了！继续使用
- **如果仍有问题** → 查看 `ENTERPRISE-IDC-GUIDE.md`
- **如果急用** → 切换到其他 Provider

---

## 🎓 学习更多

### 了解项目功能
- **Provider Pool（号池）**: 支持多账号自动轮换
- **Token Manager**: 智能 token 管理和刷新
- **多 Provider**: 支持 Claude、OpenAI、Gemini、Qwen

### 企业版特殊性
- 使用 IdC 认证而非 social 认证
- 可能需要 clientId 和 clientSecret
- 可能使用不同的 API 端点
- 可能有额外的权限限制

详见：`ENTERPRISE-IDC-GUIDE.md`

---

## ❓ 常见问题

### Q: 为什么从 403 变成 400？
**A**: 这是好消息！403 是认证失败，400 是请求格式问题。说明认证已经通过，现在只需要调整请求参数。

### Q: 400 错误能自动解决吗？
**A**: 需要先看具体的错误信息。运行测试脚本会显示详细的错误数据，根据错误信息可能需要：
- 刷新 token
- 添加缺失的字段
- 调整 API 端点

### Q: 如果所有方法都失败了怎么办？
**A**: 
1. 临时切换到 Claude/OpenAI API（如有 key）
2. 联系企业 IT 管理员获取完整配置
3. 查看 AWS CodeWhisperer 企业版文档

### Q: 需要重新登录 IDE 吗？
**A**: 不一定！项目支持：
- 手动导入 token 文件
- 从浏览器获取 token
- 使用 AWS CLI 获取
- 切换到其他 Provider

详见：`SOLUTIONS.md`

---

## 📞 需要帮助？

### 收集信息
运行这些命令并保存输出：
```bash
node check-tokens.js > token-status.txt
test-kiro-enterprise.bat > test-result.txt 2>&1
```

### 查找答案
1. `ENTERPRISE-IDC-GUIDE.md` - 企业版问题
2. `SOLUTIONS.md` - 所有解决方案
3. AWS 支持 - 企业账号问题

---

## 🌟 下一步

**现在就运行**：
```bash
quick-fix.bat
```

或者如果您有其他 API Key：
```bash
node src/api-server.js --model-provider claude-custom --claude-api-key YOUR_KEY
```

---

**祝您好运！🚀**

**文档创建**: 2025-10-08  
**状态**: ✅ 代码已更新，工具已就绪  
**版本**: 1.0
