import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/websocket_service.dart';
import '../../services/http_service.dart';
import '../../providers/app_providers.dart';

export '../../services/websocket_service.dart' show WebSocketMessageType;

/// 画布屏幕 - 主画布渲染和交互
class CanvasScreen extends ConsumerStatefulWidget {
  const CanvasScreen({super.key});

  @override
  ConsumerState<CanvasScreen> createState() => _CanvasScreenState();
}

class _CanvasScreenState extends ConsumerState<CanvasScreen> {
  // 画布控制器
  double _scale = 0.1; // 初始缩放以适应屏幕
  Offset _offset = Offset.zero;
  bool _isDragging = false;
  Offset _lastFocalPoint = Offset.zero;

  // 选中的颜色
  int _selectedColor = 1;

  // 染色状态
  bool _isColoring = false;
  String? _lastColorMessage;

  // WebSocket 服务
  WebSocketService? get _wsService => ref.read(webSocketServiceProvider);
  HttpService? get _httpService => ref.read(httpServiceProvider);

  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    
    // 计算初始缩放比例以适配屏幕
    if (_offset == Offset.zero) {
      _scale = screenSize.width / 7000;
      _offset = Offset(0, screenSize.height / 2 - (3000 * _scale / 2));
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('BitcoinPlace'),
        actions: [
          // WebSocket 连接状态
          Builder(
            builder: (context) {
              final isConnected = _wsService?.isConnected ?? false;
              return IconButton(
                icon: Icon(
                  isConnected ? Icons.wifi : Icons.wifi_off,
                  color: isConnected ? Colors.green : Colors.red,
                ),
                onPressed: () {
                  // TODO: 从认证状态获取 userId 和 token
                  _wsService?.connect('test-user-id', 'test-token');
                },
                tooltip: isConnected ? 'WebSocket 已连接' : '点击连接 WebSocket',
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.zoom_out),
            onPressed: () {
              setState(() {
                _scale *= 0.8;
                _scale = _scale.clamp(0.01, 1.0);
              });
            },
          ),
          IconButton(
            icon: const Icon(Icons.zoom_in),
            onPressed: () {
              setState(() {
                _scale *= 1.2;
                _scale = _scale.clamp(0.01, 1.0);
              });
            },
          ),
          IconButton(
            icon: const Icon(Icons.center_focus_strong),
            onPressed: () {
              setState(() {
                _scale = screenSize.width / 7000;
                _offset = Offset(0, screenSize.height / 2 - (3000 * _scale / 2));
              });
            },
          ),
        ],
      ),
      body: Stack(
        children: [
          // 画布区域
          Positioned.fill(
            child: GestureDetector(
              onPanStart: (details) {
                setState(() {
                  _isDragging = true;
                  _lastFocalPoint = details.localPosition;
                });
              },
              onPanUpdate: (details) {
                setState(() {
                  final delta = details.localPosition - _lastFocalPoint;
                  _offset += delta;
                  _lastFocalPoint = details.localPosition;
                });
              },
              onPanEnd: (details) {
                setState(() {
                  _isDragging = false;
                });
              },
              onTapUp: (details) {
                if (!_isDragging) {
                  _handleTap(details.localPosition);
                }
              },
              child: CustomPaint(
                painter: CanvasPainter(
                  scale: _scale,
                  offset: _offset,
                ),
                size: Size.infinite,
              ),
            ),
          ),
          
          // 底部调色板
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: _buildPalette(),
          ),
          
          // 缩放指示器
          Positioned(
            right: 16,
            bottom: 80,
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(8.0),
                child: Text(
                  '${(_scale * 100).toStringAsFixed(1)}%',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
            ),
          ),
          
          // 染色状态指示器
          if (_isColoring)
            Positioned(
              left: 16,
              bottom: 80,
              child: Card(
                color: Colors.greenAccent,
                child: const Padding(
                  padding: EdgeInsets.all(8.0),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.green),
                        ),
                      ),
                      SizedBox(width: 8),
                      Text(
                        '染色中...',
                        style: TextStyle(color: Colors.green, fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildPalette() {
    return Container(
      height: 80,
      color: Colors.black87,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: List.generate(
          16,
          (index) => _buildColorButton(index),
        ),
      ),
    );
  }

  Widget _buildColorButton(int colorIndex) {
    final color = _getColorFromIndex(colorIndex);
    final isSelected = _selectedColor == colorIndex;

    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedColor = colorIndex;
        });
      },
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: Border.all(
            color: isSelected ? Colors.white : Colors.grey,
            width: isSelected ? 3 : 1,
          ),
        ),
      ),
    );
  }

  Color _getColorFromIndex(int index) {
    // 16 色调色板
    const colors = [
      Colors.white,
      Colors.grey,
      Colors.black,
      Colors.red,
      Colors.orange,
      Colors.yellow,
      Colors.green,
      Colors.teal,
      Colors.blue,
      Colors.indigo,
      Colors.purple,
      Colors.pink,
      Colors.brown,
      Colors.lime,
      Colors.cyan,
      Colors.amber,
    ];
    return colors[index % colors.length];
  }

  void _handleTap(Offset localPosition) async {
    // 将屏幕坐标转换为画布坐标
    final canvasX = ((localPosition.dx - _offset.dx) / _scale).round();
    final canvasY = ((localPosition.dy - _offset.dy) / _scale).round();

    // 检查坐标是否在画布范围内
    if (canvasX >= 0 &&
        canvasX < 7000 &&
        canvasY >= 0 &&
        canvasY < 3000) {
      
      // 检查是否有染色权
      if (!_hasColorRight(canvasX, canvasY)) {
        _showColorMessage('该区域需要染色权', isError: true);
        return;
      }

      // 执行染色操作
      setState(() {
        _isColoring = true;
      });

      try {
        // 通过 WebSocket 发送染色请求
        final success = await _sendColorRequest(canvasX, canvasY, _selectedColor);
        
        if (success) {
          _showColorMessage('染色成功：($canvasX, $canvasY)');
        } else {
          _showColorMessage('染色失败，请重试', isError: true);
        }
      } catch (e) {
        _showColorMessage('网络错误：$e', isError: true);
      } finally {
        setState(() {
          _isColoring = false;
        });
      }
    }
  }

  bool _hasColorRight(int x, int y) {
    // TODO: 从本地缓存或服务器检查染色权
    // 暂时返回 true 用于测试
    return true;
  }

  Future<bool> _sendColorRequest(int x, int y, int color) async {
    if (_wsService == null || !_wsService!.isConnected) {
      // WebSocket 未连接，使用 HTTP fallback
      debugPrint('WebSocket 未连接，使用 HTTP fallback');
      // TODO: 实现 HTTP fallback
      return false;
    }

    // 发送染色消息
    final message = WebSocketMessage(
      type: WebSocketMessageType.canvasUpdate,
      payload: {
        'action': 'color',
        'x': x,
        'y': y,
        'color': color,
      },
      timestamp: DateTime.now(),
    );

    _wsService!.send(message);
    debugPrint('发送染色请求：${message.payload}');
    return true;
  }

  void _showColorMessage(String message, {bool isError = false}) {
    setState(() {
      _lastColorMessage = message;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        duration: const Duration(seconds: 2),
        backgroundColor: isError ? Colors.red : Colors.green,
      ),
    );
  }
}

