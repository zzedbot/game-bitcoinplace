# BitcoinPlace - API 接口设计

## 1. 认证与用户

### 1.1 注册

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123",
  "username": "pixelartist",
  "inviteCode": "optional123"  // 可选，邀请码
}

Response 201:
{
  "userId": "uuid",
  "username": "pixelartist",
  "email": "user@example.com",
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token",
  "createdAt": "2026-04-03T14:30:00Z"
}
```

### 1.2 登录

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}

Response 200:
{
  "userId": "uuid",
  "username": "pixelartist",
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token",
  "lastLoginAt": "2026-04-03T14:30:00Z"
}
```

### 1.3 刷新 Token

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh_token"
}

Response 200:
{
  "accessToken": "new_jwt_token",
  "refreshToken": "new_refresh_token"
}
```

### 1.4 获取当前用户信息

```http
GET /api/v1/me
Authorization: Bearer {accessToken}

Response 200:
{
  "userId": "uuid",
  "username": "pixelartist",
  "email": "user@example.com",
  "avatar": "https://...",
  "wallet": {
    "coins": 12345,
    "gems": 67
  },
  "stats": {
    "colorRightsOwned": 42,
    "colorRightsUsed": 15,
    "auctionsWon": 8,
    "auctionsSold": 3,
    "totalEarnings": 50000
  },
  "createdAt": "2026-04-03T14:30:00Z"
}
```

---

## 2. 画布相关

### 2.1 获取画布全量状态

```http
GET /api/v1/canvas/state

Response 200:
{
  "version": 12345,
  "timestamp": 1712156400000,
  "width": 7000,
  "height": 3000,
  "data": "base64_encoded_compressed_uint8array",
  "compression": "gzip"  // 或 "brotli"
}

# 客户端解压后得到 Uint8Array，每个 byte 代表一个坐标的状态
# bit 0-3: 颜色索引 (0-15)
# bit 4: 是否已染色 (0=透明，1=已染色)
```

### 2.2 获取单个坐标状态

```http
GET /api/v1/canvas/tile?x=123&y=456

Response 200:
{
  "x": 123,
  "y": 456,
  "zone": 2,
  "color": 5,  // 0-15, null=透明
  "isUsed": true,
  "ownerId": "uuid",  // null=无人拥有
  "ownerUsername": "pixelartist",  // null=无人拥有
  "lastModifiedAt": "2026-04-03T14:30:00Z"
}
```

### 2.3 获取区域状态（分块加载）

```http
GET /api/v1/canvas/region?zone=1&minX=0&minY=0&maxX=100&maxY=100

Response 200:
{
  "zone": 1,
  "bounds": {
    "minX": 0,
    "minY": 0,
    "maxX": 100,
    "maxY": 100
  },
  "tiles": [
    {"x": 0, "y": 0, "color": 5},
    {"x": 1, "y": 0, "color": null},
    ...
  ],
  "version": 12345
}
```

### 2.4 获取矿区信息

```http
GET /api/v1/canvas/zones

Response 200:
{
  "zones": [
    {
      "id": 1,
      "name": "创世矿区",
      "bounds": {"minX": 0, "minY": 0, "maxX": 1000, "maxY": 1000},
      "unlockedCount": 450000,
      "totalCount": 1000000,
      "unlockProgress": 0.45,
      "floorPrice": 500,  // 地板价（Coin）
      "avgPrice": 750
    },
    ...
  ]
}
```

### 2.5 染色操作

```http
POST /api/v1/canvas/color
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "x": 123,
  "y": 456,
  "color": 5  // 0-15
}

Response 200:
{
  "success": true,
  "version": 12346,
  "timestamp": 1712156460000,
  "transactionId": "tx_uuid"
}

Response 400 (无权限):
{
  "error": "NO_PERMISSION",
  "message": "You do not own the coloring rights for this tile"
}

Response 400 (已使用):
{
  "error": "ALREADY_USED",
  "message": "This tile has already been colored"
}
```

### 2.6 获取坐标历史

```http
GET /api/v1/canvas/tile/history?x=123&y=456

Response 200:
{
  "x": 123,
  "y": 456,
  "history": [
    {
      "action": "unlocked",
      "timestamp": "2026-04-03T10:00:00Z",
      "blockNumber": 1234
    },
    {
      "action": "granted",
      "timestamp": "2026-04-03T10:00:01Z",
      "userId": "uuid",
      "username": "pixelartist"
    },
    {
      "action": "colored",
      "timestamp": "2026-04-03T10:05:00Z",
      "userId": "uuid",
      "username": "pixelartist",
      "color": 5
    },
    {
      "action": "modified",
      "timestamp": "2026-04-03T12:00:00Z",
      "userId": "uuid",
      "username": "pixelartist",
      "color": 7
    }
  ]
}
```

---

## 3. 染色权与库存

### 3.1 获取我的染色权

```http
GET /api/v1/my/color-rights?status=unused  // unused | used | all
Authorization: Bearer {accessToken}

