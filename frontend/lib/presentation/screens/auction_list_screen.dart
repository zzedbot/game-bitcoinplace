import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:bitcoinplace_client/models/auction_model.dart';
import 'package:bitcoinplace_client/presentation/widgets/auction_card.dart';

/// 拍卖行列表屏幕
/// FE-6.1: 实现拍卖行 UI (列表/详情/筛选)
class AuctionListScreen extends ConsumerStatefulWidget {
  final bool empty;
  final bool loading;
  final Function(AuctionModel)? onAuctionTap;

  const AuctionListScreen({
    super.key,
    this.empty = false,
    this.loading = false,
    this.onAuctionTap,
  });

  @override
  ConsumerState<AuctionListScreen> createState() => _AuctionListScreenState();
}

class _AuctionListScreenState extends ConsumerState<AuctionListScreen> {
  String _filterStatus = 'all';
  String _sortBy = 'endTime';
  bool _showFilterDialog = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('拍卖行'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: _openFilterDialog,
            tooltip: '筛选',
          ),
          IconButton(
            icon: const Icon(Icons.sort),
            onPressed: _openSortMenu,
            tooltip: '排序',
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (widget.loading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (widget.empty) {
      return _buildEmptyState();
    }

    return RefreshIndicator(
      onRefresh: _onRefresh,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: 2, // Mock data count
        itemBuilder: (context, index) {
          return AuctionCard(
            auction: _getMockAuction(index),
            onTap: widget.onAuctionTap != null 
                ? () => widget.onAuctionTap!(_getMockAuction(index))
                : null,
          );
        },
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.gavel,
            size: 64,
            color: Theme.of(context).colorScheme.primary.withOpacity(0.5),
          ),
          const SizedBox(height: 16),
          Text(
            '暂无拍卖',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Text(
            '拍卖行即将开启，敬请期待',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
            ),
          ),
        ],
      ),
    );
  }

  void _openFilterDialog() {
    setState(() {
      _showFilterDialog = true;
    });
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('筛选'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            RadioListTile<String>(
              title: const Text('全部'),
              value: 'all',
              groupValue: _filterStatus,
              onChanged: (value) {
                setState(() => _filterStatus = value!);
                Navigator.pop(context);
              },
            ),
            RadioListTile<String>(
              title: const Text('进行中'),
              value: 'active',
              groupValue: _filterStatus,
              onChanged: (value) {
                setState(() => _filterStatus = value!);
                Navigator.pop(context);
              },
            ),
            RadioListTile<String>(
              title: const Text('已售出'),
              value: 'sold',
              groupValue: _filterStatus,
              onChanged: (value) {
                setState(() => _filterStatus = value!);
                Navigator.pop(context);
              },
            ),
          ],
        ),
      ),
    );
  }

  void _openSortMenu() {
    final RenderBox button = context.findRenderObject() as RenderBox;
    
    showMenu(
      context: context,
      position: RelativeRect.fromRect(
        Rect.fromLTWH(
          button.localToGlobal(Offset.zero).dx,
          button.localToGlobal(Offset.zero).dy,
          0,
          0,
        ),
        Rect.fromLTWH(0, 0, button.size.width, button.size.height),
      ),
      items: [
        const PopupMenuItem<String>(
          value: 'endTime',
          child: Text('价格排序'),
        ),
        const PopupMenuItem<String>(
          value: 'priceAsc',
          child: Text('价格从低到高'),
        ),
        const PopupMenuItem<String>(
          value: 'priceDesc',
          child: Text('价格从高到低'),
        ),
      ],
    ).then((value) {
      if (value != null) {
        setState(() => _sortBy = value);
      }
    });
  }

  Future<void> _onRefresh() async {
    // TODO: Implement refresh logic
    await Future.delayed(const Duration(seconds: 1));
  }

  AuctionModel _getMockAuction(int index) {
    return AuctionModel(
      id: 'a${index + 1}',
      sellerId: 'seller${index + 1}',
      colorRightId: 'cr${index + 1}',
      startingPrice: 100 * (index + 1),
      currentPrice: 150 * (index + 1),
      buyNowPrice: 500 * (index + 1),
      status: AuctionStatus.active,
      endTime: DateTime.now().add(Duration(hours: 24 * (index + 1))),
      createdAt: DateTime.now(),
      zoneId: index + 1,
      x: 100 * (index + 1),
      y: 100 * (index + 1),
    );
  }
}
