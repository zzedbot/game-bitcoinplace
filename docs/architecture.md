# BitcoinPlace - 技术架构设计

## 0. 数据库设计原则

**核心规范（2026-04-04 更新）：**

| 特性 | 状态 | 说明 |
|------|------|------|
| **外键约束** | ❌ 禁止使用 | 不使用 `REFERENCES` 或 Prisma `@relation` 外键约束 |
| **触发器** | ❌ 禁止使用 | 业务逻辑全部在应用层实现 |
| **存储过程** | ❌ 禁止使用 | 所有查询通过 Prisma ORM 执行 |

**原因：**
1. 微服务友好 - 无外键便于未来拆分服务
2. 迁移简单 - 数据库重置和迁移更灵活
3. 测试便利 - 单元测试无需考虑外键依赖
4. 性能可控 - 应用层批量操作比数据库级联更高效
5. 代码集中 - 业务逻辑集中在代码层，便于审查和维护

**应用层责任：**
- 使用 `prisma.$transaction()` 保证数据一致性
- 手动实现级联删除/更新逻辑
- 应用层验证外键引用存在

详细规范见：`docs/DATABASE_GUIDELINES.md`

---

## 1. 系统架构总览

```
┌─────────────────────────────────────────────────────────────────────┐
│                           客户端层 (Flutter)                         │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Flutter 3.x + Dart                         │   │
│  │         Web  │  iOS  │  Android  (一套代码，三端编译)            │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTPS / WSS
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        CDN / Edge 层                                 │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    Cloudflare / Fastly                         │ │
│  │  - 静态资源缓存 (JS/CSS/图片)                                   │ │
│  │  - 画布状态缓存 (1 秒过期 + stale-while-revalidate)               │ │
│  │  - DDoS 防护                                                     │ │
│  │  - 速率限制                                                      │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        API Gateway 层                                │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    Kong / APISIX / Nginx                       │ │
│  │  - 路由分发                                                     │ │
│  │  - 认证鉴权 (JWT 验证)                                           │ │
│  │  - 限流熔断                                                     │ │
│  │  - 请求日志                                                     │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       应用服务层 (Node.js + TypeScript)              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ 用户服务     │  │ 画布服务     │  │ 拍卖服务     │  │ 通知服务     │ │
│  │ User Service│  │CanvasService│  │AuctionService│ │NotifyService│ │
│  │             │  │             │  │             │  │             │ │
│  │ - 注册登录   │  │ - 画布状态   │  │ - 挂单      │  │ - 站内信    │ │
│  │ - 个人资料   │  │ - 染色操作   │  │ - 竞价      │  │ - 邮件      │ │
│  │ - 设备指纹   │  │ - 坐标查询   │  │ - 成交      │  │ - 推送      │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
│                                                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                    │
│  │ 经济服务     │  │ WebSocket   │  │ 定时任务     │                    │
│  │EconomyService│ │   Service   │  │ Scheduler   │                    │
│  │             │  │             │  │             │                    │
│  │ - 产出计算   │  │ - 实时推送   │  │ - 区块生成   │                    │
│  │ - 分配逻辑   │  │ - 在线用户   │  │ - 拍卖到期   │                    │
│  │ - 减半管理   │  │ - 心跳检测   │  │ - 数据统计   │                    │
│  └─────────────┘  └─────────────┘  └─────────────┘                    │
│                                                                        │
│  技术栈：Fastify + TypeScript + Prisma + BullMQ                       │
└─────────────────────────────────────────────────────────────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
┌─────────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│      PostgreSQL     │ │      Redis      │ │     MongoDB     │
│                     │ │                 │ │                 │
│ - 用户数据          │ │ - 画布缓存       │ │ - 操作日志       │
│ - 染色权所有权      │ │ - 在线用户集合   │ │ - 分析数据       │
│ - 拍卖订单          │ │ - 会话存储       │ │ - 事件流水       │
│ - 交易记录          │ │ - 排行榜         │ │                 │
│ - 减半配置          │ │ - 速率限制计数   │ │                 │
└─────────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## 2. 后端技术栈

### 2.1 技术选型

```
Node.js 20+ LTS + TypeScript
├── Web 框架：Fastify v4          # 高性能 HTTP 框架 (QPS > 50k)
├── ORM：Prisma v5                # 类型安全的数据库 ORM
├── WebSocket：ws v8              # 原生 WebSocket 实现
├── 任务队列：BullMQ v4           # Redis 驱动的任务队列
├── 认证：@fastify/jwt            # JWT 认证插件
├── 验证：@fastify/type-provider-typebox  # JSON Schema 验证
├── 日志：pino                    # 高性能日志库
├── 测试：Vitest + Supertest      # 单元测试 + 集成测试
└── 部署：Docker + K8s            # 容器化部署
```

**为什么选择 Fastify？**
- ✅ 性能最优：Node.js 框架中 QPS 最高 (~50k req/s)
- ✅ 插件生态：官方插件覆盖 JWT、CORS、速率限制等
- ✅ 类型安全：完整 TypeScript 支持
- ✅ 低开销：异步性能优异，适合高并发
- ✅ 易测试：依赖注入友好

### 2.2 项目结构

```
backend/
├── src/
│   ├── main.ts                    # 应用入口
│   ├── app.ts                     # Fastify 实例配置
│   │
│   ├── config/                    # 配置
│   │   ├── index.ts               # 配置导出
│   │   ├── database.ts            # 数据库配置
│   │   ├── redis.ts               # Redis 配置
│   │   └── jwt.ts                 # JWT 配置
│   │
│   ├── plugins/                   # Fastify 插件
│   │   ├── auth.ts                # 认证插件
│   │   ├── rate-limit.ts          # 限流插件
│   │   ├── cors.ts                # CORS 插件
│   │   └── websocket.ts           # WebSocket 插件
│   │
│   ├── routes/                    # 路由
│   │   ├── health.ts              # 健康检查
│   │   ├── auth/                  # 认证
│   │   │   ├── register.ts
│   │   │   ├── login.ts
│   │   │   └── refresh.ts
│   │   ├── canvas/                # 画布
│   │   │   ├── region.ts          # GET /canvas/region
│   │   │   ├── color.ts           # POST /canvas/color
│   │   │   └── state.ts           # GET /canvas/state
│   │   ├── auctions/              # 拍卖
│   │   │   ├── list.ts
│   │   │   ├── create.ts
│   │   │   ├── bid.ts
│   │   │   └── buy-now.ts
│   │   ├── wallet/                # 钱包
│   │   │   ├── balance.ts
│   │   │   └── transactions.ts
│   │   └── user/                  # 用户
│   │       ├── profile.ts
│   │       └── inventory.ts
│   │
│   ├── services/                  # 业务逻辑
│   │   ├── canvas.service.ts      # 画布服务
│   │   ├── auction.service.ts     # 拍卖服务
│   │   ├── economy.service.ts     # 经济服务
│   │   ├── websocket.service.ts   # WebSocket 服务
│   │   ├── user.service.ts        # 用户服务
│   │   └── notification.service.ts# 通知服务
│   │
│   ├── repositories/              # 数据访问层
│   │   ├── canvas.repository.ts
│   │   ├── auction.repository.ts
│   │   ├── user.repository.ts
│   │   └── wallet.repository.ts
│   │
│   ├── models/                    # 数据模型
│   │   ├── user.ts
│   │   ├── color-right.ts
│   │   ├── auction.ts
│   │   └── block.ts
│   │
│   ├── queues/                    # 任务队列
│   │   ├── block-producer.ts      # 区块生成任务
│   │   ├── auction-monitor.ts     # 拍卖到期监控
│   │   └── notification-sender.ts # 通知发送
│   │
│   ├── middleware/                # 中间件
│   │   ├── auth.middleware.ts     # JWT 验证
│   │   ├── validation.middleware.ts
│   │   └── error.middleware.ts
│   │
│   └── utils/                     # 工具函数
│       ├── crypto.ts
│       ├── pagination.ts
│       └── logger.ts
│
├── prisma/                        # Prisma ORM
│   ├── schema.prisma              # 数据库 Schema
│   ├── migrations/                # 数据库迁移
│   └── seed.ts                    # 种子数据
│
├── tests/                         # 测试
│   ├── unit/                      # 单元测试
│   ├── integration/               # 集成测试
│   └── e2e/                       # 端到端测试
│
├── docker/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── k8s/                       # Kubernetes 配置
│
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### 2.3 核心代码示例

