"""Core execution engine for BSM-AgentOS."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml

from bsm_agentos.security.policy import SecurityPolicy


@dataclass
class AgentSpec:
    """Structured representation of an agent definition."""

    name: str
    description: str = ""
    permissions: Dict[str, str] = field(default_factory=dict)
    schedule: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class BSMAgentEngine:
    """Orchestrates registration and execution of BSM agents."""

    def __init__(self, config_path: str = "bsm-config.yaml") -> None:
        self.config_path = Path(config_path)
        self.config = self._load_yaml(self.config_path) if self.config_path.exists() else {}
        self.security_policy = SecurityPolicy()
        self.agents: Dict[str, AgentSpec] = {}

    @staticmethod
    def _load_yaml(path: Path) -> Dict[str, Any]:
        with path.open("r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
        if not isinstance(data, dict):
            raise ValueError(f"Expected mapping in {path}, got {type(data).__name__}")
        return data

    def register_agent(self, agent_file: str) -> AgentSpec:
        """Register an agent from a YAML file or front-matter markdown."""
        path = Path(agent_file)
        raw = path.read_text(encoding="utf-8")
        if raw.strip().startswith("---"):
            _, yaml_part, *_ = raw.split("---", maxsplit=2)
        else:
            yaml_part = raw

        spec_data = yaml.safe_load(yaml_part) or {}
        if not isinstance(spec_data, dict) or "name" not in spec_data:
            raise ValueError(f"Invalid agent spec: {path}")

        self.security_policy.enforce_permissions(spec_data)
        spec = AgentSpec(
            name=spec_data["name"],
            description=spec_data.get("description", ""),
            permissions=spec_data.get("permissions", {}),
            schedule=spec_data.get("schedule"),
            metadata={k: v for k, v in spec_data.items() if k not in {"name", "description", "permissions", "schedule"}},
        )
        self.agents[spec.name] = spec
        return spec

    async def execute_agent(self, name: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a registered agent in a constrained way.

        Placeholder async flow to be replaced with your preferred runtime (container, subprocess, queue worker).
        """
        if name not in self.agents:
            raise KeyError(f"Unknown agent: {name}")

        agent = self.agents[name]
        await asyncio.sleep(0)
        return {
            "agent": agent.name,
            "status": "completed",
            "context_keys": sorted(context.keys()),
        }

    async def run_all_agents(self, context: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Run all agents concurrently."""
        shared_context = context or {}
        tasks = [self.execute_agent(name, shared_context) for name in self.agents]
        if not tasks:
            return []
        return await asyncio.gather(*tasks)
