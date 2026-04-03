import { PrismaClient, User } from '@prisma/client';
import bcrypt from 'bcrypt';

export interface CreateUserDTO {
  email: string;
  username: string;
  password: string;
  avatar?: string;
}

export class UserService {
  private prisma: PrismaClient;
  private readonly SALT_ROUNDS = 10;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * 创建新用户
   */
  async createUser(data: CreateUserDTO): Promise<User> {
    // 检查邮箱是否已存在
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingEmail) {
      throw new Error('Email already exists');
    }

    // 检查用户名是否已存在
    const existingUsername = await this.prisma.user.findUnique({
      where: { username: data.username }
    });

    if (existingUsername) {
      throw new Error('Username already exists');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(data.password, this.SALT_ROUNDS);

    // 创建用户
    return this.prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        password: hashedPassword,
        avatar: data.avatar,
        balance: 0n
      }
    });
  }

  /**
   * 通过邮箱查找用户
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email }
    });
  }

  /**
   * 通过用户名查找用户
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { username }
    });
  }

  /**
   * 通过 ID 查找用户
   */
  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id }
    });
  }

  /**
   * 验证密码
   */
  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }

  /**
   * 更新用户余额
   */
  async updateBalance(userId: string, amount: bigint): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { balance: { increment: amount } }
    });
  }

  /**
   * 设置用户余额（用于充值/提现）
   */
  async setBalance(userId: string, balance: bigint): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { balance }
    });
  }
}