**Fastify 应用入口：**
```typescript
// src/main.ts
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import { config } from './config';

import authRoutes from './routes/auth';
import canvasRoutes from './routes/canvas';
import auctionRoutes from './routes/auctions';
import walletRoutes from './routes/wallet';

const buildApp = async () => {
  const fastify = Fastify({
    logger: {
      level: config.logLevel,
    },
  });

  // 注册插件
  await fastify.register(cors, { origin: true });
  await fastify.register(jwt, { secret: config.jwtSecret });
  await fastify.register(websocket);

  // 注册路由
  await fastify.register(authRoutes, { prefix: '/api/v1/auth' });
  await fastify.register(canvasRoutes, { prefix: '/api/v1/canvas' });
  await fastify.register(auctionRoutes, { prefix: '/api/v1/auctions' });
  await fastify.register(walletRoutes, { prefix: '/api/v1/wallet' });

  // 健康检查
  fastify.get('/health', async () => ({ status: 'ok', timestamp: Date.now() }));

  return fastify;
};

const start = async () => {
  const fastify = await buildApp();
  
  try {
    await fastify.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`Server running at http://localhost:${config.port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
```

**染色路由示例：**
```typescript
// src/routes/canvas/color.ts
import { FastifyPluginAsync } from 'fastify';
import { CanvasService } from '../../services/canvas.service';
import { authMiddleware } from '../../middleware/auth.middleware';

