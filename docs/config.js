import fs from "fs";
import path from "path";

const config = {
  chat: {
    defaultAgent: "my-agent",
    maxMessageLength: 4000,
    timeoutMs: 30000
  },
  agents: {
    directory: ".github/agents",
    required: ["my-agent.agent.md"]
  }
};

function validateConfig() {
  for (const agent of config.agents.required) {
    const fullPath = path.join(process.cwd(), config.agents.directory, agent);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Missing agent: ${agent}`);
    }
  }

  return true;
}

export { config, validateConfig };
