# BitcoinPlace - 开发计划 ⚡

**文档版本：** 1.0  
**创建日期：** 2026-04-03  
**项目状态：** 设计完成，准备开发

---

## 📊 项目概览

| 属性 | 值 |
|---|---|
| **项目名称** | BitcoinPlace |
| **技术栈** | Flutter 3.x (前端) + Node.js 20 + Fastify (后端) |
| **数据库** | PostgreSQL + Redis + MongoDB |
| **货币** | 像素币 (PX) - 1 PX = 1 人民币 |
| **画布规模** | 7000×3000 = 2100 万像素 |
| **赛季周期** | 60 天 (49 天挖矿 + 7 天自由 + 4 天停滞) |
| **开发方法** | TDD (测试驱动开发) |

---

## 🧪 TDD 实践规范

### 核心工作流：Red-Green-Refactor

```
1. RED    → 先写失败的测试 (功能未实现)
2. GREEN  → 写最少代码让测试通过
3. REFACTOR → 重构代码，保持测试通过
🔁 循环往复
```

### 测试框架配置

| 层级 | 框架 | 用途 | 覆盖率目标 |
|---|---|---|---|
| **后端单元** | Vitest + Supertest | Service/Controller 测试 | >90% |
| **后端集成** | Vitest + Testcontainers | API 集成测试 | >80% |
| **前端单元** | Flutter Test | Widget/逻辑测试 | >85% |
| **前端 E2E** | integration_test | 端到端流程测试 | 关键路径 100% |
| **性能测试** | k6 | API 压力测试 | - |

### 测试文件组织

```
backend/
├── src/
│   ├── services/
│   │   ├── ColorRightService.ts
│   │   └── ColorRightService.test.ts  # 同级测试
│   └── controllers/
│       └── AuthController.ts
└── tests/
    ├── integration/        # 集成测试
    ├── e2e/               # 端到端测试
    └── fixtures/          # 测试数据

frontend/
├── lib/
│   ├── services/
│   │   ├── canvas_service.dart
│   │   └── canvas_service_test.dart  # 同级测试
│   └── widgets/
│       └── canvas_widget.dart
└── test/
    ├── unit/              # 单元测试
    ├── widget/            # Widget 测试
    └── integration/       # 集成测试
```

### 测试命名规范

**后端 (TypeScript):**
```typescript
// 文件名：ColorRightService.test.ts
describe('ColorRightService', () => {
  describe('allocate', () => {
    it('should allocate 10417 rights on day 0', async () => {});
    it('should halve output after 7 days', async () => {});
    it('should throw error if season ended', async () => {});
  });
});
```

**前端 (Dart):**
```dart
// 文件名：canvas_service_test.dart
void main() {
  group('CanvasService', () {
    test('returns correct pixel color', () {});
    test('caches canvas state locally', () {});
  });
  
  group('CanvasWidget', () {
    testWidgets('renders 21M pixels', (tester) async {});
    testWidgets('handles pinch-to-zoom', (tester) async {});
  });
}
```

### 测试覆盖率要求

| 模块类型 | 行覆盖率 | 分支覆盖率 | 关键路径 |
|---|---|---|---|
| **核心业务逻辑** | >95% | >90% | 100% |
| **API 层** | >90% | >85% | 100% |
| **工具函数** | >95% | >90% | - |
| **UI 组件** | >80% | >70% | 关键交互 |
| **整体项目** | >85% | >80% | - |

### CI/CD 集成

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Backend Test
        run: npm run test:coverage
      - name: Frontend Test
        run: flutter test --coverage
      - name: Coverage Check
        run: |
          # 检查覆盖率是否达标
          ./scripts/check-coverage.sh
