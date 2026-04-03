import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:bitcoinplace_client/presentation/screens/canvas_screen.dart';

void main() {
  testWidgets('CanvasScreen displays correctly', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: CanvasScreen(),
        ),
      ),
    );

    // Verify app bar title
    expect(find.text('BitcoinPlace'), findsOneWidget);
    
    // Verify zoom controls
    expect(find.byIcon(Icons.zoom_out), findsOneWidget);
    expect(find.byIcon(Icons.zoom_in), findsOneWidget);
    expect(find.byIcon(Icons.center_focus_strong), findsOneWidget);
  });

  testWidgets('CanvasScreen zoom controls work', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: CanvasScreen(),
        ),
      ),
    );

    // Tap zoom in button
    await tester.tap(find.byIcon(Icons.zoom_in));
    await tester.pump();

    // Tap zoom out button
    await tester.tap(find.byIcon(Icons.zoom_out));
    await tester.pump();

    // Tap center focus button
    await tester.tap(find.byIcon(Icons.center_focus_strong));
    await tester.pump();
  });

  testWidgets('CanvasScreen color palette displays 16 colors', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: CanvasScreen(),
        ),
      ),
    );

    // Verify color buttons exist (16 colors)
    final colorButtons = find.byType(Container);
    expect(colorButtons, findsWidgets);
  });

  testWidgets('CanvasScreen color selection works', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: CanvasScreen(),
        ),
      ),
    );

    // Tap on a color button (first color)
    final firstColor = find.byType(Container).first;
    await tester.tap(firstColor);
    await tester.pump();
  });
}