export const colorRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    '/color',
    {
      preHandler: [authMiddleware],
      schema: {
        body: {
          type: 'object',
          required: ['x', 'y', 'color'],
          properties: {
            x: { type: 'integer', minimum: 0, maximum: 6999 },
            y: { type: 'integer', minimum: 0, maximum: 2999 },
            color: { type: 'integer', minimum: 0, maximum: 15 },
          },
        },
      },
    },
    async (request, reply) => {
      const { x, y, color } = request.body as { x: number; y: number; color: number };
      const userId = request.user!.id;

      // 验证染色权
      const hasRight = await CanvasService.hasColorRight(userId, x, y);
      if (!hasRight) {
        return reply.status(403).send({ error: 'No color right' });
      }

      // 执行染色
      await CanvasService.colorTile(x, y, color, userId);

      // 广播更新
      fastify.websocketServer.broadcastToZone(
        CanvasService.getZone(x, y),
        { type: 'tile_colored', x, y, color, timestamp: Date.now() }
      );

      return { success: true };
    }
  );
};
```

**Prisma Schema：**
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// 数据库规范：不使用外键约束、触发器、存储过程
// 所有表间关系由应用层维护，Prisma 仅保留字段用于查询

model User {
  id          String   @id @default(uuid())
  email       String   @unique
  username    String   @unique
  password    String
  avatar      String?
  balance     BigInt   @default(0)
  lastLoginAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // 注意：移除外键关系定义，应用层维护数据一致性
  
  @@index([email])
  @@index([username])
  @@map("users")
}

model ColorRight {
  id        String   @id @default(uuid())
  userId    String   // 外键字段保留，但无数据库约束
  x         Int
  y         Int
  zoneIndex Int
  color     Int?
  used      Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // 注意：外键约束已移除
  
  @@unique([x, y])
  @@index([userId])
  @@index([zoneIndex])
  @@index([used])
  @@map("color_rights")
}

model Auction {
  id           String        @id @default(uuid())
  sellerId     String        // 外键字段保留，但无数据库约束
  colorRightId String        @unique // 外键字段保留，但无数据库约束
  startingPrice BigInt
  currentPrice BigInt
  buyNowPrice  BigInt?
  status       AuctionStatus @default(ACTIVE)
  startTime    DateTime      @default(now())
  endTime      DateTime
  winnerId     String?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  // 注意：外键约束已移除
  
  @@index([sellerId])
  @@index([status])
  @@index([endTime])
  @@map("auctions")
}

model Bid {
  id        String   @id @default(uuid())
  auctionId String   // 外键字段保留，但无数据库约束
  bidderId  String   // 外键字段保留，但无数据库约束
  amount    BigInt
  createdAt DateTime @default(now())

  // 注意：外键约束已移除
  
  @@index([auctionId])
  @@index([bidderId])
  @@map("bids")
}

model Transaction {
  id        String         @id @default(uuid())
  userId    String         // 外键字段保留，但无数据库约束
  type      TransactionType
  amount    BigInt
  balance   BigInt
  reference String?
  createdAt DateTime       @default(now())

  // 注意：外键约束已移除
  
  @@index([userId])
  @@index([type])
  @@map("transactions")
}

enum AuctionStatus {
  ACTIVE
  SOLD
  EXPIRED
  CANCELLED
}

enum TransactionType {
  DEPOSIT
  WITHDRAW
  REWARD
  PURCHASE
  SALE
  AUCTION_WIN
  FEE
}
```

### 2.4 WebSocket 服务实现

```typescript
// src/services/websocket.service.ts
import { FastifyInstance, FastifyRequest } from 'fastify';
import { WebSocket } from 'ws';

interface Client {
  ws: WebSocket;
  userId: string;
  zones: Set<number>;
}

export class WebSocketService {
  private clients: Map<string, Client> = new Map();
  private zoneSubscribers: Map<number, Set<string>> = new Map();

  constructor(private fastify: FastifyInstance) {}

  async handleConnection(ws: WebSocket, request: FastifyRequest) {
    const userId = request.user?.id;
    if (!userId) {
      ws.close(4001, 'Unauthorized');
      return;
    }

    const clientId = this.generateClientId();
    this.clients.set(clientId, { ws, userId, zones: new Set() });

    ws.on('message', (data) => this.handleMessage(clientId, data));
    ws.on('close', () => this.handleDisconnect(clientId));
    ws.on('pong', () => this.clients.get(clientId)!.isAlive = true);

    // 心跳检测
    setInterval(() => {
      const client = this.clients.get(clientId);
      if (client && !client.isAlive) {
        client.ws.terminate();
      } else if (client) {
        client.isAlive = false;
        client.ws.ping();
      }
    }, 30000);
  }

  private handleMessage(clientId: string, data: Buffer) {
    const message = JSON.parse(data.toString());
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'subscribe_zone':
        client.zones.add(message.payload.zone);
        this.zoneSubscribers.get(message.payload.zone)?.add(clientId);
        break;
      case 'unsubscribe_zone':
        client.zones.delete(message.payload.zone);
        this.zoneSubscribers.get(message.payload.zone)?.delete(clientId);
        break;
    }
  }

  private handleDisconnect(clientId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.zones.forEach(zone => {
      this.zoneSubscribers.get(zone)?.delete(clientId);
    });
    this.clients.delete(clientId);
  }

  broadcastToZone(zone: number, message: any) {
    const subscribers = this.zoneSubscribers.get(zone);
    if (!subscribers) return;

    const data = JSON.stringify(message);
    subscribers.forEach(clientId => {
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    });
  }

  sendToUser(userId: string, message: any) {
    const data = JSON.stringify(message);
    this.clients.forEach((client, clientId) => {
      if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    });
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### 2.5 任务队列 (BullMQ)

```typescript
// src/queues/block-producer.ts
import { Queue, Worker } from 'bullmq';
import { redisConfig } from '../config/redis';
import { EconomyService } from '../services/economy.service';

export class BlockProducerQueue {
  private queue: Queue;
  private worker: Worker;

  constructor() {
    this.queue = new Queue('block-production', { connection: redisConfig });
    
    this.worker = new Worker('block-production', async (job) => {
      await this.produceBlock(job.data.blockNumber);
    }, { connection: redisConfig });

    // 每 10 分钟生成一个区块
    this.startScheduler();
  }

  private async startScheduler() {
    await this.queue.add(
      'produce-block',
      { blockNumber: 1 },
      {
        repeat: {
          every: 10 * 60 * 1000, // 10 分钟
        },
      }
    );
  }

