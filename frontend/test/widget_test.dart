// This is a basic Flutter widget test.

import 'package:flutter_test/flutter_test.dart';
import 'package:bitcoinplace_client/main.dart';

void main() {
  testWidgets('App loads successfully', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const BitcoinPlaceApp());

    // Verify that onboarding screen is displayed (initial route)
    expect(find.text('欢迎来到 BitcoinPlace'), findsOneWidget);
  });

  testWidgets('Onboarding screen displays correctly', (WidgetTester tester) async {
    await tester.pumpWidget(const BitcoinPlaceApp());

    // Verify onboarding screen elements
    expect(find.text('欢迎来到 BitcoinPlace'), findsOneWidget);
    expect(find.text('21M 像素的比特币主题协作画布，与全球用户共同创作'), findsOneWidget);
    expect(find.text('下一步'), findsOneWidget);
    expect(find.text('跳过'), findsOneWidget);
  });
}
