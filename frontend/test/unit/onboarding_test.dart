import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:bitcoinplace_client/presentation/screens/onboarding_screen.dart';

void main() {
  testWidgets('OnboardingScreen displays 5 pages', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: OnboardingScreen(),
      ),
    );

    // Verify first page is visible
    expect(find.text('欢迎来到 BitcoinPlace'), findsOneWidget);
    
    // Tap next button to go to second page
    await tester.tap(find.text('下一步'));
    await tester.pumpAndSettle();
    
    expect(find.text('21 个矿区'), findsOneWidget);
    
    // Continue to third page
    await tester.tap(find.text('下一步'));
    await tester.pumpAndSettle();
    
    expect(find.text('染色权系统'), findsOneWidget);
    
    // Continue to fourth page
    await tester.tap(find.text('下一步'));
    await tester.pumpAndSettle();
    
    expect(find.text('比特币减半机制'), findsOneWidget);
    
    // Continue to fifth page
    await tester.tap(find.text('下一步'));
    await tester.pumpAndSettle();
    
    expect(find.text('开始创作'), findsWidgets); // Title + button text
  });

  testWidgets('OnboardingScreen has skip button', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: OnboardingScreen(),
      ),
    );

    expect(find.text('跳过'), findsOneWidget);
  });

  testWidgets('OnboardingScreen shows correct dot indicators', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: OnboardingScreen(),
      ),
    );

    // Should have 5 dots
    final dots = find.byType(AnimatedContainer);
    expect(dots, findsWidgets);
  });

  testWidgets('OnboardingScreen last page shows start button', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: OnboardingScreen(),
      ),
    );

    // Navigate to last page
    for (int i = 0; i < 4; i++) {
      await tester.tap(find.text('下一步'));
      await tester.pumpAndSettle();
    }

    // Last page should show "开始创作" button (find the button specifically)
    expect(find.text('开始创作'), findsWidgets); // Title + button text
  });

  testWidgets('OnboardingScreen pages have correct icons', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: OnboardingScreen(),
      ),
    );

    // First page should have brush icon
    expect(find.byIcon(Icons.brush), findsOneWidget);
    
    // Navigate to second page
    await tester.tap(find.text('下一步'));
    await tester.pumpAndSettle();
    
    // Second page should have account_balance icon
    expect(find.byIcon(Icons.account_balance), findsOneWidget);
  });
}
