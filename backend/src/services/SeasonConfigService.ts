import { PrismaClient } from '@prisma/client';
import { HalvingCalculator } from './HalvingCalculator';

export type SeasonPhase = 'MINING' | 'FREE' | 'STAGNATION';

export interface SeasonConfig {
  id: number;
  seasonNumber: number;
  startDate: Date;
  miningDays: number;
  freeDays: number;
  stagnationDays: number;
  totalDays: number;
  halvingCycleDays: number;
  baseReward: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SeasonProgress {
  currentDay: number;
  totalDays: number;
  percentage: number;
  currentPhase: SeasonPhase;
}

export class SeasonConfigService {
  private config: SeasonConfig | null = null;
  private prisma: PrismaClient;
  private halvingCalculator: HalvingCalculator;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.halvingCalculator = new HalvingCalculator();
  }

  /**
   * 初始化赛季配置
   */
  async initialize(): Promise<void> {
    this.config = await this.prisma.seasonConfig.findFirst({
      orderBy: { seasonNumber: 'desc' },
    });

    if (!this.config) {
      this.config = await this.prisma.seasonConfig.upsert({
        where: { id: 1 },
        update: {},
        create: {
          seasonNumber: 1,
          startDate: new Date(),
          miningDays: 49,
          freeDays: 7,
          stagnationDays: 4,
          totalDays: 60,
          halvingCycleDays: 7,
          baseReward: 10417,
        },
      });
    }
  }

  /**
   * 获取当前赛季阶段
   */
  async getCurrentPhase(): Promise<SeasonPhase> {
    if (!this.config) {
      throw new Error('SeasonConfig not initialized');
    }

    const dayInSeason = this.getDayInSeason();

    if (dayInSeason < this.config.miningDays) {
      return 'MINING';
    } else if (dayInSeason < this.config.miningDays + this.config.freeDays) {
      return 'FREE';
    } else {
      return 'STAGNATION';
    }
  }

  /**
   * 计算当前是赛季的第几天
   */
  private getDayInSeason(): number {
    if (!this.config) {
      throw new Error('SeasonConfig not initialized');
    }

    const now = new Date();
    return this.calculateDayInSeason(this.config.startDate, now);
  }

  /**
   * 计算两个日期之间的天数差
   */
  calculateDayInSeason(startDate: Date, currentDate: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    const diff = currentDate.getTime() - startDate.getTime();
    const days = Math.floor(diff / msPerDay);
    
    if (!this.config || this.config.totalDays <= 0) {
      return days;
    }
    
    // Wrap around for new season (handle negative days)
    return days >= 0 ? days % this.config.totalDays : ((days % this.config.totalDays) + this.config.totalDays) % this.config.totalDays;
  }

  /**
   * 检查是否允许挖矿
   */
  async isMiningAllowed(): Promise<boolean> {
    const phase = await this.getCurrentPhase();
    return phase === 'MINING';
  }

  /**
   * 获取当前配置
   */
  async getConfig(): Promise<SeasonConfig> {
    if (!this.config) {
      throw new Error('SeasonConfig not initialized');
    }
    return this.config;
  }

  /**
   * 更新配置
   */
  async updateConfig(updates: Partial<SeasonConfig>): Promise<SeasonConfig> {
    if (!this.config) {
      throw new Error('SeasonConfig not initialized');
    }

    await this.validateConfig(updates);

    this.config = await this.prisma.seasonConfig.upsert({
      where: { id: this.config.id },
      update: updates,
      create: {
        seasonNumber: 1,
        startDate: new Date(),
        miningDays: 49,
        freeDays: 7,
        stagnationDays: 4,
        totalDays: 60,
        halvingCycleDays: 7,
        baseReward: 10417,
      },
    });

    return this.config;
  }

  /**
   * 获取当前减半周期
   */
  async getHalvingCycle(): Promise<number> {
    if (!this.config) {
      throw new Error('SeasonConfig not initialized');
    }

    const dayInSeason = this.getDayInSeason();
    return this.halvingCalculator.getCycleForDay(dayInSeason, this.config.halvingCycleDays);
  }

  /**
   * 获取当日奖励
   */
  async getRewardForDay(): Promise<number> {
    if (!this.config) {
      throw new Error('SeasonConfig not initialized');
    }

    const dayInSeason = this.getDayInSeason();
    const cycle = this.halvingCalculator.getCycleForDay(dayInSeason, this.config.halvingCycleDays);
    return this.halvingCalculator.calculateReward(this.config.baseReward, cycle);
  }

  /**
   * 获取赛季进度
   */
  async getSeasonProgress(): Promise<SeasonProgress> {
    if (!this.config) {
      throw new Error('SeasonConfig not initialized');
    }

    const currentDay = this.getDayInSeason();
    const phase = await this.getCurrentPhase();

    return {
      currentDay,
      totalDays: this.config.totalDays,
      percentage: Math.floor((currentDay / this.config.totalDays) * 100),
      currentPhase: phase,
    };
  }

  /**
   * 验证配置
   */
  async validateConfig(config: Partial<SeasonConfig>): Promise<void> {
    const miningDays = config.miningDays ?? this.config?.miningDays ?? 0;
    const freeDays = config.freeDays ?? this.config?.freeDays ?? 0;
    const stagnationDays = config.stagnationDays ?? this.config?.stagnationDays ?? 0;

    if (miningDays < 0 || freeDays < 0 || stagnationDays < 0) {
      throw new Error('Days cannot be negative');
    }

    const total = miningDays + freeDays + stagnationDays;
    if (total > 365) {
      throw new Error('Total season days cannot exceed 365');
    }

    if (total <= 0) {
      throw new Error('Total season days must be positive');
    }
  }

  /**
   * 重置为新赛季
   */
  async resetSeason(): Promise<SeasonConfig> {
    if (!this.config) {
      throw new Error('SeasonConfig not initialized');
    }

    this.config = await this.prisma.seasonConfig.update({
      where: { id: this.config.id },
      data: {
        seasonNumber: this.config.seasonNumber + 1,
        startDate: new Date(),
      },
    });

    return this.config;
  }
}
