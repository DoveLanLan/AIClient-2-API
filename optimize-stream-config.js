#!/usr/bin/env node

/**
 * 流配置优化脚本
 * 用于调整和优化流式请求的配置参数
 */

import fs from 'fs';
import path from 'path';

const CONFIG_FILE = 'config.json';

// 优化后的配置
const optimizedConfig = {
  "MODEL_PROVIDER": "claude-kiro-oauth",
  "SERVER_PORT": 3000,
  "HOST": "localhost",
  "REQUIRED_API_KEY": "123456",
  
  // 网络和超时优化
  "AXIOS_TIMEOUT": 180000,        // 增加到 3 分钟
  "REQUEST_MAX_RETRIES": 5,       // 增加重试次数
  "REQUEST_BASE_DELAY": 2000,     // 增加基础延迟到 2 秒
  "CRON_NEAR_MINUTES": 10,        // 减少到 10 分钟检查一次
  "CRON_REFRESH_TOKEN": true,
  
  // 流处理优化
  "STREAM_TIMEOUT": 300000,       // 5 分钟流超时
  "STREAM_RETRY_ENABLED": true,   // 启用流重试
  "STREAM_MAX_RETRIES": 3,        // 流最大重试次数
  
  // 连接池优化
  "HTTP_KEEP_ALIVE": true,
  "HTTP_MAX_SOCKETS": 100,
  "HTTP_MAX_FREE_SOCKETS": 20,
  "HTTP_FREE_SOCKET_TIMEOUT": 120000  // 2 分钟空闲超时
};

function updateConfig() {
  console.log('=== 流配置优化脚本 ===');
  console.log('时间:', new Date().toLocaleString());
  console.log();

  let currentConfig = {};
  
  // 读取现有配置
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
      currentConfig = JSON.parse(configData);
      console.log('✅ 读取现有配置文件');
    } else {
      console.log('⚠️  配置文件不存在，将创建新文件');
    }
  } catch (error) {
    console.error('❌ 读取配置文件失败:', error.message);
    console.log('将使用默认配置');
  }

  // 合并配置
  const mergedConfig = { ...currentConfig, ...optimizedConfig };
  
  // 备份原配置
  if (fs.existsSync(CONFIG_FILE)) {
    const backupFile = `${CONFIG_FILE}.backup.${Date.now()}`;
    fs.copyFileSync(CONFIG_FILE, backupFile);
    console.log(`✅ 原配置已备份到: ${backupFile}`);
  }
  
  // 写入优化后的配置
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(mergedConfig, null, 2));
    console.log('✅ 配置文件已更新');
    console.log();
    
    console.log('=== 优化项目 ===');
    console.log('• 请求超时: 120秒 → 180秒');
    console.log('• 最大重试次数: 3次 → 5次');
    console.log('• 基础延迟: 1秒 → 2秒');
    console.log('• 添加流处理专用配置');
    console.log('• 优化连接池设置');
    console.log();
    
    console.log('=== 下一步 ===');
    console.log('1. 重启容器: docker-compose restart');
    console.log('2. 运行测试: ./test-stream-errors.sh');
    console.log('3. 监控日志: docker-compose logs -f');
    
  } catch (error) {
    console.error('❌ 写入配置文件失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  updateConfig();
}