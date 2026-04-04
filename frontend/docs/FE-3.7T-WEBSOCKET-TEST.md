# FE-3.7T WebSocket 连接/重连测试 - 测试框架 ⚡

**日期:** 2026-04-04  
**任务 ID:** FE-3.7T  
**状态:** 🔄 测试框架已创建  
**开发模式:** TDD (Red-Green-Refactor)

---

## TDD 流程记录

### RED 阶段 - 编写测试 ✅
创建了 12 个 WebSocket 连接/重连测试用例：

| 测试 ID | 测试内容 | 状态 |
|---------|---------|------|
| FE-3.7T-001 | connect 方法可调用 | ✅ |
| FE-3.7T-002 | disconnect 设置状态 | ✅ |
| FE-3.7T-003 | reconnect 方法存在 | ✅ |
| FE-3.7T-004 | 自动重连可配置 | ⏸️ 待实现 |
| FE-3.7T-005 | 指数退避算法 | ⏸️ 待实现 |
| FE-3.7T-006 | 最大重连次数限制 | ⏸️ 待实现 |
| FE-3.7T-007 | 状态流发出变化 | ✅ |
| FE-3.7T-008 | 消息队列缓冲 | ⏸️ 待实现 |
| FE-3.7T-009 | 重连后发送缓冲 | ⏸️ 待实现 |
| FE-3.7T-010 | 心跳保活 | ⏸️ 待实现 |
| FE-3.7T-011 | 连接超时处理 | ⏸️ 待实现 |
| FE-3.7T-012 | 重连错误捕获 | ✅ |

### GREEN 阶段 - 待实现 ⏳
需要实现：
- 自动重连配置属性
- 指数退避算法
- 最大重连次数限制
- 消息队列机制
- 心跳保活机制
- 连接超时处理

### REFACTOR 阶段 - 待实现 ⏳
- 提取测试辅助方法
- 创建 WebSocket mock
- 参数化测试用例

---

## 测试用例详情

### 已实现测试 (5 个)
1. **connect 方法可调用** - 验证方法存在
2. **disconnect 设置状态** - 验证断开连接
3. **reconnect 方法存在** - 验证重连方法
4. **状态流发出变化** - 验证 statusStream
5. **重连错误捕获** - 验证错误处理

### 待实现测试 (7 个)
1. **自动重连配置** - 需要 autoReconnect 属性
2. **指数退避算法** - 需要 backoff 逻辑
3. **最大重连次数** - 需要 maxReconnectAttempts 属性
4. **消息队列缓冲** - 需要 message queue 实现
5. **重连后发送缓冲** - 需要队列消费逻辑
6. **心跳保活** - 需要 heartbeat 机制
7. **连接超时处理** - 需要 timeout 配置

---

## WebSocketService 当前状态

### 已有功能
- ✅ connect(userId, token)
- ✅ disconnect()
- ✅ reconnect()
- ✅ isConnected getter
- ✅ statusStream
- ✅ sendColor(x, y, color)

### 需要增强
- ⏳ autoReconnect 配置
- ⏳ maxReconnectAttempts 配置
- ⏳ exponential backoff 算法
- ⏳ message queue 缓冲
- ⏳ heartbeat 心跳
- ⏳ connection timeout 配置

---

## 下一步

1. 实现 WebSocketService 增强功能
2. 取消测试 skip 状态
3. 在真实环境中运行测试
4. 继续下一个 P0 任务

---

*TDD 进行中：Red ✅ → Green ⏳ → Refactor ⏳*
