import { PrismaClient } from '@prisma/client';

export interface User {
  id: number;
  userId: string;
  lastActiveAt: Date;
}

export interface WeightedUser {
  id: number;
  weight: number;
}

export interface AllocationResult {
  userId: string;
  rights: number;
  reason?: string;
}

export interface AllocationSummary {
  allocatedRights: number;
  unallocatedRights: number;
  recipients: AllocationResult[];
}

export class RandomAllocationService {
  private prisma: PrismaClient;
  private readonly MAX_ALLOCATION = 1_000_000;
  private readonly FAIRNESS_THRESHOLD = 1;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * 分配权益给在线用户
   */
  async allocateToOnlineUsers(totalRights: number): Promise<AllocationSummary> {
    await this.validateAllocation(totalRights, 1);

    const onlineUsers = await this.getOnlineUsers();
    
    if (onlineUsers.length === 0) {
      return {
        allocatedRights: 0,
        unallocatedRights: totalRights,
        recipients: [],
      };
    }

    // Calculate weights for each user
    const now = new Date();
    const usersWithWeights: Array<{ id: number; weight: number; userId: string }> = [];
    
    for (const user of onlineUsers) {
      const weight = await this.calculateUserWeight(user, now);
      if (weight > 0) {
        usersWithWeights.push({ id: user.id, weight, userId: user.userId });
      }
    }

    // If all users have zero weight, distribute equally
    if (usersWithWeights.length === 0) {
      const rightsPerUser = Math.floor(totalRights / onlineUsers.length);
      const remainder = totalRights % onlineUsers.length;
      
      const recipients: AllocationResult[] = onlineUsers.map((user, index) => ({
        userId: user.userId,
        rights: rightsPerUser + (index < remainder ? 1 : 0),
      }));

      const totalAllocated = recipients.reduce((sum, r) => sum + r.rights, 0);
      return {
        allocatedRights: totalAllocated,
        unallocatedRights: totalRights - totalAllocated,
        recipients,
      };
    }

    // Distribute based on weights
    const allocation = await this.calculateWeightedAllocation(usersWithWeights, totalRights);
    
    const recipients: AllocationResult[] = allocation.map((alloc) => ({
      userId: alloc.userId,
      rights: alloc.rights,
    }));

    const totalAllocated = recipients.reduce((sum, r) => sum + r.rights, 0);

    return {
      allocatedRights: totalAllocated,
      unallocatedRights: totalRights - totalAllocated,
      recipients,
    };
  }

  /**
   * 根据权重计算分配
   */
  async calculateWeightedAllocation(
    users: Array<{ id: number; weight: number; userId: string }>,
    totalRights: number
  ): Promise<Array<{ id: number; userId: string; rights: number }>> {
    const totalWeight = users.reduce((sum, u) => sum + u.weight, 0);

    if (totalWeight === 0) {
      return users.map(u => ({ id: u.id, userId: u.userId, rights: 0 }));
    }

    if (users.length === 1) {
      return [{ id: users[0].id, userId: users[0].userId, rights: totalRights }];
    }

    // Calculate proportional allocation
    const allocation: Array<{ id: number; userId: string; rights: number; remainder: number }> = [];
    let allocatedRights = 0;

    for (const user of users) {
      const proportion = user.weight / totalWeight;
      const rights = Math.floor(proportion * totalRights);
      const remainder = (proportion * totalRights) - rights;
      
      allocation.push({ id: user.id, userId: user.userId, rights, remainder });
      allocatedRights += rights;
    }

    // Distribute remainder based on fractional parts
    let remaining = totalRights - allocatedRights;
    
    // Sort by remainder (descending) to distribute fairly
    allocation.sort((a, b) => b.remainder - a.remainder);

    for (let i = 0; i < remaining && i < allocation.length; i++) {
      allocation[i].rights += 1;
    }

    return allocation.map(({ id, userId, rights }) => ({ id, userId, rights }));
  }

  /**
   * 计算用户权重（基于活跃度）
   */
  async calculateUserWeight(user: User, now: Date): Promise<number> {
    const hoursSinceActive = (now.getTime() - user.lastActiveAt.getTime()) / (1000 * 60 * 60);
    
    // Weight decreases exponentially with time
    // Active within 1 hour: weight = 1.0
    // Active within 24 hours: weight decreases linearly
    // Inactive for more than 24 hours: weight = 0
    
    if (hoursSinceActive <= 0) {
      return 1.0;
    }
    
    if (hoursSinceActive >= 24) {
      return 0;
    }

    // Linear decay from 1.0 to 0 over 24 hours
    return 1.0 - (hoursSinceActive / 24);
  }

  /**
   * 获取随机在线用户子集
   */
  async getRandomOnlineUsers(count: number): Promise<User[]> {
    const allUsers = await this.getOnlineUsers();
    
    if (allUsers.length === 0) {
      return [];
    }

    // Fisher-Yates shuffle
    const shuffled = [...allUsers];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, Math.min(count, allUsers.length));
  }

  /**
   * 验证分配参数
   */
  async validateAllocation(totalRights: number, userCount: number): Promise<void> {
    if (totalRights < 0) {
      throw new Error('totalRights must be non-negative');
    }

    if (userCount <= 0) {
      throw new Error('userCount must be positive');
    }

    if (totalRights > this.MAX_ALLOCATION) {
      throw new Error(`totalRights exceeds maximum allocation of ${this.MAX_ALLOCATION}`);
    }
  }

  /**
   * 记录分配
   */
  async recordAllocation(allocations: AllocationResult[]): Promise<{ count: number }> {
    if (allocations.length === 0) {
      return { count: 0 };
    }

    const data = allocations.map(a => ({
      userId: a.userId,
      rights: a.rights,
      reason: a.reason || 'MINING_REWARD',
    }));

    const result = await this.prisma.colorRight.createMany({
      data,
    });

    return { count: result.count };
  }

  /**
   * 获取分配历史
   */
  async getAllocationHistory(userId: string): Promise<Array<{ id: number; userId: string; rights: number; createdAt: Date }>> {
    return this.prisma.colorRight.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 获取用户总分配
   */
  async getTotalAllocatedForUser(userId: string): Promise<number> {
    const result = await this.prisma.colorRight.aggregate({
      where: { userId },
      _sum: { rights: true },
    });

    return result._sum.rights ?? 0;
  }

  /**
   * 获取在线用户
   */
  private async getOnlineUsers(): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        lastActiveAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Active in last 24 hours
        },
      },
    });
  }
}
