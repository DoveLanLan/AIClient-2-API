#!/bin/bash

# 网络连接诊断脚本
# 用于诊断到 Kiro API 服务器的网络连接问题

echo "=== Kiro API 网络连接诊断 ==="
echo "时间: $(date)"
echo

# 1. 检查基本网络连接
echo "=== 1. 基本网络连接测试 ==="
echo "测试外网连接..."
if ping -c 3 8.8.8.8 > /dev/null 2>&1; then
    echo "✅ 外网连接正常"
else
    echo "❌ 外网连接失败"
fi

echo "测试 DNS 解析..."
if nslookup google.com > /dev/null 2>&1; then
    echo "✅ DNS 解析正常"
else
    echo "❌ DNS 解析失败"
fi
echo

# 2. 测试 Kiro API 域名解析
echo "=== 2. Kiro API 域名解析测试 ==="
kiro_domains=(
    "codewhisperer.us-east-1.amazonaws.com"
    "oidc.us-east-1.amazonaws.com"
    "prod.us-east-1.auth.desktop.kiro.dev"
)

for domain in "${kiro_domains[@]}"; do
    echo "测试域名: $domain"
    if nslookup "$domain" > /dev/null 2>&1; then
        echo "✅ $domain 解析成功"
        # 获取 IP 地址
        ip=$(nslookup "$domain" | grep -A1 "Name:" | tail -1 | awk '{print $2}')
        echo "   IP: $ip"
    else
        echo "❌ $domain 解析失败"
    fi
done
echo

# 3. 测试端口连接
echo "=== 3. HTTPS 端口连接测试 ==="
for domain in "${kiro_domains[@]}"; do
    echo "测试 HTTPS 连接: $domain:443"
    if timeout 10 bash -c "</dev/tcp/$domain/443" 2>/dev/null; then
        echo "✅ $domain:443 连接成功"
    else
        echo "❌ $domain:443 连接失败"
    fi
done
echo

# 4. 测试 TLS 握手
echo "=== 4. TLS 握手测试 ==="
for domain in "${kiro_domains[@]}"; do
    echo "测试 TLS 握手: $domain"
    if echo | timeout 10 openssl s_client -connect "$domain:443" -servername "$domain" 2>/dev/null | grep -q "CONNECTED"; then
        echo "✅ $domain TLS 握手成功"
    else
        echo "❌ $domain TLS 握手失败"
    fi
done
echo

# 5. 检查代理设置
echo "=== 5. 代理设置检查 ==="
if [ -n "$http_proxy" ]; then
    echo "HTTP 代理: $http_proxy"
fi
if [ -n "$https_proxy" ]; then
    echo "HTTPS 代理: $https_proxy"
fi
if [ -n "$HTTP_PROXY" ]; then
    echo "HTTP_PROXY: $HTTP_PROXY"
fi
if [ -n "$HTTPS_PROXY" ]; then
    echo "HTTPS_PROXY: $HTTPS_PROXY"
fi
if [ -z "$http_proxy" ] && [ -z "$https_proxy" ] && [ -z "$HTTP_PROXY" ] && [ -z "$HTTPS_PROXY" ]; then
    echo "未检测到代理设置"
fi
echo

# 6. 容器内网络测试
echo "=== 6. 容器内网络测试 ==="
if docker ps | grep -q aiclient2api; then
    echo "测试容器内网络连接..."
    
    echo "容器内 DNS 解析测试:"
    docker exec aiclient2api nslookup codewhisperer.us-east-1.amazonaws.com 2>/dev/null && echo "✅ 容器内 DNS 正常" || echo "❌ 容器内 DNS 失败"
    
    echo "容器内网络连接测试:"
    docker exec aiclient2api ping -c 2 8.8.8.8 2>/dev/null && echo "✅ 容器内网络正常" || echo "❌ 容器内网络失败"
    
    echo "容器内环境变量:"
    docker exec aiclient2api printenv | grep -i proxy || echo "容器内无代理设置"
else
    echo "❌ 容器未运行"
fi
echo

# 7. 建议
echo "=== 7. 故障排除建议 ==="
echo "如果出现网络连接问题，请尝试："
echo "1. 检查防火墙设置，确保允许 HTTPS (443) 出站连接"
echo "2. 如果在公司网络，检查是否需要配置代理"
echo "3. 尝试重启 Docker 服务: docker-compose restart"
echo "4. 检查系统时间是否正确（TLS 证书验证需要）"
echo "5. 如果问题持续，可能是 AWS 服务暂时不可用"
echo

echo "=== 诊断完成 ==="