```

### 关键模块 TDD 优先级

| 优先级 | 模块 | 测试类型 | 说明 |
|---|---|---|---|
| **P0** | 减半算法 | 单元测试 | 核心经济逻辑，必须 100% 准确 |
| **P0** | 染色权分配 | 单元测试 + 集成 | 涉及用户资产，需严格测试 |
| **P0** | 拍卖行竞价 | 单元测试 + 集成 | 资金安全关键 |
| **P0** | JWT 认证 | 单元测试 + 集成 | 安全关键 |
| **P1** | WebSocket 同步 | 集成测试 | 实时性要求高 |
| **P1** | 画布渲染 | Widget 测试 | 核心用户体验 |
| **P2** | UI 组件 | Widget 测试 | 视觉为主，E2E 补充 |

---

## 🗓️ 开发阶段总览

```
第 1-2 周    第 3-4 周    第 5-6 周    第 7-8 周    第 9-10 周
│─────────│─────────│─────────│─────────│─────────│
│  Phase 1  │  Phase 2  │  Phase 3  │  Phase 4  │  Phase 5  │
│  后端核心  │  前端核心  │  经济系统  │  测试优化  │  上线准备  │
│  MVP      │  MVP      │  完整功能  │  压力测试  │  正式发布  │
└─────────┴─────────┴─────────┴─────────┴─────────┘
                     总计：10 周 (约 2.5 个月)
