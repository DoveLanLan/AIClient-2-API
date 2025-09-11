#!/bin/bash

# Token 管理测试脚本
# 用于测试和监控 token 自动刷新功能

API_KEY="123456"
BASE_URL="http://localhost:3000"

echo "=== Token 管理测试脚本 ==="
echo "时间: $(date)"
echo

# 函数：发送API请求
api_request() {
    local method=$1
    local endpoint=$2
    local description=$3
    
    echo "[$description]"
    echo "请求: $method $BASE_URL$endpoint"
    
    if [ "$method" = "GET" ]; then
        response=$(curl --noproxy "*" -s -H "Authorization: Bearer $API_KEY" "$BASE_URL$endpoint")
    else
        response=$(curl --noproxy "*" -s -X "$method" -H "Authorization: Bearer $API_KEY" "$BASE_URL$endpoint")
    fi
    
    echo "响应: $response" | jq . 2>/dev/null || echo "响应: $response"
    echo
}

# 函数：检查服务健康状态
check_health() {
    echo "=== 1. 健康检查 ==="
    api_request "GET" "/health" "服务健康状态"
}

# 函数：查看token状态
check_token_status() {
    echo "=== 2. Token 状态检查 ==="
    api_request "GET" "/admin/token-status" "当前 Token 状态"
}

# 函数：手动刷新token
manual_refresh() {
    echo "=== 3. 手动 Token 刷新 ==="
    api_request "POST" "/admin/refresh-token" "手动触发 Token 刷新"
}

# 函数：测试API调用
test_api_call() {
    echo "=== 4. 测试 API 调用 ==="
    echo "[测试聊天API]"
    echo "请求: POST $BASE_URL/v1/chat/completions"
    
    response=$(curl --noproxy "*" -s -X POST \
        -H "Authorization: Bearer $API_KEY" \
        -H "Content-Type: application/json" \
        -d '{
            "model": "claude-sonnet-4-20250514",
            "messages": [
                {"role": "user", "content": "Hello, this is a test message. Please respond briefly."}
            ],
            "max_tokens": 50
        }' \
        "$BASE_URL/v1/chat/completions")
    
    echo "响应: $response" | jq . 2>/dev/null || echo "响应: $response"
    echo
}

# 函数：监控模式
monitor_mode() {
    echo "=== 5. 监控模式 (每30秒检查一次，按Ctrl+C退出) ==="
    
    while true; do
        echo "--- $(date) ---"
        
        # 检查token状态
        status_response=$(curl --noproxy "*" -s -H "Authorization: Bearer $API_KEY" "$BASE_URL/admin/token-status")
        
        # 解析响应
        total_tokens=$(echo "$status_response" | jq -r '.tokenStatus.totalTokens // "N/A"')
        valid_tokens=$(echo "$status_response" | jq -r '.tokenStatus.validTokens // "N/A"')
        expiring_soon=$(echo "$status_response" | jq -r '.tokenStatus.expiringSoonTokens // "N/A"')
        expired_tokens=$(echo "$status_response" | jq -r '.tokenStatus.expiredTokens // "N/A"')
        
        echo "Token 状态: 总计=$total_tokens, 有效=$valid_tokens, 即将过期=$expiring_soon, 已过期=$expired_tokens"
        
        # 如果有即将过期的token，显示详细信息
        if [ "$expiring_soon" != "0" ] && [ "$expiring_soon" != "N/A" ]; then
            echo "⚠️  检测到即将过期的 token！"
            echo "$status_response" | jq '.tokenStatus.tokens[] | select(.isExpiringSoon == true)'
        fi
        
        # 如果有过期的token，尝试刷新
        if [ "$expired_tokens" != "0" ] && [ "$expired_tokens" != "N/A" ]; then
            echo "🔄 检测到过期 token，尝试自动刷新..."
            refresh_response=$(curl --noproxy "*" -s -X POST -H "Authorization: Bearer $API_KEY" "$BASE_URL/admin/refresh-token")
            echo "刷新结果: $refresh_response" | jq . 2>/dev/null || echo "刷新结果: $refresh_response"
        fi
        
        sleep 30
    done
}

# 主菜单
show_menu() {
    echo "请选择测试选项:"
    echo "1) 健康检查"
    echo "2) 查看 Token 状态"
    echo "3) 手动刷新 Token"
    echo "4) 测试 API 调用"
    echo "5) 监控模式"
    echo "6) 运行所有测试"
    echo "0) 退出"
    echo
}

# 运行所有测试
run_all_tests() {
    check_health
    check_token_status
    manual_refresh
    check_token_status  # 刷新后再次检查
    test_api_call
}

# 主程序
if [ "$1" = "monitor" ]; then
    monitor_mode
elif [ "$1" = "all" ]; then
    run_all_tests
else
    while true; do
        show_menu
        read -p "请输入选项 (0-6): " choice
        
        case $choice in
            1) check_health ;;
            2) check_token_status ;;
            3) manual_refresh ;;
            4) test_api_call ;;
            5) monitor_mode ;;
            6) run_all_tests ;;
            0) echo "退出测试脚本"; exit 0 ;;
            *) echo "无效选项，请重新选择" ;;
        esac
        
        echo "按回车键继续..."
        read
    done
fi