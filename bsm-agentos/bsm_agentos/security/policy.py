"""Centralized security policy for BSM-AgentOS."""

from __future__ import annotations

import ast
from typing import Dict, List


class SecurityPolicy:
    """Policy scanner and permission gate."""

    forbidden_functions = {
        "eval",
        "exec",
        "__import__",
        "compile",
    }

    forbidden_qualified_calls = {
        "os.system",
        "subprocess.call",
        "subprocess.Popen",
        "requests.get",
        "urllib.request.urlopen",
    }

    allowed_permissions: Dict[str, List[str]] = {
        "contents": ["read"],
        "pull-requests": ["read"],
        "issues": ["read"],
    }

    def scan_code_for_risks(self, code: str) -> List[str]:
        tree = ast.parse(code)
        risks: List[str] = []

        for node in ast.walk(tree):
            if not isinstance(node, ast.Call):
                continue

            if isinstance(node.func, ast.Name) and node.func.id in self.forbidden_functions:
                risks.append(f"Forbidden function: {node.func.id}")

            if isinstance(node.func, ast.Attribute):
                qualified = self._qualified_name(node.func)
                if qualified in self.forbidden_qualified_calls:
                    risks.append(f"Forbidden call: {qualified}")

        return sorted(set(risks))

    def enforce_permissions(self, agent_spec: dict) -> None:
        requested = agent_spec.get("permissions", {}) or {}
        for permission, level in requested.items():
            if level not in self.allowed_permissions.get(permission, []):
                raise PermissionError(f"Agent requested forbidden permission: {permission}:{level}")

    def _qualified_name(self, attribute_node: ast.Attribute) -> str:
        parts: List[str] = [attribute_node.attr]
        value = attribute_node.value

        while isinstance(value, ast.Attribute):
            parts.append(value.attr)
            value = value.value

        if isinstance(value, ast.Name):
            parts.append(value.id)

        return ".".join(reversed(parts))