Response 200:
{
  "colorRights": [
    {
      "id": 12345,
      "x": 123,
      "y": 456,
      "zone": 2,
      "isUsed": false,
      "currentColor": null,
      "acquiredAt": "2026-04-03T10:00:00Z",
      "usedAt": null
    },
    ...
  ],
  "total": 42,
  "unusedCount": 27,
  "usedCount": 15
}
```

### 3.2 获取染色权详情

```http
GET /api/v1/color-rights/:id
Authorization: Bearer {accessToken}

Response 200:
{
  "id": 12345,
  "x": 123,
  "y": 456,
  "zone": 2,
  "isUsed": false,
  "currentColor": null,
  "owner": {
    "userId": "uuid",
    "username": "pixelartist"
  },
  "acquiredAt": "2026-04-03T10:00:00Z",
  "usedAt": null,
  "isListed": false,  // 是否在拍卖中
  "auction": null  // 如果在拍卖中，返回拍卖信息
}
```

---

## 4. 拍卖行

### 4.1 创建拍卖（固定价格）

```http
POST /api/v1/auctions
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "colorRightId": 12345,
  "type": "fixed_price",
  "price": 5000,  // Coin
  "currency": "game_coin",  // game_coin | gem
  "durationHours": 168  // 7 天
}

Response 201:
{
  "auctionId": "uuid",
  "sellerId": "uuid",
  "colorRightId": 12345,
  "x": 123,
  "y": 456,
  "zone": 2,
  "type": "fixed_price",
  "price": 5000,
  "currency": "game_coin",
  "status": "active",
  "expiresAt": "2026-04-10T14:30:00Z",
  "createdAt": "2026-04-03T14:30:00Z"
}
```

### 4.2 创建拍卖（竞价）

```http
POST /api/v1/auctions
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "colorRightId": 12345,
  "type": "bid",
  "startingBid": 1000,
  "buyNowPrice": 10000,  // 可选，一口价
  "minBidIncrement": 100,
  "durationHours": 168,
  "currency": "game_coin"
}

Response 201:
{
  "auctionId": "uuid",
  "type": "bid",
  "startingBid": 1000,
  "buyNowPrice": 10000,
  "currentBid": null,
  "currentBidder": null,
  "bidCount": 0,
  ...
}
```

### 4.3 查询拍卖列表

```http
GET /api/v1/auctions?zone=1&status=active&sortBy=price&order=asc&limit=20&offset=0
Authorization: Bearer {accessToken}

# 查询参数:
# - zone: 矿区编号 (1-21)
# - status: active | sold | expired | all
# - type: fixed_price | bid | all
# - sortBy: price | createdAt | expiresAt | bidCount
# - order: asc | desc
# - minPrice, maxPrice: 价格范围
# - limit, offset: 分页

Response 200:
{
  "auctions": [
    {
      "id": "uuid",
      "seller": {
        "userId": "uuid",
        "username": "seller123",
        "reputation": 4.8
      },
      "x": 123,
      "y": 456,
      "zone": 1,
      "type": "fixed_price",
      "price": 5000,
      "currency": "game_coin",
      "status": "active",
      "expiresAt": "2026-04-10T14:30:00Z",
      "createdAt": "2026-04-03T14:30:00Z"
    },
    ...
  ],
  "total": 1234,
  "limit": 20,
  "offset": 0
}
```

### 4.4 查询拍卖详情

```http
GET /api/v1/auctions/:id
Authorization: Bearer {accessToken}

Response 200:
{
  "id": "uuid",
  "seller": {
    "userId": "uuid",
    "username": "seller123",
    "reputation": 4.8
  },
  "colorRight": {
    "id": 12345,
    "x": 123,
    "y": 456,
    "zone": 2,
    "isUsed": false,
    "currentColor": null
  },
  "type": "bid",
  "startingBid": 1000,
  "buyNowPrice": 10000,
  "currentBid": 3500,
  "currentBidder": {
    "userId": "uuid",
    "username": "bidder456"
  },
  "bidCount": 7,
  "minBidIncrement": 100,
  "status": "active",
  "expiresAt": "2026-04-10T14:30:00Z",
  "createdAt": "2026-04-03T14:30:00Z",
  "bids": [
    {
      "bidder": {"userId": "uuid", "username": "bidder456"},
      "amount": 3500,
      "timestamp": "2026-04-03T16:00:00Z"
    },
    ...
  ]
}
```

### 4.5 出价

```http
POST /api/v1/auctions/:id/bid
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "amount": 3600
}