/// 画布绘制器
class CanvasPainter extends CustomPainter {
  final double scale;
  final Offset offset;

  CanvasPainter({
    required this.scale,
    required this.offset,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // 保存画布状态
    canvas.save();
    
    // 应用变换
    canvas.translate(offset.dx, offset.dy);
    canvas.scale(scale);

    // 绘制画布背景
    final paint = Paint()..color = Colors.black;
    canvas.drawRect(
      Rect.fromLTWH(0, 0, 7000, 3000),
      paint,
    );

    // 绘制矿区边界 (21 个 1000x1000 区域)
    final borderPaint = Paint()
      ..color = Colors.white24
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;

    for (int row = 0; row < 3; row++) {
      for (int col = 0; col < 7; col++) {
        final x = col * 1000.0;
        final y = row * 1000.0;
        canvas.drawRect(
          Rect.fromLTWH(x, y, 1000, 1000),
          borderPaint,
        );
      }
    }

    // 绘制中心标记
    final centerPaint = Paint()..color = Colors.redAccent;
    canvas.drawCircle(
      const Offset(3500, 1500),
      20,
      centerPaint,
    );

    // 恢复画布状态
    canvas.restore();
  }

  @override
  bool shouldRepaint(CanvasPainter oldDelegate) {
    return oldDelegate.scale != scale || oldDelegate.offset != offset;
  }
}
