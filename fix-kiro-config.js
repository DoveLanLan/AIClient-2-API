#!/usr/bin/env node

/**
 * Kiro Configuration Fix Tool
 * 修复 Kiro 配置的工具
 */

import { promises as fs } from 'fs';
import * as readline from 'readline';

const CONFIG_FILE = 'config.json';

function createReadlineInterface() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
}

function question(rl, prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
            resolve(answer);
        });
    });
}

async function fixKiroConfig() {
    console.log('='.repeat(60));
    console.log('Kiro Configuration Fix Tool');
    console.log('Kiro 配置修复工具');
    console.log('='.repeat(60));
    console.log('');

    // 1. 读取当前配置
    console.log('📄 读取当前配置...');
    let config = {};
    let configExists = false;

    try {
        const configContent = await fs.readFile(CONFIG_FILE, 'utf8');
        config = JSON.parse(configContent);
        configExists = true;
        console.log('✅ 配置文件已加载');
    } catch (error) {
        console.log('⚠️  配置文件不存在，将创建新的配置文件');
    }
    console.log('');

    // 2. 显示当前速率限制配置
    console.log('⚡ 当前速率限制配置:');
    console.log(`   RATE_LIMIT_ENABLED: ${config.RATE_LIMIT_ENABLED ?? true}`);
    console.log(`   RATE_LIMIT_MAX_REQUESTS: ${config.RATE_LIMIT_MAX_REQUESTS ?? 1}`);
    console.log(`   RATE_LIMIT_WINDOW_MS: ${config.RATE_LIMIT_WINDOW_MS ?? 1000}`);
    console.log(`   RATE_LIMIT_PER_IP: ${config.RATE_LIMIT_PER_IP ?? false}`);
    console.log('');

    // 3. 询问是否修复速率限制
    const rl = createReadlineInterface();

    console.log('选择修复选项:');
    console.log('  1. 放宽速率限制（推荐）- 每秒允许10个请求');
    console.log('  2. 禁用速率限制（不推荐）');
    console.log('  3. 自定义速率限制');
    console.log('  4. 保持当前配置');
    console.log('');

    const choice = await question(rl, '请选择 (1-4): ');

    switch (choice.trim()) {
        case '1':
            config.RATE_LIMIT_ENABLED = true;
            config.RATE_LIMIT_MAX_REQUESTS = 10;
            config.RATE_LIMIT_WINDOW_MS = 1000;
            console.log('✅ 已设置为: 每秒最多10个请求');
            break;

        case '2':
            config.RATE_LIMIT_ENABLED = false;
            console.log('✅ 已禁用速率限制');
            break;

        case '3':
            config.RATE_LIMIT_ENABLED = true;
            const maxReq = await question(rl, '每秒最大请求数 (建议 5-20): ');
            config.RATE_LIMIT_MAX_REQUESTS = parseInt(maxReq) || 10;
            const windowMs = await question(rl, '时间窗口(毫秒, 建议 1000): ');
            config.RATE_LIMIT_WINDOW_MS = parseInt(windowMs) || 1000;
            console.log(`✅ 已设置为: 每${config.RATE_LIMIT_WINDOW_MS}ms 最多 ${config.RATE_LIMIT_MAX_REQUESTS} 个请求`);
            break;

        case '4':
            console.log('保持当前配置不变');
            rl.close();
            return;

        default:
            console.log('⚠️  无效选择，保持当前配置');
            rl.close();
            return;
    }
    console.log('');

    // 4. 其他推荐的配置优化
    console.log('📝 应用其他推荐配置...');

    // 增加重试次数和延迟
    if (!config.REQUEST_MAX_RETRIES || config.REQUEST_MAX_RETRIES < 3) {
        config.REQUEST_MAX_RETRIES = 3;
        console.log('   ✅ REQUEST_MAX_RETRIES: 3');
    }

    if (!config.REQUEST_BASE_DELAY || config.REQUEST_BASE_DELAY < 1000) {
        config.REQUEST_BASE_DELAY = 1000;
        console.log('   ✅ REQUEST_BASE_DELAY: 1000ms');
    }

    // 确保 Kiro 相关配置存在
    if (config.MODEL_PROVIDER === 'claude-kiro-oauth') {
        if (!config.CRON_NEAR_MINUTES) {
            config.CRON_NEAR_MINUTES = 15;
            console.log('   ✅ CRON_NEAR_MINUTES: 15');
        }

        if (config.CRON_REFRESH_TOKEN === undefined) {
            config.CRON_REFRESH_TOKEN = true;
            console.log('   ✅ CRON_REFRESH_TOKEN: true');
        }
    }

    console.log('');

    // 5. 保存配置
    const saveConfig = await question(rl, '是否保存配置? (y/n): ');

    if (saveConfig.toLowerCase() === 'y' || saveConfig.toLowerCase() === 'yes') {
        try {
            // 备份原配置（如果存在）
            if (configExists) {
                const backupFile = `${CONFIG_FILE}.backup.${Date.now()}`;
                await fs.copyFile(CONFIG_FILE, backupFile);
                console.log(`📦 原配置已备份到: ${backupFile}`);
            }

            // 保存新配置
            await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
            console.log(`✅ 配置已保存到: ${CONFIG_FILE}`);
            console.log('');
            console.log('🎉 配置修复完成！');
            console.log('');
            console.log('下一步:');
            console.log('  1. 运行诊断工具: node diagnose-kiro-auth.js');
            console.log('  2. 重启服务器以应用新配置');
        } catch (error) {
            console.error(`❌ 保存配置失败: ${error.message}`);
        }
    } else {
        console.log('❌ 配置未保存');
    }

    rl.close();
}

// 运行修复
fixKiroConfig().catch(error => {
    console.error('修复过程中发生错误:', error);
    process.exit(1);
});
