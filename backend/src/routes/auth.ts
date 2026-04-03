import { FastifyPluginAsync } from 'fastify';
import { UserService, CreateUserDTO } from '../services/UserService';
import { prisma, userService, redis } from '../index';
import { deviceService } from '../services/DeviceService';

interface RegisterBody {
  email: string;
  username: string;
  password: string;
}

interface LoginBody {
  email: string;
  password: string;
}

const authRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /api/v1/auth/register
   * 用户注册
   */
  app.post('/register', async (request, reply) => {
    const body = request.body as RegisterBody;

    // 验证输入
    if (!body.email || !body.username || !body.password) {
      return reply.status(400).send({
        error: 'BadRequest',
        message: 'Email, username and password are required',
        statusCode: 400
      });
    }

    // 密码长度检查
    if (body.password.length < 6) {
      return reply.status(400).send({
        error: 'BadRequest',
        message: 'Password must be at least 6 characters',
        statusCode: 400
      });
    }

    try {
      const deviceInfo = deviceService.extractDeviceInfo(request.headers);
      const deviceId = deviceService.generateDeviceId();

      const user = await userService.createUser({
        email: body.email,
        username: body.username,
        password: body.password
      });

      // 生成 JWT Token
      const token = app.jwt.sign({ userId: user.id, email: user.email, deviceId });

      // 在 Redis 中存储设备指纹
      const fingerprint = deviceService.generateFingerprint(
        deviceInfo.userAgent,
        deviceInfo.ip
      );
      await redis.setex(`device:${deviceId}`, 86400 * 30, fingerprint); // 30 天

      // 更新最后登录时间
      await userService.updateLastLogin(user.id);

      return reply.status(201).send({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          avatar: user.avatar
        },
        token,
        deviceId
      });
    } catch (error: any) {
      if (error.message === 'Email already exists' || error.message === 'Username already exists') {
        return reply.status(409).send({
          error: 'Conflict',
          message: error.message,
          statusCode: 409
        });
      }
      throw error;
    }
  });

  /**
   * POST /api/v1/auth/login
   * 用户登录
   */
  app.post('/login', async (request, reply) => {
    const body = request.body as LoginBody;

    // 验证输入
    if (!body.email || !body.password) {
      return reply.status(400).send({
        error: 'BadRequest',
        message: 'Email and password are required',
        statusCode: 400
      });
    }

    // 查找用户
    const user = await userService.findByEmail(body.email);

    if (!user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid email or password',
        statusCode: 401
      });
    }

    // 验证密码
    const isValid = await userService.validatePassword(user, body.password);

    if (!isValid) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid email or password',
        statusCode: 401
      });
    }

    const deviceInfo = deviceService.extractDeviceInfo(request.headers);
    const deviceId = deviceService.generateDeviceId();

    // 生成 JWT Token
    const token = app.jwt.sign({ userId: user.id, email: user.email, deviceId });

    // 在 Redis 中存储设备指纹
    const fingerprint = deviceService.generateFingerprint(
      deviceInfo.userAgent,
      deviceInfo.ip
    );
    await redis.setex(`device:${deviceId}`, 86400 * 30, fingerprint);

    // 更新最后登录时间
    await userService.updateLastLogin(user.id);

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar
      },
      token,
      deviceId
    });
  });

  /**
   * POST /api/v1/auth/refresh
   * 刷新 Token
   */
  app.post('/refresh', async (request, reply) => {
    // 需要认证
    await request.jwtVerify();

    const user = await userService.findById(request.user.userId);

    if (!user) {
      return reply.status(404).send({
        error: 'NotFound',
        message: 'User not found',
        statusCode: 404
      });
    }

    // 生成新 Token
    const token = app.jwt.sign({ userId: user.id, email: user.email });

    return reply.send({ token });
  });
};

export default authRoutes;
