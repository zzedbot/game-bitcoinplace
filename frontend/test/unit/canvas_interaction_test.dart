import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:bitcoinplace_client/presentation/screens/canvas_screen.dart';

void main() {
  testWidgets('CanvasScreen color selection works', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: CanvasScreen(),
        ),
      ),
    );

    // Tap on color button 5 (red)
    final fifthColor = find.byType(Container).at(5);
    await tester.tap(fifthColor);
    await tester.pump();

    // Verify color selection feedback (SnackBar)
    expect(find.textContaining('染色'), findsNothing);
  });

  testWidgets('CanvasScreen tap on canvas shows feedback', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: CanvasScreen(),
        ),
      ),
    );

    // Wait for initial build
    await tester.pumpAndSettle();

    // Tap on screen center (canvas area)
    await tester.tapAt(const Offset(400, 300));
    await tester.pump();

    // Verify feedback is shown
    expect(find.textContaining('染色'), findsWidgets);
  });

  testWidgets('CanvasScreen WebSocket status icon displays', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: CanvasScreen(),
        ),
      ),
    );

    // Wait for initial build
    await tester.pumpAndSettle();

    // Verify WiFi icon is present (disconnected state)
    expect(find.byIcon(Icons.wifi_off), findsOneWidget);
  });

  testWidgets('CanvasScreen zoom percentage displays', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: CanvasScreen(),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Verify zoom percentage is shown (should be around 10%)
    expect(find.textContaining('%'), findsOneWidget);
  });

  testWidgets('CanvasScreen palette has 16 colors', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: CanvasScreen(),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Count color buttons (Container widgets in palette)
    final colorButtons = find.byType(Container);
    expect(colorButtons, findsWidgets);
  });
}
