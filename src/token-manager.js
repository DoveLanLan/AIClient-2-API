/**
 * Enhanced Token Manager for automatic token refresh and fallback
 * 增强的 Token 管理器，支持自动刷新和备用 token 机制
 */

import * as path from "path";
import { promises as pfs } from "fs";

export class TokenManager {
  constructor(config) {
    this.config = config;
    // 优先使用配置的路径，否则使用默认路径
    if (config.KIRO_OAUTH_CREDS_FILE_PATH) {
      this.primaryTokenFile = config.KIRO_OAUTH_CREDS_FILE_PATH;
      this.credPath = path.dirname(this.primaryTokenFile);
    } else {
      this.credPath =
        config.KIRO_OAUTH_CREDS_DIR_PATH ||
        path.join(process.env.HOME || "/root", ".aws/sso/cache");
      this.primaryTokenFile = path.join(this.credPath, "kiro-auth-token.json");
    }

    console.log(
      `[Token Manager] Initialized with credPath: ${this.credPath}, primaryTokenFile: ${this.primaryTokenFile}`
    );
  }

  /**
   * 检查 token 是否即将过期（默认10分钟内）
   */
  isTokenExpiringSoon(expiresAt, thresholdMinutes = 10) {
    try {
      const expirationTime = new Date(expiresAt);
      const currentTime = new Date();
      const thresholdTime = new Date(
        currentTime.getTime() + thresholdMinutes * 60 * 1000
      );
      return expirationTime.getTime() <= thresholdTime.getTime();
    } catch (error) {
      console.error("[Token Manager] Error checking expiry:", error.message);
      return true; // 如果无法解析，假设已过期
    }
  }

  /**
   * 检查 token 是否已经过期
   */
  isTokenExpired(expiresAt) {
    try {
      const expirationTime = new Date(expiresAt);
      const currentTime = new Date();
      return expirationTime.getTime() <= currentTime.getTime();
    } catch (error) {
      console.error("[Token Manager] Error checking expiry:", error.message);
      return true;
    }
  }

  /**
   * 扫描 SSO 缓存目录，查找所有可用的 token 文件
   */
  async scanAvailableTokens() {
    const availableTokens = [];

    try {
      const files = await pfs.readdir(this.credPath);

      for (const file of files) {
        if (file.endsWith(".json")) {
          const filePath = path.join(this.credPath, file);
          try {
            const content = await pfs.readFile(filePath, "utf8");
            const tokenData = JSON.parse(content);

            // 检查是否包含必要的字段
            if (tokenData.accessToken && tokenData.expiresAt) {
              availableTokens.push({
                file: file,
                path: filePath,
                data: tokenData,
                isExpired: this.isTokenExpired(tokenData.expiresAt),
                isExpiringSoon: this.isTokenExpiringSoon(tokenData.expiresAt),
                expiresAt: new Date(tokenData.expiresAt),
              });
            }
          } catch {
            // 忽略无法解析的文件
            console.debug(
              `[Token Manager] Skipping invalid token file: ${file}`
            );
          }
        }
      }

      // 按过期时间排序，最晚过期的在前面
      availableTokens.sort(
        (a, b) => b.expiresAt.getTime() - a.expiresAt.getTime()
      );
    } catch (error) {
      console.error(
        "[Token Manager] Error scanning token directory:",
        error.message
      );
    }

    return availableTokens;
  }

  /**
   * 查找最佳可用的 token
   */
  async findBestAvailableToken() {
    const tokens = await this.scanAvailableTokens();

    // 首先尝试找到未过期的 token
    const validTokens = tokens.filter((token) => !token.isExpired);
    if (validTokens.length > 0) {
      console.log(`[Token Manager] Found ${validTokens.length} valid tokens`);
      return validTokens[0]; // 返回最晚过期的有效 token
    }

    // 如果没有有效的 token，返回最新的（即使已过期）
    if (tokens.length > 0) {
      console.warn(
        `[Token Manager] No valid tokens found, returning most recent expired token`
      );
      return tokens[0];
    }

    console.error("[Token Manager] No token files found");
    return null;
  }

  /**
   * 自动切换到最佳可用的 token
   */
  async switchToBestToken() {
    const bestToken = await this.findBestAvailableToken();

    if (!bestToken) {
      throw new Error("No available tokens found");
    }

    // 如果最佳 token 不是当前使用的主 token 文件，则复制过去
    if (bestToken.path !== this.primaryTokenFile) {
      console.log(
        `[Token Manager] Switching from current token to: ${bestToken.file}`
      );
      console.log(
        `[Token Manager] New token expires at: ${bestToken.expiresAt.toISOString()}`
      );

      // 备份当前 token
      try {
        await pfs.copyFile(
          this.primaryTokenFile,
          `${this.primaryTokenFile}.backup.${Date.now()}`
        );
      } catch (error) {
        console.warn(
          "[Token Manager] Could not backup current token:",
          error.message
        );
      }

      // 复制最佳 token 到主 token 文件
      await pfs.copyFile(bestToken.path, this.primaryTokenFile);
      console.log(
        `[Token Manager] Successfully switched to token: ${bestToken.file}`
      );

      return bestToken.data;
    } else {
      console.log(
        "[Token Manager] Current token is already the best available"
      );
      return bestToken.data;
    }
  }

