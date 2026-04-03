import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// 主屏幕
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('BitcoinPlace'),
        actions: [
          IconButton(
            icon: const Icon(Icons.person),
            onPressed: () {
              context.go('/profile');
            },
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              context.go('/login');
            },
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Welcome
            Text(
              '欢迎来到 BitcoinPlace',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '21M 像素的比特币主题协作画布',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                color: Colors.grey,
              ),
            ),
            const SizedBox(height: 32),
            
            // Stats Cards
            Row(
              children: [
                Expanded(
                  child: _buildStatCard(
                    context,
                    '总像素',
                    '21,000,000',
                    Icons.grid_on,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _buildStatCard(
                    context,
                    '矿区数',
                    '21',
                    Icons.account_balance,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildStatCard(
                    context,
                    '赛季剩余',
                    '59 天',
                    Icons.timer,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _buildStatCard(
                    context,
                    '当前产出',
                    '10,417',
                    Icons.trending_up,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 32),
            
            // Actions
            ElevatedButton.icon(
              onPressed: () => context.go('/canvas'),
              icon: const Icon(Icons.brush),
              label: const Text('开始染色'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.all(16),
              ),
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: () => context.go('/color-rights'),
              icon: const Icon(Icons.my_library_add),
              label: const Text('我的染色权'),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.all(16),
              ),
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: () {
                // TODO: 查看拍卖行
              },
              icon: const Icon(Icons.gavel),
              label: const Text('拍卖行'),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.all(16),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(
    BuildContext context,
    String label,
    String value,
    IconData icon,
  ) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: Colors.orange),
            const SizedBox(height: 8),
            Text(
              value,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Colors.grey,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
