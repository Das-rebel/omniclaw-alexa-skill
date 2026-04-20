/**
 * PAI Hook Bus - Central event emitter for lifecycle hooks
 * Part of PAI Control Plane Overlay
 *
 * 8 lifecycle events:
 * - on_start: Agent initialized
 * - on_exit: Agent shutdown
 * - on_error: Error occurred
 * - on_tool_use: Tool executed
 * - on_message: Message received
 * - on_plan: Plan created
 * - on_execute: Execution started
 * - on_learn: Learning signal
 */

const { EventEmitter } = require('events');

const HOOK_NAMES = [
  'on_start',
  'on_exit',
  'on_error',
  'on_tool_use',
  'on_message',
  'on_plan',
  'on_execute',
  'on_learn'
];

class HookBus extends EventEmitter {
  constructor(options = {}) {
    super();
    this.subscribers = {};
    this.enabled = options.enabled !== false;
    this.featureFlag = process.env.PAI_CONTROL_PLANE_ENABLED;

    // Initialize hook arrays
    for (const name of HOOK_NAMES) {
      this.subscribers[name] = [];
    }
  }

  /**
   * Register a subscriber for a specific hook
   * @param {string} hookName - One of the 8 hook names
   * @param {Function} handler - Async function to handle the event
   * @returns {Function} Unsubscribe function
   */
  subscribe(hookName, handler) {
    if (!HOOK_NAMES.includes(hookName)) {
      throw new Error(`Unknown hook: ${hookName}. Valid hooks: ${HOOK_NAMES.join(', ')}`);
    }

    this.subscribers[hookName].push(handler);

    // Return unsubscribe function
    return () => {
      this.subscribers[hookName] = this.subscribers[hookName].filter(h => h !== handler);
    };
  }

  /**
   * Emit an event to all subscribers
   * @param {string} hookName - Hook to emit
   * @param {Object} data - Event data
   */
  async emit(hookName, data = {}) {
    if (!this.enabled) return;
    if (this.featureFlag === 'false') return;
    if (!HOOK_NAMES.includes(hookName)) {
      console.warn(`Unknown hook emitted: ${hookName}`);
      return;
    }

    const payload = {
      hook: hookName,
      timestamp: new Date().toISOString(),
      data
    };

    // Emit to EventEmitter listeners (for cross-cutting concerns)
    super.emit(hookName, payload);

    // Call subscribers
    const subscribers = this.subscribers[hookName] || [];
    for (const handler of subscribers) {
      try {
        await handler(payload);
      } catch (err) {
        console.error(`Hook ${hookName} handler error:`, err.message);
      }
    }
  }

  /**
   * Helper to emit on_start
   */
  async start(context = {}) {
    await this.emit('on_start', context);
  }

  /**
   * Helper to emit on_exit
   */
  async exit(context = {}) {
    await this.emit('on_exit', context);
  }

  /**
   * Helper to emit on_error
   */
  async error(error, context = {}) {
    await this.emit('on_error', { error: error.message, stack: error.stack, ...context });
  }

  /**
   * Helper to emit on_tool_use
   */
  async toolUse(tool, input, output, context = {}) {
    await this.emit('on_tool_use', { tool, input, output, ...context });
  }

  /**
   * Helper to emit on_message
   */
  async message(message, context = {}) {
    await this.emit('on_message', { message, ...context });
  }

  /**
   * Helper to emit on_plan
   */
  async plan(plan, context = {}) {
    await this.emit('on_plan', { plan, ...context });
  }

  /**
   * Helper to emit on_execute
   */
  async execute(task, context = {}) {
    await this.emit('on_execute', { task, ...context });
  }

  /**
   * Helper to emit on_learn
   */
  async learn(learning, context = {}) {
    await this.emit('on_learn', { learning, ...context });
  }

  /**
   * Get subscriber count for a hook
   */
  getSubscriberCount(hookName) {
    return this.subscribers[hookName]?.length || 0;
  }
}

// Singleton instance
const hookBus = new HookBus();

module.exports = {
  HookBus,
  hookBus,
  HOOK_NAMES
};