```

---

## 📦 Phase 1: 后端核心 (第 1-2 周)

### 目标
搭建后端基础架构，实现用户系统、画布服务、基础染色功能

### 任务分解

#### Week 1: 项目搭建 + 用户系统

| 任务 ID | 任务描述 | 优先级 | 预估工时 | 状态 |
|---|---|---|---|---|
| BE-1.1 | 初始化 Node.js + Fastify + TypeScript 项目 | P0 | 4h | ✅ |
| BE-1.1T | 配置 Vitest 测试框架 + 编写 Hello World 测试 | P0 | 2h | ✅ |
| BE-1.2 | 配置 Prisma ORM + PostgreSQL 连接 | P0 | 4h | ✅ |
| BE-1.2T | 编写数据库连接测试 (Testcontainers) | P0 | 2h | ✅ |
| BE-1.3 | 设计并实现用户 Schema (User 表) | P0 | 4h | ✅ |
| BE-1.3T | 编写 User Schema 验证测试 | P0 | 2h | ✅ |
| BE-1.4 | 实现 JWT 认证插件 | P0 | 4h | ✅ |
| BE-1.4T | 编写 JWT 签发/验证测试 (边界条件) | P0 | 4h | ✅ |
| BE-1.5 | 实现注册/登录/刷新 Token API | P0 | 8h | ✅ |
| BE-1.5T | 编写 Auth API 集成测试 (Supertest) | P0 | 4h | ✅ |
| BE-1.6 | 配置 Redis 连接 | P0 | 2h | ✅ |
| BE-1.6T | 编写 Redis 连接测试 | P0 | 1h | ✅ |
| BE-1.7 | 实现设备指纹识别逻辑 | P1 | 8h | ✅ |
| BE-1.7T | 编写设备指纹生成/验证测试 | P1 | 4h | ✅ |
| BE-1.8 | 代码覆盖率检查 + 修复未覆盖分支 | P0 | 4h | ⬜ |

**Week 1 交付物：**
- ✅ 可运行的 Fastify 服务
- ✅ 用户注册/登录 API
- ✅ JWT 认证中间件
- ✅ 数据库 Schema v1

---

#### Week 2: 画布服务 + 染色功能

| 任务 ID | 任务描述 | 优先级 | 预估工时 | 状态 |
|---|---|---|---|---|
| BE-2.1 | 设计染色权 Schema (ColorRight 表) | P0 | 4h | ✅ |
| BE-2.1T | 编写 ColorRight Schema 验证测试 | P0 | 2h | ✅ |
| BE-2.2 | 实现 Redis bitfield 存储画布状态 | P0 | 8h | ✅ |
| BE-2.2T | 编写 bitfield 读写测试 (边界/并发) | P0 | 4h | ✅ |
| BE-2.3 | 实现画布查询 API (全量/区域/单点) | P0 | 8h | ✅ |
| BE-2.3T | 编写画布查询 API 测试 (缓存命中/未命中) | P0 | 4h | ✅ |
| BE-2.4 | 实现染色 API (验证 + 执行 + 广播) | P0 | 8h | ✅ |
| BE-2.4T | 编写染色 API 测试 (权限/并发/回滚) | P0 | 6h | ✅ |
| BE-2.5 | 实现 WebSocket 服务 (实时同步) | P0 | 12h | ✅ |
| BE-2.5T | 编写 WebSocket 连接/断线重连测试 | P0 | 4h | ✅ |
| BE-2.6 | 实现基础产出逻辑 (固定速率) | P0 | 8h | ✅ |
| BE-2.6T | 编写产出逻辑测试 (时间边界/并发) | P0 | 4h | ✅ |
| BE-2.7 | 端到端集成测试 (注册→产出→染色) | P0 | 8h | ⬜ |
| BE-2.8 | 代码覆盖率检查 + 修复未覆盖分支 | P0 | 4h | ⬜ |

**Week 2 交付物：**
- ✅ 画布状态存储 (Redis)
- ✅ 染色 API + WebSocket 实时同步
- ✅ 基础产出逻辑
- ✅ 集成测试套件

---

### Phase 1 验收标准

- [ ] 用户可以注册/登录
- [ ] 用户可以在线获得染色权
- [ ] 用户可以对画布染色
- [ ] 染色操作实时同步给所有在线用户
- [ ] API 响应时间 < 200ms
- [ ] WebSocket 延迟 < 100ms

---

## 📦 Phase 2: 前端核心 (第 3-4 周)

### 目标
搭建 Flutter 前端，实现画布渲染、染色交互、用户界面

### 任务分解

#### Week 3: 项目搭建 + 画布渲染

| 任务 ID | 任务描述 | 优先级 | 预估工时 | 状态 |
|---|---|---|---|---|
| FE-3.1 | 初始化 Flutter 项目 + 配置依赖 | P0 | 4h | ⬜ |
| FE-3.1T | 配置 flutter_test + 编写 Hello World 测试 | P0 | 2h | ⬜ |
| FE-3.2 | 配置 Riverpod 状态管理 | P0 | 4h | ⬜ |
| FE-3.2T | 编写 Provider 状态管理测试 | P0 | 2h | ⬜ |
| FE-3.3 | 配置 go_router 路由系统 | P0 | 4h | ⬜ |
| FE-3.3T | 编写路由跳转测试 | P0 | 2h | ⬜ |
| FE-3.4 | 实现登录/注册页面 | P0 | 8h | ⬜ |
| FE-3.4T | 编写登录/注册页面 Widget 测试 | P0 | 4h | ⬜ |
| FE-3.5 | 实现 CustomPainter 画布渲染 | P0 | 16h | ⬜ |
| FE-3.5T | 编写画布渲染测试 (像素正确性) | P0 | 8h | ⬜ |
| FE-3.6 | 实现画布缩放/平移交互 | P0 | 12h | ⬜ |
| FE-3.6T | 编写手势交互测试 (缩放/平移边界) | P0 | 4h | ⬜ |
| FE-3.7 | 实现 WebSocket 连接 + 实时同步 | P0 | 8h | ⬜ |
| FE-3.7T | 编写 WebSocket 连接/重连测试 | P0 | 4h | ⬜ |
| FE-3.8 | Hive 本地缓存配置 | P1 | 4h | ⬜ |
| FE-3.8T | 编写本地缓存读写测试 | P1 | 2h | ⬜ |

**Week 3 交付物：**
- ✅ Flutter 项目可运行
- ✅ 画布渲染 (7000×3000)
- ✅ 缩放/平移交互
- ✅ 实时染色同步

---

#### Week 4: 染色交互 + 用户界面

| 任务 ID | 任务描述 | 优先级 | 预估工时 | 状态 |
|---|---|---|---|---|
| FE-4.1 | 实现 16 色调色板 UI | P0 | 4h | ⬜ |
| FE-4.2 | 实现染色操作 (点击/长按) | P0 | 8h | ⬜ |
| FE-4.2T | 编写染色交互测试 (手势/反馈) | P0 | 4h | ⬜ |
| FE-4.3 | 实现染色权验证提示 | P0 | 4h | ⬜ |
| FE-4.4 | 实现用户个人资料页 | P0 | 8h | ⬜ |
| FE-4.3T | 编写权限验证提示测试 | P0 | 2h | ⬜ |
| FE-4.5 | 实现我的染色权列表 | P0 | 8h | ⬜ |
| FE-4.6 | 实现矿区边界可视化 | P1 | 8h | ⬜ |
| FE-4.4T | 编写个人页 Widget 测试 | P0 | 4h | ⬜ |
| FE-4.7 | 实现新手引导流程 | P1 | 8h | ⬜ |
| FE-4.8 | Web/iOS/Android三端适配测试 | P0 | 8h | ⬜ |
| FE-4.5T | 编写染色权列表测试 (加载/空状态) | P0 | 4h | ⬜ |

**Week 4 交付物：**
| FE-4.6T | 编写矿区边界渲染测试 | P1 | 4h | ⬜ |
- ✅ 完整染色交互流程
- ✅ 用户界面 (个人主页、染色权列表)
| FE-4.7T | 编写新手引导流程测试 | P1 | 4h | ⬜ |
- ✅ 三端可运行 (Web/iOS/Android)

| FE-4.8T | 编写三端 E2E 测试 (关键路径) | P0 | 8h | ⬜ |
---

### Phase 2 验收标准

- [ ] 画布渲染帧率 > 30fps
- [ ] 缩放/平移流畅无卡顿
- [ ] 染色操作响应 < 500ms
- [ ] Web/iOS/Android 三端功能一致
- [ ] 新手引导完整

---

## 📦 Phase 3: 经济系统 (第 5-6 周)

### 目标
实现完整的比特币经济模型：减半机制、拍卖行、钱包系统

### 任务分解

#### Week 5: 经济系统后端

| 任务 ID | 任务描述 | 优先级 | 预估工时 | 状态 |
|---|---|---|---|---|
| BE-5.1 | 实现赛季配置系统 | P0 | 4h | ⬜ |
| BE-5.1T | 编写赛季配置验证测试 | P0 | 2h | ⬜ |
| BE-5.2 | 实现减半周期计算逻辑 | P0 | 8h | ⬜ |
| BE-5.2T | 编写减半周期计算测试 (边界/溢出) | P0 | 6h | ⬜ |
| BE-5.3 | 实现随机分配算法 (在线用户权重) | P0 | 12h | ⬜ |
| BE-5.3T | 编写随机分配算法测试 (公平性/权重) | P0 | 8h | ⬜ |
| BE-5.4 | 实现 BullMQ 任务队列 (区块生成) | P0 | 8h | ⬜ |
| BE-5.4T | 编写 BullMQ 队列测试 (重试/失败处理) | P0 | 4h | ⬜ |
| BE-5.5 | 实现钱包系统 (余额/交易记录) | P0 | 8h | ⬜ |
| BE-5.5T | 编写钱包系统测试 (余额/转账/并发) | P0 | 6h | ⬜ |
| BE-5.6 | 实现充值/提现 API | P2 | 8h | ⬜ |
| BE-5.6T | 编写充值/提现 API 测试 (回调/对账) | P2 | 4h | ⬜ |
| BE-5.7 | 实现通知系统 (站内信 + 邮件) | P0 | 8h | ⬜ |
| BE-5.7T | 编写通知系统测试 (邮件/站内信) | P0 | 4h | ⬜ |
| BE-5.8 | 代码覆盖率检查 + 经济逻辑审计 | P0 | 4h | ⬜ |

**Week 5 交付物：**
- ✅ 减半机制运行
- ✅ 染色权随机分配
- ✅ 钱包系统
- ✅ 通知系统

---

#### Week 6: 拍卖行系统

| 任务 ID | 任务描述 | 优先级 | 预估工时 | 状态 |
|---|---|---|---|---|
| BE-6.1 | 设计拍卖 Schema (Auction/Bid 表) | P0 | 4h | ⬜ |
| BE-6.2 | 实现挂单 API | P0 | 8h | ⬜ |
| BE-6.3 | 实现竞价 API | P0 | 8h | ⬜ |
| BE-6.1T | 编写拍卖 Schema 验证测试 | P0 | 2h | ⬜ |
| BE-6.4 | 实现一口价购买 API | P0 | 4h | ⬜ |
| BE-6.2T | 编写挂单 API 测试 (验证/锁仓) | P0 | 4h | ⬜ |
| BE-6.5 | 实现拍卖行查询/筛选 API | P0 | 8h | ⬜ |
| BE-6.3T | 编写竞价 API 测试 (出价/超时/失败) | P0 | 6h | ⬜ |
| BE-6.6 | 实现拍卖到期自动成交 | P0 | 8h | ⬜ |
| BE-6.4T | 编写一口价购买测试 (并发/原子性) | P0 | 4h | ⬜ |
| BE-6.7 | 实现交易手续费逻辑 | P0 | 4h | ⬜ |
| BE-6.5T | 编写拍卖行查询测试 (筛选/排序/分页) | P0 | 4h | ⬜ |
| FE-6.1 | 实现拍卖行 UI (列表/详情/筛选) | P0 | 16h | ⬜ |
| BE-6.6T | 编写拍卖到期成交测试 (定时任务) | P0 | 4h | ⬜ |
| FE-6.2 | 实现挂单/竞价 UI | P0 | 8h | ⬜ |
| BE-6.7T | 编写交易手续费测试 (计算/分成) | P0 | 2h | ⬜ |

| FE-6.1T | 编写拍卖行 UI 测试 (列表/筛选/详情) | P0 | 8h | ⬜ |
**Week 6 交付物：**
| FE-6.2T | 编写挂单/竞价 UI 测试 (表单/验证) | P0 | 4h | ⬜ |
- ✅ 完整拍卖行系统
| BE-6.8 | 经济系统端到端测试 (完整交易流程) | P0 | 8h | ⬜ |
- ✅ 前端拍卖行 UI
- ✅ 经济系统闭环

---

### Phase 3 验收标准

- [ ] 减半机制准确运行 (7 天周期)
- [ ] 染色权随机分配公平
- [ ] 拍卖行交易流畅
- [ ] 钱包余额准确
- [ ] 通知及时送达

---

## 📦 Phase 4: 测试优化 (第 7-8 周)

### 目标
压力测试、性能优化、安全加固、Bug 修复

### 任务分解

#### Week 7: 压力测试 + 性能优化

| 任务 ID | 任务描述 | 优先级 | 预估工时 | 状态 |
|---|---|---|---|---|
| QA-7.1 | 编写压力测试脚本 (10 万并发) | P0 | 8h | ⬜ |
| QA-7.2 | 执行 API 压力测试 | P0 | 8h | ⬜ |
| QA-7.3 | 执行 WebSocket 压力测试 | P0 | 8h | ⬜ |
| QA-7.4 | 数据库查询优化 (索引/缓存) | P0 | 12h | ⬜ |
| QA-7.5 | CDN 缓存配置 + 测试 | P0 | 4h | ⬜ |
| QA-7.6 | 前端性能优化 (帧率/内存) | P0 | 12h | ⬜ |
| QA-7.7 | 修复性能瓶颈 | P0 | 16h | ⬜ |

**Week 7 交付物：**
- ✅ 压力测试报告
- ✅ 性能优化完成
- ✅ CDN 缓存生效

---

#### Week 8: 安全加固 + Bug 修复

| 任务 ID | 任务描述 | 优先级 | 预估工时 | 状态 |
|---|---|---|---|---|
| SEC-8.1 | SQL 注入防护审计 | P0 | 4h | ⬜ |
| SEC-8.2 | XSS 防护审计 | P0 | 4h | ⬜ |
| SEC-8.3 | 防刷奖机制 (设备指纹/IP 限制) | P0 | 8h | ⬜ |
| SEC-8.4 | 速率限制配置 | P0 | 4h | ⬜ |
| SEC-8.5 | 敏感操作日志审计 | P0 | 4h | ⬜ |
| BUG-8.1 | 修复 P0 级 Bug | P0 | 16h | ⬜ |
| BUG-8.2 | 修复 P1 级 Bug | P1 | 16h | ⬜ |
| DOC-8.1 | 编写部署文档 | P0 | 8h | ⬜ |
| DOC-8.2 | 编写 API 文档 | P0 | 8h | ⬜ |

**Week 8 交付物：**
- ✅ 安全审计报告
- ✅ Bug 修复完成
- ✅ 部署文档
- ✅ API 文档

---

### Phase 4 验收标准

- [ ] 支持 10 万并发在线
- [ ] API 响应时间 < 200ms (P95)
- [ ] WebSocket 延迟 < 100ms (P95)
- [ ] 画布加载时间 < 2 秒
- [ ] 无 P0 级安全漏洞
- [ ] 无 P0 级 Bug

---

## 📦 Phase 5: 上线准备 (第 9-10 周)

### 目标
生产环境部署、灰度测试、正式上线

### 任务分解

#### Week 9: 生产部署 + 灰度测试

| 任务 ID | 任务描述 | 优先级 | 预估工时 | 状态 |
|---|---|---|---|---|
| OPS-9.1 | 生产环境服务器配置 | P0 | 8h | ⬜ |
| OPS-9.2 | Docker 容器化部署 | P0 | 8h | ⬜ |
| OPS-9.3 | Kubernetes 集群配置 | P1 | 12h | ⬜ |
| OPS-9.4 | 数据库主从复制配置 | P0 | 4h | ⬜ |
| OPS-9.5 | Redis 集群配置 | P0 | 4h | ⬜ |
| OPS-9.6 | CDN 配置 (Cloudflare) | P0 | 4h | ⬜ |
| OPS-9.7 | 监控系统配置 (Prometheus+Grafana) | P0 | 8h | ⬜ |
| OPS-9.8 | 告警系统配置 | P0 | 4h | ⬜ |
| QA-9.1 | 灰度测试 (100 用户) | P0 | 16h | ⬜ |
| QA-9.2 | 收集反馈 + 修复问题 | P0 | 16h | ⬜ |

**Week 9 交付物：**
- ✅ 生产环境就绪
- ✅ 监控系统运行
- ✅ 灰度测试完成

---

#### Week 10: 正式上线 + 运营准备

| 任务 ID | 任务描述 | 优先级 | 预估工时 | 状态 |
|---|---|---|---|---|
| OPS-10.1 | 正式上线 (开放注册) | P0 | 4h | ⬜ |
| MKT-10.1 | 准备运营活动 (创世狂欢周) | P0 | 8h | ⬜ |
| MKT-10.2 | 准备新手引导内容 | P0 | 4h | ⬜ |
| SUP-10.1 | 客服培训 + 问题响应流程 | P0 | 4h | ⬜ |
| MON-10.1 | 24 小时监控值班 | P0 | 40h | ⬜ |
| FIX-10.1 | 快速响应线上问题 | P0 | - | ⬜ |

**Week 10 交付物：**
- ✅ 正式上线
- ✅ 运营活动开启
- ✅ 客服体系就绪

---

### Phase 5 验收标准

- [ ] 生产环境稳定运行
- [ ] 监控系统正常告警
- [ ] 灰度测试无重大问题
- [ ] 正式上线成功
- [ ] 用户反馈积极

---

## 📋 人员配置建议

| 角色 | 人数 | 职责 |
|---|---|---|
| **后端开发** | 2 人 | Node.js/Fastify、数据库、WebSocket |
| **前端开发** | 2 人 | Flutter、UI/UX、三端适配 |
| **测试工程师** | 1 人 | 测试用例、压力测试、质量保障 |
| **运维工程师** | 1 人 | 部署、监控、安全 |
| **产品经理** | 1 人 | 需求管理、运营活动 |
| **UI 设计师** | 1 人 (兼职) | 界面设计、视觉优化 |

**最小团队：** 4 人 (1 后端 + 1 前端 + 1 测试 + 1 产品兼运维)

---

## ⚠️ 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|---|---|---|---|
| 技术风险：Flutter Web 性能不足 | 中 | 高 | 提前测试，必要时降级为 CanvasKit |
| 技术风险：WebSocket 并发压力 | 中 | 高 | 水平扩展、消息队列、限流 |
| 人员风险：关键人员离职 | 低 | 高 | 文档完善、代码审查、知识共享 |
| 时间风险：开发延期 | 中 | 中 | 优先级管理、MVP 先行、灵活调整 |
| 安全风险：DDoS 攻击 | 中 | 高 | CDN 防护、限流、多活部署 |
| 运营风险：冷启动困难 | 高 | 中 | 预热活动、KOL 合作、早期用户激励 |

---

## 📊 成功指标 (KPI)

### MVP 阶段 (第 4 周)

- [ ] 日活跃用户 (DAU) > 100
- [ ] 染色操作 > 1000 次/天
- [ ] 用户留存率 (7 日) > 30%

### Alpha 阶段 (第 6 周)

- [ ] DAU > 1000
- [ ] 拍卖行交易量 > 100 笔/天
- [ ] 用户留存率 (7 日) > 40%

### Beta 阶段 (第 8 周)

- [ ] DAU > 5000
- [ ] 赛季参与度 > 60%
- [ ] 用户留存率 (7 日) > 50%

### Launch 阶段 (第 10 周)

- [ ] DAU > 10000
- [ ] 赛季完成率 > 80%
- [ ] 用户留存率 (7 日) > 60%
- [ ] 收入 > ¥10,000/赛季

---

## 🔧 CI/CD 配置示例

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [master, develop]
  pull_request:
    branches: [master]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      - run: npm ci
        working-directory: ./backend
      - run: npm run test:coverage
        working-directory: ./backend
      - name: Check Coverage
        run: |
          coverage=$(cat backend/coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$coverage < 85" | bc -l) )); then
            echo "❌ Coverage $coverage% is below 85%"
            exit 1
          fi
          echo "✅ Coverage $coverage%"

  frontend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.x'
          cache: true
      - run: flutter pub get
        working-directory: ./frontend
      - run: flutter test --coverage
        working-directory: ./frontend
      - name: Check Coverage
        run: |
          coverage=$(genhtml frontend/coverage/lcov.info -o coverage_report 2>&1 | grep "lines......" | awk '{print $2}' | tr -d '%')
          if (( $(echo "$coverage < 80" | bc -l) )); then
            echo "❌ Coverage $coverage% is below 80%"
            exit 1
          fi
          echo "✅ Coverage $coverage%"

  e2e-test:
    runs-on: ubuntu-latest
    needs: [backend-test, frontend-test]
    steps:
      - uses: actions/checkout@v3
      - name: Run E2E Tests
        run: |
          # Start backend
          docker-compose up -d
          # Run E2E tests
          npm run test:e2e
        env:
          E2E_BASE_URL: http://localhost:3000

  deploy-staging:
    runs-on: ubuntu-latest
    needs: [backend-test, frontend-test, e2e-test]
    if: github.ref == 'refs/heads/develop'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Staging
        run: |
          # Deploy to staging environment
          echo "Deploying to staging..."

  deploy-production:
    runs-on: ubuntu-latest
    needs: [backend-test, frontend-test, e2e-test]
    if: github.ref == 'refs/heads/master'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Production
        run: |
          # Deploy to production environment
          echo "Deploying to production..."
```

