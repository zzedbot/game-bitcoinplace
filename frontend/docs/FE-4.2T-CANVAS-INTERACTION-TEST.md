# FE-4.2T 染色交互测试 - 测试框架 ⚡

**日期:** 2026-04-04  
**任务 ID:** FE-4.2T  
**状态:** 🔄 测试框架已创建，待实现 Mock  
**开发模式:** TDD (Red-Green-Refactor)

---

## TDD 流程记录

### RED 阶段 - 编写失败的测试 ✅
已创建 8 个染色交互测试用例：

1. **坐标转换测试** - 验证屏幕坐标到画布坐标的转换
2. **边界检查测试** - 验证画布外点击无响应
3. **染色权验证测试** - 验证无染色权时显示错误
4. **成功染色测试** - 验证成功染色显示成功消息
5. **失败染色测试** - 验证失败染色显示错误消息
6. **加载状态测试** - 验证染色中显示加载指示器
7. **调色板选择测试** - 验证颜色选择更新
8. **HTTP 降级测试** - 验证 WebSocket 断开时使用 HTTP

### GREEN 阶段 - 待实现 ⏳
需要实现：
- Mock WebSocketService
- Mock HttpService
- Mock ColorRightService
- 测试用 Provider 覆盖

### REFACTOR 阶段 - 待实现 ⏳
- 提取测试辅助方法
- 创建 Mock 工厂
- 参数化测试用例

---

## 测试用例详情

### 1. 坐标转换测试
```dart
testWidgets('Canvas coordinates conversion is correct', (tester) async {
  // Screen (400, 300) with scale 0.1 should map to canvas (4000, 3000)
  // TODO: Implement coordinate conversion verification
});
```

### 2. 边界检查测试
```dart
testWidgets('Tap outside canvas bounds shows no action', (tester) async {
  // Tap outside 7000x3000 bounds
  // TODO: Verify no coloring attempt is made
});
```

### 3. 染色权验证测试
```dart
testWidgets('Color right check prevents unauthorized coloring', (tester) async {
  // Mock no color right
  // TODO: Verify error message "该区域需要染色权"
});
```

### 4. 成功染色测试
```dart
testWidgets('Successful coloring shows success message', (tester) async {
  // Mock successful WebSocket response
  // TODO: Verify SnackBar with "染色成功"
});
```

### 5. 失败染色测试
```dart
testWidgets('Failed coloring shows error message', (tester) async {
  // Mock failed WebSocket response
  // TODO: Verify SnackBar with "染色失败"
});
```

### 6. 加载状态测试
```dart
testWidgets('Coloring state shows loading indicator', (tester) async {
  // TODO: Verify loading indicator appears during _isColoring
});
```

### 7. 调色板选择测试
```dart
testWidgets('Palette color selection updates selected color', (tester) async {
  // Tap different colors
  // TODO: Verify _selectedColor changes
});
```

### 8. HTTP 降级测试
```dart
testWidgets('WebSocket disconnected uses HTTP fallback', (tester) async {
  // Mock WebSocket disconnected
  // TODO: Verify HTTP POST is made to /api/canvas/color
});
```

---

## 需要的 Mock

### WebSocketService Mock
```dart
class MockWebSocketService implements WebSocketService {
  bool isConnected = false;
  Future<bool> Function(int, int, int)? onSendColor;
  
  @override
  Future<bool> sendColor(int x, int y, int color) async {
    if (onSendColor != null) {
      return await onSendColor!(x, y, color);
    }
    return false;
  }
}
```

### HttpService Mock
```dart
class MockHttpService implements HttpService {
  Future<Response>? onRequest;
  
  @override
  Future<Response> post(String path, {dynamic data}) async {
    if (onRequest != null) {
      return await onRequest!;
    }
    throw Exception('Not implemented');
  }
}
```

---

## 下一步

1. 创建 Mock 服务类
2. 实现 Provider 覆盖
3. 取消测试 skip 状态
4. 运行测试验证

---

*TDD 进行中：Red ✅ → Green ⏳ → Refactor ⏳*
