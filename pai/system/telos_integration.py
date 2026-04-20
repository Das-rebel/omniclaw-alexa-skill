"""
PAI TELOS Integration for OmniClaw
Bridges PAI control plane with OmniClaw execution plane
"""

import os
import json
from pathlib import Path
from typing import Dict, Optional, Any


class TelosIntegration:
    """
    Integrates PAI TELOS identity system with OmniClaw agent.

    Loads TELOS context and makes it available to:
    - HALO TaskPlanner (for goal-aware decomposition)
    - Memory system (for identity-tagged entries)
    - Skill resolver (for preference-aware resolution)
    """

    def __init__(self, pai_base_path: Optional[str] = None):
        """
        Initialize TELOS integration.

        Args:
            pai_base_path: Path to PAI directory (default: auto-detect)
        """
        if pai_base_path is None:
            # Auto-detect from this file's location
            pai_base_path = Path(__file__).parent.parent.parent / "pai"
        else:
            pai_base_path = Path(pai_base_path)

        self.pai_base = pai_base_path
        self.telos_dir = pai_base_path / "system" / "telos"
        self.user_telos_dir = pai_base_path / "user" / "telos"

        self._context: Dict[str, Any] = {}
        self._loaded = False

    def load(self) -> Dict[str, Any]:
        """
        Load TELOS identity files into context.

        Returns:
            TELOS context dictionary
        """
        if self._loaded:
            return self._context

        self._context = {
            "_meta": {
                "loaded_at": self._get_timestamp(),
                "source": "system",
                "pai_enabled": self._is_pai_enabled()
            }
        }

        telos_files = [
            "MISSION", "GOALS", "PROJECTS", "BELIEFS",
            "MODELS", "STRATEGIES", "NARRATIVES", "LEARNED",
            "CHALLENGES", "IDEAS"
        ]

        # Load system TELOS
        for name in telos_files:
            self._load_file(name, self.telos_dir)

        # Load user overrides
        if self.user_telos_dir.exists():
            self._context["_meta"]["source"] = "user"
            for name in telos_files:
                self._load_file(name, self.user_telos_dir, allow_override=True)

        self._loaded = True
        return self._context

    def _load_file(self, name: str, directory: Path, allow_override: bool = False):
        """Load a single TELOS file"""
        file_path = directory / f"{name}.md"

        if not file_path.exists():
            return

        try:
            content = file_path.read_text(encoding="utf-8")
            key = name.lower()

            if allow_override and key in self._context:
                # User override takes precedence
                self._context[key] = content
            elif key not in self._context:
                self._context[key] = content
        except Exception as e:
            print(f"Warning: Failed to load TELOS/{name}: {e}")

    def _is_pai_enabled(self) -> bool:
        """Check if PAI control plane is enabled"""
        return os.environ.get("PAI_CONTROL_PLANE_ENABLED", "true").lower() != "false"

    def _get_timestamp(self) -> str:
        """Get current ISO timestamp"""
        from datetime import datetime
        return datetime.now().isoformat()

    def get_context(self) -> Dict[str, Any]:
        """
        Get TELOS context, loading if necessary.

        Returns:
            TELOS context dictionary
        """
        if not self._loaded:
            return self.load()
        return self._context

    def get_telo(self, name: str) -> Optional[str]:
        """
        Get a specific TELOS value.

        Args:
            name: TELOS file name (e.g., 'GOALS', 'beliefs')

        Returns:
            TELOS content or None
        """
        context = self.get_context()
        return context.get(name.lower())

    def get_goals(self) -> Optional[str]:
        """Get GOALS content"""
        return self.get_telo("goals")

    def get_mission(self) -> Optional[str]:
        """Get MISSION content"""
        return self.get_telo("mission")

    def get_beliefs(self) -> Optional[str]:
        """Get BELIEFS content"""
        return self.get_telo("beliefs")

    def get_models(self) -> Optional[str]:
        """Get MODELS content"""
        return self.get_telo("models")

    def to_prompt_context(self) -> str:
        """
        Convert TELOS context to a prompt-friendly string.

        Returns:
            Formatted string for injection into prompts
        """
        context = self.get_context()

        lines = ["[PAI TELOS Identity]"]
        for key in ["mission", "goals", "beliefs", "models"]:
            if key in context and key != "_meta":
                lines.append(f"\n## {key.upper()}")
                lines.append(context[key])

        return "\n".join(lines)

    def add_to_memory_entry(self, entry: Dict[str, Any]) -> Dict[str, Any]:
        """
        Add TELOS metadata to a memory entry.

        Args:
            entry: Memory entry dictionary

        Returns:
            Entry with TELOS metadata added
        """
        entry["telos_source"] = self._context.get("_meta", {}).get("source", "system")
        entry["telos_loaded_at"] = self._context.get("_meta", {}).get("loaded_at")
        return entry

    def format_for_taskplanner(self) -> str:
        """
        Format TELOS context specifically for HALO TaskPlanner.

        Returns:
            Goal-aware context string
        """
        goals = self.get_goals() or ""
        mission = self.get_mission() or ""

        return f"""
[TASKPLANNER CONTEXT]
Mission: {mission}

Current Goals:
{goals}

Use these goals to prioritize and decompose tasks.
"""
