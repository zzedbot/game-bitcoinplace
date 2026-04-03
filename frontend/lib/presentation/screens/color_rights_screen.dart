import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// 染色权列表页面
class ColorRightsScreen extends ConsumerStatefulWidget {
  const ColorRightsScreen({super.key});

  @override
  ConsumerState<ColorRightsScreen> createState() => _ColorRightsScreenState();
}

class _ColorRightsScreenState extends ConsumerState<ColorRightsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('我的染色权'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: '可用'),
            Tab(text: '已使用'),
            Tab(text: '已过期'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildColorRightsList(ColorRightStatus.available),
          _buildColorRightsList(ColorRightStatus.used),
          _buildColorRightsList(ColorRightStatus.expired),
        ],
      ),
    );
  }

  Widget _buildColorRightsList(ColorRightStatus status) {
    // TODO: 从 API 获取染色权数据
    final colorRights = _getMockColorRights(status);

    if (colorRights.isEmpty) {
      return _buildEmptyState(status);
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: colorRights.length,
      itemBuilder: (context, index) {
        final colorRight = colorRights[index];
        return _buildColorRightCard(colorRight, status);
      },
    );
  }

  Widget _buildEmptyState(ColorRightStatus status) {
    String message;
    IconData icon;

    switch (status) {
      case ColorRightStatus.available:
        message = '暂无可用染色权\n完成新手任务或等待矿区开放获取';
        icon = Icons.add_location;
        break;
      case ColorRightStatus.used:
        message = '暂无已使用染色权';
        icon = Icons.check_circle_outline;
        break;
      case ColorRightStatus.expired:
        message = '暂无已过期染色权';
        icon = Icons.access_time;
        break;
    }

    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon,
            size: 80,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 16),
          Text(
            message,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 16,
              color: Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildColorRightCard(
      MockColorRight colorRight, ColorRightStatus status) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 顶部信息
            Row(
              children: [
                // 颜色指示器
                Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    color: colorRight.color,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.grey[300]!),
                  ),
                ),
                
                const SizedBox(width: 12),
                
                // 坐标信息
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '坐标：(${colorRight.x}, ${colorRight.y})',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        '矿区：${colorRight.zoneName}',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
                
                // 状态标签
                _buildStatusChip(status),
              ],
            ),
            
            const SizedBox(height: 16),
            
            // 时间信息
            Row(
              children: [
                Icon(
                  Icons.access_time,
                  size: 16,
                  color: Colors.grey[600],
                ),
                const SizedBox(width: 4),
                Text(
                  '获取时间：${colorRight.acquiredAt}',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 8),
            
            Row(
              children: [
                Icon(
                  Icons.event,
                  size: 16,
                  color: Colors.grey[600],
                ),
                const SizedBox(width: 4),
                Text(
                  '过期时间：${colorRight.expiresAt}',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 16),
            
            // 操作按钮
            if (status == ColorRightStatus.available)
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        // TODO: 导航到画布并定位到该坐标
                      },
                      icon: const Icon(Icons.map),
                      label: const Text('定位'),
                    ),
                  ),
                  
                  const SizedBox(width: 12),
                  
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        // TODO: 使用染色权
                        _showUseDialog(colorRight);
                      },
                      icon: const Icon(Icons.brush),
                      label: const Text('使用'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue,
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ),
                ],
              )
            else if (status == ColorRightStatus.used)
              Row(
                children: [
                  Icon(
                    Icons.check_circle,
                    size: 16,
                    color: Colors.green,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '已用于染色：颜色 #${colorRight.usedColor}',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusChip(ColorRightStatus status) {
    Color color;
    String label;

    switch (status) {
      case ColorRightStatus.available:
        color = Colors.green;
        label = '可用';
        break;
      case ColorRightStatus.used:
        color = Colors.blue;
        label = '已用';
        break;
      case ColorRightStatus.expired:
        color = Colors.grey;
        label = '过期';
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: color,
        ),
      ),
    );
  }

  void _showUseDialog(MockColorRight colorRight) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('使用染色权'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('坐标：(${colorRight.x}, ${colorRight.y})'),
            const SizedBox(height: 8),
            Text('矿区：${colorRight.zoneName}'),
            const SizedBox(height: 16),
            const Text('选择颜色：'),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: List.generate(
                16,
                (index) => GestureDetector(
                  onTap: () {
                    // TODO: 使用染色权
                    Navigator.pop(context);
                  },
                  child: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: _getColorFromIndex(index),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.grey),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('取消'),
          ),
        ],
      ),
    );
  }

  Color _getColorFromIndex(int index) {
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

  List<MockColorRight> _getMockColorRights(ColorRightStatus status) {
    // TODO: 替换为真实 API 调用
    if (status == ColorRightStatus.available) {
      return [
        MockColorRight(
          x: 1500,
          y: 1000,
          zoneName: '中央矿区',
          color: Colors.blue,
          acquiredAt: '2026-04-03 10:00',
          expiresAt: '2026-04-10 10:00',
        ),
        MockColorRight(
          x: 2500,
          y: 1500,
          zoneName: '东部矿区',
          color: Colors.red,
          acquiredAt: '2026-04-03 12:00',
          expiresAt: '2026-04-10 12:00',
        ),
      ];
    }
    return [];
  }
}

enum ColorRightStatus { available, used, expired }

class MockColorRight {
  final int x;
  final int y;
  final String zoneName;
  final Color color;
  final String acquiredAt;
  final String expiresAt;
  final int? usedColor;

  MockColorRight({
    required this.x,
    required this.y,
    required this.zoneName,
    required this.color,
    required this.acquiredAt,
    required this.expiresAt,
    this.usedColor,
  });
}
