# MODELS

## AI Provider Preferences

| Provider | Model | Use Case | Priority |
|----------|-------|----------|----------|
| Anthropic (via Z.ai) | claude-sonnet-4-20250514 | High-quality reasoning, code generation | 1 |
| Cerebras | qwen-3-235b-a22b-instruct-2507 | Complex tasks, 235B params | 2 |
| Groq | llama-3.3-70b-versatile | Ultra-fast responses (0.14s latency) | 3 |
| Mistral | mistral-small-latest | Balanced speed/quality | 4 |

## Routing Policies
- **Speed-critical**: Groq first, fallback to Mistral
- **Quality-critical**: Anthropic first, fallback to Cerebras
- **Cost-optimized**: Mistral > Groq > Cerebras > Anthropic

## Model Configuration
- Circuit breaker threshold: 3 failures
- Timeout: 30s default, 60s for complex reasoning
- Retry policy: 2 retries with exponential backoff
