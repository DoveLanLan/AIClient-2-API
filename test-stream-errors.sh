#!/bin/bash

# 流错误诊断和测试脚本

API_KEY="123456"
BASE_URL="http://localhost:3000"

echo "=== 流错误诊断和测试 ==="
echo "时间: $(date)"
echo

# 1. 检查容器状态
echo "=== 1. 容器状态 ==="
docker-compose ps
echo

# 2. 测试多种流式请求
echo "=== 2. 流式请求测试 ==="

# 测试短消息流式请求
echo "--- 测试 1: 短消息流式请求 ---"
short_response=$(timeout 30 curl --noproxy "*" -s -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -H "model-provider: claude-kiro-oauth" \
    -d '{
        "model": "claude-sonnet-4-20250514",
        "messages": [{"role": "user", "content": "Hi"}],
        "stream": true,
        "max_tokens": 10
    }' \
    "$BASE_URL/claude-kiro-oauth/v1/chat/completions")

if [ $? -eq 0 ]; then
    echo "✅ 短消息流式请求成功"
    echo "响应长度: $(echo "$short_response" | wc -c) 字符"
else
    echo "❌ 短消息流式请求超时或失败"
fi
echo

# 测试长消息流式请求
echo "--- 测试 2: 长消息流式请求 ---"
long_response=$(timeout 60 curl --noproxy "*" -s -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -H "model-provider: claude-kiro-oauth" \
    -d '{
        "model": "claude-sonnet-4-20250514",
        "messages": [{"role": "user", "content": "Please write a detailed explanation about artificial intelligence, including its history, current applications, and future prospects. Make it comprehensive."}],
        "stream": true,
        "max_tokens": 500
    }' \
    "$BASE_URL/claude-kiro-oauth/v1/chat/completions")

if [ $? -eq 0 ]; then
    echo "✅ 长消息流式请求成功"
    echo "响应长度: $(echo "$long_response" | wc -c) 字符"
else
    echo "❌ 长消息流式请求超时或失败"
fi
echo

# 3. 测试非流式请求作为对比
echo "=== 3. 非流式请求对比测试 ==="
normal_response=$(timeout 30 curl --noproxy "*" -s -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -H "model-provider: claude-kiro-oauth" \
    -d '{
        "model": "claude-sonnet-4-20250514",
        "messages": [{"role": "user", "content": "Hello"}],
        "max_tokens": 50
    }' \
    "$BASE_URL/claude-kiro-oauth/v1/chat/completions")

if echo "$normal_response" | jq . > /dev/null 2>&1; then
    echo "✅ 非流式请求成功"
    echo "$normal_response" | jq '.choices[0].message.content // .error.message // "Unknown response"'
else
    echo "❌ 非流式请求失败"
    echo "响应: $normal_response"
fi
echo

# 4. 并发流式请求测试
echo "=== 4. 并发流式请求测试 ==="
echo "启动 3 个并发流式请求..."

for i in {1..3}; do
    (
        echo "启动并发请求 $i"
        response=$(timeout 45 curl --noproxy "*" -s -X POST \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $API_KEY" \
            -H "model-provider: claude-kiro-oauth" \
            -d "{
                \"model\": \"claude-sonnet-4-20250514\",
                \"messages\": [{\"role\": \"user\", \"content\": \"Concurrent test $i\"}],
                \"stream\": true,
                \"max_tokens\": 30
            }" \
            "$BASE_URL/claude-kiro-oauth/v1/chat/completions")
        
        if [ $? -eq 0 ]; then
            echo "✅ 并发请求 $i 成功"
        else
            echo "❌ 并发请求 $i 失败"
        fi
    ) &
done

wait
echo "并发测试完成"
echo

# 5. 检查流相关的错误日志
echo "=== 5. 流错误日志分析 ==="
echo "查找流相关错误..."
stream_errors=$(docker-compose logs --tail=50 | grep -E "(stream.*abort|socket.*hang|request.*abort|premature.*close)" || echo "")
if [ -z "$stream_errors" ]; then
    echo "✅ 未发现流相关错误"
else
    echo "❌ 发现流错误:"
    echo "$stream_errors"
fi
echo

echo "查找网络重试日志..."
retry_logs=$(docker-compose logs --tail=50 | grep -E "(Retrying|retry|Network.*error)" || echo "")
if [ -z "$retry_logs" ]; then
    echo "未发现重试日志"
else
    echo "重试日志:"
    echo "$retry_logs"
fi
echo

# 6. 系统资源检查
echo "=== 6. 系统资源检查 ==="
echo "容器资源使用:"
docker stats aiclient2api --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
echo

echo "系统网络连接:"
netstat -an | grep :3000 | head -5
echo

echo "=== 诊断完成 ==="
echo "建议:"
echo "1. 如果出现大量流错误，可能是网络不稳定或超时设置过短"
echo "2. 检查客户端是否过早断开连接"
echo "3. 考虑增加重试次数或调整超时设置"
echo "4. 监控系统资源使用情况"