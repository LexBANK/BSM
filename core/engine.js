import fs from "fs";
import path from "path";
import YAML from "yaml";
import { validateAgent } from "../security/policy.js";

const FRONTMATTER_SEPARATOR = "---";

export class AgentEngine {
  constructor(agentDir = ".github/agents") {
    this.agentDir = agentDir;
    this.agents = {};
  }

  loadAgents() {
    if (!fs.existsSync(this.agentDir)) {
      this.agents = {};
      return;
    }

    const agentFiles = fs
      .readdirSync(this.agentDir)
      .filter((file) => file.endsWith(".agent.md"));

    agentFiles.forEach((file) => {
      const filePath = path.join(this.agentDir, file);
      const content = fs.readFileSync(filePath, "utf8");
      const blocks = content.split(FRONTMATTER_SEPARATOR);
      const yamlBlock = blocks.length > 2 ? blocks[1] : "";
      const agentSpec = YAML.parse(yamlBlock) || {};

      validateAgent(agentSpec);

      if (!agentSpec.name) {
        throw new Error(`Agent spec in ${file} is missing required field: name`);
      }

      this.agents[agentSpec.name] = agentSpec;
    });
  }

  runAgent(name) {
    if (!this.agents[name]) {
      throw new Error(`Agent ${name} not found.`);
    }
    return { status: "ok", agent: name };
  }

  runAll() {
    return Object.keys(this.agents).map((name) => this.runAgent(name));
  }
}
