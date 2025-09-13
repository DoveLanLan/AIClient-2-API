#!/bin/bash

# 快速测试修复后的代码

API_KEY="123456"
BASE_URL="http://localhost:3000"

echo "=== 快速测试修复 ==="
echo "时间: $(date)"
echo

# 等待容器启动
echo "等待容器启动..."
sleep 15

# 1. 健康检查
echo "=== 1. 健康检查 ==="
health_response=$(curl --noproxy "*" -s "$BASE_URL/health")
if echo "$health_response" | jq . > /dev/null 2>&1; then
    echo "✅ 健康检查成功"
    echo "$health_response" | jq .
else
    echo "❌ 健康检查失败: $health_response"
fi
echo

# 2. 测试流式 API 调用（之前出错的）
echo "=== 2. 测试流式 API 调用 ==="
stream_response=$(curl --noproxy "*" -s -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -H "model-provider: claude-kiro-oauth" \
    -d '{
        "model": "claude-sonnet-4-20250514",
        "messages": [{"role": "user", "content": "Hello, test message"}],
        "stream": true,
        "max_tokens": 50
    }' \
    "$BASE_URL/claude-kiro-oauth/v1/chat/completions")

if echo "$stream_response" | grep -q "data:" || echo "$stream_response" | jq . > /dev/null 2>&1; then
    echo "✅ 流式 API 调用成功"
    echo "响应前100字符: $(echo "$stream_response" | head -c 100)..."
else
    echo "❌ 流式 API 调用失败"
    echo "响应: $stream_response"
fi
echo

# 3. 测试普通 API 调用
echo "=== 3. 测试普通 API 调用 ==="
normal_response=$(curl --noproxy "*" -s -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -H "model-provider: claude-kiro-oauth" \
    -d '{
        "model": "claude-sonnet-4-20250514",
        "messages": [{"role": "user", "content": "Hello"}],
        "max_tokens": 20
    }' \
    "$BASE_URL/claude-kiro-oauth/v1/chat/completions")

if echo "$normal_response" | jq . > /dev/null 2>&1; then
    echo "✅ 普通 API 调用成功"
    echo "$normal_response" | jq '.choices[0].message.content // .error.message // "Unknown response"'
else
    echo "❌ 普通 API 调用失败"
    echo "响应: $normal_response"
fi
echo

# 4. 检查错误日志
echo "=== 4. 检查错误日志 ==="
error_logs=$(docker-compose logs --tail=20 | grep -E "(Error|ReferenceError|require.*not.*defined)" || echo "")
if [ -z "$error_logs" ]; then
    echo "✅ 未发现 require 相关错误"
else
    echo "❌ 发现错误:"
    echo "$error_logs"
fi
echo

echo "=== 测试完成 ==="