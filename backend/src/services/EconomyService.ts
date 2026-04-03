import { PrismaClient } from '@prisma/client';

export interface SeasonConfig {
  seasonNumber: number;
  startDate: Date;
  endDate: Date;
  miningDays: number;      // 49 天
  freeDays: number;        // 7 天
  frozenDays: number;      // 4 天
  halvingCycleDays: number; // 7 天
  initialOutputPerWindow: number; // 10417
}

export interface OutputResult {
  totalOutput: number;
  windowNumber: number;
  outputPerWindow: number;
  halvingCount: number;
}

export class EconomyService {
  private prisma: PrismaClient;

  // 赛季配置
  private readonly SEASON_CONFIG: SeasonConfig = {
    seasonNumber: 1,
    startDate: new Date('2026-04-01T00:00:00Z'),
    endDate: new Date('2026-05-31T00:00:00Z'),
    miningDays: 49,
    freeDays: 7,
    frozenDays: 4,
    halvingCycleDays: 7,
    initialOutputPerWindow: 10417 // 每 10 分钟窗口产出
  };

  // 区块窗口时间 (10 分钟)
  private readonly BLOCK_WINDOW_MS = 10 * 60 * 1000;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * 计算当前赛季的第几天
   */
  getSeasonDay(now: Date = new Date()): number {
    const diff = now.getTime() - this.SEASON_CONFIG.startDate.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return Math.max(0, Math.min(days, this.getTotalSeasonDays() - 1));
  }

  /**
   * 获取赛季总天数
   */
  getTotalSeasonDays(): number {
    return this.SEASON_CONFIG.miningDays + 
           this.SEASON_CONFIG.freeDays + 
           this.SEASON_CONFIG.frozenDays;
  }

  /**
   * 判断当前处于哪个时期
   */
  getSeasonPhase(now: Date = new Date()): 'mining' | 'free' | 'frozen' {
    const day = this.getSeasonDay(now);

    if (day < this.SEASON_CONFIG.miningDays) {
      return 'mining';
    } else if (day < this.SEASON_CONFIG.miningDays + this.SEASON_CONFIG.freeDays) {
      return 'free';
    } else {
      return 'frozen';
    }
  }

  /**
   * 计算当前减半周期 (第几个 7 天)
   */
  getHalvingCycle(now: Date = new Date()): number {
    const day = this.getSeasonDay(now);
    return Math.floor(day / this.SEASON_CONFIG.halvingCycleDays);
  }

  /**
   * 计算当前窗口的产出量 (考虑减半)
   */
  calculateOutputPerWindow(now: Date = new Date()): number {
    const halvingCycle = this.getHalvingCycle(now);
    const phase = this.getSeasonPhase(now);

    // 非挖矿期不产出
    if (phase !== 'mining') {
      return 0;
    }

    // 每 7 天减半一次
    const halvingCount = Math.floor(halvingCycle / 1); // 每个周期减半一次
    const output = Math.floor(
      this.SEASON_CONFIG.initialOutputPerWindow / Math.pow(2, halvingCount)
    );

    // 最小产出为 1
    return Math.max(1, output);
  }

  /**
   * 计算从赛季开始到当前的总产出
   */
  calculateTotalOutput(now: Date = new Date()): OutputResult {
    const phase = this.getSeasonPhase(now);
    const totalWindows = this.getTotalWindowsInSeason();
    const currentWindow = this.getCurrentWindowNumber(now);

    let totalOutput = 0;
    let halvingCount = 0;

    for (let window = 0; window < currentWindow; window++) {
      const windowTime = new Date(
        this.SEASON_CONFIG.startDate.getTime() + window * this.BLOCK_WINDOW_MS
      );
      const windowHalvingCycle = this.getHalvingCycle(windowTime);
      const windowPhase = this.getSeasonPhase(windowTime);

      if (windowPhase !== 'mining') {
        continue;
      }

      const windowHalvingCount = Math.floor(windowHalvingCycle / 1);
      const windowOutput = Math.floor(
        this.SEASON_CONFIG.initialOutputPerWindow / Math.pow(2, windowHalvingCount)
      );

      totalOutput += Math.max(1, windowOutput);
      halvingCount = windowHalvingCount;
    }

    return {
      totalOutput,
      windowNumber: currentWindow,
      outputPerWindow: this.calculateOutputPerWindow(now),
      halvingCount
    };
  }

  /**
   * 获取赛季中的总窗口数
   */
  getTotalWindowsInSeason(): number {
    const totalMinutes = this.SEASON_CONFIG.miningDays * 24 * 60;
    return Math.floor(totalMinutes / 10);
  }

  /**
   * 获取当前窗口编号
   */
  getCurrentWindowNumber(now: Date = new Date()): number {
    const diff = now.getTime() - this.SEASON_CONFIG.startDate.getTime();
    return Math.floor(diff / this.BLOCK_WINDOW_MS);
  }

  /**
   * 获取当前窗口的开始和结束时间
   */
  getCurrentWindowBounds(now: Date = new Date()): { start: Date; end: Date } {
    const windowNumber = this.getCurrentWindowNumber(now);
    const start = new Date(
      this.SEASON_CONFIG.startDate.getTime() + windowNumber * this.BLOCK_WINDOW_MS
    );
    const end = new Date(start.getTime() + this.BLOCK_WINDOW_MS);
    return { start, end };
  }

  /**
   * 获取距离下次减半的剩余时间 (毫秒)
   */
  getTimeUntilNextHalving(now: Date = new Date()): number {
    const currentCycle = this.getHalvingCycle(now);
    const nextCycleStart = new Date(
      this.SEASON_CONFIG.startDate.getTime() + 
      (currentCycle + 1) * this.SEASON_CONFIG.halvingCycleDays * 24 * 60 * 60 * 1000
    );
    
    return Math.max(0, nextCycleStart.getTime() - now.getTime());
  }

  /**
   * 获取赛季剩余时间 (毫秒)
   */
  getSeasonRemainingTime(now: Date = new Date()): number {
    const endDate = new Date(
      this.SEASON_CONFIG.startDate.getTime() + 
      this.getTotalSeasonDays() * 24 * 60 * 60 * 1000
    );
    return Math.max(0, endDate.getTime() - now.getTime());
  }

  /**
   * 获取赛季配置信息
   */
  getSeasonConfig(): SeasonConfig & {
    currentPhase: string;
    currentDay: number;
    currentHalvingCycle: number;
    totalDays: number;
  } {
    const now = new Date();
    return {
      ...this.SEASON_CONFIG,
      currentPhase: this.getSeasonPhase(now),
      currentDay: this.getSeasonDay(now),
      currentHalvingCycle: this.getHalvingCycle(now),
      totalDays: this.getTotalSeasonDays()
    };
  }

  /**
   * 验证是否可以进行染色权分配
   */
  canAllocate(now: Date = new Date()): { can: boolean; reason?: string } {
    const phase = this.getSeasonPhase(now);

    if (phase === 'frozen') {
      return { can: false, reason: 'Season is in frozen period' };
    }

    if (phase === 'free') {
      return { can: true, reason: 'Free trading period - no new allocation' };
    }

    return { can: true };
  }
}

export const economyService = (prisma: PrismaClient) => 
  new EconomyService(prisma);
