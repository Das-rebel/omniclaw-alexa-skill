# TMLPD Configuration Guide

Complete guide for configuring TMLPD deployments.

## Table of Contents

- [Basic Configuration](#basic-configuration)
- [Agent Configuration](#agent-configuration)
- [Coordination Settings](#coordination-settings)
- [Cost Optimization](#cost-optimization)
- [Error Handling](#error-handling)
- [Monitoring & Logging](#monitoring--logging)
- [Advanced Features](#advanced-features)

## Basic Configuration

### Minimal Configuration

```yaml
deployment:
  name: "My Deployment"
  agents:
    - id: "agent-1"
      provider: "anthropic"
      model: "claude-sonnet-4"
      focus: "General development"
```

### Complete Configuration

```yaml
deployment:
  name: "Production Deployment"
  description: "Full production deployment with monitoring"

  agents: [...]  # See Agent Configuration

  coordination: ...  # See Coordination Settings
  cost_optimization: ...  # See Cost Optimization
  error_handling: ...  # See Error Handling
  output: ...  # See Output Configuration
  monitoring: ...  # See Monitoring Configuration
```

## Agent Configuration

### Basic Agent

```yaml
- id: "my-agent"
  provider: "anthropic"
  model: "claude-sonnet-4"
  focus: "Development tasks"
```

### Advanced Agent

```yaml
- id: "frontend-specialist"
  provider: "anthropic"
  model: "claude-sonnet-4-20250514"
  focus: "React components, TypeScript, styling"

  # Task filtering
  task_pattern: "task-ui-*|task-frontend-*|task-component-*"
  priority: "high"  # critical, high, medium, low

  # Concurrency
  max_concurrent: 3

  # Phase (for phase-based deployment)
  phase: 2
  phase_name: "Implementation"

  # Dependencies
  dependencies: ["phase1-architect"]

  # Budget (optional)
  budget_limit: 20.00
```

### Supported Providers

| Provider | Models | Best For |
|----------|--------|----------|
| `anthropic` | `claude-opus-4`, `claude-sonnet-4` | Complex reasoning, UI/UX |
| `openai` | `gpt-4-turbo`, `gpt-4o` | Code generation, debugging |
| `google` | `gemini-2.0-flash`, `gemini-2.5-pro` | Fast testing, research |
| `perplexity` | `llama-3.1-sonar-large` | Web-connected research |
| `groq` | `llama-3.3-70b` | Fast, cost-effective tasks |
| `cerebras` | `llama-3.3-70b` | High-speed execution |

## Coordination Settings

### Synchronization

```yaml
coordination:
  # How often agents sync progress (seconds)
  sync_interval: 300  # 5 minutes

  # How to resolve conflicts
  conflict_resolution: "timestamp"  # timestamp, priority-based, manual

  # How to merge results
  merge_strategy: "git-merge"  # git-merge, sequential-phases

  # Load balancing
  load_balancing: "dynamic"  # dynamic, work-stealing, none

  # Checkpoint frequency
  checkpoint_interval: 600  # 10 minutes
```

### Phase Gating

```yaml
coordination:
  # Wait for phases to complete before starting next
  phase_gating: true

  # Respect task dependencies
  wait_for_dependencies: true

  # Rebalance work between agents
  rebalance_interval: 120  # 2 minutes

  # When to consider an agent overloaded
  overload_threshold: 3  # tasks pending
```

## Cost Optimization

### Basic Budget Limits

```yaml
cost_optimization:
  enabled: true
  budget_limit: 50.00  # USD total
```

### Per-Agent Budgets

```yaml
cost_optimization:
  enabled: true
  budget_limit: 100.00

  per_agent_budget:
    frontend-agent: 20.00
    backend-agent: 30.00
    testing-agent: 25.00
    docs-agent: 10.00
    remaining: 15.00
```

### Cost Optimization Features

```yaml
cost_optimization:
  enabled: true
  budget_limit: 50.00

  # Prefer cached responses when available
  prefer_cached: true

  # Alert when approaching budget
  alert_threshold: 0.80  # Alert at 80% of budget

  # Stop when budget exceeded
  stop_on_exceed: true

  # Use fallback models for cost savings
  use_fallback_models: true
```

## Error Handling

### Retry Policies

```yaml
error_handling:
  # Exponential backoff between retries
  retry_policy: "exponential_backoff"  # exponential_backoff, linear, none

  # Maximum retry attempts
  max_retries: 3

  # Fallback to different model on failure
  fallback_on_failure: true
```

### Timeouts

```yaml
error_handling:
  # Timeout per task (seconds)
  timeout_per_task: 300  # 5 minutes

  # Timeout for entire deployment
  timeout_total: 3600  # 1 hour

  # Grace period before force shutdown
  shutdown_grace_period: 60  # 1 minute
```

### Checkpointing

```yaml
error_handling:
  # Save progress periodically
  checkpoint_interval: 600  # 10 minutes

  # Resume from last checkpoint on failure
  auto_resume: true

  # Keep checkpoint history
  checkpoint_retention: 5  # Keep last 5 checkpoints
```

## Monitoring & Logging

### Basic Logging

```yaml
logging:
  level: "info"  # debug, info, warn, error
  format: "json"  # json, text

  outputs:
    - type: "console"
      enabled: true

    - type: "file"
      enabled: true
      path: ".tmlpd-logs/deployment.log"
```

### Advanced Logging

```yaml
logging:
  level: "debug"
  format: "json"

  outputs:
    - type: "console"
      enabled: true
      colorize: true

    - type: "file"
      enabled: true
      path: ".tmlpd-logs/deployment.log"
      rotation:
        enabled: true
        max_size_mb: 100
        max_files: 10

  # Structured logging fields
  fields:
    - timestamp
    - agent_id
    - task_id
    - provider
    - model
    - status
    - duration_ms
    - cost_usd
```

### Metrics Collection

```yaml
monitoring:
  metrics:
    enabled: true
    collection_interval: 10  # seconds
    retention_days: 30

    export_formats:
      - json
      - prometheus

  # Performance tracking
  performance:
    track_latency: true
    track_throughput: true
    track_cost: true
    track_errors: true
    track_success_rate: true
```

### Alerts

```yaml
monitoring:
  alerts:
    enabled: true

    channels:
      - type: "console"
        enabled: true

      - type: "file"
        enabled: true
        path: ".tmlpd-alerts.log"

      - type: "webhook"
        enabled: false
        url: "https://hooks.example.com/alerts"

    rules:
      - name: "high_error_rate"
        condition: "error_rate > 0.10"
        severity: "warning"
        message: "Error rate exceeds 10%"

      - name: "budget_alert"
        condition: "cost > budget_limit * 0.90"
        severity: "critical"
        message: "Approaching budget limit"
```

## Advanced Features

### Dynamic Load Balancing

```yaml
coordination:
  load_balancing: "dynamic"
  rebalance_interval: 120
  overload_threshold: 3
  strategy: "work-stealing"
```

### Quality Gates

```yaml
quality_gates:
  phase_1_complete:
    - "Architecture document approved"
    - "Project structure created"
    - "All dependencies identified"

  phase_2_complete:
    - "All features implemented"
    - "Code coverage > 80%"
    - "No critical bugs"

  testing_complete:
    - "Test suite passes"
    - "All tests passing"
    - "Performance benchmarks met"
```

### Custom Metrics

```yaml
monitoring:
  custom_metrics:
    - name: "tasks_per_minute"
      type: "gauge"
      description: "Tasks completed per minute"

    - name: "average_cost_per_task"
      type: "gauge"
      description: "Average cost per completed task"

    - name: "provider_success_rate"
      type: "gauge"
      labels: ["provider"]
      description: "Success rate by LLM provider"
```

### Health Checks

```yaml
health_checks:
  enabled: true
  interval: 60  # seconds

  checks:
    - name: "api_connectivity"
      type: "external"
      url: "https://api.anthropic.com/v1/messages"

    - name: "disk_space"
      type: "system"
      threshold_gb: 5

    - name: "memory_usage"
      type: "system"
      threshold_percent: 85
```

## Complete Example

```yaml
deployment:
  name: "Production Deployment"

  agents:
    - id: "frontend-agent"
      provider: "anthropic"
      model: "claude-sonnet-4"
      focus: "Frontend development"
      max_concurrent: 3
      budget_limit: 20.00

    - id: "backend-agent"
      provider: "openai"
      model: "gpt-4-turbo"
      focus: "Backend development"
      max_concurrent: 3
      budget_limit: 25.00

  coordination:
    sync_interval: 300
    conflict_resolution: "timestamp"
    load_balancing: "dynamic"
    checkpoint_interval: 600

  cost_optimization:
    enabled: true
    budget_limit: 50.00
    alert_threshold: 0.80

  error_handling:
    retry_policy: "exponential_backoff"
    max_retries: 3
    timeout_per_task: 300

  logging:
    level: "info"
    format: "json"
    outputs:
      - type: "console"
        enabled: true
      - type: "file"
        enabled: true
        path: ".tmlpd-logs/deployment.log"

  monitoring:
    metrics:
      enabled: true
      collection_interval: 10
    alerts:
      enabled: true
```

## Configuration Validation

Validate your configuration before deployment:

```bash
# Validate YAML syntax
treequest-parallel --validate-config tmlpd-config.yaml

# Dry run (show what would happen)
treequest-parallel --dry-run --config=tmlpd-config.yaml

# Test configuration
treequest-parallel --test-config tmlpd-config.yaml
```

## Best Practices

1. **Start Simple** - Begin with basic configuration, add features gradually
2. **Set Budgets** - Always configure budget limits
3. **Enable Checkpointing** - For long-running deployments
4. **Monitor Closely** - Use alerts for early problem detection
5. **Test Locally** - Validate configurations before production use
6. **Document Changes** - Keep config files in version control
7. **Review Regularly** - Update configurations based on usage patterns

For more examples, see the [examples/](../examples/) directory.
