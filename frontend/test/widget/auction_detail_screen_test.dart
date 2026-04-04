import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:bitcoinplace_client/presentation/screens/auction_detail_screen.dart';
import 'package:bitcoinplace_client/models/auction_model.dart';

void main() {
  group('FE-6.2T: Auction Detail Screen', () {
    final mockAuction = AuctionModel(
      id: 'a1',
      sellerId: 'seller1',
      colorRightId: 'cr1',
      startingPrice: 100,
      currentPrice: 150,
      buyNowPrice: 500,
      status: AuctionStatus.active,
      endTime: DateTime.now().add(const Duration(hours: 24)),
      createdAt: DateTime.now(),
      zoneId: 1,
      x: 100,
      y: 100,
    );

    testWidgets('FE-6.2T-001: displays auction details', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: AuctionDetailScreen(auction: mockAuction),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('拍卖详情'), findsOneWidget);
      expect(find.text('150 PX'), findsOneWidget);
    });

    testWidgets('FE-6.2T-002: displays current price', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: AuctionDetailScreen(auction: mockAuction),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('当前价'), findsOneWidget);
      expect(find.text('150 PX'), findsOneWidget);
    });

    testWidgets('FE-6.2T-003: displays buy-now price', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: AuctionDetailScreen(auction: mockAuction),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('500 PX'), findsOneWidget);
    });

    testWidgets('FE-6.2T-004: displays countdown timer', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: AuctionDetailScreen(auction: mockAuction),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.textContaining('剩余'), findsOneWidget);
      expect(find.textContaining('小时'), findsOneWidget);
    });

    testWidgets('FE-6.2T-005: place bid button works', (WidgetTester tester) async {
      bool bidCalled = false;
      await tester.pumpWidget(
        MaterialApp(
          home: AuctionDetailScreen(
            auction: mockAuction,
            onPlaceBid: (amount) {
              bidCalled = true;
            },
          ),
        ),
      );
      await tester.pumpAndSettle();
      
      // Enter bid amount first
      final bidField = find.byType(TextFormField);
      await tester.enterText(bidField, '200');
      await tester.pumpAndSettle();
      
      // Scroll down to reveal buttons
      await tester.drag(
        find.byType(SingleChildScrollView),
        const Offset(0, -300),
      );
      await tester.pumpAndSettle();
      
      // Tap bid button
      final bidButton = find.text('竞价');
      await tester.tap(bidButton);
      await tester.pumpAndSettle();
      
      expect(bidCalled, isTrue);
    });

    testWidgets('FE-6.2T-006: buy-now button works', (WidgetTester tester) async {
      bool buyoutCalled = false;
      await tester.pumpWidget(
        MaterialApp(
          home: AuctionDetailScreen(
            auction: mockAuction,
            onBuyout: () {
              buyoutCalled = true;
            },
          ),
        ),
      );
      await tester.pumpAndSettle();
      
      // Scroll down to reveal buttons
      await tester.drag(
        find.byType(SingleChildScrollView),
        const Offset(0, -300),
      );
      await tester.pumpAndSettle();
      
      // Tap buy-now button
      final buyoutButton = find.text('一口价购买');
      await tester.tap(buyoutButton);
      await tester.pumpAndSettle();
      
      expect(buyoutCalled, isTrue);
    });

    testWidgets('FE-6.2T-007: bid input field works', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: AuctionDetailScreen(auction: mockAuction),
        ),
      );
      await tester.pumpAndSettle();
      final bidField = find.byType(TextFormField);
      await tester.enterText(bidField, '200');
      await tester.pumpAndSettle();
      expect(find.text('200'), findsOneWidget);
    });

    testWidgets('FE-6.2T-008: bid history displays', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: AuctionDetailScreen(auction: mockAuction),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('竞价历史'), findsOneWidget);
    });

    testWidgets('FE-6.2T-009: minimum bid hint displays', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: AuctionDetailScreen(auction: mockAuction),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.textContaining('最低竞价 151 PX'), findsWidgets);
    });

    testWidgets('FE-6.2T-010: auction status badge displays', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: AuctionDetailScreen(auction: mockAuction),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('进行中'), findsOneWidget);
    });

    testWidgets('FE-6.2T-011: seller info displays', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: AuctionDetailScreen(auction: mockAuction),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('卖家：seller1'), findsOneWidget);
    });

    testWidgets('FE-6.2T-012: color right location displays', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: AuctionDetailScreen(auction: mockAuction),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.textContaining('坐标'), findsOneWidget);
      expect(find.textContaining('100, 100'), findsOneWidget);
    });
  });
}
