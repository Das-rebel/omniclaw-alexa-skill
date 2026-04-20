# STRATEGIES

## Orchestration Strategy
- **HALO 3-tier**: TaskPlanner → RoleAssigner → ExecutionEngine
- **Parallel execution** when subtasks are independent
- **Sequential** when dependencies exist between subtasks

## Skill Resolution Strategy
1. CODE tier: Deterministic scripts (highest priority)
2. CLI tier: Shell commands
3. PROMPT tier: Template-based responses
4. SKILL tier: LLM-based skills (fallback)

## Error Handling Strategy
- Circuit breaker opens after 3 consecutive failures
- Half-open state allows 1 test request
- Graceful degradation: full service → reduced features → readonly
- All errors logged via hook system for analysis

## Memory Strategy
- **Hot (Working)**: Current session context, 50 item limit
- **Warm (Episodic)**: Recent interactions, Firestore stored
- **Cold (Semantic)**: Knowledge graph, long-term facts
- TELOS provides identity layer above memory tiers
