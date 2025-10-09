#!/bin/bash

# Docker ClientId 路径修复验证脚本
# 用于验证 Docker 容器中的 clientIdHash 文件加载是否正常

set -e

echo "================================================"
echo "Docker ClientId 路径修复验证"
echo "================================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. 检查宿主机文件
echo "📁 步骤 1: 检查宿主机文件"
echo "----------------------------------------"

CACHE_DIR="${HOME}/.aws/sso/cache"
TOKEN_FILE="${CACHE_DIR}/kiro-auth-token.json"

if [ ! -f "$TOKEN_FILE" ]; then
    echo -e "${RED}❌ 未找到 token 文件: $TOKEN_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 找到 token 文件: $TOKEN_FILE${NC}"

# 提取 clientIdHash
if command -v jq &> /dev/null; then
    CLIENT_ID_HASH=$(jq -r '.clientIdHash // empty' "$TOKEN_FILE")
    if [ -n "$CLIENT_ID_HASH" ]; then
        echo -e "${GREEN}✅ clientIdHash: $CLIENT_ID_HASH${NC}"
        
        # 检查对应的文件是否存在
        HASH_FILE="${CACHE_DIR}/${CLIENT_ID_HASH}.json"
        if [ -f "$HASH_FILE" ]; then
            echo -e "${GREEN}✅ 找到 clientIdHash 文件: $HASH_FILE${NC}"
        else
            echo -e "${RED}❌ 未找到 clientIdHash 文件: $HASH_FILE${NC}"
            echo -e "${YELLOW}⚠️  建议运行: node merge-kiro-tokens.js${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  token 文件中没有 clientIdHash 字段${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  未安装 jq，跳过 clientIdHash 检查${NC}"
fi

echo ""

# 2. 检查 Docker 配置
echo "🐳 步骤 2: 检查 Docker 配置"
echo "----------------------------------------"

if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ 未找到 docker-compose.yml${NC}"
    exit 1
fi

# 检查 volumes 配置
if grep -q "\${HOME}/\.aws/sso/cache:/app/\.aws/sso/cache" docker-compose.yml; then
    echo -e "${GREEN}✅ Docker 配置正确：挂载整个 cache 目录${NC}"
elif grep -q "\.aws/sso/cache/kiro-auth-token\.json" docker-compose.yml; then
    echo -e "${YELLOW}⚠️  Docker 配置使用单文件挂载${NC}"
    echo -e "${YELLOW}   建议改为挂载整个目录以支持 clientIdHash${NC}"
else
    echo -e "${RED}❌ 未找到 .aws/sso/cache 挂载配置${NC}"
fi

echo ""

# 3. 重启容器
echo "🔄 步骤 3: 重启 Docker 容器"
echo "----------------------------------------"

read -p "是否要重启容器？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "停止容器..."
    docker-compose down
    
    echo "启动容器..."
    docker-compose up -d
    
    echo "等待容器启动..."
    sleep 5
    
    echo -e "${GREEN}✅ 容器已重启${NC}"
else
    echo "跳过容器重启"
fi

echo ""

# 4. 检查容器日志
echo "📋 步骤 4: 检查容器日志"
echo "----------------------------------------"

if docker ps | grep -q aiclient2api; then
    echo "查看最近的日志..."
    echo ""
    docker-compose logs --tail=50 aiclient2api | grep -E "(clientIdHash|clientId|Kiro Auth)" || echo "未找到相关日志"
    echo ""
    
    # 检查是否成功加载
    if docker-compose logs aiclient2api | grep -q "Successfully loaded clientId and clientSecret"; then
        echo -e "${GREEN}✅ 成功加载 clientId 和 clientSecret${NC}"
    elif docker-compose logs aiclient2api | grep -q "Could not load client credentials from clientIdHash"; then
        echo -e "${RED}❌ 无法加载 clientIdHash 文件${NC}"
        echo ""
        echo "可能的原因："
        echo "1. clientIdHash 文件不存在"
        echo "2. Docker 挂载配置不正确"
        echo "3. 文件权限问题"
    else
        echo -e "${YELLOW}⚠️  未找到 clientIdHash 相关日志${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  容器未运行${NC}"
fi

echo ""

# 5. 测试容器内文件访问
echo "🔍 步骤 5: 测试容器内文件访问"
echo "----------------------------------------"

if docker ps | grep -q aiclient2api; then
    echo "检查容器内的文件..."
    
    # 检查主 token 文件
    if docker exec aiclient2api test -f /app/.aws/sso/cache/kiro-auth-token.json; then
        echo -e "${GREEN}✅ 容器内可访问: kiro-auth-token.json${NC}"
    else
        echo -e "${RED}❌ 容器内无法访问: kiro-auth-token.json${NC}"
    fi
    
    # 检查 clientIdHash 文件（如果存在）
    if [ -n "$CLIENT_ID_HASH" ]; then
        if docker exec aiclient2api test -f "/app/.aws/sso/cache/${CLIENT_ID_HASH}.json"; then
            echo -e "${GREEN}✅ 容器内可访问: ${CLIENT_ID_HASH}.json${NC}"
        else
            echo -e "${RED}❌ 容器内无法访问: ${CLIENT_ID_HASH}.json${NC}"
        fi
    fi
    
    # 列出容器内的所有文件
    echo ""
    echo "容器内 cache 目录的文件列表："
    docker exec aiclient2api ls -la /app/.aws/sso/cache/ 2>/dev/null || echo "无法列出文件"
else
    echo -e "${YELLOW}⚠️  容器未运行，跳过检查${NC}"
fi

echo ""

# 6. 总结
echo "================================================"
echo "📊 验证总结"
echo "================================================"

echo ""
echo "如果看到错误，请尝试以下解决方案："
echo ""
echo "1. 确保 docker-compose.yml 中挂载了整个 cache 目录："
echo "   volumes:"
echo "     - \${HOME}/.aws/sso/cache:/app/.aws/sso/cache:rw"
echo ""
echo "2. 如果 clientIdHash 文件不存在，运行合并工具："
echo "   node merge-kiro-tokens.js"
echo ""
echo "3. 重新构建并启动容器："
echo "   docker-compose down"
echo "   docker-compose build"
echo "   docker-compose up -d"
echo ""
echo "4. 查看详细日志："
echo "   docker-compose logs -f aiclient2api"
echo ""

echo "更多信息请参考: DOCKER-CLIENTID-FIX.md"

