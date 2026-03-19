#!/usr/bin/env node

/**
 * Quick test to verify fixes
 */

const TwitterTestHelper = require('./comprehensive_quantum_claw_alexa_test/utils/twitter-test-helper');
const ConversationTestHelper = require('./comprehensive_quantum_claw_alexa_test/utils/conversation-test-helper');

async function testFixes() {
    console.log('🧪 Testing Fixes...\n');

    // Test 1: Twitter Hindi language detection
    console.log('Test 1: Twitter Hindi Language Detection');
    const hindiResult = await TwitterTestHelper.testTwitterIntegration('Show me tweets in Hindi');
    console.log('  Query:', hindiResult.query);
    console.log('  Success:', hindiResult.success);
    if (hindiResult.tweets && hindiResult.tweets.length > 0) {
        console.log('  Tweet 1 text:', hindiResult.tweets[0].text);
        console.log('  Tweet 1 language:', hindiResult.tweets[0].language);
        console.log('  Tweet 1 expectedLanguage:', hindiResult.tweets[0].expectedLanguage);

        const validation = TwitterTestHelper.validateTweetLanguageDetection(hindiResult, 'hi');
        console.log('  Validation passed:', validation.passed);
        console.log('  Match rate:', validation.details.matchRate);
    }
    console.log('');

    // Test 2: Twitter no results search
    console.log('Test 2: Twitter No Results Search');
    const noResultsResult = await TwitterTestHelper.testTweetSearch('xyz123nonexistent', 0);
    console.log('  Success:', noResultsResult.success);
    console.log('  Expected:', noResultsResult.expectedResults);
    console.log('  Actual:', noResultsResult.actualResults);
    console.log('');

    // Test 3: Twitter very_long_topic edge case
    console.log('Test 3: Twitter very_long_topic Edge Case');
    const longTopicResult = await TwitterTestHelper.testTwitterIntegration('a'.repeat(100));
    console.log('  Success:', longTopicResult.success);
    console.log('  Error:', longTopicResult.error || 'None');
    console.log('');

    // Test 4: Conversation context session persistence
    console.log('Test 4: Conversation Context Session Persistence');
    const mockSession = {
        id: 'test-session',
        userId: 'test-user',
        state: {
            lastQuery: 'What is AI?',
            totalTurns: 2,
            duration: 5000,
            name: 'Test Session'
        },
        metadata: {
            duration: 5000,
            turnCount: 2,
            language: 'en',
            complexity: 'simple'
        }
    };

    const expectedState = {
        state: { name: 'Test' },
        fields: ['duration', 'turnCount']
    };

    const validation = ConversationTestHelper.validateSessionPersistence(mockSession, expectedState);
    console.log('  Validation passed:', validation.passed);
    console.log('  State match:', validation.details.stateMatch);
    console.log('  Context preserved:', validation.details.contextPreserved);
    console.log('');

    console.log('✅ All tests complete!');
}

testFixes().catch(console.error);
