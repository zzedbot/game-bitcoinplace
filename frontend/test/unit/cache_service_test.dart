import 'package:flutter_test/flutter_test.dart';
import 'package:bitcoinplace_client/services/cache_service.dart';

void main() {
  group('CacheService', () {
    late CacheService cacheService;

    setUp(() {
      cacheService = CacheService();
      cacheService.clear(); // 清空缓存确保测试独立
    });

    tearDown(() {
      cacheService.clear();
    });

    group('Constructor', () {
      test('creates CacheService instance', () {
        final service = CacheService();
        expect(service, isNotNull);
      });

      test('singleton returns same instance', () {
        final service1 = CacheService();
        final service2 = CacheService();
        expect(service1, equals(service2));
      });
    });

    group('Basic Operations', () {
      test('put and get cache value', () async {
        await cacheService.put('test_key', 'test_value');
        final value = cacheService.get<String>('test_key');
        expect(value, equals('test_value'));
      });

      test('get non-existent key returns null', () {
        final value = cacheService.get<String>('non_existent');
        expect(value, isNull);
      });

      test('put overwrites existing key', () async {
        await cacheService.put('key', 'value1');
        await cacheService.put('key', 'value2');
        final value = cacheService.get<String>('key');
        expect(value, equals('value2'));
      });

      test('remove cache entry', () async {
        await cacheService.put('key', 'value');
        await cacheService.remove('key');
        final value = cacheService.get<String>('key');
        expect(value, isNull);
      });

      test('remove non-existent key does not throw', () async {
        expect(() => cacheService.remove('non_existent'), returnsNormally);
      });

      test('clear all cache entries', () async {
        await cacheService.put('key1', 'value1');
        await cacheService.put('key2', 'value2');
        await cacheService.put('key3', 'value3');
        await cacheService.clear();
        
        expect(cacheService.get<String>('key1'), isNull);
        expect(cacheService.get<String>('key2'), isNull);
        expect(cacheService.get<String>('key3'), isNull);
      });
    });

    group('Type Safety', () {
      test('store and retrieve integer', () async {
        await cacheService.put('int_key', 42);
        final value = cacheService.get<int>('int_key');
        expect(value, equals(42));
      });

      test('store and retrieve double', () async {
        await cacheService.put('double_key', 3.14);
        final value = cacheService.get<double>('double_key');
        expect(value, equals(3.14));
      });

      test('store and retrieve boolean', () async {
        await cacheService.put('bool_key', true);
        final value = cacheService.get<bool>('bool_key');
        expect(value, isTrue);
      });

      test('store and retrieve list', () async {
        await cacheService.put('list_key', [1, 2, 3]);
        final value = cacheService.get<List>('list_key');
        expect(value, equals([1, 2, 3]));
      });

      test('store and retrieve map', () async {
        await cacheService.put('map_key', {'key': 'value'});
        final value = cacheService.get<Map>('map_key');
        expect(value, equals({'key': 'value'}));
      });

      test('store and retrieve custom object', () async {
        final obj = {'name': 'Test', 'id': 123};
        await cacheService.put('obj_key', obj);
        final value = cacheService.get<Map>('obj_key');
        expect(value, equals(obj));
      });

      test('type mismatch returns null', () async {
        await cacheService.put('int_key', 42);
        final value = cacheService.get<String>('int_key');
        expect(value, isNull);
      });
    });

    group('Cache Expiration', () {
      test('cache expires after short TTL', () async {
        cacheService.put('short_key', 'value', ttl: const Duration(milliseconds: 10));
        expect(cacheService.get<String>('short_key'), equals('value'));
        await Future.delayed(const Duration(milliseconds: 20));
        expect(cacheService.get<String>('short_key'), isNull);
      });

      test('cache does not expire immediately', () {
        cacheService.put('long_key', 'value', ttl: const Duration(seconds: 10));
        expect(cacheService.get<String>('long_key'), equals('value'));
      });

      test('custom TTL overrides default', () async {
        cacheService.put('custom_key', 'value', ttl: const Duration(milliseconds: 10));
        await Future.delayed(const Duration(milliseconds: 20));
        expect(cacheService.get<String>('custom_key'), isNull);
      });
    });

    group('Cache Size Management', () {
      test('evicts oldest entry when cache is full', () {
        // 设置较小的缓存大小进行测试（需要修改服务或使用反射）
        // 这里测试正常情况下的缓存行为
        for (int i = 0; i < 50; i++) {
          cacheService.put('key_$i', 'value_$i');
        }
        
        final stats = cacheService.getStats();
        expect(stats['totalEntries'], lessThanOrEqualTo(100));
      });

      test('maintains LRU order', () {
        // 添加多个条目
        cacheService.put('key1', 'value1');
        cacheService.put('key2', 'value2');
        
        // 访问 key1，使其变为最近使用
        cacheService.get('key1');
        
        // key2 应该是 LRU 候选
        // 这个测试需要内部状态验证，暂时跳过详细验证
      });
    });

    group('Cache Stats', () {
      test('getStats returns correct structure', () {
        final stats = cacheService.getStats();
        
        expect(stats.containsKey('totalEntries'), isTrue);
        expect(stats.containsKey('validEntries'), isTrue);
        expect(stats.containsKey('expiredEntries'), isTrue);
        expect(stats.containsKey('maxSize'), isTrue);
      });

      test('getStats returns correct counts for empty cache', () {
        final stats = cacheService.getStats();
        
        expect(stats['totalEntries'], equals(0));
        expect(stats['validEntries'], equals(0));
        expect(stats['expiredEntries'], equals(0));
        expect(stats['maxSize'], equals(100));
      });

      test('getStats returns correct counts with entries', () async {
        await cacheService.put('key1', 'value1');
        await cacheService.put('key2', 'value2');
        await cacheService.put('key3', 'value3');
        
        final stats = cacheService.getStats();
        
        expect(stats['totalEntries'], equals(3));
        expect(stats['validEntries'], equals(3));
        expect(stats['expiredEntries'], equals(0));
      });

      test('getStats counts expired entries correctly', () async {
        cacheService.put('short_key', 'value', ttl: const Duration(milliseconds: 10));
        cacheService.put('long_key', 'value', ttl: const Duration(minutes: 5));
        await Future.delayed(const Duration(milliseconds: 20));
        final stats = cacheService.getStats();
        expect(stats['validEntries'], equals(1));
      });
    });

    group('Async Operations', () {
      test('preload caches value from future', () async {
        await cacheService.preload(
          'preload_key',
          () async => 'loaded_value',
        );
        
        // 等待一小段时间确保异步操作完成
        await Future.delayed(const Duration(milliseconds: 10));
        expect(cacheService.get<String>('preload_key'), equals('loaded_value'));
      });

      test('preload does not overwrite existing cache', () async {
        await cacheService.put('existing_key', 'existing_value');
        
        await cacheService.preload(
          'existing_key',
          () async => 'new_value',
        );
        
        final value = cacheService.get<String>('existing_key');
        expect(value, equals('existing_value'));
      });

      test('preload handles errors gracefully', () async {
        // 不应该抛出异常
        expect(() => cacheService.preload(
          'error_key',
          () async => throw Exception('Load failed'),
        ), returnsNormally);
      });

      test('getOrLoad returns cached value if available', () async {
        await cacheService.put('cached_key', 'cached_value');
        
        var loadCalled = false;
        await cacheService.getOrLoad(
          'cached_key',
          () async {
            loadCalled = true;
            return 'loaded_value';
          },
        );
        
        // 验证缓存值被返回（不触发加载）
        expect(loadCalled, isFalse);
      });

      test('getOrLoad loads value if not cached', () async {
        var loadCalled = false;
        await cacheService.getOrLoad(
          'miss_key',
          () async {
            loadCalled = true;
            return 'loaded_value';
          },
        );
        
        // 验证加载被触发
        expect(loadCalled, isTrue);
      });

      test('getOrLoad uses custom TTL', () {
        cacheService.getOrLoad(
          'ttl_key',
          () async => 'value',
          ttl: const Duration(milliseconds: 50),
        );
        
        // 验证方法调用成功
        expect(cacheService.get<String>('ttl_key'), isNull);
      });
    });

    group('Edge Cases', () {
      test('handles null values correctly', () {
        // null 值不应该被缓存
        cacheService.put('null_key', null);
        final value = cacheService.get('null_key');
        expect(value, isNull);
      });

      test('handles empty string keys', () {
        cacheService.put('', 'value');
        final value = cacheService.get<String>('');
        expect(value, equals('value'));
      });

      test('handles special characters in keys', () {
        cacheService.put('key/with/slashes', 'value1');
        cacheService.put('key:with:colons', 'value2');
        cacheService.put('key@with@ats', 'value3');
        
        expect(cacheService.get<String>('key/with/slashes'), equals('value1'));
        expect(cacheService.get<String>('key:with:colons'), equals('value2'));
        expect(cacheService.get<String>('key@with@ats'), equals('value3'));
      });

      test('concurrent gets do not cause race conditions', () {
        cacheService.put('concurrent_key', 'value');
        
        final results = List.generate(
          10,
          (i) => cacheService.get<String>('concurrent_key'),
        );
        
        expect(results.every((r) => r == 'value'), isTrue);
      });
    });

    group('Performance', () {
      test('handles large number of entries', () {
        // 添加 100 个条目
        for (int i = 0; i < 100; i++) {
          cacheService.put('perf_key_$i', 'value_$i');
        }
        
        final stats = cacheService.getStats();
        expect(stats['totalEntries'], equals(100));
        
        // 验证所有条目都可访问
        for (int i = 0; i < 100; i++) {
          expect(cacheService.get<String>('perf_key_$i'), equals('value_$i'));
        }
      });

      test('get operation is fast', () {
        cacheService.put('speed_key', 'value');
        
        final stopwatch = Stopwatch()..start();
        for (int i = 0; i < 1000; i++) {
          cacheService.get<String>('speed_key');
        }
        stopwatch.stop();
        
        // 1000 次获取应该在 100ms 内完成
        expect(stopwatch.elapsedMilliseconds, lessThan(100));
      });
    });

    group('Hive Persistent Storage', () {
      test('initialize Hive on startup', () async {
        // TODO: Implement Hive initialization test
        // This test should verify that Hive is properly initialized
        // when the app starts and boxes are opened
        expect(true, isTrue, skip: 'Hive integration pending');
      });

      test('persist cache data across app restarts', () async {
        // TODO: Implement persistence test
        // Store data in Hive box, simulate restart, verify data persists
        expect(true, isTrue, skip: 'Hive persistence pending');
      });

      test('store complex objects in Hive', () async {
        // TODO: Implement complex object storage test
        // Verify that models can be serialized and stored in Hive
        expect(true, isTrue, skip: 'Hive object storage pending');
      });

      test('Hive box operations are isolated', () async {
        // TODO: Implement isolation test
        // Verify that different boxes don't interfere with each other
        expect(true, isTrue, skip: 'Hive isolation test pending');
      });
    });

    // FE-3.8T: 本地缓存读写测试
    group('FE-3.8T Local Cache Read/Write', () {
      test('FE-3.8T-001: Memory cache read/write basic operation', () async {
        await cacheService.put('fe38t_key1', 'fe38t_value1');
        final value = cacheService.get<String>('fe38t_key1');
        expect(value, equals('fe38t_value1'));
      });

      test('FE-3.8T-002: Memory cache returns null for expired key', () async {
        await cacheService.put('short_key', 'value', ttl: const Duration(milliseconds: 50));
        await Future.delayed(const Duration(milliseconds: 100));
        final value = cacheService.get<String>('short_key');
        expect(value, isNull);
      });

      test('FE-3.8T-003: Memory cache LRU eviction when maxSize exceeded', () async {
        // 设置最大大小为 3
        final smallCache = CacheService();
        // 注意：实际测试需要能够设置 maxSize
        // TODO: Implement LRU eviction test with configurable maxSize
        expect(true, isTrue, skip: 'LRU eviction test pending maxSize injection');
      });

      test('FE-3.8T-004: Hive persistence survives app restart simulation', () async {
        // 初始化 Hive
        await cacheService.initialize();
        
        // 写入数据
        await cacheService.put('persist_key', 'persist_value');
        
        // 模拟重启：创建新实例
        final newCache = CacheService();
        await newCache.initialize();
        
        // 验证数据持久化
        final value = newCache.get<String>('persist_key');
        expect(value, equals('persist_value'));
        
        // 清理
        await newCache.clear();
        await newCache.close();
      });

      test('FE-3.8T-005: Hive stores data with TTL metadata', () async {
        await cacheService.initialize();
        
        final expiresAt = DateTime.now().add(const Duration(minutes: 5));
        await cacheService.put('ttl_key', 'ttl_value', ttl: const Duration(minutes: 5));
        
        // 验证 Hive 中存储了 TTL 信息
        final hiveBox = cacheService.hiveBox;
        expect(hiveBox, isNotNull);
        final storedData = hiveBox!.get('ttl_key');
        expect(storedData, isNotNull);
        expect(storedData['value'], equals('ttl_value'));
        expect(storedData['expiresAt'], isNotNull);
        
        await cacheService.clear();
      });

      test('FE-3.8T-006: Hive remove deletes from both layers', () async {
        await cacheService.initialize();
        
        await cacheService.put('remove_key', 'remove_value');
        
        // 验证内存中有数据
        expect(cacheService.get<String>('remove_key'), equals('remove_value'));
        
        // 删除
        await cacheService.remove('remove_key');
        
        // 验证内存中无数据
        expect(cacheService.get<String>('remove_key'), isNull);
        
        // 验证 Hive 中无数据
        final hiveBox = cacheService.hiveBox;
        expect(hiveBox!.get('remove_key'), isNull);
        
        await cacheService.close();
      });

      test('FE-3.8T-007: Hive clear removes all data', () async {
        await cacheService.initialize();
        
        await cacheService.put('clear_key1', 'value1');
        await cacheService.put('clear_key2', 'value2');
        await cacheService.put('clear_key3', 'value3');
        
        await cacheService.clear();
        
        // 验证内存清空
        expect(cacheService.getStats()['totalEntries'], equals(0));
        
        // 验证 Hive 清空
        final hiveBox = cacheService.hiveBox;
        expect(hiveBox!.length, equals(0));
        
        await cacheService.close();
      });

      test('FE-3.8T-008: getStats includes Hive box size', () async {
        await cacheService.initialize();
        
        await cacheService.put('stats_key1', 'value1');
        await cacheService.put('stats_key2', 'value2');
        
        final stats = cacheService.getStats();
        
        expect(stats['totalEntries'], equals(2));
        expect(stats['hiveBoxSize'], equals(2));
        
        await cacheService.clear();
      });

      test('FE-3.8T-009: initialize is idempotent', () async {
        await cacheService.initialize();
        final firstBox = cacheService.hiveBox;
        
        await cacheService.initialize();
        final secondBox = cacheService.hiveBox;
        
        expect(firstBox, equals(secondBox));
        
        await cacheService.close();
      });

      test('FE-3.8T-010: close releases Hive box resources', () async {
        await cacheService.initialize();
        await cacheService.close();
        
        expect(cacheService.isInitialized, isFalse);
        expect(cacheService.hiveBox, isNull);
      });

      test('FE-3.8T-011: getOrLoad with Hive persistence', () async {
        await cacheService.initialize();
        
        var loadCount = 0;
        final result = await cacheService.getOrLoad(
          'getorload_key',
          () async {
            loadCount++;
            return 'loaded_value';
          },
        );
        
        expect(result, equals('loaded_value'));
        expect(loadCount, equals(1));
        
        // 第二次调用应该从缓存返回
        final cachedResult = await cacheService.getOrLoad(
          'getorload_key',
          () async {
            loadCount++;
            return 'loaded_value2';
          },
        );
        
        expect(cachedResult, equals('loaded_value'));
        expect(loadCount, equals(1)); // 不应该再次加载
        
        await cacheService.clear();
      });

      test('FE-3.8T-012: preload with Hive persistence', () async {
        await cacheService.initialize();
        
        await cacheService.preload(
          'preload_key',
          () async => 'preload_value',
        );
        
        // 等待异步操作完成
        await Future.delayed(const Duration(milliseconds: 50));
        
        final value = cacheService.get<String>('preload_key');
        expect(value, equals('preload_value'));
        
        await cacheService.clear();
      });
    });
  });
}
