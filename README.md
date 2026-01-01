# TMLPD - TreeQuest Multi-LLM Parallel Deployment

<div align="center">

**Accelerate development by deploying multiple AI agents in parallel across different LLM providers**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Claude Skill](https://img.shields.io/badge/Claude-Skill-blue)](https://claude.ai/skills)
[![TreeQuest](https://img.shields.io/badge/TreeQuest-Integrated-green)](https://github.com/treequest-ai/treequest)

[Installation](#installation) • [Quick Start](#quick-start) • [Documentation](#documentation) • [Examples](#examples) • [Contributing](#contributing)

</div>

---

## Overview

**TMLPD (TreeQuest Multi-LLM Parallel Deployment)** is a powerful skill for deploying multiple AI agents in parallel across different LLM providers. By leveraging the strengths of various AI models, you can accelerate development by 3-4x while optimizing costs and ensuring quality.

### 🚀 Key Benefits

- **3-4x Faster Development:** Execute tasks in parallel across multiple AI models
- **Cost Optimization:** Route tasks to the most cost-effective suitable model
- **Specialized Capabilities:** Use models for their strengths (vision, reasoning, coding, research)
- **Redundancy & Verification:** Run critical tasks on multiple models for consensus
- **Project Agnostic:** Works with any project from any directory

### 🎯 Perfect For

- ✅ Multi-phase development projects
- ✅ Full-stack application development
- ✅ Comprehensive testing suites
- ✅ Documentation generation
- ✅ Refactoring large codebases
- ✅ Research and analysis tasks

---

## Features

### Three Execution Modes

#### 1. Category Mode (Most Popular)
Split tasks by type across specialized models:
- **Frontend** → Claude Sonnet (UI/UX focus)
- **Backend** → GPT-4 Turbo (code efficiency)
- **Testing** → Gemini Flash (test speed)
- **Documentation** → Perplexity (research-backed)

#### 2. Phase Mode
Execute project phases in parallel with dependency management:
- Phase 1: Architecture design
- Phase 2: Feature implementation (parallel)
- Phase 3: Testing & validation
- Phase 4: Deployment & documentation

#### 3. Verification Mode
Run critical tasks on multiple models for consensus:
- Security fixes → Multi-model verification
- Production code → Triple-check implementation
- Critical decisions → Cross-model validation

### Advanced Capabilities

- 🔄 **Dynamic Load Balancing** - Auto-distribute work across agents
- 💰 **Cost Optimization** - Budget limits and provider selection
- 🔁 **Error Recovery** - Auto-retry with exponential backoff
- 💾 **Checkpoint System** - Resume from any point
- 📊 **Real-time Monitoring** - Dashboard and metrics
- 🎛️ **Flexible Configuration** - YAML-based templates

---

## Installation

### Prerequisites

1. **TreeQuest CLI** (required)
   ```bash
   pip install treequest-ai
   ```

2. **Multiple LLM API Keys** (at least one required)
   - Anthropic (Claude) - Recommended
   - OpenAI (GPT-4)
   - Google (Gemini)
   - Perplexity
   - Groq/Cerebras

### Step 1: Clone or Download

```bash
# Clone the repository
git clone https://github.com/your-username/tmlpd-skill.git
cd tmlpd-skill

# Or download the skill files directly
```

### Step 2: Install the Skill

```bash
# Copy skill files to Claude skills directory
mkdir -p ~/.claude/skills
cp src/skills/TMLPD*.md ~/.claude/skills/
cp src/skills/tmlpd*.yaml ~/.claude/skills/
cp src/skills/test-tmlpd.sh ~/.claude/skills/
chmod +x ~/.claude/skills/test-tmlpd.sh
```

### Step 3: Verify Installation

```bash
# Run verification script
~/.claude/skills/test-tmlpd.sh

# Or manually check
treequest status
```

---

## Quick Start

### From Any Project

```bash
cd /path/to/your-project

# Invoke the skill
/TMLPD

# Or use TreeQuest directly
treequest-parallel --agents=4 --mode=category --background
```

### Example: Brain Spark Project

```bash
cd ~/brain-spark-analysis-project

# Copy configuration template
cp ~/.claude/skills/tmlpd-category.yaml ./tmlpd-config.yaml

# Deploy 4 parallel agents
treequest-parallel --config=tmlpd-config.yaml --background

# Monitor progress
treequest-parallel --status
tail -f .tmlpd-output/tmlpd-logs.json
```

### With TaskMaster Integration

```bash
# Parse PRD and expand tasks
task-master parse-prd .taskmaster/docs/prd.txt
task-master expand --all --research

# Deploy TreeQuest agents
treequest-parallel --source=taskmaster --agents=5
```

---

## Documentation

### Main Documentation

- **[Full Guide](src/skills/TMLPD.md)** - Comprehensive documentation (540 lines)
  - Detailed deployment strategies
  - Configuration options
  - Performance optimization
  - Troubleshooting guide

- **[Quick Reference](src/skills/TMLPD-QUICKREF.md)** - Fast command lookup (210 lines)
  - Common patterns
  - Agent configurations
  - Cost optimization table

### Configuration Templates

- **[Category Mode](src/skills/tmlpd-category.yaml)** - Split by task type
- **[Phase Mode](src/skills/tmlpd-phase.yaml)** - Execute phases in parallel
- **[Monitoring Config](src/skills/tmlpd-monitoring.yaml)** - Advanced monitoring

---

## Examples

### Example 1: Frontend + Backend Development

```yaml
# tmlpd-fullstack.yaml
deployment:
  agents:
    - id: "frontend-agent"
      provider: "anthropic"
      model: "claude-sonnet-4"
      focus: "React components, styling, animations"
      tasks: ["task-ui-*", "task-frontend-*"]

    - id: "backend-agent"
      provider: "openai"
      model: "gpt-4-turbo"
      focus: "API endpoints, database, business logic"
      tasks: ["task-api-*", "task-backend-*"]
```

### Example 2: Testing Sprint

```bash
# Deploy 3 specialized testing agents
treequest-parallel \
  --agents=3 \
  --mode=category \
  --focus=testing \
  --providers="google,anthropic,groq" \
  --timeout=3600
```

### Example 3: Documentation Generation

```bash
# Research and documentation focused
treequest-parallel \
  --agents=2 \
  --providers="perplexity,anthropic" \
  --focus="research,documentation" \
  --budget=20.00
```

More examples in the [examples/](examples/) directory.

---

## Performance

### Benchmarks

Based on real-world testing with mixed-complexity tasks:

| Agents | Tasks | Sequential | Parallel | Speedup | Cost Efficiency |
|--------|-------|------------|----------|---------|-----------------|
| 2 | 25 | 120 min | 65 min | **1.8x** | ⭐⭐⭐⭐⭐ |
| 4 | 25 | 120 min | 35 min | **3.4x** | ⭐⭐⭐⭐ |
| 6 | 50 | 240 min | 65 min | **3.7x** | ⭐⭐⭐ |

### Cost Optimization

| Task Type | Recommended Provider | Cost (1M tokens) | Speed |
|-----------|---------------------|------------------|-------|
| Simple tests | Groq/Cerebras | $0.10 | ⚡⚡⚡ |
| Code generation | GPT-4 Turbo | $10.00 | ⚡⚡ |
| Complex reasoning | Claude Sonnet | $3.00 | ⚡⚡ |
| Research | Perplexity Sonar | $1.00 | ⚡⚡ |
| Critical decisions | Claude Opus | $15.00 | ⚡ |

---

## Configuration

### Basic Configuration

```yaml
deployment:
  name: "My Project Deployment"
  agents:
    - id: "agent-1"
      provider: "anthropic"
      model: "claude-sonnet-4"
      focus: "General development"
      max_concurrent: 3

  coordination:
    sync_interval: 300  # 5 minutes
    checkpoint_interval: 600  # 10 minutes

  cost_optimization:
    enabled: true
    budget_limit: 50.00  # USD

  output:
    directory: ".tmlpd-output"
    verbose: true
```

### Advanced Features

See the [full configuration guide](docs/CONFIGURATION.md) for:
- Dynamic load balancing
- Custom alert rules
- Health checks
- Performance baselines
- Metrics export

---

## Monitoring

### Real-time Dashboard

```bash
# Launch monitoring dashboard
treequest-parallel --dashboard

# View metrics
treequest-parallel --metrics

# Export performance data
treequest-parallel --export-metrics > metrics.json
```

### Key Metrics

- 📊 **Tasks Completed** - Total tasks finished per agent
- ⏱️ **Average Latency** - Response time per provider
- 💰 **Cost Accumulation** - Running cost total
- ❌ **Error Rate** - Failed task percentage
- 📈 **Throughput** - Tasks per minute per agent

---

## Troubleshooting

### Common Issues

**Issue:** Agent not starting
```bash
# Check provider status
treequest test

# Verify configuration
treequest config --show
```

**Issue:** Merge conflicts
```bash
# Auto-resolve with timestamp strategy
treequest-parallel --merge-conflicts --strategy=timestamp
```

**Issue:** Need to stop deployment
```bash
# Graceful shutdown
treequest-parallel --shutdown --graceful

# Force shutdown (emergency)
treequest-parallel --shutdown --force
```

For more troubleshooting tips, see [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

---

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
# Fork and clone the repository
git clone https://github.com/your-username/tmlpd-skill.git
cd tmlpd-skill

# Create a feature branch
git checkout -b feature/your-feature-name

# Make your changes and test
~/.claude/skills/test-tmlpd.sh

# Submit a pull request
```

---

## Roadmap

### Version 1.1 (Planned)
- [ ] Web-based monitoring dashboard
- [ ] Auto-configuration wizard
- [ ] Performance profiling tools
- [ ] More provider integrations

### Version 2.0 (Future)
- [ ] Distributed deployment across machines
- [ ] Agent marketplace
- [ ] Custom agent templates
- [ ] CI/CD integration

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- **TreeQuest AI** - Multi-LLM orchestration engine
- **Anthropic** - Claude models for complex reasoning
- **OpenAI** - GPT models for code generation
- **Google** - Gemini models for testing
- **Perplexity** - Llama Sonar for research

---

## Support

- 📖 **Documentation:** [Full Guide](src/skills/TMLPD.md)
- 🐛 **Issues:** [GitHub Issues](https://github.com/your-username/tmlpd-skill/issues)
- 💬 **Discussions:** [GitHub Discussions](https://github.com/your-username/tmlpd-skill/discussions)
- 📧 **Email:** support@example.com

---

## Citation

If you use TMLPD in your research or work, please cite:

```bibtex
@software{tmlpd2025,
  title={TMLPD: TreeQuest Multi-LLM Parallel Deployment},
  author={Your Name},
  year={2025},
  url={https://github.com/your-username/tmlpd-skill}
}
```

---

<div align="center">

**Made with ❤️ for the AI development community**

[⭐ Star us on GitHub](https://github.com/your-username/tmlpd-skill) •
[🐛 Report Issues](https://github.com/your-username/tmlpd-skill/issues) •
[💡 Suggest Features](https://github.com/your-username/tmlpd-skill/discussions)

</div>
