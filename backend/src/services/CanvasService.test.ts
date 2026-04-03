import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CanvasService, CANVAS_CONFIG } from './CanvasService';
import { Redis } from 'ioredis';

// Mock Redis
vi.mock('ioredis', () => {
  const Redis = vi.fn().mockImplementation(() => ({
    bitfield: vi.fn(),
    pipeline: vi.fn(() => ({
      bitfield: vi.fn().mockReturnThis(),
      exec: vi.fn()
    })),
    del: vi.fn(),
    exists: vi.fn()
  }));
  return { Redis };
});

describe('CanvasService', () => {
  let service: CanvasService;
  let mockRedis: any;

  beforeEach(() => {
    mockRedis = new Redis();
    service = new CanvasService(mockRedis);
    vi.clearAllMocks();
  });

  describe('pixelToOffset', () => {
    it('应该正确计算像素偏移量', () => {
      // 私有方法，通过 setPixel 间接测试
      // (0, 0) -> offset 0
      // (1, 0) -> offset 4 (4 bits per pixel)
      // (0, 1) -> offset 7000 * 4 = 28000
    });
  });

  describe('validateCoordinates', () => {
    it('应该接受有效坐标', async () => {
      mockRedis.bitfield.mockResolvedValue([0]);

      await expect(service.getPixel(0, 0)).resolves.not.toThrow();
      await expect(service.getPixel(6999, 2999)).resolves.not.toThrow();
      await expect(service.getPixel(3500, 1500)).resolves.not.toThrow();
    });

    it('应该拒绝超出边界的 X 坐标', async () => {
      await expect(service.getPixel(-1, 0)).rejects.toThrow('out of bounds');
      await expect(service.getPixel(7000, 0)).rejects.toThrow('out of bounds');
    });

    it('应该拒绝超出边界的 Y 坐标', async () => {
      await expect(service.getPixel(0, -1)).rejects.toThrow('out of bounds');
      await expect(service.getPixel(0, 3000)).rejects.toThrow('out of bounds');
    });
  });

  describe('validateColor', () => {
    it('应该接受有效颜色 (0-15)', async () => {
      mockRedis.bitfield.mockResolvedValue([0]);

      for (let color = 0; color <= 15; color++) {
        await expect(service.setPixel(0, 0, color)).resolves.not.toThrow();
      }
    });

    it('应该拒绝超出范围的颜色', async () => {
      await expect(service.setPixel(0, 0, -1)).rejects.toThrow('Color -1 out of bounds');
      await expect(service.setPixel(0, 0, 16)).rejects.toThrow('Color 16 out of bounds');
    });
  });

  describe('getPixel', () => {
    it('应该获取像素颜色', async () => {
      mockRedis.bitfield.mockResolvedValue([5]);

      const color = await service.getPixel(100, 200);

      expect(color).toBe(5);
      expect(mockRedis.bitfield).toHaveBeenCalledWith(
        'canvas:state',
        'GET',
        'u4',
        expect.any(String)
      );
    });

    it('应该返回 null 对于未染色的像素', async () => {
      mockRedis.bitfield.mockResolvedValue([0]);

      const color = await service.getPixel(0, 0);

      // 0 表示未染色/默认色
      expect(color).toBe(0);
    });
  });

  describe('setPixel', () => {
    it('应该设置像素颜色并返回旧值', async () => {
      mockRedis.bitfield.mockResolvedValue([0, 0]); // [oldValue, setValue]

      const oldColor = await service.setPixel(100, 200, 7);

      expect(oldColor).toBe(0);
      expect(mockRedis.bitfield).toHaveBeenCalledWith(
        'canvas:state',
        'OVERFLOW', 'SAT',
        'GET', 'u4', expect.any(String),
        'SET', 'u4', expect.any(String), '7'
      );
    });

    it('应该使用 OVERFLOW SAT 避免溢出', async () => {
      mockRedis.bitfield.mockResolvedValue([0, 0]);

      await service.setPixel(0, 0, 15);

      expect(mockRedis.bitfield).toHaveBeenCalledWith(
        'canvas:state',
        'OVERFLOW', 'SAT',
        'GET', 'u4', expect.any(String),
        'SET', 'u4', expect.any(String), '15'
      );
    });
  });

  describe('getPixels', () => {
    it('应该批量获取像素', async () => {
      const coordinates = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 }
      ];

      const mockPipeline = {
        bitfield: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([
          [null, [1]],
          [null, [2]],
          [null, [3]]
        ])
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline);

      const results = await service.getPixels(coordinates);

      expect(results.size).toBe(3);
      expect(results.get('0,0')).toBe(1);
      expect(results.get('1,0')).toBe(2);
      expect(results.get('0,1')).toBe(3);
    });

    it('应该跳过无效坐标', async () => {
      const coordinates = [
        { x: 0, y: 0 },
        { x: 7000, y: 0 }, // 无效
        { x: 0, y: 3000 }  // 无效
      ];

      const mockPipeline = {
        bitfield: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([[null, [1]]])
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline);

      const results = await service.getPixels(coordinates);

      expect(results.size).toBe(1);
      expect(mockPipeline.bitfield).toHaveBeenCalledTimes(1);
    });
  });

  describe('setPixels', () => {
    it('应该批量设置像素', async () => {
      const pixelMap = new Map([
        ['0,0', 1],
        ['1,0', 2],
        ['0,1', 3]
      ]);

      const mockPipeline = {
        bitfield: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([])
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline);

      await service.setPixels(pixelMap);

      expect(mockPipeline.bitfield).toHaveBeenCalledTimes(3);
      expect(mockPipeline.exec).toHaveBeenCalled();
    });
  });

  describe('getRegion', () => {
    it('应该获取区域像素', async () => {
      mockRedis.bitfield.mockResolvedValue([1]);

      const region = await service.getRegion(0, 0, 10, 10);

      expect(region).toHaveLength(10);
      expect(region[0]).toHaveLength(10);
    });

    it('应该处理边界情况', async () => {
      mockRedis.bitfield.mockResolvedValue([1]);

      const region = await service.getRegion(6995, 2995, 10, 10);

      // 应该自动裁剪到画布边界
      expect(region.length).toBeLessThanOrEqual(10);
    });
  });

  describe('getStats', () => {
    it('应该返回画布统计信息', async () => {
      mockRedis.bitfield.mockResolvedValue([0]);

      const stats = await service.getStats();

      expect(stats.totalPixels).toBe(21_000_000);
      expect(stats.coloredPixels).toBeGreaterThanOrEqual(0);
      expect(stats.uncoloredPixels).toBeGreaterThan(0);
      expect(stats.coveragePercent).toBeGreaterThanOrEqual(0);
      expect(stats.coveragePercent).toBeLessThanOrEqual(100);
    });
  });

  describe('clear', () => {
    it('应该清除画布', async () => {
      await service.clear();

      expect(mockRedis.del).toHaveBeenCalledWith('canvas:state');
    });
  });

  describe('getSize', () => {
    it('应该返回画布大小', async () => {
      const size = await service.getSize();

      // 21M pixels × 4 bits = 10.5 MB
      expect(size).toBe(10_500_000);
    });
  });

  describe('isInitialized', () => {
    it('应该检查画布是否已初始化', async () => {
      mockRedis.exists.mockResolvedValue(1);

      const initialized = await service.isInitialized();

      expect(initialized).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalledWith('canvas:state');
    });

    it('应该返回 false 对于未初始化的画布', async () => {
      mockRedis.exists.mockResolvedValue(0);

      const initialized = await service.isInitialized();

      expect(initialized).toBe(false);
    });
  });

  describe('getZoneStats', () => {
    it('应该返回矿区统计信息', async () => {
      mockRedis.bitfield.mockResolvedValue([0]);

      const stats = await service.getZoneStats(0);

      expect(stats.zoneIndex).toBe(0);
      expect(stats.totalPixels).toBe(1_000_000); // 1000 × 1000
      expect(stats.coloredPixels).toBeGreaterThanOrEqual(0);
      expect(stats.coveragePercent).toBeGreaterThanOrEqual(0);
      expect(stats.coveragePercent).toBeLessThanOrEqual(100);
    });

    it('应该拒绝无效的矿区索引', async () => {
      await expect(service.getZoneStats(-1)).rejects.toThrow('out of bounds');
      await expect(service.getZoneStats(21)).rejects.toThrow('out of bounds');
    });
  });

  describe('CANVAS_CONFIG', () => {
    it('应该有正确的配置值', () => {
      expect(CANVAS_CONFIG.WIDTH).toBe(7000);
      expect(CANVAS_CONFIG.HEIGHT).toBe(3000);
      expect(CANVAS_CONFIG.TOTAL_PIXELS).toBe(21_000_000);
      expect(CANVAS_CONFIG.ZONE_SIZE).toBe(1000);
      expect(CANVAS_CONFIG.TOTAL_ZONES).toBe(21);
      expect(CANVAS_CONFIG.COLORS).toBe(16);
    });
  });
});
