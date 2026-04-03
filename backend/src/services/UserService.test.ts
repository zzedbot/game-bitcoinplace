import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { PrismaClient, User } from '@prisma/client';
import { UserService, CreateUserDTO } from './UserService';
import bcrypt from 'bcrypt';

// Mock PrismaClient
vi.mock('@prisma/client', () => {
  const PrismaClient = vi.fn().mockImplementation(() => ({
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn()
    },
    $disconnect: vi.fn()
  }));
  return { PrismaClient };
});

describe('UserService', () => {
  let service: UserService;
  let mockPrisma: any;

  const testEmail = 'test@example.com';
  const testUsername = 'testuser';
  const testPassword = 'password123';

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    service = new UserService(mockPrisma);

    // 重置所有 mock
    vi.clearAllMocks();
  });

  describe('createUser', () => {
    it('应该创建新用户', async () => {
      const mockUser: Partial<User> = {
        id: 'user-1',
        email: testEmail,
        username: testUsername,
        avatar: null,
        balance: BigInt(0),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const dto: CreateUserDTO = {
        email: testEmail,
        username: testUsername,
        password: testPassword
      };

      const user = await service.createUser(dto);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: testEmail,
          username: testUsername,
          password: expect.any(String)
        })
      });
      expect(user.email).toBe(testEmail);
    });

    it('应该在邮箱已存在时抛出错误', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      const dto: CreateUserDTO = {
        email: testEmail,
        username: testUsername,
        password: testPassword
      };

      await expect(service.createUser(dto)).rejects.toThrow('Email already exists');
    });

    it('应该在用户名已存在时抛出错误', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'existing' });

      const dto: CreateUserDTO = {
        email: testEmail,
        username: testUsername,
        password: testPassword
      };

      await expect(service.createUser(dto)).rejects.toThrow('Username already exists');
    });
  });

  describe('findByEmail', () => {
    it('应该通过邮箱查找用户', async () => {
      const mockUser: Partial<User> = {
        id: 'user-1',
        email: testEmail,
        username: testUsername
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const user = await service.findByEmail(testEmail);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: testEmail }
      });
      expect(user?.email).toBe(testEmail);
    });

    it('应该在用户不存在时返回 null', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const user = await service.findByEmail('nonexistent@example.com');

      expect(user).toBeNull();
    });
  });

  describe('findById', () => {
    it('应该通过 ID 查找用户', async () => {
      const mockUser: Partial<User> = {
        id: 'user-1',
        email: testEmail,
        username: testUsername
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const user = await service.findById('user-1');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' }
      });
      expect(user?.id).toBe('user-1');
    });
  });

  describe('validatePassword', () => {
    it('应该验证正确的密码', async () => {
      const hashedPassword = await bcrypt.hash(testPassword, 10);
      const mockUser: Partial<User> = {
        id: 'user-1',
        password: hashedPassword
      };

      const isValid = await service.validatePassword(mockUser as User, testPassword);

      expect(isValid).toBe(true);
    });

    it('应该拒绝错误的密码', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 10);
      const mockUser: Partial<User> = {
        id: 'user-1',
        password: hashedPassword
      };

      const isValid = await service.validatePassword(mockUser as User, 'wrongpassword');

      expect(isValid).toBe(false);
    });
  });

  describe('updateLastLogin', () => {
    it('应该更新最后登录时间', async () => {
      const mockUser: Partial<User> = {
        id: 'user-1',
        email: testEmail
      };

      mockPrisma.user.update.mockResolvedValue(mockUser);

      await service.updateLastLogin('user-1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { lastLoginAt: expect.any(Date) }
      });
    });
  });
});
