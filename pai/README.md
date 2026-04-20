# PAI Control Plane Overlay for OmniClaw

Personal AI Infrastructure (PAI) concepts integrated as a **control plane overlay** on OmniClaw.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  PAI CONTROL PLANE                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────────────┐   │
│  │  TELOS  │  │  HOOKS  │  │ SKILL HIERARCHY │   │
│  │ (10 IDs)│  │ (8 evts)│  │ CODE→CLI→PROMPT │   │
│  └─────────┘  └─────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────┘
                        │ hooks.emit()
                        ▼
┌─────────────────────────────────────────────────────┐
│             OMNICLAW EXECUTION PLANE                 │
│  HALO Orchestrator │ Universal Router │ Providers  │
└─────────────────────────────────────────────────────┘
```

## Directory Structure

```
pai/
├── system/                 # Infrastructure (git-controlled)
│   ├── telos/             # 10 identity files
│   │   ├── MISSION.md
│   │   ├── GOALS.md
│   │   ├── ...
│   │   └── loader.js
│   ├── hooks/             # Lifecycle hook system
│   │   ├── hook_bus.js
│   │   └── subscribers/
│   ├── skills/            # Skill registry
│   │   └── registry.yaml
│   ├── index.js           # Integration entry point
│   └── feature_flags.js
└── user/                  # User customizations (preserved across upgrades)
    ├── skills/
    ├── prompts/
    └── telos/             # User TELOS overrides
```

## Features

### 1. TELOS Identity System

10 documentation files capturing identity:

| File | Purpose |
|------|---------|
| MISSION | Core purpose statement |
| GOALS | Active and long-term goals |
| PROJECTS | Current project status |
| BELIEFS | Core principles |
| MODELS | AI model preferences |
| STRATEGIES | Operational strategies |
| NARRATIVES | User story/persona |
| LEARNED | Past lessons |
| CHALLENGES | Current blockers |
| IDEAS | Future improvements |

### 2. Hook System (8 Lifecycle Events)

- `on_start` - Agent initialized
- `on_exit` - Agent shutdown
- `on_error` - Error occurred
- `on_tool_use` - Tool executed
- `on_message` - Message received
- `on_plan` - Plan created
- `on_execute` - Execution started
- `on_learn` - Learning signal

### 3. Skill Hierarchy

Resolution order: **CODE → CLI → PROMPT → SKILL**

### 4. Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| `PAI_CONTROL_PLANE_ENABLED` | `true` | Master switch |
| `PAI_TELOS_ENABLED` | `true` | TELOS loading |
| `PAI_HOOKS_ENABLED` | `true` | Hook system |
| `PAI_SKILLS_ENABLED` | `true` | Skill hierarchy |
| `PAI_LOGGING_ENABLED` | `false` | Hook logging |
| `PAI_METRICS_ENABLED` | `false` | Hook metrics |

## Installation

```bash
cd omniclaw-personal-assistant/pai
bash install.sh
```

## Usage

### JavaScript (Node.js)

```javascript
const { initializePai, hookBus } = require('./pai/system');

// Initialize PAI control plane
const pai = initializePai({
  loadTelos: true,
  registerHooks: true,
  registerLogging: false
});

// Emit a hook event
await hookBus.error(new Error('Something went wrong'));

// Get TELOS context
const context = pai.telos;
```

### Python

```python
from pai.system.telos_integration import TelosIntegration

# Load TELOS
telos = TelosIntegration()
context = telos.load()

# Get specific values
goals = telos.get_goals()
mission = telos.get_mission()

# Add to memory entry
entry = telos.add_to_memory_entry({"key": "value"})
```

## Upgrade Preservation

The `user/` directory is preserved across upgrades. Run `install.sh` after pulling updates to ensure USER/ is re-initialized.

```bash
# Before upgrade
cp -r pai/user ~/omniclaw-user-backup

# After upgrade
cp -r ~/omniclaw-user-backup pai/user
```

Or use the automated script:

```bash
cd pai && bash install.sh
```

## Integration Points

### Node.js Cloud Functions

```javascript
const { initializePai } = require('./pai/system');

// In index.js or main.js
const pai = initializePai();
```

### Python Agent

```python
from pai.system.telos_integration import TelosIntegration

# In tmlpd_agent.py initialize()
self.telos = TelosIntegration()
self.telos.load()
```

## Verification

```bash
# Check PAI directories exist
ls pai/system/telos/
ls pai/system/hooks/
ls pai/system/skills/

# Check feature flag
PAI_CONTROL_PLANE_ENABLED=false node -e "console.log('disabled')"
```

## What NOT to Modify

| Area | Reason |
|------|--------|
| HALO orchestrator | Proven architecture, don't compete |
| Universal router | Sufficient for routing needs |
| 3-tier memory | Already sophisticated |
| Platform integrations | Wrap with hooks only |
