import { createHash } from 'crypto';

export interface DeviceFingerprint {
  deviceId: string;
  fingerprint: string;
  userAgent?: string;
  ipHash?: string;
  createdAt: Date;
}

export class DeviceService {
  /**
   * 生成设备指纹
   * 基于用户代理、IP、屏幕分辨率等信息生成唯一标识
   */
  generateFingerprint(
    userAgent: string,
    ip: string,
    additionalData?: Record<string, string>
  ): string {
    const data = {
      ua: userAgent,
      ip: this.hashIP(ip),
      ...additionalData
    };

    const str = JSON.stringify(data);
    return createHash('sha256').update(str).digest('hex');
  }

  /**
   * 生成设备 ID
   * 用于标识唯一设备
   */
  generateDeviceId(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 15);
    return createHash('sha256')
      .update(timestamp + random)
      .digest('hex')
      .substring(0, 32);
  }

  /**
   * 哈希化 IP 地址（保护隐私）
   */
  private hashIP(ip: string): string {
    return createHash('sha256').update(ip).digest('hex').substring(0, 16);
  }

  /**
   * 验证设备指纹是否匹配
   */
  verifyFingerprint(
    storedFingerprint: string,
    userAgent: string,
    ip: string
  ): boolean {
    const currentFingerprint = this.generateFingerprint(userAgent, ip);
    return storedFingerprint === currentFingerprint;
  }

  /**
   * 从请求中提取设备信息
   */
  extractDeviceInfo(headers: Record<string, string | undefined>): {
    userAgent: string;
    ip: string;
    language?: string;
    platform?: string;
  } {
    const userAgent = headers['user-agent'] || 'unknown';
    const ip =
      headers['x-forwarded-for']?.split(',')[0] ||
      headers['x-real-ip'] ||
      '127.0.0.1';
    const language = headers['accept-language'];
    const platform = this.extractPlatform(userAgent);

    return { userAgent, ip, language, platform };
  }

  /**
   * 从 User Agent 中提取平台信息
   */
  private extractPlatform(userAgent: string): string {
    const ua = userAgent.toLowerCase();

    if (ua.includes('win')) return 'Windows';
    if (ua.includes('mac')) return 'macOS';
    // Android 必须在 Linux 之前检测，因为 Android UA 包含 Linux
    if (ua.includes('android')) return 'Android';
    if (ua.includes('linux')) return 'Linux';
    if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad'))
      return 'iOS';

    return 'Unknown';
  }
}

export const deviceService = new DeviceService();
