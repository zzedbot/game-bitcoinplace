# BitcoinPlace - 技术架构设计

## 1. 系统架构总览

```
┌─────────────────────────────────────────────────────────────────────┐
│                           客户端层                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │   Web 端     │  │   iOS App   │  │  Android App│                  │
│  │ React+Pixi  │  │   Swift     │  │   Kotlin    │                  │
│  └─────────────┘  └─────────────┘  └─────────────┘                  │
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
│                       应用服务层                                     │
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

## 2. 核心模块设计

### 2.1 画布服务 (CanvasService)

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
CREATE TABLE color_rights (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID NOT NULL,
    x               INT NOT NULL CHECK (x >= 0 AND x < 7000),
    y               INT NOT NULL CHECK (y >= 0 AND y < 3000),
    zone            INT NOT NULL CHECK (zone >= 1 AND zone <= 21),
    
    is_used         BOOLEAN DEFAULT FALSE,
    current_color   INT CHECK (current_color >= 0 AND current_color < 16),
    
    acquired_at     TIMESTAMPTZ DEFAULT NOW(),
    used_at         TIMESTAMPTZ,
    last_modified_at TIMESTAMPTZ,
    
    UNIQUE (x, y)
);

CREATE INDEX idx_color_rights_user ON color_rights(user_id);
CREATE INDEX idx_color_rights_zone ON color_rights(zone, is_used);
CREATE INDEX idx_color_rights_unused ON color_rights(is_used, user_id) WHERE is_used = FALSE;
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
  block_id            BIGINT NOT NULL REFERENCES blocks(id),
  user_id             UUID NOT NULL,
  x                   INT NOT NULL,
  y                   INT NOT NULL,
  won_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_block_winners_user ON block_winners(user_id);
```

### 2.3 拍卖服务 (AuctionService)

**职责：**
- 管理拍卖订单
- 处理竞价逻辑
- 执行成交结算

**数据库表：**

```sql
CREATE TYPE auction_type AS ENUM ('fixed_price', 'bid');
CREATE TYPE auction_status AS ENUM ('active', 'sold', 'cancelled', 'expired');

CREATE TABLE auctions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id           UUID NOT NULL,
  color_right_id      BIGINT NOT NULL REFERENCES color_rights(id),
  
  x                   INT NOT NULL,
  y                   INT NOT NULL,
  zone                INT NOT NULL,
  
  auction_type        auction_type NOT NULL,
  
  -- 定价
  price               BIGINT NOT NULL,  -- 最小单位：聪或游戏币分
  currency            VARCHAR(10) DEFAULT 'game_coin',
  
  -- 竞价字段（仅 bid 类型）
  current_bid         BIGINT,
  current_bidder_id   UUID,
  bid_count           INT DEFAULT 0,
  min_bid_increment   BIGINT DEFAULT 0,
  
  -- 状态
  status              auction_status DEFAULT 'active',
  starts_at           TIMESTAMPTZ DEFAULT NOW(),
  expires_at          TIMESTAMPTZ NOT NULL,
  sold_at             TIMESTAMPTZ,
  final_price         BIGINT,
  buyer_id            UUID,
  
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_auctions_status ON auctions(status, expires_at);
CREATE INDEX idx_auctions_zone ON auctions(zone, status);
CREATE INDEX idx_auctions_seller ON auctions(seller_id);
CREATE INDEX idx_auctions_price ON auctions(price, status) WHERE status = 'active';

-- 竞价记录
CREATE TABLE auction_bids (
  id                  BIGSERIAL PRIMARY KEY,
  auction_id          UUID NOT NULL REFERENCES auctions(id),
  bidder_id           UUID NOT NULL,
  amount              BIGINT NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_auction_bids_auction ON auction_bids(auction_id);
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

## 3. 前端架构

### 3.1 技术选型

```
React 18 + TypeScript
├── 状态管理：Zustand / Redux Toolkit
├── 路由：React Router v6
├── Canvas 渲染：Pixi.js (WebGL) 或 Konva.js
├── UI 组件：shadcn/ui + Tailwind CSS
├── WebSocket：socket.io-client
├── 数据请求：TanStack Query (React Query)
└── 构建工具：Vite
```

### 3.2 组件结构

```
src/
├── components/
│   ├── Canvas/
│   │   ├── CanvasView.tsx        # 主画布组件
│   │   ├── CanvasLayer.tsx       # 渲染层（Pixi）
│   │   ├── TilePreview.tsx       # 坐标预览
│   │   ├── ZoomControls.tsx      # 缩放控制
│   │   └── Palette.tsx           # 调色板
│   ├── Auction/
│   │   ├── AuctionList.tsx       # 拍卖列表
│   │   ├── AuctionDetail.tsx     # 拍卖详情
│   │   ├── CreateAuction.tsx     # 创建拍卖
│   │   └── BidPanel.tsx          # 竞价面板
│   ├── User/
│   │   ├── Wallet.tsx            # 钱包
│   │   ├── Inventory.tsx         # 库存（染色权）
│   │   └── Profile.tsx           # 个人资料
│   └── common/
│       ├── Header.tsx
│       ├── Notification.tsx
│       └── Loading.tsx
├── hooks/
│   ├── useCanvas.ts              # 画布逻辑
│   ├── useWebSocket.ts           # WebSocket 连接
│   └── useAuction.ts             # 拍卖逻辑
├── stores/
│   ├── canvasStore.ts            # 画布状态
│   ├── userStore.ts              # 用户状态
│   └── auctionStore.ts           # 拍卖状态
└── services/
    ├── api.ts                    # API 客户端
    ├── websocket.ts              # WebSocket 客户端
    └── utils.ts                  # 工具函数
```

### 3.3 画布渲染优化

```typescript
// 使用 Pixi.js 进行 WebGL 渲染
import * as PIXI from 'pixi.js';

class CanvasRenderer {
  private app: PIXI.Application;
  private tileGraphics: PIXI.Graphics;
  private zoomLevel: number = 4;  // 4x 或 40x
  private visibleRegion: Region;

  constructor(container: HTMLElement) {
    this.app = new PIXI.Application({
      width: container.clientWidth,
      height: container.clientHeight,
      antialias: false,  // 像素艺术不需要抗锯齿
      backgroundColor: 0x1a1a1a,
    });
    container.appendChild(this.app.view);

    this.tileGraphics = new PIXI.Graphics();
    this.app.stage.addChild(this.tileGraphics);
  }

  // 渲染可见区域的瓦片
  renderVisibleRegion(tiles: TileData[]) {
    this.tileGraphics.clear();

    const tileSize = this.zoomLevel;  // 4px 或 40px
    const colors = this.getColorPalette();

    for (const tile of tiles) {
      if (!this.isVisible(tile.x, tile.y)) continue;
      if (tile.color === null) continue;  // 透明

      this.tileGraphics.beginFill(colors[tile.color]);
      this.tileGraphics.drawRect(
        tile.x * tileSize,
        tile.y * tileSize,
        tileSize,
        tileSize
      );
      this.tileGraphics.endFill();
    }
  }

  // 批量更新（用于 WebSocket 推送的增量变化）
  batchUpdateTileChanges(changes: TileChange[]) {
    requestAnimationFrame(() => {
      for (const change of changes) {
        this.renderSingleTile(change.x, change.y, change.color);
      }
    });
  }

  // 分块加载策略
  async loadRegion(zone: number, bounds: Bounds) {
    const response = await fetch(`/api/v1/canvas/region?zone=${zone}&...`);
    const data = await response.json();
    this.renderVisibleRegion(data.tiles);
  }
}
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
