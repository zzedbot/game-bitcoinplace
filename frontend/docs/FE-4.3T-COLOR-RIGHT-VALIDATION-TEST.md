# FE-4.3T 权限验证提示测试 - 测试框架 ⚡

**日期:** 2026-04-04  
**任务 ID:** FE-4.3T  
**状态:** 🔄 测试框架已创建  
**开发模式:** TDD (Red-Green-Refactor)

---

## TDD 流程记录

### RED 阶段 - 编写测试 ✅
创建了 14 个权限验证提示测试用例：

**UI 交互测试 (10 个)**
| 测试 ID | 测试内容 | 状态 |
|---------|---------|------|
| FE-4.3T-001 | 无染色权显示错误 | ⏸️ Mock 待实现 |
| FE-4.3T-002 | 有染色权允许染色 | ⏸️ Mock 待实现 |
| FE-4.3T-003 | 调用 ColorRightService | ⏸️ 服务调用验证 |
| FE-4.3T-004 | 错误消息自动消失 | ⏸️ 待实现 |
| FE-4.3T-005 | 快速点击防抖 | ⏸️ 待实现 |
| FE-4.3T-006 | 权限状态更新 UI | ⏸️ 待实现 |
| FE-4.3T-007 | 区域级权限检查 | ⏸️ 待实现 |
| FE-4.3T-008 | 权限使用后过期 | ⏸️ 待实现 |
| FE-4.3T-009 | 错误消息包含区域信息 | ⏸️ 待实现 |
| FE-4.3T-010 | 购买按钮显示 | ⏸️ 待实现 |

**Service 集成测试 (4 个)**
| 测试 ID | 测试内容 | 状态 |
|---------|---------|------|
| FE-4.3T-011 | checkColorRight 返回布尔值 | ⏸️ Backend mock |
| FE-4.3T-012 | checkColorRight 缓存结果 | ⏸️ 缓存测试 |
| FE-4.3T-013 | getColorRights 返回区域列表 | ⏸️ 区域列表测试 |
| FE-4.3T-014 | clear 使缓存失效 | ⏸️ 缓存清理测试 |

### GREEN 阶段 - 待实现 ⏳
需要实现：
- CanvasScreen._hasColorRight 集成 ColorRightService
- 错误提示 UI（SnackBar/Dialog）
- 购买染色权按钮
- 防抖逻辑
- ColorRightService 缓存机制

### REFACTOR 阶段 - 待实现 ⏳
- 提取测试辅助方法
- 创建 ColorRightService mock
- 参数化测试用例

---

## 需要的 Mock

### ColorRightService Mock
```dart
class MockColorRightService implements ColorRightService {
  Map<String, bool> _zoneRights = {};
  
  void setZoneRight(int zone, bool hasRight) {
    _zoneRights[zone.toString()] = hasRight;
  }
  
  @override
  Future<bool> hasColorRight(int x, int y) async {
    final zone = _getZone(x, y);
    return _zoneRights[zone.toString()] ?? false;
  }
  
  String _getZone(int x, int y) {
    // 21 个区域，每个 1000x1000
    final zoneX = x ~/ 1000;
    final zoneY = y ~/ 1000;
    return '${zoneX}_${zoneY}';
  }
}
```

### CanvasScreen Test Helper
```dart
Future<void> pumpCanvasScreenWithMock(
  WidgetTester tester,
  MockColorRightService mockColorRight,
) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        colorRightServiceProvider.overrideWithValue(mockColorRight),
      ],
      child: const MaterialApp(
        home: CanvasScreen(),
      ),
    ),
  );
  await tester.pumpAndSettle();
}
```

---

## 当前代码状态

### CanvasScreen._hasColorRight
```dart
bool _hasColorRight(int x, int y) {
  // TODO: 从本地缓存或服务器检查染色权
  // 暂时返回 true 用于测试
  return true;
}
```

需要更新为：
```dart
Future<bool> _hasColorRight(int x, int y) async {
  final colorRightService = ref.read(colorRightServiceProvider);
  return await colorRightService.hasColorRight(x, y);
}
```

---

## 下一步

1. 实现 ColorRightService mock
2. 更新 CanvasScreen 集成 ColorRightService
3. 实现错误提示 UI
4. 取消测试 skip 状态
5. 继续下一个 P0 任务

---

*TDD 进行中：Red ✅ → Green ⏳ → Refactor ⏳*
