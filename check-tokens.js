/**
 * Token 诊断工具 - 检查所有可用的 Kiro tokens
 */
import { TokenManager } from './src/token-manager.js';
import * as path from 'path';
import * as os from 'os';

async function checkTokens() {
    const config = {
        KIRO_OAUTH_CREDS_DIR_PATH: path.join(os.homedir(), '.aws', 'sso', 'cache')
    };

    const tokenManager = new TokenManager(config);
    
    console.log('=== Kiro Token Status Report ===\n');
    
    // 获取 token 状态报告
    const report = await tokenManager.getTokenStatusReport();
    
    console.log(`Total tokens found: ${report.totalTokens}`);
    console.log(`Valid tokens: ${report.validTokens}`);
    console.log(`Expiring soon: ${report.expiringSoonTokens}`);
    console.log(`Expired tokens: ${report.expiredTokens}\n`);
    
    if (report.tokens.length === 0) {
        console.log('❌ No token files found in:', config.KIRO_OAUTH_CREDS_DIR_PATH);
        return;
    }
    
    console.log('Token Details:');
    console.log('─'.repeat(80));
    
    report.tokens.forEach((token, index) => {
        const statusEmoji = token.status === 'valid' ? '✅' : 
                           token.status === 'expiring-soon' ? '⚠️' : '❌';
        
        console.log(`${statusEmoji} Token ${index + 1}: ${token.file}`);
        console.log(`   Status: ${token.status}`);
        console.log(`   Expires at: ${token.expiresAt}`);
        
        // 计算剩余时间
        const expiresDate = new Date(token.expiresAt);
        const now = new Date();
        const remainingMs = expiresDate - now;
        const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
        const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (remainingMs > 0) {
            console.log(`   Time remaining: ${remainingHours}h ${remainingMinutes}m`);
        } else {
            console.log(`   Expired ${Math.abs(remainingHours)}h ${Math.abs(remainingMinutes)}m ago`);
        }
        console.log('');
    });
    
    // 找出最佳 token
    const bestToken = await tokenManager.findBestAvailableToken();
    if (bestToken) {
        console.log('─'.repeat(80));
        console.log('🌟 Best available token:', bestToken.file);
        console.log(`   Expires: ${bestToken.expiresAt.toISOString()}`);
        console.log(`   Status: ${bestToken.isExpired ? 'Expired' : 'Valid'}`);
    }
}

checkTokens().catch(console.error);