  private async produceBlock(blockNumber: number) {
    const reward = await EconomyService.calculateBlockReward(blockNumber);
    const winners = await EconomyService.selectWinners(reward);
    
    await EconomyService.distributeRewards(blockNumber, winners);
    
    // 广播给所有用户
    WebSocketService.broadcastGlobal({
      type: 'block_generated',
      payload: {
        blockNumber,
        reward,
        winners,
        timestamp: Date.now(),
      },
    });
  }
}
```

### 2.6 配置文件

```typescript
// src/config/index.ts
export const config = {
  port: process.env.PORT || 3000,
  logLevel: process.env.LOG_LEVEL || 'info',
  
  database: {
    url: process.env.DATABASE_URL!,
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: '7d',
  },
  
  canvas: {
    width: 7000,
    height: 3000,
    totalTiles: 21000000,
    zones: 21,
  },
  
  season: {
    miningDays: 49,
    freeDays: 7,
    frozenDays: 4,
    halvingPeriodDays: 7,
  },
};
```

### 2.7 Docker 部署

```dockerfile
# docker/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

```yaml
# docker/docker-compose.yml
version: '3.8'

services:
  api:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/bitcoinplace
      - REDIS_HOST=redis
      - JWT_SECRET=your-secret-key
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=bitcoinplace
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## 3. 核心模块设计

### 3.1 画布服务 (CanvasService)

**职责：**
- 管理 7000×3000 画布的状态
- 处理染色请求
- 提供画布数据给客户端

**数据结构：**

```redis
# Redis bitfield 存储画布状态
# 每个坐标用 8 bit:
#   bit 0-3: 颜色索引 (0-15)
#   bit 4:   是否已染色 (0=透明，1=已染色)
#   bit 5-7: 保留

# 读取单个坐标
BITFIELD canvas:state GET u8 {offset}

# 更新单个坐标
BITFIELD canvas:state SET u8 {offset} {value}

# offset = x + y * 7000
```

```sql
-- PostgreSQL 存储染色权所有权
-- 注意：不使用外键约束，应用层维护数据一致性
CREATE TABLE color_rights (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL,  -- 外键字段，但无数据库约束
    x               INT NOT NULL,
    y               INT NOT NULL,
    zone_index      INT NOT NULL,
    
    used            BOOLEAN DEFAULT FALSE,
    color           INT,  -- 当前颜色 (0-15), null=未使用
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ,
    
    UNIQUE (x, y)
);

CREATE INDEX idx_color_rights_user ON color_rights(user_id);
CREATE INDEX idx_color_rights_zone ON color_rights(zone_index);
CREATE INDEX idx_color_rights_used ON color_rights(used);
```

**API 接口：**

```typescript
// 获取画布全量数据（用于初始化）
GET /api/v1/canvas/state
Response: {
  version: number,      // 画布版本号
  data: Uint8Array,     // 压缩后的画布数据
  timestamp: number
}

// 获取单个坐标状态
GET /api/v1/canvas/tile?x=123&y=456
Response: {
  x: number,
  y: number,
  color: number | null,  // null=透明
  isUsed: boolean,
  ownerId: string | null
}

// 获取区域状态（用于分块加载）
GET /api/v1/canvas/region?zone=1&minX=0&minY=0&maxX=100&maxY=100
Response: {
  zone: number,
  tiles: Array<{x: number, y: number, color: number}>
}

// 染色操作
POST /api/v1/canvas/color
Body: {
  x: number,
  y: number,
  color: number
}
Response: {
  success: boolean,
  newVersion: number
}
```

### 2.2 经济服务 (EconomyService)

**职责：**
- 计算当前减半周期的产出速率
- 管理色块解锁（区块生成）
- 随机分配染色权给在线用户

**核心逻辑：**

```typescript
// 伪代码示例

interface HalvingCycle {
  cycle: number;
  startDate: Date;
  endDate: Date;
  blocksPerWindow: number;  // 每窗口产出色块数
}

class EconomyService {
  // 获取当前减半周期
  getCurrentCycle(): HalvingCycle {
    const now = new Date();
    return db.halvingSchedule
      .findOne({ where: { startDate: { lte: now }, endDate: { gt: now } } });
  }

  // 计算当前周期应产出的色块数
  getBlockReward(): number {
    const cycle = this.getCurrentCycle();
    return cycle.blocksPerWindow;
  }

  // 每 10 分钟执行：生成新区块并分配
  async generateBlock(): Promise<void> {
    const reward = this.getBlockReward();
    const onlineUsers = await this.getOnlineUsers();
    
    if (onlineUsers.length === 0) return;
    
    // 随机抽取中奖用户（可加权）
    const winners = this.randomSelect(onlineUsers, reward);
    
    // 为每个赢家分配一个未解锁的坐标
    for (const user of winners) {
      const coord = await this.getNextUnlockedCoordinate();
      if (!coord) break;  // 已挖完
      
      await this.grantColoringRight(user.id, coord.x, coord.y);
    }
  }

  // 加权随机选择（考虑在线时长、活跃度）
  randomSelect(users: User[], count: number): User[] {
    // 计算每个用户的权重
    const weights = users.map(u => {
      const timeWeight = Math.min(u.onlineMinutes / 60, 2);  // 最多 2 倍
      const activityWeight = 1 + u.activityScore / 100;
      return timeWeight * activityWeight;
    });
    
    // 加权随机抽样
    return weightedSample(users, weights, count);
  }
}
```

**数据库表：**

```sql
-- 注意：不使用外键约束，应用层维护数据一致性
-- 减半周期配置
CREATE TABLE halving_schedule (
  cycle               INT PRIMARY KEY,
  start_date          TIMESTAMPTZ NOT NULL,
  end_date            TIMESTAMPTZ NOT NULL,
  blocks_per_window   INT NOT NULL,
  description         TEXT
);