  /**
   * 智能 token 刷新策略
   */
  async smartRefresh(kiroApiService) {
    console.log("[Token Manager] Starting smart refresh strategy...");
    
    // 首先检查当前 token 状态
    const currentTokenExpired = this.isTokenExpired(kiroApiService.expiresAt);
    const currentTokenExpiringSoon = this.isTokenExpiringSoon(kiroApiService.expiresAt);
    
    console.log(`[Token Manager] Current token status - Expired: ${currentTokenExpired}, Expiring Soon: ${currentTokenExpiringSoon}`);
    
    // 如果当前 token 还有效且不即将过期，直接返回
    if (!currentTokenExpired && !currentTokenExpiringSoon) {
      console.log("[Token Manager] Current token is still valid, no refresh needed");
      return true;
    }
    
    // 策略1: 如果当前 token 只是即将过期但还没过期，尝试正常刷新
    if (!currentTokenExpired && currentTokenExpiringSoon) {
      try {
        console.log("[Token Manager] Attempting normal token refresh for expiring token...");
        await kiroApiService.initializeAuth(true);
        console.log("[Token Manager] Normal token refresh successful");
        return true;
      } catch (error) {
        console.warn("[Token Manager] Normal token refresh failed:", error.message);
        // 继续到策略2
      }
    }
    
    // 策略2: 切换到最佳可用 token
    try {
      console.log("[Token Manager] Attempting to switch to best available token...");
      const newTokenData = await this.switchToBestToken();

      // 更新 kiroApiService 的 token 信息
      kiroApiService.accessToken = newTokenData.accessToken;
      kiroApiService.refreshToken = newTokenData.refreshToken;
      kiroApiService.expiresAt = newTokenData.expiresAt;
      if (newTokenData.profileArn) {
        kiroApiService.profileArn = newTokenData.profileArn;
      }
      if (newTokenData.clientIdHash) {
        kiroApiService.clientIdHash = newTokenData.clientIdHash;
      }
      if (newTokenData.clientId) {
        kiroApiService.clientId = newTokenData.clientId;
      }
      if (newTokenData.clientSecret) {
        kiroApiService.clientSecret = newTokenData.clientSecret;
      }
      if (newTokenData.authMethod) {
        kiroApiService.authMethod = newTokenData.authMethod;
      }
      if (newTokenData.region) {
        kiroApiService.region = newTokenData.region;
      }
      if (newTokenData.provider) {
        kiroApiService.provider = newTokenData.provider;
      }
      if (newTokenData.clientIdHash) {
        kiroApiService.clientIdHash = newTokenData.clientIdHash;
      }
      
      console.log(`[Token Manager] Token updated - AuthMethod: ${newTokenData.authMethod}, Provider: ${newTokenData.provider || 'N/A'}`);

      console.log("[Token Manager] Successfully switched to new token");

      // 策略3: 如果新 token 也即将过期，尝试刷新它
      if (this.isTokenExpiringSoon(newTokenData.expiresAt)) {
        console.log("[Token Manager] New token is expiring soon, attempting refresh...");
        try {
          await kiroApiService.initializeAuth(true);
          console.log("[Token Manager] New token refresh successful");
        } catch (refreshError) {
          console.warn(
            "[Token Manager] New token refresh failed, but will continue with current token:",
            refreshError.message
          );
        }
      }

      return true;
    } catch (switchError) {
      console.error(
        "[Token Manager] Failed to switch to alternative token:",
        switchError.message
      );
      throw new Error(
        `All token refresh strategies failed. Please re-authenticate manually. Error: ${switchError.message}`
      );
    }
  }

  /**
   * 获取 token 状态报告
   */
  async getTokenStatusReport() {
    const tokens = await this.scanAvailableTokens();
    const report = {
      totalTokens: tokens.length,
      validTokens: tokens.filter((t) => !t.isExpired).length,
      expiringSoonTokens: tokens.filter((t) => !t.isExpired && t.isExpiringSoon)
        .length,
      expiredTokens: tokens.filter((t) => t.isExpired).length,
      tokens: tokens.map((t) => ({
        file: t.file,
        expiresAt: t.expiresAt.toISOString(),
        isExpired: t.isExpired,
        isExpiringSoon: t.isExpiringSoon,
        status: t.isExpired
          ? "expired"
          : t.isExpiringSoon
          ? "expiring-soon"
          : "valid",
      })),
    };

    return report;
  }
}
