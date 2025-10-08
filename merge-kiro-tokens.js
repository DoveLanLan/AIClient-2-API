#!/usr/bin/env node

/**
 * Kiro Token Merger - 自动合并 SSO Token 文件
 * 
 * 这个脚本会：
 * 1. 读取 kiro-auth-token.json（包含 accessToken, refreshToken）
 * 2. 根据 clientIdHash 字段找到对应的 JSON 文件（包含 clientId, clientSecret）
 * 3. 合并这两个文件的内容
 * 4. 保存合并后的完整配置
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

const KIRO_AUTH_TOKEN_FILE = 'kiro-auth-token.json';

async function mergeKiroTokens() {
    console.log('='.repeat(70));
    console.log('Kiro Token Merger - Kiro Token 自动合并工具');
    console.log('='.repeat(70));
    console.log('');

    // 1. 确定 SSO cache 目录
    const defaultCredPath = path.join(os.homedir(), '.aws', 'sso', 'cache');
    const tokenFilePath = path.join(defaultCredPath, KIRO_AUTH_TOKEN_FILE);

    console.log('📁 检查文件...');
    console.log(`   SSO Cache 目录: ${defaultCredPath}`);
    console.log(`   Token 文件: ${tokenFilePath}`);
    console.log('');

    // 2. 读取主 token 文件
    console.log('📄 读取 kiro-auth-token.json...');
    let tokenData;
    try {
        const content = await fs.readFile(tokenFilePath, 'utf8');
        tokenData = JSON.parse(content);
        console.log('   ✅ 成功读取');
    } catch (error) {
        console.error(`   ❌ 读取失败: ${error.message}`);
        console.error('');
        console.error('请确保文件存在: ' + tokenFilePath);
        process.exit(1);
    }

    // 显示当前 token 信息
    console.log('');
    console.log('📋 当前 Token 信息:');
    console.log(`   accessToken: ${tokenData.accessToken ? '✅ 存在' : '❌ 缺失'}`);
    console.log(`   refreshToken: ${tokenData.refreshToken ? '✅ 存在' : '❌ 缺失'}`);
    console.log(`   expiresAt: ${tokenData.expiresAt || '未设置'}`);
    console.log(`   authMethod: ${tokenData.authMethod || '未设置'}`);
    console.log(`   provider: ${tokenData.provider || '未设置'}`);
    console.log(`   region: ${tokenData.region || '未设置'}`);
    console.log(`   clientId: ${tokenData.clientId ? '✅ 存在' : '❌ 缺失'}`);
    console.log(`   clientSecret: ${tokenData.clientSecret ? '✅ 存在' : '❌ 缺失'}`);
    console.log(`   clientIdHash: ${tokenData.clientIdHash || '未设置'}`);
    console.log('');

    // 3. 检查是否已经有完整的配置
    if (tokenData.clientId && tokenData.clientSecret) {
        console.log('✅ Token 文件已经包含 clientId 和 clientSecret');
        console.log('   无需合并');
        console.log('');
        
        // 验证 token 过期时间
        if (tokenData.expiresAt) {
            const expiresAt = new Date(tokenData.expiresAt);
            const now = new Date();
            const diffMinutes = Math.floor((expiresAt.getTime() - now.getTime()) / 60000);
            
            if (diffMinutes > 0) {
                console.log(`✅ Token 有效（剩余 ${diffMinutes} 分钟）`);
            } else {
                console.warn(`⚠️  Token 已过期（${Math.abs(diffMinutes)} 分钟前）`);
            }
        }
        return;
    }

    // 4. 查找 clientIdHash 对应的文件
    if (!tokenData.clientIdHash) {
        console.error('❌ 未找到 clientIdHash 字段');
        console.error('');
        console.error('无法自动合并。请手动添加 clientId 和 clientSecret 到 kiro-auth-token.json');
        process.exit(1);
    }

    const clientCredFilePath = path.join(defaultCredPath, `${tokenData.clientIdHash}.json`);
    console.log(`🔍 查找 Client 凭证文件...`);
    console.log(`   文件名: ${tokenData.clientIdHash}.json`);
    console.log(`   完整路径: ${clientCredFilePath}`);
    console.log('');

    // 5. 读取 client 凭证文件
    let clientCreds;
    try {
        const content = await fs.readFile(clientCredFilePath, 'utf8');
        clientCreds = JSON.parse(content);
        console.log('   ✅ 成功读取 Client 凭证');
    } catch (error) {
        console.error(`   ❌ 读取失败: ${error.message}`);
        console.error('');
        console.error('请确认该文件存在: ' + clientCredFilePath);
        process.exit(1);
    }

    console.log('');
    console.log('📋 Client 凭证信息:');
    console.log(`   clientId: ${clientCreds.clientId ? '✅ 存在' : '❌ 缺失'}`);
    console.log(`   clientSecret: ${clientCreds.clientSecret ? '✅ 存在' : '❌ 缺失'}`);
    if (clientCreds.expiresAt) {
        console.log(`   Client 过期时间: ${new Date(clientCreds.expiresAt).toLocaleString()}`);
    }
    console.log('');

    // 6. 验证必要字段
    if (!clientCreds.clientId || !clientCreds.clientSecret) {
        console.error('❌ Client 凭证文件缺少必要字段');
        process.exit(1);
    }

    // 7. 合并配置
    console.log('🔄 合并配置...');
    const mergedConfig = {
        ...tokenData,
        clientId: clientCreds.clientId,
        clientSecret: clientCreds.clientSecret,
    };

    // Token 的过期时间应该使用 token 文件的，不是 client 文件的
    // Client 文件的 expiresAt 是 client 的过期时间（通常是几个月后）
    console.log('   ✅ 已添加 clientId');
    console.log('   ✅ 已添加 clientSecret');
    console.log('');

    // 8. 显示合并后的配置
    console.log('📦 合并后的配置:');
    console.log(JSON.stringify({
        accessToken: mergedConfig.accessToken ? `${mergedConfig.accessToken.substring(0, 30)}...` : 'N/A',
        refreshToken: mergedConfig.refreshToken ? `${mergedConfig.refreshToken.substring(0, 30)}...` : 'N/A',
        clientId: mergedConfig.clientId,
        clientSecret: mergedConfig.clientSecret ? `${mergedConfig.clientSecret.substring(0, 50)}...` : 'N/A',
        expiresAt: mergedConfig.expiresAt,
        authMethod: mergedConfig.authMethod,
        provider: mergedConfig.provider,
        region: mergedConfig.region,
        clientIdHash: mergedConfig.clientIdHash,
    }, null, 2));
    console.log('');

    // 9. 备份原文件
    const backupFile = `${tokenFilePath}.backup.${Date.now()}`;
    try {
        await fs.copyFile(tokenFilePath, backupFile);
        console.log(`💾 原文件已备份到: ${backupFile}`);
    } catch (error) {
        console.warn(`⚠️  无法备份原文件: ${error.message}`);
    }

    // 10. 保存合并后的配置
    try {
        await fs.writeFile(
            tokenFilePath,
            JSON.stringify(mergedConfig, null, 2),
            'utf8'
        );
        console.log(`✅ 合并后的配置已保存到: ${tokenFilePath}`);
    } catch (error) {
        console.error(`❌ 保存失败: ${error.message}`);
        process.exit(1);
    }

    console.log('');
    console.log('='.repeat(70));
    console.log('🎉 合并完成！');
    console.log('='.repeat(70));
    console.log('');
    console.log('下一步:');
    console.log('  1. 运行诊断工具验证: node diagnose-kiro-auth.js');
    console.log('  2. 重启服务器测试: node src/api-server.js --model-provider claude-kiro-oauth');
    console.log('');
}

// 运行合并
mergeKiroTokens().catch(error => {
    console.error('合并过程中发生错误:', error);
    process.exit(1);
});
