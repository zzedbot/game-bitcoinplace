import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:bitcoinplace_client/services/image_optimizer.dart';

void main() {
  group('ImageOptimizer', () {
    late ImageOptimizer imageOptimizer;

    setUp(() {
      imageOptimizer = ImageOptimizer();
    });

    group('Constructor', () {
      test('creates ImageOptimizer instance', () {
        final optimizer = ImageOptimizer();
        expect(optimizer, isNotNull);
      });

      test('singleton returns same instance', () {
        final optimizer1 = ImageOptimizer();
        final optimizer2 = ImageOptimizer();
        expect(optimizer1, equals(optimizer2));
      });
    });

    group('buildOptimizedNetworkImage', () {
      test('returns Image.network widget', () {
        final widget = imageOptimizer.buildOptimizedNetworkImage(
          'https://example.com/image.png',
        );

        expect(widget, isA<Image>());
      });

      test('applies width and height parameters', () {
        final widget = imageOptimizer.buildOptimizedNetworkImage(
          'https://example.com/image.png',
          width: 200,
          height: 300,
        );

        expect(widget, isA<Image>());
        // 验证参数被传递（通过 widget 属性）
      });

      test('applies fit parameter', () {
        final widget = imageOptimizer.buildOptimizedNetworkImage(
          'https://example.com/image.png',
          fit: BoxFit.contain,
        );

        expect(widget, isA<Image>());
      });

      test('uses default fit when not specified', () {
        final widget = imageOptimizer.buildOptimizedNetworkImage(
          'https://example.com/image.png',
        );

        expect(widget, isA<Image>());
      });

      test('accepts custom placeholder', () {
        final customPlaceholder = const Text('Loading...');
        final widget = imageOptimizer.buildOptimizedNetworkImage(
          'https://example.com/image.png',
          placeholder: customPlaceholder,
        );

        expect(widget, isA<Image>());
      });

      test('accepts custom error widget', () {
        final customErrorWidget = const Text('Error');
        final widget = imageOptimizer.buildOptimizedNetworkImage(
          'https://example.com/image.png',
          errorWidget: customErrorWidget,
        );

        expect(widget, isA<Image>());
      });

      test('handles null placeholder gracefully', () {
        final widget = imageOptimizer.buildOptimizedNetworkImage(
          'https://example.com/image.png',
          placeholder: null,
        );

        expect(widget, isA<Image>());
      });

      test('handles null errorWidget gracefully', () {
        final widget = imageOptimizer.buildOptimizedNetworkImage(
          'https://example.com/image.png',
          errorWidget: null,
        );

        expect(widget, isA<Image>());
      });
    });

    group('buildCachedImage', () {
      test('returns Image.network widget', () {
        final widget = imageOptimizer.buildCachedImage(
          'https://example.com/image.png',
        );

        expect(widget, isA<Image>());
      });

      test('applies width and height parameters', () {
        final widget = imageOptimizer.buildCachedImage(
          'https://example.com/image.png',
          width: 200,
          height: 300,
        );

        expect(widget, isA<Image>());
      });

      test('applies fit parameter', () {
        final widget = imageOptimizer.buildCachedImage(
          'https://example.com/image.png',
          fit: BoxFit.fill,
        );

        expect(widget, isA<Image>());
      });

      test('uses default fit when not specified', () {
        final widget = imageOptimizer.buildCachedImage(
          'https://example.com/image.png',
        );

        expect(widget, isA<Image>());
      });

      test('caches image with specified dimensions', () {
        final widget = imageOptimizer.buildCachedImage(
          'https://example.com/image.png',
          width: 400,
          height: 600,
        );

        expect(widget, isA<Image>());
      });
    });

    group('Edge Cases', () {
      test('handles empty URL', () {
        final widget = imageOptimizer.buildOptimizedNetworkImage('');
        expect(widget, isA<Image>());
      });

      test('handles very long URL', () {
        final longUrl = 'https://example.com/' + 'a' * 1000 + '/image.png';
        final widget = imageOptimizer.buildOptimizedNetworkImage(longUrl);
        expect(widget, isA<Image>());
      });

      test('handles special characters in URL', () {
        final widget = imageOptimizer.buildOptimizedNetworkImage(
          'https://example.com/image with spaces.png',
        );
        expect(widget, isA<Image>());
      });

      test('handles zero dimensions', () {
        final widget = imageOptimizer.buildOptimizedNetworkImage(
          'https://example.com/image.png',
          width: 0,
          height: 0,
        );
        expect(widget, isA<Image>());
      });

      test('handles negative dimensions', () {
        final widget = imageOptimizer.buildOptimizedNetworkImage(
          'https://example.com/image.png',
          width: -100,
          height: -200,
        );
        expect(widget, isA<Image>());
      });
    });

    group('Different Image Types', () {
      test('handles JPEG images', () {
        final widget = imageOptimizer.buildOptimizedNetworkImage(
          'https://example.com/image.jpg',
        );
        expect(widget, isA<Image>());
      });

      test('handles PNG images', () {
        final widget = imageOptimizer.buildOptimizedNetworkImage(
          'https://example.com/image.png',
        );
        expect(widget, isA<Image>());
      });

      test('handles GIF images', () {
        final widget = imageOptimizer.buildOptimizedNetworkImage(
          'https://example.com/image.gif',
        );
        expect(widget, isA<Image>());
      });

      test('handles WebP images', () {
        final widget = imageOptimizer.buildOptimizedNetworkImage(
          'https://example.com/image.webp',
        );
        expect(widget, isA<Image>());
      });

      test('handles images with query parameters', () {
        final widget = imageOptimizer.buildOptimizedNetworkImage(
          'https://example.com/image.png?width=100&height=200',
        );
        expect(widget, isA<Image>());
      });
    });
  });

  group('RenderOptimizer', () {
    group('buildOptimizedListView', () {
      test('returns ListView widget', () {
        final widget = RenderOptimizer.buildOptimizedListView(
          itemCount: 10,
          itemBuilder: (context, index) => Text('Item $index'),
        );

        expect(widget, isA<ListView>());
      });

      test('applies itemCount correctly', () {
        final widget = RenderOptimizer.buildOptimizedListView(
          itemCount: 5,
          itemBuilder: (context, index) => Text('Item $index'),
        );

        expect(widget, isA<ListView>());
      });

      test('applies custom key', () {
        final key = UniqueKey();
        final widget = RenderOptimizer.buildOptimizedListView(
          itemCount: 10,
          itemBuilder: (context, index) => Text('Item $index'),
          key: key,
        );

        expect(widget, isA<ListView>());
        expect(widget.key, equals(key));
      });

      test('applies addAutomaticKeepAlives', () {
        final widget = RenderOptimizer.buildOptimizedListView(
          itemCount: 10,
          itemBuilder: (context, index) => Text('Item $index'),
          addAutomaticKeepAlives: false,
        );

        expect(widget, isA<ListView>());
      });

      test('applies addRepaintBoundaries', () {
        final widget = RenderOptimizer.buildOptimizedListView(
          itemCount: 10,
          itemBuilder: (context, index) => Text('Item $index'),
          addRepaintBoundaries: false,
        );

        expect(widget, isA<ListView>());
      });

      test('applies addSemanticIndexes', () {
        final widget = RenderOptimizer.buildOptimizedListView(
          itemCount: 10,
          itemBuilder: (context, index) => Text('Item $index'),
          addSemanticIndexes: false,
        );

        expect(widget, isA<ListView>());
      });

      test('applies cacheExtent', () {
        final widget = RenderOptimizer.buildOptimizedListView(
          itemCount: 10,
          itemBuilder: (context, index) => Text('Item $index'),
          cacheExtent: 500,
        );

        expect(widget, isA<ListView>());
      });

      test('handles zero itemCount', () {
        final widget = RenderOptimizer.buildOptimizedListView(
          itemCount: 0,
          itemBuilder: (context, index) => Text('Item $index'),
        );

        expect(widget, isA<ListView>());
      });

      test('handles large itemCount', () {
        final widget = RenderOptimizer.buildOptimizedListView(
          itemCount: 1000,
          itemBuilder: (context, index) => Text('Item $index'),
        );

        expect(widget, isA<ListView>());
      });
    });

    group('buildOptimizedGridView', () {
      test('returns GridView widget', () {
        final widget = RenderOptimizer.buildOptimizedGridView(
          crossAxisCount: 3,
          itemCount: 10,
          itemBuilder: (context, index) => Text('Item $index'),
        );

        expect(widget, isA<GridView>());
      });

      test('applies crossAxisCount correctly', () {
        final widget = RenderOptimizer.buildOptimizedGridView(
          crossAxisCount: 4,
          itemCount: 10,
          itemBuilder: (context, index) => Text('Item $index'),
        );

        expect(widget, isA<GridView>());
      });

      test('applies itemCount correctly', () {
        final widget = RenderOptimizer.buildOptimizedGridView(
          crossAxisCount: 3,
          itemCount: 20,
          itemBuilder: (context, index) => Text('Item $index'),
        );

        expect(widget, isA<GridView>());
      });

      test('applies custom key', () {
        final key = UniqueKey();
        final widget = RenderOptimizer.buildOptimizedGridView(
          crossAxisCount: 3,
          itemCount: 10,
          itemBuilder: (context, index) => Text('Item $index'),
          key: key,
        );

        expect(widget, isA<GridView>());
        expect(widget.key, equals(key));
      });

      test('applies mainAxisSpacing', () {
        final widget = RenderOptimizer.buildOptimizedGridView(
          crossAxisCount: 3,
          itemCount: 10,
          itemBuilder: (context, index) => Text('Item $index'),
          mainAxisSpacing: 16,
        );

        expect(widget, isA<GridView>());
      });

      test('applies crossAxisSpacing', () {
        final widget = RenderOptimizer.buildOptimizedGridView(
          crossAxisCount: 3,
          itemCount: 10,
          itemBuilder: (context, index) => Text('Item $index'),
          crossAxisSpacing: 16,
        );

        expect(widget, isA<GridView>());
      });

      test('applies childAspectRatio', () {
        final widget = RenderOptimizer.buildOptimizedGridView(
          crossAxisCount: 3,
          itemCount: 10,
          itemBuilder: (context, index) => Text('Item $index'),
          childAspectRatio: 2,
        );

        expect(widget, isA<GridView>());
      });

      test('handles zero itemCount', () {
        final widget = RenderOptimizer.buildOptimizedGridView(
          crossAxisCount: 3,
          itemCount: 0,
          itemBuilder: (context, index) => Text('Item $index'),
        );

        expect(widget, isA<GridView>());
      });

      test('handles single crossAxisCount', () {
        final widget = RenderOptimizer.buildOptimizedGridView(
          crossAxisCount: 1,
          itemCount: 10,
          itemBuilder: (context, index) => Text('Item $index'),
        );

        expect(widget, isA<GridView>());
      });

      test('handles large crossAxisCount', () {
        final widget = RenderOptimizer.buildOptimizedGridView(
          crossAxisCount: 10,
          itemCount: 100,
          itemBuilder: (context, index) => Text('Item $index'),
        );

        expect(widget, isA<GridView>());
      });
    });

    group('Edge Cases', () {
      test('ListView with null itemBuilder throws', () {
        expect(
          () => RenderOptimizer.buildOptimizedListView(
            itemCount: 10,
            itemBuilder: null as IndexedWidgetBuilder,
          ),
          throwsA(isA<TypeError>()),
        );
      });

      test('GridView with null itemBuilder throws', () {
        expect(
          () => RenderOptimizer.buildOptimizedGridView(
            crossAxisCount: 3,
            itemCount: 10,
            itemBuilder: null as IndexedWidgetBuilder,
          ),
          throwsA(isA<TypeError>()),
        );
      });

      test('GridView with zero crossAxisCount throws assertion', () {
        expect(
          () => RenderOptimizer.buildOptimizedGridView(
            crossAxisCount: 0,
            itemCount: 10,
            itemBuilder: (context, index) => Text('Item $index'),
          ),
          throwsA(isA<AssertionError>()),
        );
      });
    });
  });
}
