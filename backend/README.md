# BitcoinPlace Backend ⚡

Node.js + Fastify + TypeScript 后端服务

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动数据库和 Redis

```bash
docker-compose up -d
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

### 4. 生成 Prisma 客户端

```bash
npx prisma generate
```

### 5. 运行数据库迁移

```bash
npm run prisma:migrate
```

### 6. 启动开发服务器

```bash
npm run dev
```

服务器将在 http://localhost:3000 启动

---

## 📝 API 端点

### 认证

| 方法 | 路径 | 描述 |
|---|---|---|
| POST | /api/v1/auth/register | 用户注册 |
| POST | /api/v1/auth/login | 用户登录 |
| POST | /api/v1/auth/refresh | 刷新 Token |

### 用户

| 方法 | 路径 | 描述 | 认证 |
|---|---|---|---|
| GET | /api/v1/users/me | 获取当前用户信息 | ✅ |
| GET | /api/v1/users/:id | 获取指定用户信息 | ✅ |

---

## 🧪 测试

### 运行所有测试

```bash
npm test
```

### 运行测试（监听模式）

```bash
npm run test:watch
```

### 运行测试并生成覆盖率报告

```bash
npm run test:coverage
```

---

## 📁 项目结构

```
backend/
├── src/
│   ├── index.ts           # 应用入口
│   ├── services/          # 业务逻辑层
│   │   ├── UserService.ts
│   │   └── UserService.test.ts
│   ├── controllers/       # 控制器层
│   ├── routes/            # 路由定义
│   │   ├── auth.ts
│   │   └── users.ts
│   ├── middleware/        # 中间件
│   ├── db/               # 数据库配置
│   ├── utils/            # 工具函数
│   └── types/            # 类型定义
├── prisma/
│   └── schema.prisma     # 数据库 Schema
├── tests/
│   ├── integration/      # 集成测试
│   ├── e2e/             # 端到端测试
│   └── fixtures/        # 测试数据
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── docker-compose.yml
```

---

## 🛠️ 开发命令

| 命令 | 描述 |
|---|---|
| `npm run dev` | 开发模式（热重载） |
| `npm run build` | 构建生产版本 |
| `npm run start` | 启动生产服务 |
| `npm test` | 运行测试 |
| `npm run test:coverage` | 测试 + 覆盖率报告 |
| `npm run prisma:generate` | 生成 Prisma 客户端 |
| `npm run prisma:migrate` | 运行数据库迁移 |
| `npm run prisma:studio` | 打开 Prisma Studio |

---

## 📊 数据库 Schema

当前已定义的模型：

- **User** - 用户账户
- **ColorRight** - 染色权
- **Auction** - 拍卖
- **Bid** - 竞价
- **Transaction** - 交易记录

---

## 🔐 认证

使用 JWT (JSON Web Token) 进行认证。

### 获取 Token

```bash
POST /api/v1/auth/register
{
  "email": "user@example.com",
  "username": "username",
  "password": "password"
}
```

### 使用 Token

在请求头中添加：

```
Authorization: Bearer <your-token>
```

---

## 📝 开发进度

### Phase 1: 后端核心 (第 1-2 周)

#### Week 1: 项目搭建 + 用户系统 ✅

- [x] BE-1.1: 初始化 Node.js + Fastify + TypeScript 项目
- [x] BE-1.1T: 配置 Vitest 测试框架
- [x] BE-1.2: 配置 Prisma ORM + PostgreSQL
- [x] BE-1.2T: 数据库连接测试
- [x] BE-1.3: 设计并实现用户 Schema
- [x] BE-1.3T: Schema 验证测试
- [x] BE-1.4: 实现 JWT 认证插件
- [x] BE-1.4T: JWT 签发/验证测试
- [x] BE-1.5: 实现注册/登录 API
- [x] BE-1.5T: Auth API 集成测试
- [ ] BE-1.6: 配置 Redis 连接
- [ ] BE-1.7: 实现设备指纹识别逻辑
- [ ] BE-1.8: 代码覆盖率检查

---

Made with ⚡ by ZedBot
