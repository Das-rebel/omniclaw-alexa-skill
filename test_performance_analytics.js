/**
 * OmniClaw 2.0 Performance & Analytics Validation Suite
 *
 * Tests performance characteristics and analytics systems to validate targets:
 * - Response Time (P95 <2s target)
 * - Memory Usage (No leaks target)
 * - Confidence Scoring
 * - Routing Performance (<100ms target)
 * - Session Lifecycle Tracking
 * - Feature Flags Assignment
 * - Metrics Collection
 */

const SmartRouter = require('./infrastructure/cloud-functions/deploy/core/smart_router');
const AnalyticsTracker = require('./infrastructure/cloud-functions/deploy/analytics/analytics_tracker');
const FeatureFlags = require('./infrastructure/cloud-functions/deploy/analytics/feature_flags');
const MetricsCollector = require('./infrastructure/cloud-functions/deploy/analytics/metrics_collector');

class PerformanceAnalyticsValidator {
  constructor() {
    this.smartRouter = new SmartRouter();
    this.analytics = new AnalyticsTracker();
    this.featureFlags = new FeatureFlags();
    this.metricsCollector = new MetricsCollector();

    this.results = {
      performance: {},
      memory: {},
      confidence: {},
      analytics: {},
      summary: {}
    };
  }

  /**
   * Run all validation tests
   */
  async runAllTests() {
    console.log('=== OmniClaw 2.0 Performance & Analytics Validation ===\n');

    await this.testResponseTime();
    await this.testMemoryUsage();
    await this.testConfidenceScoring();
    await this.testRoutingPerformance();
    await this.testSessionLifecycle();
    await this.testFeatureFlags();
    await this.testMetricsCollection();

    this.generateSummary();
    this.printResults();

    return this.results;
  }

  /**
   * Test 1: Response Time (P95 <2s target)
   */
  async testResponseTime() {
    console.log('📊 Test 1: Response Time Performance');
    console.log('Target: P95 < 2000ms\n');

    const queryCount = 100;
    const responseTimes = [];

    const testQueries = [
      'Play my road trip playlist',
      'Who is Albert Einstein?',
      'Get the latest news',
      'Send a WhatsApp message to mom',
      'Play the last movie on Kodi',
      'Translate hello to Spanish',
      'Search Twitter for AI news',
      'Find papers on machine learning',
      'What can you do?',
      'Tell me a story'
    ];

    for (let i = 0; i < queryCount; i++) {
      const query = testQueries[i % testQueries.length];
      const sessionId = `perf_test_${i}`;

      const startTime = Date.now();

      try {
        await this.smartRouter.route(query, {
          platform: 'alexa',
          sessionId
        });

        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);

        if (i % 20 === 0) {
          console.log(`  Progress: ${i}/${queryCount} queries`);
        }
      } catch (error) {
        console.error(`  Query ${i} failed:`, error.message);
      }
    }

