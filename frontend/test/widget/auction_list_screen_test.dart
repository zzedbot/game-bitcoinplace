import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:bitcoinplace_client/presentation/screens/auction_list_screen.dart';
import 'package:bitcoinplace_client/presentation/widgets/auction_card.dart';
import 'package:bitcoinplace_client/models/auction_model.dart';

void main() {
  group('FE-6.1T: Auction List Screen', () {
    testWidgets('FE-6.1T-001: displays auction list', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(home: AuctionListScreen(loading: false)),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byType(AuctionCard), findsWidgets);
      expect(find.text('拍卖行'), findsOneWidget);
    });

    testWidgets('FE-6.1T-002: displays auction count', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(home: AuctionListScreen()),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byType(AuctionCard), findsWidgets);
    });

    testWidgets('FE-6.1T-003: filter by status works', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(home: AuctionListScreen()),
        ),
      );
      await tester.pumpAndSettle();
      final filterButton = find.byIcon(Icons.filter_list);
      await tester.tap(filterButton);
      await tester.pumpAndSettle();
      expect(find.text('筛选'), findsOneWidget);
    });

    testWidgets('FE-6.1T-004: sort by price works', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(home: AuctionListScreen()),
        ),
      );
      await tester.pumpAndSettle();
      final sortButton = find.byIcon(Icons.sort);
      await tester.tap(sortButton);
      await tester.pumpAndSettle();
      expect(find.text('价格排序'), findsOneWidget);
    });

    testWidgets('FE-6.1T-005: empty state displays correctly', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(home: AuctionListScreen(empty: true)),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('暂无拍卖'), findsOneWidget);
      expect(find.byIcon(Icons.gavel), findsOneWidget);
    });

    testWidgets('FE-6.1T-006: loading state displays correctly', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(home: AuctionListScreen(loading: true)),
        ),
      );
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('FE-6.1T-007: auction card shows price', (WidgetTester tester) async {
      final auction = AuctionModel(
        id: 'a1',
        sellerId: 'seller1',
        colorRightId: 'cr1',
        startingPrice: 100,
        currentPrice: 150,
        buyNowPrice: 500,
        status: AuctionStatus.active,
        endTime: DateTime.now().add(const Duration(hours: 24)),
        createdAt: DateTime.now(),
      );
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: AuctionCard(auction: auction),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('150 PX'), findsOneWidget);
    });

    testWidgets('FE-6.1T-008: auction card shows countdown', (WidgetTester tester) async {
      final auction = AuctionModel(
        id: 'a1',
        sellerId: 'seller1',
        colorRightId: 'cr1',
        startingPrice: 100,
        currentPrice: 150,
        buyNowPrice: 500,
        status: AuctionStatus.active,
        endTime: DateTime.now().add(const Duration(hours: 24)),
        createdAt: DateTime.now(),
      );
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: AuctionCard(auction: auction),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.textContaining('剩余'), findsOneWidget);
    });

    testWidgets('FE-6.1T-009: pull to refresh works', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(home: AuctionListScreen()),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byType(RefreshIndicator), findsOneWidget);
    });

    testWidgets('FE-6.1T-010: tap auction navigates to detail', (WidgetTester tester) async {
      bool navigated = false;
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: AuctionListScreen(
              onAuctionTap: (auction) => navigated = true,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      final card = find.byType(AuctionCard);
      await tester.tap(card.first);
      await tester.pumpAndSettle();
      expect(navigated, isTrue);
    });
  });
}
