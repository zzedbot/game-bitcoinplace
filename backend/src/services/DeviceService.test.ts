import { describe, it, expect, beforeEach } from 'vitest';
import { DeviceService, deviceService } from './DeviceService';

describe('DeviceService', () => {
  let service: DeviceService;

  beforeEach(() => {
    service = new DeviceService();
  });

  describe('generateFingerprint', () => {
    it('应该生成一致的指纹', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
      const ip = '192.168.1.100';

      const fp1 = service.generateFingerprint(ua, ip);
      const fp2 = service.generateFingerprint(ua, ip);

      expect(fp1).toBe(fp2);
      expect(fp1).toHaveLength(64); // SHA256 hex
    });

    it('应该为不同的 UA 生成不同的指纹', () => {
      const ip = '192.168.1.100';
      const ua1 = 'Mozilla/5.0 (Windows NT 10.0)';
      const ua2 = 'Mozilla/5.0 (Macintosh; Intel Mac OS X)';

      const fp1 = service.generateFingerprint(ua1, ip);
      const fp2 = service.generateFingerprint(ua2, ip);

      expect(fp1).not.toBe(fp2);
    });

    it('应该为不同的 IP 生成不同的指纹', () => {
      const ua = 'Mozilla/5.0';
      const ip1 = '192.168.1.100';
      const ip2 = '192.168.1.101';

      const fp1 = service.generateFingerprint(ua, ip1);
      const fp2 = service.generateFingerprint(ua, ip2);

      expect(fp1).not.toBe(fp2);
    });

    it('应该支持额外数据', () => {
      const ua = 'Mozilla/5.0';
      const ip = '192.168.1.100';
      const extra = { screen: '1920x1080', timezone: 'UTC+8' };

      const fp1 = service.generateFingerprint(ua, ip);
      const fp2 = service.generateFingerprint(ua, ip, extra);

      expect(fp1).not.toBe(fp2);
    });
  });

  describe('generateDeviceId', () => {
    it('应该生成唯一的设备 ID', () => {
      const id1 = service.generateDeviceId();
      const id2 = service.generateDeviceId();

      expect(id1).not.toBe(id2);
      expect(id1).toHaveLength(32);
    });

    it('应该生成十六进制格式的 ID', () => {
      const id = service.generateDeviceId();
      expect(/^[0-9a-f]+$/.test(id)).toBe(true);
    });
  });

  describe('verifyFingerprint', () => {
    it('应该验证匹配的指纹', () => {
      const ua = 'Mozilla/5.0';
      const ip = '192.168.1.100';
      const fp = service.generateFingerprint(ua, ip);

      const isValid = service.verifyFingerprint(fp, ua, ip);

      expect(isValid).toBe(true);
    });

    it('应该拒绝不匹配的指纹', () => {
      const ua = 'Mozilla/5.0';
      const ip = '192.168.1.100';
      const fp = service.generateFingerprint(ua, ip);

      const isValid = service.verifyFingerprint(fp, 'Different UA', ip);

      expect(isValid).toBe(false);
    });
  });

  describe('extractDeviceInfo', () => {
    it('应该提取设备信息', () => {
      const headers = {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'x-forwarded-for': '203.0.113.195, 70.41.3.18',
        'accept-language': 'en-US,en;q=0.9'
      };

      const info = service.extractDeviceInfo(headers);

      expect(info.userAgent).toBe(headers['user-agent']);
      expect(info.ip).toBe('203.0.113.195'); // 第一个 IP
      expect(info.language).toBe('en-US,en;q=0.9');
    });

    it('应该在缺少 header 时使用默认值', () => {
      const headers = {};

      const info = service.extractDeviceInfo(headers);

      expect(info.userAgent).toBe('unknown');
      expect(info.ip).toBe('127.0.0.1');
    });
  });

  describe('extractPlatform', () => {
    it.each([
      ['Mozilla/5.0 (Windows NT 10.0)', 'Windows'],
      ['Mozilla/5.0 (Macintosh; Intel Mac OS X)', 'macOS'],
      ['Mozilla/5.0 (X11; Linux x86_64)', 'Linux'],
      ['Mozilla/5.0 (Linux; Android 10)', 'Android'],
      ['Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)', 'iOS'],
      ['Mozilla/5.0 (iPad; CPU OS 14_0)', 'iOS'],
      ['Unknown Agent', 'Unknown']
    ])('应该识别平台 %s 为 %s', (ua, expected) => {
      // 使用私有方法测试需要通过公共方法间接测试
      const info = service.extractDeviceInfo({ 'user-agent': ua });
      // 这里我们直接测试 extractDeviceInfo 的结果
      expect(info.platform).toBe(expected);
    });
  });

  describe('hashIP', () => {
    it('应该哈希化 IP 地址', () => {
      // 通过 generateFingerprint 间接测试
      const fp1 = service.generateFingerprint('test', '192.168.1.1');
      const fp2 = service.generateFingerprint('test', '192.168.1.1');

      // 相同的 IP 应该生成相同的指纹
      expect(fp1).toBe(fp2);
    });
  });
});