---

## ✅ TDD 检查清单

### 每个任务完成前必须确认

- [ ] 测试用例已编写 (先于实现代码)
- [ ] 所有测试通过 (绿色)
- [ ] 代码已重构 (无重复、命名清晰)
- [ ] 测试覆盖率达标 (>85% 后端，>80% 前端)
- [ ] 边界条件已测试 (空值、最大值、并发)
- [ ] 错误处理已测试 (异常、超时、失败)
- [ ] 集成测试已更新 (如影响其他模块)

### 代码审查检查项

- [ ] 测试文件与实现文件同级放置
- [ ] 测试命名清晰描述场景 (it should... when...)
- [ ] 测试独立运行 (无依赖顺序)
- [ ] 测试数据使用 fixtures/factories
- [ ] 无硬编码测试数据 (使用动态生成)
- [ ] 慢测试已标记 (skip/slow)
- [ ] Mock 使用合理 (不过度 mock)

### 提交前检查

```bash
# 后端
npm run test           # 运行所有测试
npm run test:coverage  # 生成覆盖率报告
npm run lint           # 代码风格检查

# 前端
flutter test           # 运行所有测试
flutter test --coverage  # 生成覆盖率报告
flutter analyze        # 代码分析
```

---

## 🎯 下一步行动

### 立即开始 (Week 1) - TDD 流程

1. [ ] 确认团队成员分工
2. [ ] 搭建开发环境
3. [ ] 初始化后端项目 (BE-1.1)
4. [ ] 配置 Vitest 测试框架 (BE-1.1T)
5. [ ] 设计数据库 Schema (BE-1.3)
6. [ ] 编写 Schema 验证测试 (BE-1.3T)
7. [ ] 实现用户认证 API (BE-1.5)
8. [ ] 编写认证 API 集成测试 (BE-1.5T)

### 本周目标 (遵循 Red-Green-Refactor)

- [ ] BE-1.1 ~ BE-1.8 完成 (含所有测试任务)
- [ ] 用户注册/登录流程跑通
- [ ] 数据库连接稳定
- [ ] 测试覆盖率 > 85%
- [ ] CI 流程配置完成

---

*Good luck! Let's build something amazing! ⚡*
