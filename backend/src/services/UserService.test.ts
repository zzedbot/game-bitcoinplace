import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { UserService } from './UserService';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const userService = new UserService(prisma);

describe('UserService', () => {
  const testEmail = 'test@example.com';
  const testUsername = 'testuser';
  const testPassword = 'password123';

  beforeAll(async () => {
    // 清理测试数据
    await prisma.user.deleteMany({ where: { email: testEmail } });
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.$disconnect();
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        email: testEmail,
        username: testUsername,
        password: testPassword
      };

      const user = await userService.createUser(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(testEmail);
      expect(user.username).toBe(testUsername);
      expect(user.password).not.toBe(testPassword); // 密码应该已加密
      expect(user.balance).toBe(0n);
    });

    it('should throw error when email already exists', async () => {
      const userData = {
        email: testEmail,
        username: 'anotheruser',
        password: 'password456'
      };

      await expect(userService.createUser(userData)).rejects.toThrow('Email already exists');
    });

    it('should throw error when username already exists', async () => {
      const userData = {
        email: 'another@example.com',
        username: testUsername,
        password: 'password456'
      };

      await expect(userService.createUser(userData)).rejects.toThrow('Username already exists');
    });

    it('should hash password with bcrypt', async () => {
      const userData = {
        email: 'test2@example.com',
        username: 'testuser2',
        password: testPassword
      };

      const user = await userService.createUser(userData);
      
      // 验证密码是否已正确加密
      const isValid = await bcrypt.compare(testPassword, user.password);
      expect(isValid).toBe(true);

      // 清理
      await prisma.user.delete({ where: { id: user.id } });
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const user = await userService.findByEmail(testEmail);
      
      expect(user).toBeDefined();
      expect(user?.email).toBe(testEmail);
    });

    it('should return null when user not found', async () => {
      const user = await userService.findByEmail('nonexistent@example.com');
      
      expect(user).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('should find user by username', async () => {
      const user = await userService.findByUsername(testUsername);
      
      expect(user).toBeDefined();
      expect(user?.username).toBe(testUsername);
    });

    it('should return null when user not found', async () => {
      const user = await userService.findByUsername('nonexistentuser');
      
      expect(user).toBeNull();
    });
  });

  describe('validatePassword', () => {
    it('should return true for correct password', async () => {
      const user = await userService.findByEmail(testEmail);
      expect(user).toBeDefined();

      const isValid = await userService.validatePassword(user!, testPassword);
      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const user = await userService.findByEmail(testEmail);
      expect(user).toBeDefined();

      const isValid = await userService.validatePassword(user!, 'wrongpassword');
      expect(isValid).toBe(false);
    });
  });
});