    // Calculate statistics
    const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const sorted = responseTimes.sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.50)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    const targetMet = p95 < 2000;

    this.results.performance.responseTime = {
      queryCount,
      average: Math.round(avg),
      p50: Math.round(p50),
      p95: Math.round(p95),
      p99: Math.round(p99),
      min: Math.round(...responseTimes),
      max: Math.round(...responseTimes),
      target: 2000,
      targetMet,
      status: targetMet ? '✅ PASS' : '❌ FAIL'
    };

    console.log(`  Average: ${Math.round(avg)}ms`);
    console.log(`  P50: ${Math.round(p50)}ms`);
    console.log(`  P95: ${Math.round(p95)}ms (Target: <2000ms)`);
    console.log(`  P99: ${Math.round(p99)}ms`);
    console.log(`  Status: ${targetMet ? '✅ PASS' : '❌ FAIL'}\n`);
  }

  /**
   * Test 2: Memory Usage (No leaks target)
   */
  async testMemoryUsage() {
    console.log('🧠 Test 2: Memory Leak Detection');
    console.log('Target: No unbounded growth over 1000 sessions\n');

    const sessionCount = 1000;
    const memorySnapshots = [];

    // Get initial memory
    if (global.gc) global.gc();
    const initialMemory = process.memoryUsage();
    console.log(`  Initial Memory: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`);

    // Create sessions
    for (let i = 0; i < sessionCount; i++) {
      const sessionId = `memory_test_${i}`;

      // Process query
      try {
        await this.smartRouter.route('What can you do?', {
          platform: 'alexa',
          sessionId
        });
      } catch (error) {
        console.error(`  Session ${i} failed:`, error.message);
      }

      // Snapshot memory every 100 sessions
      if (i % 100 === 0) {
        if (global.gc) global.gc();
        const mem = process.memoryUsage();
        memorySnapshots.push({
          session: i,
          heapUsed: mem.heapUsed,
          heapTotal: mem.heapTotal,
          external: mem.external
        });
        console.log(`  Session ${i}: ${Math.round(mem.heapUsed / 1024 / 1024)}MB heap used`);
      }
    }

    // Final memory
    if (global.gc) global.gc();
    const finalMemory = process.memoryUsage();
    console.log(`  Final Memory: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`);

    // Analyze growth
    const growthPerSession = (finalMemory.heapUsed - initialMemory.heapUsed) / sessionCount;
    const totalGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
    const leakDetected = growthPerSession > 1024; // >1KB per session indicates potential leak

    this.results.memory = {
      sessionCount,
      initialMemoryMB: Math.round(initialMemory.heapUsed / 1024 / 1024),
      finalMemoryMB: Math.round(finalMemory.heapUsed / 1024 / 1024),
      growthBytes: Math.round(totalGrowth),
      growthPerSession: Math.round(growthPerSession),
      leakDetected,
      snapshots: memorySnapshots.map(s => ({
        session: s.session,
        heapMB: Math.round(s.heapUsed / 1024 / 1024)
      })),
      status: !leakDetected ? '✅ PASS' : '⚠️ WARNING',
      recommendation: leakDetected
        ? 'Potential memory leak detected. Investigate session cleanup.'
        : 'No significant memory leaks detected.'
    };

    console.log(`  Growth per session: ${Math.round(growthPerSession)} bytes`);
    console.log(`  Status: ${this.results.memory.status}`);
    console.log(`  ${this.results.memory.recommendation}\n`);
  }

  /**
   * Test 3: Confidence Scoring
   */
  async testConfidenceScoring() {
    console.log('🎯 Test 3: Confidence Scoring Accuracy');
    console.log('Targets: Clear queries >80%, ambiguous queries trigger clarification\n');

    const testCases = [
      {
        query: 'Play my road trip playlist',
        expectedConfidence: 0.8,
        category: 'clear'
      },
      {
        query: 'Who is Albert Einstein?',
        expectedConfidence: 0.8,
        category: 'clear'
      },
      {
        query: 'Send a message',
        expectedConfidence: 0.5,
        category: 'ambiguous'
      },
      {
        query: 'Play something',
        expectedConfidence: 0.5,
        category: 'ambiguous'
      },
      {
        query: 'Translate hello to Spanish',
        expectedConfidence: 0.9,
        category: 'clear'
      }
    ];

    let highConfidenceCount = 0;
    let lowConfidenceCount = 0;
    const results = [];

    for (const testCase of testCases) {
      const routing = await this.smartRouter.route(testCase.query, {});

      const meetsThreshold = testCase.category === 'clear'
        ? routing.confidence >= 0.8
        : routing.confidence < 0.8;

      if (routing.confidence >= 0.8) {
        highConfidenceCount++;
      } else {
        lowConfidenceCount++;
      }

      results.push({
        query: testCase.query,
        confidence: routing.confidence,
        expectedConfidence: testCase.expectedConfidence,
        category: testCase.category,
        meetsThreshold,
        intent: routing.intent
      });

      console.log(`  "${testCase.query}"`);
      console.log(`    Confidence: ${(routing.confidence * 100).toFixed(0)}% (Expected: ${testCase.category})`);
      console.log(`    Intent: ${routing.intent}`);
      console.log(`    Status: ${meetsThreshold ? '✅' : '❌'}`);
    }

    const clearQueryAccuracy = results.filter(r =>
      r.category === 'clear' && r.meetsThreshold
    ).length / results.filter(r => r.category === 'clear').length;

    this.results.confidence = {
      totalTests: testCases.length,
      highConfidenceCount,
      lowConfidenceCount,
      clearQueryAccuracy: Math.round(clearQueryAccuracy * 100),
      target: 80,
      targetMet: clearQueryAccuracy >= 0.8,
      results,
      status: clearQueryAccuracy >= 0.8 ? '✅ PASS' : '❌ FAIL'
    };

    console.log(`\n  Clear Query Accuracy: ${Math.round(clearQueryAccuracy * 100)}% (Target: ≥80%)`);
    console.log(`  Status: ${this.results.confidence.status}\n`);
  }

  /**
   * Test 4: Routing Performance (<100ms target)
   */
  async testRoutingPerformance() {
    console.log('⚡ Test 4: Routing Performance');
    console.log('Target: <100ms routing time\n');

    const testQueries = [
      'play music on spotify',
      'search wikipedia for einstein',
      'send whatsapp message',
      'get latest news',
      'play movie on kodi',
      'translate text to spanish',
      'search twitter',
      'find reddit posts',
      'watch youtube video',
      'search arxiv papers'
    ];

    const iterations = 100;
    const routingTimes = [];

    for (let i = 0; i < iterations; i++) {
      const query = testQueries[i % testQueries.length];

      const startTime = Date.now();
      await this.smartRouter.route(query, {});
      const routingTime = Date.now() - startTime;

      routingTimes.push(routingTime);
    }

    const avg = routingTimes.reduce((a, b) => a + b, 0) / routingTimes.length;
    const sorted = routingTimes.sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.50)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    const targetMet = p95 < 100;

    this.results.performance.routing = {
      iterations,
      average: Math.round(avg),
      p50: Math.round(p50),
      p95: Math.round(p95),
      p99: Math.round(p99),
      min: Math.round(...routingTimes),
      max: Math.round(...routingTimes),
      target: 100,
      targetMet,
      status: targetMet ? '✅ PASS' : '❌ FAIL'
    };

    console.log(`  Average: ${Math.round(avg)}ms`);
    console.log(`  P50: ${Math.round(p50)}ms`);
    console.log(`  P95: ${Math.round(p95)}ms (Target: <100ms)`);
    console.log(`  P99: ${Math.round(p99)}ms`);
    console.log(`  Status: ${targetMet ? '✅ PASS' : '❌ FAIL'}\n`);
  }

  /**
   * Test 5: Session Lifecycle Tracking
   */
  async testSessionLifecycle() {
    console.log('🔄 Test 5: Session Lifecycle Tracking');
    console.log('Testing: startSession → trackInteraction → endSession\n');

    const sessionId = 'lifecycle_test_session';
    const userId = 'test_user_123';

    // Initialize session via MetricsCollector
    const session = this.metricsCollector.initializeSession({
      userId,
      headers: { 'user-agent': 'Alexa/1.0' }
    });

    console.log(`  Session initialized: ${session.sessionId}`);
    console.log(`  Platform: ${session.platform}`);
    console.log(`  A/B Test Group: ${session.abTestGroup}`);
    console.log(`  Enabled Features: ${Object.keys(session.enabledFeatures).filter(k => session.enabledFeatures[k]).join(', ')}`);

    // Track interactions
    const interactions = [
      { query: 'Play music', intent: 'SpotifyIntent', success: true, responseTime: 1500 },
      { query: 'Who is Einstein?', intent: 'WikipediaIntent', success: true, responseTime: 1200 },
      { query: 'Send message', intent: 'WhatsAppIntent', success: false, responseTime: 800 }
    ];

    for (const interaction of interactions) {
      this.metricsCollector.trackQuery(session, { query: interaction.query }, {
        intent: interaction.intent,
        success: interaction.success,
        responseTime: interaction.responseTime
      });
      console.log(`  Tracked: ${interaction.query} (${interaction.success ? 'success' : 'failure'})`);
    }

    // Track satisfaction
    this.metricsCollector.trackSatisfaction(session, 5, 'Great experience!');
    console.log(`  Tracked satisfaction: 5/5`);

    // End session
    const finalMetrics = this.metricsCollector.endSession(session);
    console.log(`\n  Session ended. Duration: ${Math.round(finalMetrics.duration / 1000)}s`);
    console.log(`  Completion rate: ${(finalMetrics.taskCompletionRate * 100).toFixed(0)}%`);

    // Verify analytics tracking
    const dashboard = this.metricsCollector.getDashboardData();

    this.results.analytics.sessionLifecycle = {
      sessionCreated: !!session.sessionId,
      interactionsTracked: finalMetrics.interactionCount === interactions.length,
      satisfactionTracked: finalMetrics.satisfactionCount === 1,
      sessionEnded: !!finalMetrics.endTime,
      completionRate: Math.round(finalMetrics.taskCompletionRate * 100),
      duration: Math.round(finalMetrics.duration / 1000),
      status: session.sessionId && finalMetrics.interactionCount === interactions.length ? '✅ PASS' : '❌ FAIL'
    };

    console.log(`  Status: ${this.results.analytics.sessionLifecycle.status}\n`);
  }

  /**
   * Test 6: Feature Flags Assignment Consistency
   */
  async testFeatureFlags() {
    console.log('🚩 Test 6: Feature Flags & A/B Testing');
    console.log('Testing: Consistent assignment, percentage rollout, whitelist\n');

    // Test 1: Consistent assignment (same user gets same group)
    const testUserId = 'consistency_test_user';
    const assignments = [];

    for (let i = 0; i < 10; i++) {
      const group = this.featureFlags.getABTestGroup('ui_simplification', testUserId);
      assignments.push(group);
    }

    const allSame = assignments.every(a => a === assignments[0]);

    console.log(`  Consistency Test: ${allSame ? '✅ PASS' : '❌ FAIL'} (User always gets same group: ${assignments[0]})`);

    // Test 2: Percentage rollout distribution
    const testUsers = Array.from({ length: 100 }, (_, i) => `user_${i}`);
    const enabledCount = testUsers.filter(userId =>
      this.featureFlags.isEnabled('simplified_ui', { userId, sessionId: userId })
    ).length;

    const expectedPercentage = this.featureFlags.flags.simplified_ui.rolloutPercentage;
    const actualPercentage = enabledCount / testUsers.length * 100;
    const withinTolerance = Math.abs(actualPercentage - expectedPercentage) < 15; // ±15% tolerance

    console.log(`  Rollout Test: Expected ${expectedPercentage}%, Got ${actualPercentage.toFixed(1)}%`);
    console.log(`    Status: ${withinTolerance ? '✅ PASS' : '❌ FAIL'} (±15% tolerance)`);

    // Test 3: Whitelist overrides
    const whitelistedUser = 'whitelist_test_user';
    this.featureFlags.addToWhitelist('simplified_ui', whitelistedUser);

    const whitelistedEnabled = this.featureFlags.isEnabled('simplified_ui', {
      userId: whitelistedUser,
      sessionId: 'test_session'
    });

    this.featureFlags.removeFromWhitelist('simplified_ui', whitelistedUser);

    console.log(`  Whitelist Test: ${whitelistedEnabled ? '✅ PASS' : '❌ FAIL'} (Whitelisted users always enabled)`);

    // Test 4: Instant rollback
    const beforeRollback = this.featureFlags.isEnabled('simplified_ui', { userId: 'test_user', sessionId: 'test' });
    this.featureFlags.disableFeature('simplified_ui');
    const afterRollback = this.featureFlags.isEnabled('simplified_ui', { userId: 'test_user', sessionId: 'test' });
    this.featureFlags.enableFeature('simplified_ui', 10); // Restore

    const rollbackWorks = beforeRollback !== afterRollback && !afterRollback;

    console.log(`  Rollback Test: ${rollbackWorks ? '✅ PASS' : '❌ FAIL'} (Instant disable works)`);

    this.results.analytics.featureFlags = {
      consistencyTest: allSame,
      rolloutTest: withinTolerance,
      whitelistTest: whitelistedEnabled,
      rollbackTest: rollbackWorks,
      expectedPercentage,
      actualPercentage: Math.round(actualPercentage),
      status: (allSame && withinTolerance && whitelistedEnabled && rollbackWorks) ? '✅ PASS' : '❌ FAIL'
    };

    console.log(`  Overall Status: ${this.results.analytics.featureFlags.status}\n`);
  }

  /**
   * Test 7: Metrics Collection & Alerting
   */
  async testMetricsCollection() {
    console.log('📈 Test 7: Metrics Collection & Alerting');
    console.log('Testing: Metrics aggregation, dashboard data, alert triggers\n');

    // Create test sessions with different outcomes
    const sessions = [
      { outcome: 'success', count: 45, responseTime: 800 },
      { outcome: 'failure', count: 5, responseTime: 300 }
    ];

    let alertTriggered = false;
    this.metricsCollector.onAlert((alerts) => {
      alertTriggered = true;
      console.log(`  🚨 Alert triggered: ${alerts[0].message}`);
    });

    for (const sessionType of sessions) {
      for (let i = 0; i < sessionType.count; i++) {
        const session = this.metricsCollector.initializeSession({
          userId: `user_${i}`,
          headers: { 'user-agent': 'Alexa/1.0' }
        });

        this.metricsCollector.trackQuery(session, { query: 'test query' }, {
          success: sessionType.outcome === 'success',
          responseTime: sessionType.responseTime
        });

        this.metricsCollector.endSession(session);
      }
    }

    // Get dashboard data
    const dashboard = this.metricsCollector.getDashboardData();

    console.log(`  Total Sessions: ${dashboard.summary.totalSessions}`);
    console.log(`  Total Interactions: ${dashboard.summary.totalInteractions}`);
    console.log(`  Completion Rate: ${(dashboard.summary.overallCompletionRate * 100).toFixed(0)}%`);
    console.log(`  Error Rate: ${(dashboard.errorRate.rate * 100).toFixed(1)}%`);

    // Test health check
    const health = this.metricsCollector.healthCheck();
    console.log(`\n  Health Check: ${health.status}`);
    console.log(`  Tracking Enabled: ${health.trackingEnabled}`);
    console.log(`  Active Feature Flags: ${health.featureFlagsEnabled}`);
    console.log(`  Active A/B Tests: ${health.abTestsActive}`);

    this.results.analytics.metricsCollection = {
      sessionsTracked: dashboard.summary.totalSessions === 50,
      interactionsTracked: dashboard.summary.totalInteractions === 50,
      completionRateCalculated: dashboard.summary.overallCompletionRate > 0,
      errorRateCalculated: dashboard.errorRate.rate >= 0,
      healthCheck: health.status === 'healthy',
      dashboard: {
        totalSessions: dashboard.summary.totalSessions,
        completionRate: Math.round(dashboard.summary.overallCompletionRate * 100),
        errorRate: Math.round(dashboard.errorRate.rate * 100)
      },
      status: (dashboard.summary.totalSessions === 50 && health.status === 'healthy') ? '✅ PASS' : '❌ FAIL'
    };

    console.log(`  Status: ${this.results.analytics.metricsCollection.status}\n`);
  }

  /**
   * Generate overall summary
   */
  generateSummary() {
    const allTests = [
      this.results.performance.responseTime,
      this.results.memory,
      this.results.confidence,
      this.results.performance.routing,
      this.results.analytics.sessionLifecycle,
      this.results.analytics.featureFlags,
      this.results.analytics.metricsCollection
    ];

    const passCount = allTests.filter(t => t.status && t.status.includes('PASS')).length;
    const failCount = allTests.filter(t => t.status && t.status.includes('FAIL')).length;
    const warningCount = allTests.filter(t => t.status && t.status.includes('WARNING')).length;

    this.results.summary = {
      totalTests: allTests.length,
      passed: passCount,
      failed: failCount,
      warnings: warningCount,
      passRate: Math.round((passCount / allTests.length) * 100),
      overallStatus: failCount === 0 ? '✅ ALL TESTS PASSED' : `❌ ${failCount} TESTS FAILED`,
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    // Response time recommendations
    if (this.results.performance.responseTime && !this.results.performance.responseTime.targetMet) {
      recommendations.push({
        area: 'Response Time',
        issue: 'P95 response time exceeds 2s target',
        priority: 'HIGH',
        actions: [
          'Profile query processing bottlenecks',
          'Implement caching for repeated queries',
          'Optimize AI API call timeouts',
          'Consider parallelizing independent operations'
        ]
      });
    }

    // Memory recommendations
    if (this.results.memory.leakDetected) {
      recommendations.push({
        area: 'Memory Management',
        issue: 'Potential memory leak detected',
        priority: 'CRITICAL',
        actions: [
          'Implement session cleanup with TTL',
          'Review userSessions Map usage',
          'Add explicit session cleanup on endSession',
          'Consider using WeakMap for temporary data'
        ]
      });
    }

    // Routing performance recommendations
    if (this.results.performance.routing && !this.results.performance.routing.targetMet) {
      recommendations.push({
        area: 'Routing Performance',
        issue: 'Routing time exceeds 100ms target',
        priority: 'MEDIUM',
        actions: [
          'Pre-compile regex patterns',
          'Implement inverted index for keywords',
          'Cache routing results for repeated queries',
          'Optimize keyword matching algorithm'
        ]
      });
    }

    // Confidence scoring recommendations
    if (this.results.confidence && !this.results.confidence.targetMet) {
      recommendations.push({
        area: 'Confidence Scoring',
        issue: 'Clear query accuracy below 80%',
        priority: 'MEDIUM',
        actions: [
          'Improve keyword matching specificity',
          'Add more intent patterns',
          'Implement fuzzy matching for typos',
          'Train AI model on query patterns'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Print formatted results
   */
  printResults() {
    console.log('=== VALIDATION RESULTS ===\n');

    console.log('📊 Performance Results:');
    if (this.results.performance.responseTime) {
      console.log(`  Response Time: ${this.results.performance.responseTime.status}`);
      console.log(`    P95: ${this.results.performance.responseTime.p95}ms (Target: <2000ms)`);
    }
    if (this.results.performance.routing) {
      console.log(`  Routing: ${this.results.performance.routing.status}`);
      console.log(`    P95: ${this.results.performance.routing.p95}ms (Target: <100ms)`);
    }

    console.log('\n🧠 Memory Results:');
    console.log(`  Memory Leaks: ${this.results.memory.status}`);
    console.log(`    Growth per session: ${this.results.memory.growthPerSession} bytes`);

    console.log('\n🎯 Confidence Scoring:');
    console.log(`  Accuracy: ${this.results.confidence.status}`);
    console.log(`    Clear query accuracy: ${this.results.confidence.clearQueryAccuracy}%`);

    console.log('\n📈 Analytics Results:');
    console.log(`  Session Lifecycle: ${this.results.analytics.sessionLifecycle.status}`);
    console.log(`  Feature Flags: ${this.results.analytics.featureFlags.status}`);
    console.log(`  Metrics Collection: ${this.results.analytics.metricsCollection.status}`);

    console.log('\n=== SUMMARY ===');
    console.log(`Total Tests: ${this.results.summary.totalTests}`);
    console.log(`Passed: ${this.results.summary.passed}`);
    console.log(`Failed: ${this.results.summary.failed}`);
    console.log(`Warnings: ${this.results.summary.warnings}`);
    console.log(`Pass Rate: ${this.results.summary.passRate}%`);
    console.log(`Overall: ${this.results.summary.overallStatus}`);

    if (this.results.summary.recommendations.length > 0) {
      console.log('\n=== RECOMMENDATIONS ===');
      this.results.summary.recommendations.forEach((rec, i) => {
        console.log(`\n${i + 1}. ${rec.area} (${rec.priority} PRIORITY)`);
        console.log(`   Issue: ${rec.issue}`);
        console.log('   Actions:');
        rec.actions.forEach(action => {
          console.log(`   - ${action}`);
        });
      });
    }

    console.log('\n=== END OF VALIDATION ===\n');
  }

  /**
   * Export results to JSON
   */
  exportResults() {
    return JSON.stringify(this.results, null, 2);
  }
}

// Run tests if executed directly
if (require.main === module) {
  const validator = new PerformanceAnalyticsValidator();

  validator.runAllTests()
    .then(() => {
      console.log('Exporting results to results.json...');
      require('fs').writeFileSync(
        '/Users/Subho/omniclaw-personal-assistant/performance_validation_results.json',
        validator.exportResults()
      );
      console.log('✅ Results exported to performance_validation_results.json');
    })
    .catch(error => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}

module.exports = PerformanceAnalyticsValidator;
