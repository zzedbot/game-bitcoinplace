import { PrismaClient, ColorRight, User } from '@prisma/client';

export interface AllocateColorRightResult {
  colorRight: ColorRight;
  isRandomReward: boolean;
}

export class ColorRightService {
  private prisma: PrismaClient;
  
  // 画布配置
  private readonly CANVAS_WIDTH = 7000;
  private readonly CANVAS_HEIGHT = 3000;
  private readonly ZONE_SIZE = 1000;
  private readonly TOTAL_ZONES = 21;
  
  // 每个区块窗口分配的染色权数量 (第 1 周)
  private readonly INITIAL_ALLOCATION_PER_WINDOW = 10417;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * 为用户分配染色权
   * @param userId 用户 ID
   * @param count 分配数量
   * @param zoneIndex 指定矿区 (可选，随机分配)
   */
  async allocate(
    userId: string,
    count: number = 1,
    zoneIndex?: number
  ): Promise<ColorRight[]> {
    const allocated: ColorRight[] = [];

    for (let i = 0; i < count; i++) {
      const position = this.generateRandomPosition(zoneIndex);
      
      // 检查该位置是否已被分配
      const existing = await this.prisma.colorRight.findUnique({
        where: {
          x_y: {
            x: position.x,
            y: position.y
          }
        }
      });

      if (existing) {
        // 位置已被占用，跳过
        continue;
      }

      // 创建染色权
      const colorRight = await this.prisma.colorRight.create({
        data: {
          userId,
          x: position.x,
          y: position.y,
          zoneIndex: position.zoneIndex,
          used: false,
          color: null
        }
      });

      allocated.push(colorRight);
    }

    return allocated;
  }

  /**
   * 生成随机位置
   */
  private generateRandomPosition(forceZoneIndex?: number): {
    x: number;
    y: number;
    zoneIndex: number;
  } {
    const zoneIndex = forceZoneIndex ?? Math.floor(Math.random() * this.TOTAL_ZONES);
    
    // 计算矿区的起始坐标
    const zoneRow = Math.floor(zoneIndex / 7); // 0-2
    const zoneCol = zoneIndex % 7; // 0-6
    
    const startX = zoneCol * this.ZONE_SIZE;
    const startY = zoneRow * this.ZONE_SIZE;
    
    // 在矿区内随机生成坐标
    const x = startX + Math.floor(Math.random() * this.ZONE_SIZE);
    const y = startY + Math.floor(Math.random() * this.ZONE_SIZE);
    
    return { x, y, zoneIndex };
  }

  /**
   * 使用染色权 (染色)
   */
  async useColorRight(
    colorRightId: string,
    userId: string,
    color: number
  ): Promise<ColorRight> {
    // 验证颜色范围 (0-15)
    if (color < 0 || color > 15) {
      throw new Error('Color must be between 0 and 15');
    }

    // 查找染色权
    const colorRight = await this.prisma.colorRight.findUnique({
      where: { id: colorRightId },
      include: { user: true }
    });

    if (!colorRight) {
      throw new Error('ColorRight not found');
    }

    // 验证所有权
    if (colorRight.userId !== userId) {
      throw new Error('Not the owner of this color right');
    }

    // 更新颜色
    return this.prisma.colorRight.update({
      where: { id: colorRightId },
      data: {
        used: true,
        color,
        updatedAt: new Date()
      }
    });
  }

  /**
   * 获取用户的染色权列表
   */
  async getUserColorRights(
    userId: string,
    used?: boolean,
    limit: number = 50,
    offset: number = 0
  ): Promise<ColorRight[]> {
    const where: any = { userId };
    
    if (used !== undefined) {
      where.used = used;
    }

    return this.prisma.colorRight.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });
  }

  /**
   * 获取单个染色权
   */
  async getColorRight(id: string): Promise<ColorRight | null> {
    return this.prisma.colorRight.findUnique({
      where: { id }
    });
  }

  /**
   * 获取画布上某像素的染色权
   */
  async getColorRightAt(x: number, y: number): Promise<ColorRight | null> {
    return this.prisma.colorRight.findUnique({
      where: {
        x_y: { x, y }
      }
    });
  }

  /**
   * 获取矿区统计信息
   */
  async getZoneStats(zoneIndex: number): Promise<{
    total: number;
    used: number;
    unused: number;
    uniqueOwners: number;
  }> {
    const [total, used, unused, owners] = await Promise.all([
      this.prisma.colorRight.count({ where: { zoneIndex } }),
      this.prisma.colorRight.count({ where: { zoneIndex, used: true } }),
      this.prisma.colorRight.count({ where: { zoneIndex, used: false } }),
      this.prisma.colorRight.groupBy({
        by: ['userId'],
        where: { zoneIndex },
        _count: true
      })
    ]);

    return {
      total,
      used,
      unused,
      uniqueOwners: owners.length
    };
  }

  /**
   * 批量分配 (用于赛季初始化)
   */
  async bulkAllocate(
    userId: string,
    count: number,
    zoneIndex?: number
  ): Promise<ColorRight[]> {
    const allocated: ColorRight[] = [];
    let attempts = 0;
    const maxAttempts = count * 3; // 最多尝试 3 倍次数

    while (allocated.length < count && attempts < maxAttempts) {
      const result = await this.allocate(userId, 1, zoneIndex);
      if (result.length > 0) {
        allocated.push(...result);
      }
      attempts++;
    }

    return allocated;
  }

  /**
   * 验证用户是否有权限染色某位置
   */
  async canColorAt(userId: string, x: number, y: number): Promise<{
    can: boolean;
    reason?: string;
    colorRight?: ColorRight;
  }> {
    const colorRight = await this.getColorRightAt(x, y);

    if (!colorRight) {
      return { can: false, reason: 'No color right at this position' };
    }

    if (colorRight.userId !== userId) {
      return { can: false, reason: 'Not the owner', colorRight };
    }

    return { can: true, colorRight };
  }
}

export const colorRightService = (prisma: PrismaClient) => 
  new ColorRightService(prisma);
