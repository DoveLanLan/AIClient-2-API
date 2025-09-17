#!/bin/bash

# 检查构建状态和代码同步脚本

echo "=== Docker 构建状态检查 ==="
echo "时间: $(date)"
echo

# 1. 检查当前运行的容器
echo "=== 1. 当前容器状态 ==="
if docker-compose ps | grep -q "Up"; then
    echo "✅ 容器正在运行"
    docker-compose ps
    
    # 检查容器内的代码版本
    echo
    echo "=== 2. 检查容器内代码版本 ==="
    echo "容器内文件修改时间:"
    docker exec aiclient2api ls -la /app/src/claude/claude-kiro.js | awk '{print $6, $7, $8, $9}'
    
    echo "本地文件修改时间:"
    ls -la src/claude/claude-kiro.js | awk '{print $6, $7, $8, $9}'
    
    # 检查关键代码是否存在
    echo
    echo "=== 3. 检查关键修复是否生效 ==="
    if docker exec aiclient2api grep -q "stream has been aborted" /app/src/claude/claude-kiro.js; then
        echo "✅ 流错误修复代码已存在于容器中"
    else
        echo "❌ 流错误修复代码不存在于容器中 - 需要重新构建"
    fi
    
    if docker exec aiclient2api grep -q "shouldRetryStreamError" /app/src/claude/claude-kiro.js; then
        echo "✅ 流重试方法已存在于容器中"
    else
        echo "❌ 流重试方法不存在于容器中 - 需要重新构建"
    fi
    
else
    echo "❌ 容器未运行"
fi

echo
echo "=== 4. 网络连接检查 ==="
if curl -s --connect-timeout 5 https://registry-1.docker.io > /dev/null; then
    echo "✅ Docker Hub 连接正常"
else
    echo "❌ Docker Hub 连接失败"
fi

echo
echo "=== 5. 构建建议 ==="
if docker-compose ps | grep -q "Up"; then
    echo "当前容器正在运行，如果代码已更新但容器内代码过旧，请执行："
    echo "  docker-compose down"
    echo "  docker-compose build"
    echo "  docker-compose up -d"
else
    echo "容器未运行，请先构建并启动："
    echo "  docker-compose build"
    echo "  docker-compose up -d"
fi

echo
echo "如果网络问题导致构建失败，可以："
echo "1. 等待网络恢复后重试"
echo "2. 使用代理或VPN"
echo "3. 使用本地镜像缓存"