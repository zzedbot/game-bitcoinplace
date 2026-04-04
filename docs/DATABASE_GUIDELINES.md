# 数据库使用规范

## 核心原则

**明确禁止使用以下数据库特性：**

1. ❌ **外键约束 (Foreign Key Constraints)**
   - 不使用 Prisma 的 `@relation` 外键约束
   - 表间关系通过应用层逻辑维护
   - 保留外键字段用于查询，但不添加数据库级约束

2. ❌ **触发器 (Triggers)**
   - 不使用数据库触发器
   - 业务逻辑全部在应用层实现

3. ❌ **存储过程 (Stored Procedures)**
   - 不使用存储过程或函数
   - 所有查询通过 Prisma ORM 执行

---

## 原因

1. **微服务友好** - 无外键约束便于未来拆分服务
2. **迁移简单** - 数据库迁移和重置更灵活
3. **测试便利** - 单元测试无需考虑外键依赖
4. **性能可控** - 应用层批量操作比数据库级联更高效
5. **代码集中** - 业务逻辑集中在代码层，便于审查和维护

---

## Prisma Schema 规范

### 关系定义方式

```prisma
// ❌ 错误 - 带外键约束
model User {
  id         String   @id
  auctions   Auction[] @relation("SellerAuctions")
}

model Auction {
  id       String @id
  sellerId String
  seller   User   @relation("SellerAuctions", fields: [sellerId], references: [id])
}

// ✅ 正确 - 无外键约束
model User {
  id         String   @id
  // 移除外键关系定义
}

model Auction {
  id       String @id
  sellerId String // 保留字段用于查询，但无约束
  // 移除 relation 定义
}
```

### 索引保留

```prisma
// ✅ 保留索引用于查询优化
model Auction {
  id         String   @id
  sellerId   String   @index("auctions_sellerId_idx")
  status     String   @index("auctions_status_idx")
  endTime    DateTime @index("auctions_endTime_idx")
}
```

---

## 应用层责任

移除外键约束后，应用层需确保：

1. **数据一致性** - 删除用户前检查关联记录
2. **事务处理** - 使用 Prisma 事务保证原子性
3. **级联逻辑** - 手动实现级联删除/更新

示例：
```typescript
// 删除用户时手动处理关联数据
await prisma.$transaction([
  prisma.bid.deleteMany({ where: { bidderId: userId } }),
  prisma.auction.deleteMany({ where: { sellerId: userId } }),
  prisma.colorRight.deleteMany({ where: { userId: userId } }),
  prisma.user.delete({ where: { id: userId } }),
]);
```

---

## 例外情况

无。所有表必须遵循此规范。

---

最后更新：2026-04-04
