import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/app_providers.dart';

/// 用户资料页面
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // TODO: 从 Provider 获取用户数据
    final user = ref.watch(currentUserIdProvider);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('个人资料'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () {
              // TODO: 编辑资料
            },
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 头像区域
          _buildAvatarSection(context),
          
          const SizedBox(height: 24),
          
          // 统计信息
          _buildStatsSection(context),
          
          const SizedBox(height: 24),
          
          // 用户信息
          _buildInfoSection(context),
          
          const SizedBox(height: 24),
          
          // 设置选项
          _buildSettingsSection(context),
        ],
      ),
    );
  }

  Widget _buildAvatarSection(BuildContext context) {
    return Column(
      children: [
        // 头像
        Container(
          width: 100,
          height: 100,
          decoration: BoxDecoration(
            color: Colors.blue,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 3),
          ),
          child: const Icon(
            Icons.person,
            size: 60,
            color: Colors.white,
          ),
        ),
        
        const SizedBox(height: 16),
        
        // 用户名
        const Text(
          '用户',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),
        
        const SizedBox(height: 8),
        
        // 用户 ID
        Text(
          'ID: 12345',
          style: TextStyle(
            fontSize: 14,
            color: Colors.grey[600],
          ),
        ),
      ],
    );
  }

  Widget _buildStatsSection(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '统计信息',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            
            const SizedBox(height: 16),
            
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStatItem('拥有像素', '0'),
                _buildStatItem('已染色', '0'),
                _buildStatItem('染色权', '0'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(String label, String value) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: Colors.blue,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey[600],
          ),
        ),
      ],
    );
  }

  Widget _buildInfoSection(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '个人信息',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            
            const SizedBox(height: 16),
            
            _buildInfoRow('邮箱', 'user@example.com'),
            _buildInfoRow('注册时间', '2026-04-03'),
            _buildInfoRow('上次登录', '刚刚'),
            _buildInfoRow('个人简介', '暂无简介'),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: TextStyle(
                color: Colors.grey[600],
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 14,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSettingsSection(BuildContext context) {
    return Card(
      child: Column(
        children: [
          ListTile(
            leading: const Icon(Icons.palette),
            title: const Text('我的染色权'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              context.go('/color-rights');
            },
          ),
          
          const Divider(height: 1),
          
          ListTile(
            leading: const Icon(Icons.history),
            title: const Text('染色历史'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              // TODO: 导航到染色历史
            },
          ),
          
          const Divider(height: 1),
          
          ListTile(
            leading: const Icon(Icons.security),
            title: const Text('账号安全'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              // TODO: 导航到安全设置
            },
          ),
          
          const Divider(height: 1),
          
          ListTile(
            leading: const Icon(Icons.help_outline),
            title: const Text('帮助与反馈'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              // TODO: 导航到帮助
            },
          ),
          
          const Divider(height: 1),
          
          ListTile(
            leading: const Icon(Icons.logout, color: Colors.red),
            title: const Text('退出登录', style: TextStyle(color: Colors.red)),
            onTap: () {
              _showLogoutDialog(context);
            },
          ),
        ],
      ),
    );
  }

  void _showLogoutDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('确认退出'),
        content: const Text('确定要退出登录吗？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () {
              // TODO: 执行退出登录
              Navigator.pop(context);
            },
            child: const Text('退出', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }
}
