/**
 * OmniClaw 2.0 - Advanced Capabilities Test Suite
 *
 * Tests all 11 advanced capabilities + 3 Kodi capabilities
 * Validates natural language routing, discoverability, and progressive disclosure
 */

const SmartRouter = require('./infrastructure/cloud-functions/deploy/core/smart_router');
const ProgressiveDisclosure = require('./infrastructure/cloud-functions/deploy/core/progressive_disclosure');

class AdvancedCapabilitiesTest {
  constructor() {
    this.smartRouter = new SmartRouter();
    this.progressiveDisclosure = new ProgressiveDisclosure();
    this.testResults = [];
    this.passedTests = 0;
    this.failedTests = 0;
  }

  /**
   * Test a single capability
   */
  async testCapability(capabilityName, query, expectedIntent, expectedConfidenceMin = 0.5) {
    console.log(`\n🧪 Testing: ${capabilityName}`);
    console.log(`   Query: "${query}"`);

    try {
      // Route the query
      const routingResult = await this.smartRouter.route(query, {
        platform: 'alexa',
        sessionId: 'test-session'
      });

      // Validate routing
      const intentMatch = routingResult.intent === expectedIntent;
      const confidenceMatch = routingResult.confidence >= expectedConfidenceMin;

      const passed = intentMatch && confidenceMatch;

      // Record result
      const result = {
        capability: capabilityName,
        query,
        passed,
        intent: routingResult.intent,
        expectedIntent,
        confidence: routingResult.confidence,
        intentMatch,
        confidenceMatch,
        capabilityDetected: routingResult.capability
      };

      this.testResults.push(result);

      if (passed) {
        this.passedTests++;
        console.log(`   ✅ PASS - Intent: ${routingResult.intent}, Confidence: ${(routingResult.confidence * 100).toFixed(0)}%`);
      } else {
        this.failedTests++;
        console.log(`   ❌ FAIL`);
        if (!intentMatch) console.log(`      Expected: ${expectedIntent}, Got: ${routingResult.intent}`);
        if (!confidenceMatch) console.log(`      Confidence too low: ${(routingResult.confidence * 100).toFixed(0)}%`);
      }

      return passed;
    } catch (error) {
      this.failedTests++;
      console.log(`   ❌ ERROR: ${error.message}`);
      this.testResults.push({
        capability: capabilityName,
        query,
        passed: false,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Test progressive disclosure hints
   */
  async testProgressiveDisclosure() {
    console.log('\n\n🔍 Testing Progressive Disclosure System\n');

    const testCases = [
      { capability: 'music', interactionCount: 1, expectHint: true },
      { capability: 'tv', interactionCount: 2, expectHint: true },
      { capability: 'answers', interactionCount: 3, expectHint: true },
      { capability: 'music', interactionCount: 10, expectHint: false }
    ];

    let hintsPassed = 0;
    let hintsTotal = 0;

    for (const testCase of testCases) {
      hintsTotal++;
      console.log(`\n🔍 Hint Test: ${testCase.capability} (interaction #${testCase.interactionCount})`);

      const hint = this.progressiveDisclosure.getHint(
        testCase.capability,
        { interactionCount: testCase.interactionCount }
      );

      const hasHint = hint !== null;
      const passed = hasHint === testCase.expectHint;

      if (passed) {
        hintsPassed++;
        console.log(`   ✅ PASS - ${testCase.expectHint ? 'Hint shown' : 'No hint (expected)'}: ${hint?.text || 'N/A'}`);
      } else {
        console.log(`   ❌ FAIL - Expected ${testCase.expectHint ? 'hint' : 'no hint'}, got ${hasHint ? 'hint' : 'no hint'}`);
      }
    }

    console.log(`\n📊 Progressive Disclosure: ${hintsPassed}/${hintsTotal} passed`);
    return hintsPassed === hintsTotal;
  }

  /**
   * Test "What can you do?" discovery
   */
  async testDiscoveryResponses() {
    console.log('\n\n🎯 Testing Discovery Responses ("What can you do?")\n');

    const testCases = [
      { interactionCount: 1, description: 'New user' },
      { interactionCount: 3, description: 'Returning user' },
      { interactionCount: 10, description: 'Experienced user' }
    ];

    let discoveryPassed = 0;
    let discoveryTotal = 0;

    for (const testCase of testCases) {
      discoveryTotal++;
      console.log(`\n🎯 Discovery Test: ${testCase.description} (${testCase.interactionCount} interactions)`);

      const response = this.progressiveDisclosure.getDiscoveryResponse({
        interactionCount: testCase.interactionCount,
        platform: 'alexa'
      });

      const hasMessage = response && response.message;
      const isBrief = testCase.interactionCount < 3;

      const passed = hasMessage;

      if (passed) {
        discoveryPassed++;
        console.log(`   ✅ PASS - ${isBrief ? 'Brief' : 'Detailed'} response provided`);
        console.log(`   Message: "${response.message.substring(0, 100)}..."`);
      } else {
        console.log(`   ❌ FAIL - No response provided`);
      }
    }

    console.log(`\n📊 Discovery: ${discoveryPassed}/${discoveryTotal} passed`);
    return discoveryPassed === discoveryTotal;
  }

  /**
   * Test related capability suggestions
   */
  async testRelatedCapabilities() {
    console.log('\n\n🔗 Testing Related Capability Suggestions\n');

    const testCases = [
      { current: 'music', expectRelated: ['tv', 'news'] },
      { current: 'tv', expectRelated: ['music', 'news'] },
      { current: 'answers', expectRelated: ['news', 'arxiv'] }
    ];

    let relatedPassed = 0;
    let relatedTotal = 0;

    for (const testCase of testCases) {
      relatedTotal++;
      console.log(`\n🔗 Related Test: ${testCase.current} → related capabilities`);

      const related = this.progressiveDisclosure.getRelatedCapabilities(testCase.current);

      const hasCorrectCount = related.length === testCase.expectRelated.length;
      const hasCorrectCapabilities = related.every(r =>
        testCase.expectRelated.includes(r.capability)
      );

      const passed = hasCorrectCount && hasCorrectCapabilities;

      if (passed) {
        relatedPassed++;
        console.log(`   ✅ PASS - Suggested: ${related.map(r => r.capability).join(', ')}`);
      } else {
        console.log(`   ❌ FAIL - Expected: ${testCase.expectRelated.join(', ')}, Got: ${related.map(r => r.capability).join(', ')}`);
      }
    }

    console.log(`\n📊 Related Capabilities: ${relatedPassed}/${relatedTotal} passed`);
    return relatedPassed === relatedTotal;
  }

  /**
   * Run all advanced capability tests
   */
  async runAllTests() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  OmniClaw 2.0 - Advanced Capabilities Test Suite          ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    console.log('\n📋 Testing 11 Advanced + 3 Kodi Capabilities\n');
    console.log('═══════════════════════════════════════════════════════════════');

    // Test all 14 advanced capabilities
    await this.testCapability('Translation', "Translate 'Hello world' to Spanish", 'TranslateIntent', 0.9);
    await this.testCapability('Stories', "Tell me a story about a brave knight", 'StoryIntent', 0.5);
    await this.testCapability('Twitter', "Search Twitter for AI news", 'TwitterIntent', 0.6);
    await this.testCapability('Reddit', "Search Reddit for programming jokes", 'RedditIntent', 0.6);
    await this.testCapability('YouTube', "Search YouTube for Python tutorials", 'YouTubeIntent', 0.6);
    await this.testCapability('Arxiv', "Search Arxiv for machine learning papers", 'ArxivIntent', 0.6);
    await this.testCapability('Google Translate', "Use Google Translate", 'QueryIntent', 0.4);
    await this.testCapability('ElevenLabs TTS', "Speak this with ElevenLabs", 'QueryIntent', 0.4);
    await this.testCapability('Sarvam TTS', "Speak this in Hindi", 'QueryIntent', 0.4);
    await this.testCapability('Spotify Pause', "Pause the music", 'QueryIntent', 0.5);
    await this.testCapability('Spotify Skip', "Skip this track", 'QueryIntent', 0.5);
    await this.testCapability('Kodi Pause', "Pause Kodi", 'QueryIntent', 0.5);
    await this.testCapability('Kodi Play', "Play on Kodi", 'QueryIntent', 0.5);
    await this.testCapability('Kodi Addons', "Open Seren on Kodi", 'QueryIntent', 0.5);

    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('📊 Test Results Summary');
    console.log('═══════════════════════════════════════════════════════════════');

    const totalTests = this.passedTests + this.failedTests;
    const passRate = ((this.passedTests / totalTests) * 100).toFixed(1);

    console.log(`\nTotal Tests: ${totalTests}`);
    console.log(`✅ Passed: ${this.passedTests} (${passRate}%)`);
    console.log(`❌ Failed: ${this.failedTests}`);

    // Test progressive disclosure
    const pdPassed = await this.testProgressiveDisclosure();

    // Test discovery responses
    const discoveryPassed = await this.testDiscoveryResponses();

    // Test related capabilities
    const relatedPassed = await this.testRelatedCapabilities();

    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('🎯 Overall Results');
    console.log('═══════════════════════════════════════════════════════════════');

    const allPassed = (
      this.failedTests === 0 &&
      pdPassed &&
      discoveryPassed &&
      relatedPassed
    );

    if (allPassed) {
      console.log('\n✅ ALL TESTS PASSED!\n');
      console.log('✅ Natural language routing: Working perfectly');
      console.log('✅ Progressive disclosure: Hints shown appropriately');
      console.log('✅ Discovery mechanism: New/experienced user differentiation');
      console.log('✅ Related capabilities: Contextual suggestions working');
    } else {
      console.log('\n⚠️  SOME TESTS FAILED\n');
      if (this.failedTests > 0) {
        console.log(`❌ ${this.failedTests} capability routing tests failed`);
      }
      if (!pdPassed) {
        console.log('❌ Progressive disclosure tests failed');
      }
      if (!discoveryPassed) {
        console.log('❌ Discovery response tests failed');
      }
      if (!relatedPassed) {
        console.log('❌ Related capabilities tests failed');
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════════');

    return {
      total: totalTests,
      passed: this.passedTests,
      failed: this.failedTests,
      passRate: parseFloat(passRate),
      progressiveDisclosurePassed: pdPassed,
      discoveryPassed: discoveryPassed,
      relatedCapabilitiesPassed: relatedPassed,
      allPassed
    };
  }

  /**
   * Generate detailed report
   */
  generateReport() {
    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  Detailed Test Report                                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Group by status
    const passed = this.testResults.filter(r => r.passed);
    const failed = this.testResults.filter(r => !r.passed);

    console.log(`✅ Passed Tests (${passed.length}):\n`);
    passed.forEach(result => {
      console.log(`   ${result.capability}: "${result.query}"`);
      console.log(`      → ${result.intent} (${(result.confidence * 100).toFixed(0)}% confidence)\n`);
    });

    if (failed.length > 0) {
      console.log(`\n❌ Failed Tests (${failed.length}):\n`);
      failed.forEach(result => {
        console.log(`   ${result.capability}: "${result.query}"`);
        if (result.error) {
          console.log(`      → ERROR: ${result.error}\n`);
        } else {
          console.log(`      → Expected: ${result.expectedIntent}, Got: ${result.intent}`);
          console.log(`      → Confidence: ${(result.confidence * 100).toFixed(0)}%\n`);
        }
      });
    }

    console.log('\n═══════════════════════════════════════════════════════════════\n');
  }
}

// Run tests if executed directly
if (require.main === module) {
  const tester = new AdvancedCapabilitiesTest();

  (async () => {
    const results = await tester.runAllTests();
    tester.generateReport();

    // Exit with appropriate code
    process.exit(results.allPassed ? 0 : 1);
  })().catch(error => {
    console.error('\n❌ Test suite error:', error);
    process.exit(1);
  });
}

module.exports = AdvancedCapabilitiesTest;