Response 200:
{
  "success": true,
  "auctionId": "uuid",
  "newBid": 3600,
  "isWinning": true,
  "message": "Bid placed successfully"
}

Response 400 (出价过低):
{
  "error": "BID_TOO_LOW",
  "message": "Minimum bid is 3600 (current bid + increment)"
}

Response 400 (余额不足):
{
  "error": "INSUFFICIENT_BALANCE",
  "message": "You need 3600 Coin but only have 2000 Coin"
}
```

### 4.6 立即购买

```http
POST /api/v1/auctions/:id/buy-now
Authorization: Bearer {accessToken}

Response 200:
{
  "success": true,
  "auctionId": "uuid",
  "finalPrice": 10000,
  "message": "Purchase successful"
}

Response 400 (无一口价):
{
  "error": "NO_BUY_NOW",
  "message": "This auction does not have a buy-now price"
}
```

### 4.7 取消拍卖

```http
DELETE /api/v1/auctions/:id
Authorization: Bearer {accessToken}

Response 200:
{
  "success": true,
  "message": "Auction cancelled"
}

Response 400 (有出价):
{
  "error": "HAS_BIDS",
  "message": "Cannot cancel auction with existing bids"
}
```

### 4.8 获取我的拍卖

```http
GET /api/v1/my/auctions?type=selling  // selling | bidding | all
Authorization: Bearer {accessToken}

Response 200:
{
  "selling": [...],  // 我卖出的
  "bidding": [...],  // 我竞拍的
  "sold": [...],     // 已成交的卖出
  "won": [...]       // 已成交的买入
}
```

---

## 5. 钱包与交易

### 5.1 获取钱包余额

```http
GET /api/v1/wallet
Authorization: Bearer {accessToken}

Response 200:
{
  "userId": "uuid",
  "balances": {
    "game_coin": {
      "available": 12345,
      "locked": 3600,  // 竞拍中锁定的金额
      "total": 15945
    },
    "gem": {
      "available": 67,
      "locked": 0,
      "total": 67
    }
  }
}
```

### 5.2 交易记录

```http
GET /api/v1/wallet/transactions?limit=50&offset=0
Authorization: Bearer {accessToken}

Response 200:
{
  "transactions": [
    {
      "id": "tx_uuid",
      "type": "auction_purchase",  // auction_purchase | auction_sale | reward | transfer_in | transfer_out
      "amount": -10000,
      "currency": "game_coin",
      "balanceAfter": 12345,
      "description": "Purchased auction #uuid",
      "relatedAuctionId": "uuid",
      "timestamp": "2026-04-03T14:30:00Z"
    },
    ...
  ],
  "total": 123,
  "limit": 50,
  "offset": 0
}
```

### 5.3 用户间转账

```http
POST /api/v1/wallet/transfer
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "toUsername": "recipient123",
  "amount": 1000,
  "currency": "game_coin",
  "message": "Thanks for the artwork!"  // 可选
}

Response 200:
{
  "success": true,
  "transactionId": "tx_uuid",
  "fee": 10,  // 1% 手续费
  "netAmount": 1010,  // 实际扣除（含手续费）
  "message": "Transfer successful"
}
```

---

## 6. 区块与经济

### 6.1 获取当前经济状态

```http
GET /api/v1/economy/status

Response 200:
{
  "currentCycle": 0,
  "cycleName": "创世周期",
  "blocksPerWindow": 2400,
  "nextHalvingDate": "2026-05-03T00:00:00Z",
  "daysUntilHalving": 30,
  "totalUnlocked": 432000,
  "totalTiles": 21000000,
  "unlockProgress": 0.0206,
  "onlineUsers": 1234,
  "lastBlockNumber": 1728,
  "lastBlockTime": "2026-04-03T14:30:00Z"
}
```

### 6.2 获取区块信息

```http
GET /api/v1/blocks/:number

Response 200:
{
  "blockNumber": 1728,
  "generatedAt": "2026-04-03T14:30:00Z",
  "rewardAmount": 2400,
  "cycle": 0,
  "winnerCount": 2400,
  "winners": [
    {
      "userId": "uuid",
      "username": "lucky_miner",
      "x": 1234,
      "y": 567,
      "zone": 2
    },
    ...
  ]
}
```

### 6.3 获取我的获奖历史

```http
GET /api/v1/my/block-wins?limit=50&offset=0
Authorization: Bearer {accessToken}

