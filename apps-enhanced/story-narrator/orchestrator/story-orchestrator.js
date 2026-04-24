/**
 * Story Orchestrator - Stub
 */
const { withTimeout } = require('../../shared/resilience/timeout-wrapper');
const { retryWithBackoff } = require('../../shared/resilience/retry');

class StoryOrchestrator {
  constructor() {}
  async orchestrate() { return {}; }
}
module.exports = { StoryOrchestrator };
