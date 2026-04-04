import 'package:flutter/material.dart';
import 'package:bitcoinplace_client/models/auction_model.dart';

/// 拍卖详情屏幕
/// FE-6.2: 实现挂单/竞价 UI
class AuctionDetailScreen extends StatefulWidget {
  final AuctionModel auction;
  final Function(int)? onPlaceBid;
  final VoidCallback? onBuyout;

  const AuctionDetailScreen({
    super.key,
    required this.auction,
    this.onPlaceBid,
    this.onBuyout,
  });

  @override
  State<AuctionDetailScreen> createState() => _AuctionDetailScreenState();
}

class _AuctionDetailScreenState extends State<AuctionDetailScreen> {
  final _bidController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _bidController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('拍卖详情'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 状态和倒计时
            _buildHeader(),
            
            const SizedBox(height: 24),
            
            // 价格信息
            _buildPriceSection(),
            
            const SizedBox(height: 24),
            
            // 染色权信息
            _buildColorRightInfo(),
            
            const SizedBox(height: 24),
            
            // 卖家信息
            _buildSellerInfo(),
            
            const SizedBox(height: 24),
            
            // 竞价历史
            _buildBidHistory(),
            
            const SizedBox(height: 24),
            
            // 操作按钮
            _buildActionButtons(),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        _buildStatusBadge(),
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            const Text('剩余时间'),
            Text(
              widget.auction.formattedTimeRemaining,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: widget.auction.isExpired
                    ? Colors.red
                    : Theme.of(context).colorScheme.primary,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildStatusBadge() {
    Color badgeColor;
    String statusText;
    
    switch (widget.auction.status) {
      case AuctionStatus.active:
        badgeColor = Colors.green;
        statusText = '进行中';
        break;
      case AuctionStatus.sold:
        badgeColor = Colors.orange;
        statusText = '已售出';
        break;
      case AuctionStatus.expired:
        badgeColor = Colors.grey;
        statusText = '已过期';
        break;
      case AuctionStatus.cancelled:
        badgeColor = Colors.red;
        statusText = '已取消';
        break;
    }
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: badgeColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: badgeColor),
      ),
      child: Text(
        statusText,
        style: TextStyle(
          color: badgeColor,
          fontWeight: FontWeight.bold,
          fontSize: 14,
        ),
      ),
    );
  }

  Widget _buildPriceSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primaryContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          Column(
            children: [
              Text(
                '当前价',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 8),
              Text(
                '${widget.auction.currentPrice} PX',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.primary,
                ),
              ),
            ],
          ),
          Container(
            width: 1,
            height: 50,
            color: Theme.of(context).colorScheme.onPrimaryContainer.withOpacity(0.2),
          ),
          Column(
            children: [
              Text(
                '一口价',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 8),
              Text(
                '${widget.auction.buyNowPrice} PX',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.secondary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildColorRightInfo() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '染色权信息',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            const Icon(Icons.location_on_outlined, size: 20),
            const SizedBox(width: 8),
            Text(
              '区域 ${widget.auction.zoneId ?? 1} - 坐标 (${widget.auction.x ?? 0}, ${widget.auction.y ?? 0})',
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSellerInfo() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '卖家信息',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            CircleAvatar(
              radius: 20,
              backgroundColor: Theme.of(context).colorScheme.primary,
              child: Text(
                widget.auction.sellerId.substring(0, 1).toUpperCase(),
                style: const TextStyle(color: Colors.white),
              ),
            ),
            const SizedBox(width: 12),
            Text(
              '卖家：${widget.auction.sellerId}',
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildBidHistory() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '竞价历史',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(12),
          ),
          child: widget.auction.bidCount != null && widget.auction.bidCount! > 0
              ? Text(
                  '${widget.auction.bidCount} 次竞价',
                  style: Theme.of(context).textTheme.bodyMedium,
                )
              : Text(
                  '暂无竞价',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                  ),
                ),
        ),
      ],
    );
  }

  Widget _buildActionButtons() {
    if (!widget.auction.canBid) {
      return const Center(
        child: Text('拍卖已结束'),
      );
    }

    return Column(
      children: [
        // 竞价输入
        Form(
          key: _formKey,
          child: TextFormField(
            controller: _bidController,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              labelText: '竞价金额',
              hintText: '最低竞价 ${widget.auction.minimumBid} PX',
              prefixText: '',
              suffixText: 'PX',
              border: const OutlineInputBorder(),
            ),
            validator: (value) {
              if (value == null || value.isEmpty) {
                return '请输入竞价金额';
              }
              final amount = int.tryParse(value);
              if (amount == null) {
                return '请输入有效数字';
              }
              if (amount < widget.auction.minimumBid) {
                return '最低竞价 ${widget.auction.minimumBid} PX';
              }
              return null;
            },
          ),
        ),
        
        const SizedBox(height: 16),
        
        // 提示
        Text(
          '最低竞价 ${widget.auction.minimumBid} PX',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
          ),
        ),
        
        const SizedBox(height: 16),
        
        // 按钮
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: widget.onPlaceBid != null
                    ? () {
                        if (_formKey.currentState!.validate()) {
                          final amount = int.parse(_bidController.text);
                          widget.onPlaceBid!(amount);
                        }
                      }
                    : null,
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: const Text('竞价'),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: FilledButton(
                onPressed: widget.auction.canBuyout ? widget.onBuyout : null,
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: const Text('一口价购买'),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
