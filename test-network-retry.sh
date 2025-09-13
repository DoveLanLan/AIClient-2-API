#!/bin/bash

# 测试网络重试功能

API_KEY="123456"
BASE_URL="http://localhost:3000"

echo "=== 测试网络重试功能 ==="
echo "时间: $(date)"
echo

# 1. 检查容器状态
echo "=== 1. 检查容器状态 ==="
docker-compose ps
echo

# 2. 多次测试 API 调用，观察网络错误处理
echo "=== 2. 连续测试 API 调用 ==="
for i in {1..5}; do
    echo "--- 测试 $i ---"
    echo "时间: $(date)"
    
    response=$(curl --noproxy "*" -s -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $API_KEY" \
        -H "model-provider: claude-kiro-oauth" \
        -d '{
            "model": "claude-sonnet-4-20250514",
            "messages": [{"role": "user", "content": "Test message ' $i '"}],
            "max_tokens": 20
        }' \
        "$BASE_URL/claude-kiro-oauth/v1/chat/completions")
    
    if echo "$response" | jq . > /dev/null 2>&1; then
        echo "✅ 测试 $i 成功"
        echo "$response" | jq '.choices[0].message.content // .error.message // "Unknown response"'
    else
        echo "❌ 测试 $i 失败"
        echo "响应: $response"
    fi
    
    echo "等待 3 秒..."
    sleep 3
    echo
done

# 3. 检查日志中的网络错误和重试
echo "=== 3. 检查最近的日志 ==="
echo "查找网络错误和重试日志..."
docker-compose logs --tail=50 | grep -E "(network|socket|TLS|retry|Retrying)" || echo "未发现网络相关日志"
echo

# 4. 检查错误统计
echo "=== 4. 错误统计 ==="
echo "最近的错误日志:"
docker-compose logs --tail=100 | grep -E "(Error|Failed|failed)" | tail -10 || echo "未发现错误日志"
echo

echo "=== 测试完成 ==="