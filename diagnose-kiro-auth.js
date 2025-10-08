#!/usr/bin/env node

/**
 * Kiro Authentication Diagnostic Tool
 * 诊断 Kiro 认证问题的工具
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

const KIRO_AUTH_TOKEN_FILE = 'kiro-auth-token.json';

async function diagnoseKiroAuth() {
    console.log('='.repeat(60));
    console.log('Kiro Authentication Diagnostic Tool');
    console.log('Kiro 认证诊断工具');
    console.log('='.repeat(60));
    console.log('');

    // 1. 检查认证文件路径
    const defaultCredPath = path.join(os.homedir(), '.aws', 'sso', 'cache');
    const tokenFilePath = path.join(defaultCredPath, KIRO_AUTH_TOKEN_FILE);

    console.log('📁 检查认证文件路径...');
    console.log(`   默认路径: ${defaultCredPath}`);
    console.log(`   Token 文件: ${tokenFilePath}`);
    console.log('');

    try {
        const stats = await fs.stat(tokenFilePath);
        console.log(`✅ Token 文件存在 (大小: ${stats.size} bytes)`);
        console.log(`   最后修改: ${stats.mtime.toLocaleString()}`);
    } catch (error) {
        console.error(`❌ Token 文件不存在: ${tokenFilePath}`);
        console.error(`   错误: ${error.message}`);
        return;
    }
    console.log('');

    // 2. 读取和解析 token 文件
    console.log('📄 读取 Token 文件...');
    let tokenData;
    try {
        const fileContent = await fs.readFile(tokenFilePath, 'utf8');
        tokenData = JSON.parse(fileContent);
        console.log('✅ Token 文件解析成功');
    } catch (error) {
        console.error(`❌ Token 文件读取/解析失败: ${error.message}`);
        return;
    }
    console.log('');

    // 3. 检查必要字段
    console.log('🔍 检查 Token 数据...');
    const requiredFields = {
        accessToken: 'Access Token',
        refreshToken: 'Refresh Token',
        expiresAt: '过期时间',
        authMethod: '认证方法',
        region: '区域',
    };

    const optionalFields = {
        clientId: 'Client ID (IdC 必需)',
        clientSecret: 'Client Secret (IdC 必需)',
        profileArn: 'Profile ARN (Social 必需)',
        clientIdHash: 'Client ID Hash (用于查找 client 凭证文件)',
    };

    let hasErrors = false;
    let warnings = [];

    // 检查必需字段
    for (const [field, description] of Object.entries(requiredFields)) {
        if (tokenData[field]) {
            const value = field.includes('Token') || field.includes('Secret') 
                ? `${String(tokenData[field]).substring(0, 20)}...` 
                : tokenData[field];
            console.log(`   ✅ ${description}: ${value}`);
        } else {
            console.error(`   ❌ ${description}: 缺失`);
            hasErrors = true;
        }
    }

    // 检查可选字段（根据认证方法）
    const authMethod = tokenData.authMethod;
    console.log('');
    console.log(`🔐 认证方法: ${authMethod || '未设置'}`);

    if (authMethod === 'IdC') {
        console.log('   检查 IdC 特定字段...');
        
        // 检查 clientIdHash
        if (tokenData.clientIdHash) {
            console.log(`   ℹ️  clientIdHash: ${tokenData.clientIdHash}`);
            
            // 尝试查找对应的文件
            const clientIdHashFile = path.join(path.dirname(tokenFilePath), `${tokenData.clientIdHash}.json`);
            try {
                const clientCredContent = await fs.readFile(clientIdHashFile, 'utf8');
                const clientCred = JSON.parse(clientCredContent);
                console.log(`   ✅ 找到对应的 client 凭证文件: ${tokenData.clientIdHash}.json`);
                
                if (clientCred.clientId) {
                    console.log(`   ✅ 文件中包含 clientId: ${clientCred.clientId.substring(0, 20)}...`);
                    if (!tokenData.clientId) {
                        console.log(`   ℹ️  建议: 运行 'node merge-kiro-tokens.js' 合并配置`);
                        warnings.push('clientId 在单独的文件中，建议运行合并工具');
                    }
                } else {
                    console.error(`   ❌ client 凭证文件缺少 clientId`);
                    hasErrors = true;
                }
                
                if (clientCred.clientSecret) {
                    console.log(`   ✅ 文件中包含 clientSecret: ${clientCred.clientSecret.substring(0, 20)}...`);
                    if (!tokenData.clientSecret) {
                        console.log(`   ℹ️  建议: 运行 'node merge-kiro-tokens.js' 合并配置`);
                    }
                } else {
                    console.error(`   ❌ client 凭证文件缺少 clientSecret`);
                    hasErrors = true;
                }
            } catch (error) {
                console.error(`   ❌ 无法读取 client 凭证文件: ${error.message}`);
                console.error(`   文件路径: ${clientIdHashFile}`);
                hasErrors = true;
            }
        }
        
        if (!tokenData.clientId) {
            if (!tokenData.clientIdHash) {
                console.error(`   ❌ clientId 缺失 (IdC 认证必需)`);
                hasErrors = true;
            }
        } else {
            console.log(`   ✅ clientId: ${tokenData.clientId.substring(0, 20)}...`);
        }

        if (!tokenData.clientSecret) {
            if (!tokenData.clientIdHash) {
                console.error(`   ❌ clientSecret 缺失 (IdC 认证必需)`);
                hasErrors = true;
            }
        } else {
            console.log(`   ✅ clientSecret: ${tokenData.clientSecret.substring(0, 20)}...`);
        }

        if (tokenData.profileArn) {
            warnings.push('IdC 认证不需要 profileArn，但存在该字段（可忽略）');
        }
    } else if (authMethod === 'social') {
        console.log('   检查 Social 认证特定字段...');
        if (!tokenData.profileArn) {
            warnings.push('profileArn 缺失 (Social 认证推荐)');
        } else {
            console.log(`   ✅ profileArn: ${tokenData.profileArn}`);
        }
    } else {
        console.warn(`   ⚠️  未知的认证方法: ${authMethod}`);
        warnings.push(`未知的认证方法: ${authMethod}`);
    }
    console.log('');

    // 4. 检查 token 过期时间
    console.log('⏰ 检查 Token 过期状态...');
    if (tokenData.expiresAt) {
        try {
            const expiresAt = new Date(tokenData.expiresAt);
            const now = new Date();
            const diffMs = expiresAt.getTime() - now.getTime();
            const diffMinutes = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMinutes / 60);

            console.log(`   过期时间: ${expiresAt.toLocaleString()}`);
            console.log(`   当前时间: ${now.toLocaleString()}`);

            if (diffMs < 0) {
                console.error(`   ❌ Token 已过期 (${Math.abs(diffMinutes)} 分钟前)`);
                hasErrors = true;
            } else if (diffMs < 10 * 60 * 1000) { // 10分钟
                console.warn(`   ⚠️  Token 即将过期 (剩余 ${diffMinutes} 分钟)`);
                warnings.push(`Token 即将过期 (剩余 ${diffMinutes} 分钟)`);
            } else if (diffHours < 1) {
                console.log(`   ⚠️  Token 剩余时间较短 (剩余 ${diffMinutes} 分钟)`);
                warnings.push(`Token 剩余时间较短 (剩余 ${diffMinutes} 分钟)`);
            } else {
                console.log(`   ✅ Token 有效 (剩余 ${diffHours} 小时 ${diffMinutes % 60} 分钟)`);
            }
        } catch (error) {
            console.error(`   ❌ 无法解析过期时间: ${error.message}`);
            hasErrors = true;
        }
    }
    console.log('');

    // 5. 扫描其他可用的 token 文件
    console.log('🔎 扫描其他可用的 Token 文件...');
    try {
        const files = await fs.readdir(defaultCredPath);
        const tokenFiles = [];

        for (const file of files) {
            if (file.endsWith('.json')) {
                const filePath = path.join(defaultCredPath, file);
                try {
                    const content = await fs.readFile(filePath, 'utf8');
                    const data = JSON.parse(content);

                    if (data.accessToken && data.expiresAt) {
                        const expiresAt = new Date(data.expiresAt);
                        const now = new Date();
                        const isExpired = expiresAt.getTime() <= now.getTime();

                        tokenFiles.push({
                            file,
                            expiresAt,
                            isExpired,
                            authMethod: data.authMethod || 'unknown',
                        });
                    }
                } catch {
                    // 忽略无法解析的文件
                }
            }
        }

        tokenFiles.sort((a, b) => b.expiresAt.getTime() - a.expiresAt.getTime());

        if (tokenFiles.length > 0) {
            console.log(`   找到 ${tokenFiles.length} 个 Token 文件:`);
            tokenFiles.forEach((tf, index) => {
                const status = tf.isExpired ? '❌ 已过期' : '✅ 有效';
                const isCurrent = tf.file === KIRO_AUTH_TOKEN_FILE ? ' [当前]' : '';
                console.log(`     ${index + 1}. ${tf.file}${isCurrent}`);
                console.log(`        ${status} | 过期时间: ${tf.expiresAt.toLocaleString()} | 认证: ${tf.authMethod}`);
            });
        } else {
            console.warn('   ⚠️  未找到其他可用的 Token 文件');
        }
    } catch (error) {
        console.error(`   ❌ 扫描目录失败: ${error.message}`);
    }
    console.log('');

    // 6. 总结和建议
    console.log('='.repeat(60));
    console.log('📊 诊断总结');
    console.log('='.repeat(60));

    if (hasErrors) {
        console.log('');
        console.error('❌ 发现严重问题，需要修复:');
        console.error('');
        console.error('  可能的原因:');
        console.error('  1. Token 文件缺少必要字段（clientId, clientSecret）');
        console.error('  2. Token 已过期');
        console.error('  3. 认证方法配置不正确');
        console.error('');
        console.error('  建议的修复步骤:');
        console.error('  1. 重新登录 AWS SSO / Kiro 以获取新的认证凭证');
        console.error('  2. 确保使用正确的认证方法（IdC 或 Social）');
        console.error('  3. 检查 .aws/sso/cache 目录中是否有其他有效的 token 文件');
        console.error('  4. 如果使用 IdC 认证，确保 clientId 和 clientSecret 正确');
    } else if (warnings.length > 0) {
        console.log('');
        console.warn('⚠️  发现警告:');
        warnings.forEach(warning => {
            console.warn(`   - ${warning}`);
        });
        console.log('');
        console.log('  建议: 建议尽快刷新 token 或重新登录');
    } else {
        console.log('');
        console.log('✅ Token 配置看起来正常');
        console.log('');
        console.log('  如果仍然出现 400 错误，可能是:');
        console.log('  1. API 端点问题');
        console.log('  2. 网络连接问题');
        console.log('  3. 速率限制过于严格');
    }

    // 7. 速率限制建议
    console.log('');
    console.log('='.repeat(60));
    console.log('⚡ 速率限制建议');
    console.log('='.repeat(60));
    console.log('');
    console.log('  当前默认配置:');
    console.log('    RATE_LIMIT_MAX_REQUESTS: 1 (每秒最多1个请求)');
    console.log('    RATE_LIMIT_WINDOW_MS: 1000 (时间窗口1秒)');
    console.log('');
    console.log('  建议配置:');
    console.log('    RATE_LIMIT_MAX_REQUESTS: 10 (每秒最多10个请求)');
    console.log('    RATE_LIMIT_WINDOW_MS: 1000');
    console.log('  或禁用速率限制:');
    console.log('    RATE_LIMIT_ENABLED: false');
    console.log('');
}

// 运行诊断
diagnoseKiroAuth().catch(error => {
    console.error('诊断过程中发生错误:', error);
    process.exit(1);
});
