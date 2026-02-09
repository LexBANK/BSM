import fs from "fs";
import path from "path";
import YAML from "yaml";

const DEFAULT_REGISTRY_PATH = path.join(process.cwd(), "agents", "registry.yaml");
const ALLOWED_CONTEXTS = new Set(["chat", "api", "github", "ci"]);

function asTrue(value) {
  return value === true;
}

export function normalizeContext(rawContext) {
  const context = String(rawContext || "chat").trim().toLowerCase();
  return ALLOWED_CONTEXTS.has(context) ? context : "chat";
}

export function loadRegistry(registryPath = DEFAULT_REGISTRY_PATH) {
  try {
    if (!fs.existsSync(registryPath)) return { agents: [] };

    const raw = fs.readFileSync(registryPath, "utf8");
    const parsed = YAML.parse(raw);

    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.agents)) {
      return { agents: [] };
    }

    return { agents: parsed.agents };
  } catch {
    return { agents: [] };
  }
}

export function listAgentsByContext(context = "chat", registryPath) {
  const normalizedContext = normalizeContext(context);
  const { agents } = loadRegistry(registryPath);

  return agents
    .filter((agent) => {
      const contexts = agent?.contexts || {};
      const expose = agent?.expose || {};
      return asTrue(contexts[normalizedContext]) && asTrue(expose.selectable);
    })
    .map((agent) => {
      const id = typeof agent?.id === "string" ? agent.id.trim() : "";
      if (!id) return null;

      const name = typeof agent?.name === "string" && agent.name.trim()
        ? agent.name.trim()
        : id;

      return {
        id,
        name,
        category: typeof agent?.category === "string" && agent.category.trim()
          ? agent.category.trim()
          : "conversational"
      };
    })
    .filter(Boolean);
}