Response 200:
{
  "wins": [
    {
      "blockNumber": 1728,
      "x": 1234,
      "y": 567,
      "zone": 2,
      "wonAt": "2026-04-03T14:30:00Z",
      "isUsed": false,
      "currentColor": null
    },
    ...
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

---

## 7. 通知

### 7.1 获取我的通知

```http
GET /api/v1/notifications?unread=false&limit=50
Authorization: Bearer {accessToken}

Response 200:
{
  "notifications": [
    {
      "id": "notif_uuid",
      "type": "you_won",  // you_won | auction_outbid | auction_sold | auction_expired | system
      "title": "你获得了染色权！",
      "body": "你在区块 #1728 中获得了坐标 (1234, 567) 的染色权",
      "data": {
        "blockNumber": 1728,
        "x": 1234,
        "y": 567
      },
      "isRead": false,
      "createdAt": "2026-04-03T14:30:00Z"
    },
    ...
  ],
  "unreadCount": 5,
  "total": 123
}
```

### 7.2 标记通知为已读

```http
POST /api/v1/notifications/:id/read
Authorization: Bearer {accessToken}

Response 200:
{
  "success": true
}
```

### 7.3 标记所有通知为已读

```http
POST /api/v1/notifications/read-all
Authorization: Bearer {accessToken}

Response 200:
{
  "success": true,
  "markedCount": 5
}
```

---

## 8. WebSocket 消息

### 8.1 连接

```
wss://api.bitcoinplace.io/ws
Authorization: Bearer {accessToken}
```

### 8.2 客户端 → 服务端

**订阅矿区：**
```json
{
  "type": "subscribe_zone",
  "payload": {
    "zone": 1
  }
}
```

**取消订阅：**
```json
{
  "type": "unsubscribe_zone",
  "payload": {
    "zone": 1
  }
}
```

**染色操作：**
```json
{
  "type": "color_tile",
  "payload": {
    "x": 123,
    "y": 456,
    "color": 5,
    "nonce": "random_string"
  }
}
```

**心跳：**
```json
{
  "type": "ping",
  "payload": {
    "timestamp": 1712156400000
  }
}
```

### 8.3 服务端 → 客户端

**坐标染色广播：**
```json
{
  "type": "tile_colored",
  "payload": {
    "x": 123,
    "y": 456,
    "color": 5,
    "timestamp": 1712156400000,
    "version": 12346
  }
}
```

**区块生成广播：**
```json
{
  "type": "block_generated",
  "payload": {
    "blockNumber": 1729,
    "rewardAmount": 2400,
    "winnerCount": 2400,
    "timestamp": 1712156400000
  }
}
```

**你中奖了：**
```json
{
  "type": "you_won",
  "payload": {
    "blockNumber": 1729,
    "x": 2345,
    "y": 678,
    "zone": 3
  }
}
```

**拍卖出价通知：**
```json
{
  "type": "auction_bid",
  "payload": {
    "auctionId": "uuid",
    "currentBid": 3600,
    "currentBidder": "uuid",
    "isOutbid": true,  // 你的出价被超越了
    "expiresAt": "2026-04-10T14:30:00Z"
  }
}
```

**拍卖成交通知：**
```json
{
  "type": "auction_sold",
  "payload": {
    "auctionId": "uuid",
    "role": "seller",  // seller | buyer
    "finalPrice": 10000,
    "counterparty": "uuid"
  }
}
```

**心跳响应：**
```json
{
  "type": "pong",
  "payload": {
    "timestamp": 1712156400000,
    "serverTime": 1712156400000
  }
}
```

---

## 9. 错误码

| 错误码 | HTTP 状态 | 说明 |
|---|---|---|
| UNAUTHORIZED | 401 | 未认证或 Token 过期 |
| FORBIDDEN | 403 | 无权限 |
| NOT_FOUND | 404 | 资源不存在 |
| BAD_REQUEST | 400 | 请求参数错误 |
| CONFLICT | 409 | 资源冲突（如重复出价） |
| INSUFFICIENT_BALANCE | 400 | 余额不足 |
| NO_PERMISSION | 400 | 无染色权限 |
| ALREADY_USED | 400 | 坐标已使用 |
| AUCTION_NOT_FOUND | 404 | 拍卖不存在 |
| AUCTION_EXPIRED | 400 | 拍卖已过期 |
| BID_TOO_LOW | 400 | 出价过低 |
| HAS_BIDS | 400 | 有出价，无法取消 |
| RATE_LIMITED | 429 | 请求频率过高 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

---

*文档版本：1.0*  
*最后更新：2026-04-03*
