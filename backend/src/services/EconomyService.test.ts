import { describe, it, expect, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { EconomyService } from './EconomyService';

describe('EconomyService', () => {
  let service: EconomyService;
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    service = new EconomyService(mockPrisma);
  });

  describe('getSeasonDay', () => {
    it('应该返回赛季的第几天', () => {
      // 赛季开始于 2026-04-01
      const testDate = new Date('2026-04-05T00:00:00Z');
      const day = service.getSeasonDay(testDate);
      
      expect(day).toBe(4); // 第 5 天 (从 0 开始)
    });

    it('应该限制在赛季范围内', () => {
      const beforeSeason = new Date('2026-03-01T00:00:00Z');
      const afterSeason = new Date('2026-07-01T00:00:00Z');

      expect(service.getSeasonDay(beforeSeason)).toBe(0);
      expect(service.getSeasonDay(afterSeason)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getTotalSeasonDays', () => {
    it('应该返回赛季总天数 (60 天)', () => {
      const total = service.getTotalSeasonDays();
      
      expect(total).toBe(60); // 49 + 7 + 4
    });
  });

  describe('getSeasonPhase', () => {
    it('应该返回挖矿期 (mining)', () => {
      const miningDate = new Date('2026-04-15T00:00:00Z'); // 第 14 天
      expect(service.getSeasonPhase(miningDate)).toBe('mining');
    });

    it('应该返回自由期 (free)', () => {
      const freeDate = new Date('2026-05-20T00:00:00Z'); // 第 49 天后
      expect(service.getSeasonPhase(freeDate)).toBe('free');
    });

    it('应该返回冻结期 (frozen)', () => {
      const frozenDate = new Date('2026-05-27T00:00:00Z'); // 第 56 天后
      expect(service.getSeasonPhase(frozenDate)).toBe('frozen');
    });
  });

  describe('getHalvingCycle', () => {
    it('应该返回当前减半周期', () => {
      const day1 = new Date('2026-04-05T00:00:00Z'); // 第 4 天
      const day10 = new Date('2026-04-15T00:00:00Z'); // 第 14 天
      const day20 = new Date('2026-04-25T00:00:00Z'); // 第 24 天

      expect(service.getHalvingCycle(day1)).toBe(0); // 第 1 个周期 (0-6 天)
      expect(service.getHalvingCycle(day10)).toBe(2); // 第 3 个周期 (14-20 天)
      expect(service.getHalvingCycle(day20)).toBe(3); // 第 4 个周期 (21-27 天)
    });
  });

  describe('calculateOutputPerWindow', () => {
    it('应该返回初始产出量 (第 1 周期)', () => {
      const day1 = new Date('2026-04-05T00:00:00Z');
      const output = service.calculateOutputPerWindow(day1);
      
      expect(output).toBe(10417);
    });

    it('应该在第 2 周期减半', () => {
      const day10 = new Date('2026-04-15T00:00:00Z');
      const output = service.calculateOutputPerWindow(day10);
      
      expect(output).toBe(2604); // 10417 / 4 (第 3 个减半周期)
    });

    it('应该在第 3 周期再次减半', () => {
      const day20 = new Date('2026-04-25T00:00:00Z');
      const output = service.calculateOutputPerWindow(day20);
      
      expect(output).toBe(1302); // 10417 / 8 (第 4 个减半周期)
    });

    it('应该在自由期返回 0', () => {
      const freeDate = new Date('2026-05-20T00:00:00Z');
      const output = service.calculateOutputPerWindow(freeDate);
      
      expect(output).toBe(0);
    });

    it('应该在冻结期返回 0', () => {
      const frozenDate = new Date('2026-05-27T00:00:00Z');
      const output = service.calculateOutputPerWindow(frozenDate);
      
      expect(output).toBe(0);
    });

    it('应该保证最小产出为 1', () => {
      // 第 7 个周期后产出会非常小
      const lateDate = new Date('2026-05-10T00:00:00Z');
      const output = service.calculateOutputPerWindow(lateDate);
      
      expect(output).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getCurrentWindowNumber', () => {
    it('应该返回当前窗口编号', () => {
      const startTime = new Date('2026-04-01T00:00:00Z');
      const after10Min = new Date('2026-04-01T00:10:00Z');
      const after1Hour = new Date('2026-04-01T01:00:00Z');

      expect(service.getCurrentWindowNumber(startTime)).toBe(0);
      expect(service.getCurrentWindowNumber(after10Min)).toBe(1);
      expect(service.getCurrentWindowNumber(after1Hour)).toBe(6);
    });
  });

  describe('getCurrentWindowBounds', () => {
    it('应该返回当前窗口的开始和结束时间', () => {
      const testTime = new Date('2026-04-01T00:05:00Z');
      const bounds = service.getCurrentWindowBounds(testTime);

      expect(bounds.start.getTime()).toBe(new Date('2026-04-01T00:00:00Z').getTime());
      expect(bounds.end.getTime()).toBe(new Date('2026-04-01T00:10:00Z').getTime());
    });
  });

  describe('getTimeUntilNextHalving', () => {
    it('应该返回距离下次减半的剩余时间', () => {
      const day1 = new Date('2026-04-05T00:00:00Z');
      const timeUntilHalving = service.getTimeUntilNextHalving(day1);

      // 应该在 0-7 天之间
      expect(timeUntilHalving).toBeGreaterThan(0);
      expect(timeUntilHalving).toBeLessThan(7 * 24 * 60 * 60 * 1000);
    });
  });

  describe('getSeasonRemainingTime', () => {
    it('应该返回赛季剩余时间', () => {
      const day1 = new Date('2026-04-05T00:00:00Z');
      const remaining = service.getSeasonRemainingTime(day1);

      // 大约还有 55 天
      expect(remaining).toBeGreaterThan(50 * 24 * 60 * 60 * 1000);
      expect(remaining).toBeLessThan(60 * 24 * 60 * 60 * 1000);
    });
  });

  describe('getSeasonConfig', () => {
    it('应该返回完整的赛季配置', () => {
      const config = service.getSeasonConfig();

      expect(config.seasonNumber).toBe(1);
      expect(config.miningDays).toBe(49);
      expect(config.freeDays).toBe(7);
      expect(config.frozenDays).toBe(4);
      expect(config.halvingCycleDays).toBe(7);
      expect(config.initialOutputPerWindow).toBe(10417);
      expect(config.totalDays).toBe(60);
      expect(config.currentPhase).toBeDefined();
      expect(config.currentDay).toBeDefined();
      expect(config.currentHalvingCycle).toBeDefined();
    });
  });

  describe('canAllocate', () => {
    it('应该在挖矿期允许分配', () => {
      const miningDate = new Date('2026-04-15T00:00:00Z');
      const result = service.canAllocate(miningDate);

      expect(result.can).toBe(true);
    });

    it('应该在自由期允许分配 (但不产出)', () => {
      const freeDate = new Date('2026-05-20T00:00:00Z');
      const result = service.canAllocate(freeDate);

      expect(result.can).toBe(true);
      expect(result.reason).toContain('Free trading');
    });

    it('应该在冻结期拒绝分配', () => {
      const frozenDate = new Date('2026-05-27T00:00:00Z');
      const result = service.canAllocate(frozenDate);

      expect(result.can).toBe(false);
      expect(result.reason).toContain('frozen');
    });
  });

  describe('calculateTotalOutput', () => {
    it('应该计算累计总产出', () => {
      const day10 = new Date('2026-04-15T00:00:00Z');
      const result = service.calculateTotalOutput(day10);

      expect(result.totalOutput).toBeGreaterThan(0);
      expect(result.windowNumber).toBeGreaterThan(0);
      expect(result.outputPerWindow).toBeLessThanOrEqual(10417);
      expect(result.halvingCount).toBeGreaterThanOrEqual(0);
    });
  });
});