-- 区块生成记录
CREATE TABLE blocks (
  id                  BIGSERIAL PRIMARY KEY,
  block_number        BIGINT NOT NULL UNIQUE,
  generated_at        TIMESTAMPTZ DEFAULT NOW(),
  reward_amount       INT NOT NULL,
  cycle               INT NOT NULL,
  winner_count        INT NOT NULL
);

-- 区块赢家记录
CREATE TABLE block_winners (
  id                  BIGSERIAL PRIMARY KEY,
  block_id            BIGINT NOT NULL,  -- 外键字段，但无数据库约束
  user_id             UUID NOT NULL,
  x                   INT NOT NULL,
  y                   INT NOT NULL,
  won_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_block_winners_user ON block_winners(user_id);
CREATE INDEX idx_block_winners_block ON block_winners(block_id);
```

### 2.3 拍卖服务 (AuctionService)

**职责：**
- 管理拍卖订单
- 处理竞价逻辑
- 执行成交结算

**数据库表：**

```sql
-- 注意：不使用外键约束 (REFERENCES)，应用层维护数据一致性
CREATE TYPE auction_status AS ENUM ('active', 'sold', 'expired', 'cancelled');

CREATE TABLE auctions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id           UUID NOT NULL,        -- 外键字段，但无数据库约束
  color_right_id      UUID NOT NULL UNIQUE, -- 外键字段，但无数据库约束
  
  starting_price      BIGINT NOT NULL,
  current_price       BIGINT NOT NULL,
  buy_now_price       BIGINT,               -- 一口价
  
  status              auction_status DEFAULT 'active',
  start_time          TIMESTAMPTZ DEFAULT NOW(),
  end_time            TIMESTAMPTZ NOT NULL,
  winner_id           UUID,
  
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ
);

CREATE INDEX idx_auctions_status ON auctions(status);
CREATE INDEX idx_auctions_end_time ON auctions(end_time);
CREATE INDEX idx_auctions_seller ON auctions(seller_id);

-- 竞价记录
CREATE TABLE bids (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id          UUID NOT NULL,  -- 外键字段，但无数据库约束
  bidder_id           UUID NOT NULL,  -- 外键字段，但无数据库约束
  amount              BIGINT NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bids_auction ON bids(auction_id);
CREATE INDEX idx_bids_bidder ON bids(bidder_id);
```

**API 接口：**

```typescript
// 创建拍卖
POST /api/v1/auctions
Body: {
  colorRightId: number,
  type: 'fixed_price' | 'bid',
  price: number,           // 固定价或起拍价
  buyNowPrice?: number,    // 一口价（可选）
  durationHours: number,   // 拍卖时长
  minBidIncrement?: number // 最小加价幅度（竞价类型）
}

// 出价
POST /api/v1/auctions/:id/bid
Body: {
  amount: number
}

// 立即购买（固定价或达到一口价）
POST /api/v1/auctions/:id/buy-now

// 取消拍卖（仅自己的、无出价的）
DELETE /api/v1/auctions/:id

// 查询拍卖列表
GET /api/v1/auctions?zone=1&status=active&sortBy=price&order=asc
```

### 2.4 WebSocket 服务

**职责：**
- 维护客户端长连接
- 实时推送画布变化
- 广播区块生成事件
- 心跳检测

**消息类型：**

```typescript
// 服务端 → 客户端

interface TileColoredMessage {
  type: 'tile_colored';
  payload: {
    x: number;
    y: number;
    color: number;
    timestamp: number;
  };
}

interface BlockGeneratedMessage {
  type: 'block_generated';
  payload: {
    blockNumber: number;
    rewardAmount: number;
    winners: Array<{ userId: string; x: number; y: number }>;
    timestamp: number;
  };
}

interface YouWonMessage {
  type: 'you_won';
  payload: {
    blockNumber: number;
    x: number;
    y: number;
    zone: number;
  };
}

interface AuctionBidMessage {
  type: 'auction_bid';
  payload: {
    auctionId: string;
    currentBid: number;
    currentBidder: string;
    isOutbid: boolean;  // 是否被超越
  };
}

// 客户端 → 服务端

interface ColorTileCommand {
  type: 'color_tile';
  payload: {
    x: number;
    y: number;
    color: number;
    nonce: string;  // 防重放
  };
}

interface SubscribeZoneCommand {
  type: 'subscribe_zone';
  payload: {
    zone: number;
  };
}
```

**连接管理：**

```typescript
class WebSocketService {
  private clients: Map<string, WebSocket> = new Map();
  private userConnections: Map<string, Set<string>> = new Map(); // userId -> connectionIds

  async handleConnection(ws: WebSocket, user: User) {
    const connectionId = generateId();
    this.clients.set(connectionId, ws);
    
    if (!this.userConnections.has(user.id)) {
      this.userConnections.set(user.id, new Set());
    }
    this.userConnections.get(user.id)!.add(connectionId);
    
    ws.on('close', () => this.handleDisconnect(connectionId, user.id));
    ws.on('message', (data) => this.handleMessage(ws, data));
    
    // 心跳
    const heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
    
    ws.on('close', () => clearInterval(heartbeat));
  }

  // 广播给所有订阅了某矿区的用户
  broadcastToZone(zone: number, message: any) {
    // 实现略
  }

  // 发送给特定用户
  sendToUser(userId: string, message: any) {
    const connectionIds = this.userConnections.get(userId);
    if (!connectionIds) return;
    
    connectionIds.forEach(connId => {
      const ws = this.clients.get(connId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }
}
```

---

## 3. 前端架构 (Flutter 跨平台)

### 3.1 技术选型

**为什么选择 Flutter？**
- ✅ 一套代码编译 Web、iOS、Android 三端
- ✅ Skia 引擎原生渲染，60fps 稳定性能
- ✅ 三端 UI/UX 像素级一致
- ✅ 热重载开发效率高
- ✅ 2026 年生态成熟，Web 性能大幅提升

```
Flutter 3.x + Dart
├── 状态管理：Riverpod 2.x
├── 路由：go_router
├── Canvas 渲染：CustomPainter + Skia
├── UI 组件：Material 3 + 自定义主题
├── WebSocket：web_socket_channel
├── HTTP 客户端：dio
├── 本地存储：hive (画布缓存) + flutter_secure_storage
├── 代码生成：freezed + json_serializable
└── 构建工具：flutter build (web/ios/android)
```

**pubspec.yaml 核心依赖：**
```yaml
name: bitcoinplace
description: BitcoinPlace - Collaborative Canvas Game
version: 1.0.0+1

environment:
  sdk: '>=3.2.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter

  # 状态管理
  flutter_riverpod: ^2.4.0
  riverpod_annotation: ^2.3.0

  # 网络
  dio: ^5.3.0
  web_socket_channel: ^2.4.0

  # 本地存储
  hive: ^2.2.3
  hive_flutter: ^1.1.0
  flutter_secure_storage: ^9.0.0

  # 路由
  go_router: ^12.0.0

  # 动画
  flutter_animate: ^4.3.0

  # 工具
  freezed_annotation: ^2.4.0
  json_annotation: ^4.8.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  build_runner: ^2.4.0
  freezed: ^2.4.0
  json_serializable: ^6.7.0
  riverpod_generator: ^2.3.0
```

### 3.2 项目结构

```
bitcoinplace/
├── lib/
│   ├── main.dart                    # 应用入口
│   ├── core/
│   │   ├── config/
│   │   │   ├── app_config.dart      # 应用配置 (API 地址等)
│   │   │   ├── season_config.dart   # 赛季配置 (60 天周期)
│   │   │   └── theme_config.dart    # 主题配置
│   │   ├── constants/
│   │   │   ├── colors.dart          # 16 色调色板
│   │   │   ├── dimensions.dart      # 尺寸常量
│   │   │   └── api_endpoints.dart   # API 端点
│   │   └── utils/
│   │       ├── extensions.dart      # Dart 扩展
│   │       ├── validators.dart      # 表单验证
│   │       └── formatters.dart      # 格式化工具
│   │
│   ├── data/
│   │   ├── models/                  # 数据模型
│   │   │   ├── user.dart
│   │   │   ├── color_right.dart
│   │   │   ├── auction.dart
│   │   │   ├── block.dart
│   │   │   └── transaction.dart
│   │   ├── repositories/            # 数据仓库
│   │   │   ├── auth_repository.dart
│   │   │   ├── canvas_repository.dart
│   │   │   ├── auction_repository.dart
│   │   │   └── wallet_repository.dart
│   │   └── services/                # API 服务
│   │       ├── api_client.dart      # Dio 封装
│   │       ├── websocket_service.dart
│   │       ├── auth_service.dart
│   │       ├── canvas_service.dart
│   │       ├── auction_service.dart
│   │       └── wallet_service.dart
│   │
│   ├── domain/
│   │   ├── entities/                # 领域模型
│   │   │   ├── user_entity.dart
│   │   │   ├── color_right_entity.dart
│   │   │   └── auction_entity.dart
│   │   └── use_cases/               # 业务逻辑
│   │       ├── auth/
│   │       ├── canvas/
│   │       ├── auction/
│   │       └── wallet/
│   │
│   ├── presentation/
│   │   ├── providers/               # Riverpod 状态管理
│   │   │   ├── auth_provider.dart
│   │   │   ├── canvas_provider.dart
│   │   │   ├── auction_provider.dart
│   │   │   └── wallet_provider.dart
│   │   │
│   │   ├── screens/                 # 页面
│   │   │   ├── splash/              # 启动页
│   │   │   │   └── splash_screen.dart
│   │   │   ├── auth/                # 认证
│   │   │   │   ├── login_screen.dart
│   │   │   │   └── register_screen.dart
│   │   │   ├── home/                # 首页 (画布)
│   │   │   │   ├── home_screen.dart
│   │   │   │   └── canvas_screen.dart
│   │   │   ├── auction/             # 拍卖行
│   │   │   │   ├── auction_list_screen.dart
│   │   │   │   ├── auction_detail_screen.dart
│   │   │   │   └── create_auction_screen.dart
│   │   │   ├── wallet/              # 钱包
│   │   │   │   ├── wallet_screen.dart
│   │   │   │   └── transaction_history_screen.dart
│   │   │   ├── inventory/           # 库存 (染色权)
│   │   │   │   └── inventory_screen.dart
│   │   │   └── profile/             # 个人中心
│   │   │       ├── profile_screen.dart
│   │   │       └── settings_screen.dart
│   │   │
│   │   └── widgets/                 # 可复用组件
│   │       ├── canvas/
│   │       │   ├── bitcoin_place_canvas.dart    # 主画布组件
│   │       │   ├── canvas_painter.dart          # CustomPainter
│   │       │   ├── tile_preview.dart            # 坐标预览
│   │       │   ├── zoom_controls.dart           # 缩放控制
│   │       │   ├── palette_widget.dart          # 调色板
│   │       │   └── zone_indicator.dart          # 矿区指示器
│   │       ├── auction/
│   │       │   ├── auction_card.dart
│   │       │   ├── bid_panel.dart
│   │       │   └── price_display.dart
│   │       ├── common/
│   │       │   ├── app_bar.dart
│   │       │   ├── loading_overlay.dart
│   │       │   ├── error_widget.dart
│   │       │   └── empty_state.dart
│   │       └── wallet/
│   │           ├── balance_card.dart
│   │           └── transaction_tile.dart
│   │
│   └── platform/                      # 平台特定代码
│       ├── web/
│       │   └── web_config.dart        # Web 优化配置
│       ├── mobile/
│       │   └── mobile_config.dart     # 移动端优化
│       └── desktop/
│           └── desktop_config.dart    # 桌面端 (可选)
│
├── assets/
│   ├── images/                        # 图片资源
│   ├── fonts/                         # 字体
│   └── icons/                         # 图标
│
├── test/                              # 单元测试
├── integration_test/                  # 集成测试
└── pubspec.yaml
```

### 3.3 画布渲染核心实现

**CustomPainter 渲染 7000×3000 画布：**

```dart
import 'package:flutter/material.dart';
import '../core/constants/colors.dart';

/// 画布数据模型
class TileData {
  final int x;
  final int y;
  final int? colorIndex;  // null = 透明
  
  const TileData({
    required this.x,
    required this.y,
    this.colorIndex,
  });
}

/// 画布 CustomPainter
class CanvasPainter extends CustomPainter {
  final Map<Point, int> tiles;  // 坐标 → 颜色索引
  final double zoomLevel;
  final Rect visibleRegion;
  
  CanvasPainter({
    required this.tiles,
    required this.zoomLevel,
    required this.visibleRegion,
  });
  
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint();
    final tileSize = zoomLevel;
    
    // 只渲染可见区域
    final startX = (visibleRegion.left / tileSize).floor();
    final startY = (visibleRegion.top / tileSize).floor();
    final endX = ((visibleRegion.right) / tileSize).ceil();
    final endY = ((visibleRegion.bottom) / tileSize).ceil();
    
    for (int x = startX; x < endX; x++) {
      for (int y = startY; y < endY; y++) {
        final point = Point(x, y);
        final colorIndex = tiles[point];
        
        if (colorIndex == null) continue;  // 透明
        
        paint.color = AppColors.palette[colorIndex];
        canvas.drawRect(
          Rect.fromLTWH(
            x * tileSize,
            y * tileSize,
            tileSize,
            tileSize,
          ),
          paint,
        );
      }
    }
  }
  
  @override
  bool shouldRepaint(CanvasPainter old) {
    return old.zoomLevel != zoomLevel || 
           old.visibleRegion != visibleRegion ||
           old.tiles.length != tiles.length;
  }
}

/// 画布组件 (支持缩放、平移)
class BitcoinPlaceCanvas extends ConsumerStatefulWidget {
  const BitcoinPlaceCanvas({Key? key}) : super(key: key);

  @override
  ConsumerState<BitcoinPlaceCanvas> createState() => _BitcoinPlaceCanvasState();
}

class _BitcoinPlaceCanvasState extends ConsumerState<BitcoinPlaceCanvas> {
  double _zoomLevel = 4.0;  // 4x 查看 / 40x 染色
  Offset _offset = Offset.zero;
  bool _isPanning = false;
  Offset _lastPanPosition = Offset.zero;
  
  // 画布尺寸
  static const double canvasWidth = 7000.0;
  static const double canvasHeight = 3000.0;
  
  @override
  Widget build(BuildContext context) {
    final canvasState = ref.watch(canvasProvider);
    final tiles = canvasState.tiles;
    
    return GestureDetector(
      // 缩放手势
      onScaleUpdate: _handleScaleUpdate,
      // 拖拽手势
      onPanStart: _handlePanStart,
      onPanUpdate: _handlePanUpdate,
      onPanEnd: _handlePanEnd,
      // 点击染色
      onTapUp: _handleTap,
      
      child: ClipRect(
        child: Container(
          color: const Color(0xFF1a1a1a),
          child: Transform(
            transform: Matrix4.identity()
              ..translate(_offset.dx, _offset.dy)
              ..scale(_zoomLevel),
            child: RepaintBoundary(  // 性能优化：离屏渲染
              child: CustomPaint(
                size: const Size(canvasWidth, canvasHeight),
                painter: CanvasPainter(
                  tiles: tiles,
                  zoomLevel: _zoomLevel,
                  visibleRegion: _calculateVisibleRegion(),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
  
  void _handleScaleUpdate(ScaleUpdateDetails details) {
    setState(() {
      // 限制缩放范围：1x - 40x
      _zoomLevel = (_zoomLevel * details.scale).clamp(1.0, 40.0);
    });
  }
  
  void _handlePanStart(DragStartDetails details) {
    _isPanning = true;
    _lastPanPosition = details.globalPosition;
  }
  
  void _handlePanUpdate(DragUpdateDetails details) {
    if (!_isPanning) return;
    
    setState(() {
      _offset += details.globalPosition - _lastPanPosition;
      _lastPanPosition = details.globalPosition;
    });
  }
  
  void _handlePanEnd(DragEndDetails details) {
    _isPanning = false;
  }
  
  void _handleTap(TapUpDetails details) {
    // 计算点击的坐标
    final renderBox = context.findRenderObject() as RenderBox;
    final localPosition = renderBox.globalToLocal(details.globalPosition);
    
    final x = ((localPosition.dx - _offset.dx) / _zoomLevel).floor();
    final y = ((localPosition.dy - _offset.dy) / _zoomLevel).floor();
    
    if (x >= 0 && x < canvasWidth && y >= 0 && y < canvasHeight) {
      _handleTileTap(x, y);
    }
  }
  
  void _handleTileTap(int x, int y) {
    // 打开染色对话框或预览
    ref.read(canvasProvider.notifier).selectTile(x, y);
  }
  
  Rect _calculateVisibleRegion() {
    final screenSize = MediaQuery.of(context).size;
    return Rect.fromLTWH(
      -_offset.dx / _zoomLevel,
      -_offset.dy / _zoomLevel,
      screenSize.width / _zoomLevel,
      screenSize.height / _zoomLevel,
    );
  }
}
```

### 3.4 性能优化策略

**1. 分块加载 (Lazy Loading)**
```dart
class CanvasRepository {
  final CanvasService _service;
  final Box<Map<Point, int>> _cache;  // Hive 本地缓存
  
  // 只加载可见区域的瓦片
  Future<void> loadVisibleRegion(Rect region) async {
    final zone = _getZoneForRegion(region);
    final data = await _service.getRegion(
      zone: zone,
      minX: region.left.floor(),
      minY: region.top.floor(),
      maxX: region.right.ceil(),
      maxY: region.bottom.ceil(),
    );
    
    // 合并到缓存
    await _cache.put(zone, data.tiles);
  }
}
```

**2. WebSocket 增量更新**
```dart
class CanvasProvider extends StateNotifier<CanvasState> {
  final WebSocketService _ws;
  
  CanvasProvider() : super(CanvasState.initial()) {
    _ws.listen((message) {
      switch (message.type) {
        case 'tile_colored':
          _handleTileColored(message.payload);
          break;
        case 'block_generated':
          _handleBlockGenerated(message.payload);
          break;
      }
    });
  }
  
  void _handleTileColored(TileColoredPayload payload) {
    state = state.copyWith(
      tiles: {
        ...state.tiles,
        Point(payload.x, payload.y): payload.color,
      },
      version: payload.version,
    );
  }
}
```

**3. 本地缓存策略**
```dart
// Hive 存储画布快照
@HiveType(typeId: 0)
class CanvasSnapshot extends HiveObject {
  @HiveField(0)
  int version;
  
  @HiveField(1)
  Map<String, int> tiles;  // "x,y" → colorIndex
  
  @HiveField(2)
  DateTime cachedAt;
  
  bool get isStale => 
    DateTime.now().difference(cachedAt).inSeconds > 60;
}

// 启动时加载缓存
Future<CanvasSnapshot?> loadCachedCanvas() async {
  final box = await Hive.openBox<CanvasSnapshot>('canvas_cache');
  return box.get('latest');
}
```

### 3.5 三端适配策略

**Web 端优化：**
```dart
// web/web_config.dart
import 'dart:html' as html;

class WebConfig {
  static void init() {
    // 设置 CanvasKit  CDN
    html.document.querySelector('script')?.setAttribute(
      'src',
      'https://www.gstatic.com/flutter-canvaskit/0.0.0/canvaskit.js',
    );
    
    // 启用 Service Worker
    if ('serviceWorker' in html.window.navigator) {
      html.window.navigator.serviceWorker?.register('flutter_service_worker.js');
    }
  }
}
```

**移动端优化：**
```dart
// mobile/mobile_config.dart
import 'package:flutter/services.dart';

class MobileConfig {
  static void init() {
    // 隐藏状态栏
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    
    // 锁定方向
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
  }
}
```

### 3.6 构建命令

```bash
# Web 发布
flutter build web --release --web-renderer canvaskit

# iOS 发布
flutter build ios --release

# Android 发布
flutter build apk --release
# 或 App Bundle
flutter build appbundle --release

# 分析包体积
flutter build apk --analyze-size

# 性能分析
flutter run --profile
```

---

## 4. 部署架构

### 4.1 开发环境

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: bitcoinplace
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
    ports:
      - "5432:5432"
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  backend:
    build: ./src/backend
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://dev:dev@postgres/bitcoinplace
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis
  
  frontend:
    build: ./src/frontend
    ports:
      - "5173:5173"
```

### 4.2 生产环境（K8s）

```yaml
# 简化的 K8s 部署配置
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    spec:
      containers:
      - name: backend
        image: bitcoinplace/backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
spec:
  selector:
    app: backend
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

---

## 5. 监控与日志

### 5.1 关键指标

| 指标 | 告警阈值 | 说明 |
|---|---|---|
| API P99 延迟 | >500ms | 用户体验关键 |
| WebSocket 连接数 | >80% 容量 | 需扩容 |
| 数据库连接池 | >90% 使用率 | 连接泄漏风险 |
| 画布同步延迟 | >1s | 实时性下降 |
| 错误率 | >1% | 系统异常 |

### 5.2 日志收集

```
应用日志 → Fluentd → Elasticsearch → Grafana
访问日志 → Cloudflare Logs → S3 → Athena
```

---

*文档版本：1.0*  
*最后更新：2026-04-03*
