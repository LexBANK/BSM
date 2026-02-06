#!/usr/bin/env node
import fs from "node:fs";

const [input, output] = process.argv.slice(2);

if (!input || !output) {
  console.error("Usage: node scripts/json_to_md.js <input.json> <output.md>");
  process.exit(1);
}

const raw = fs.readFileSync(input, "utf8");
const data = JSON.parse(raw);

const normalizeStatus = (status) => {
  switch (status) {
    case "success":
      return "✅ Success";
    case "partial_success":
      return "⚠️ Partial Success";
    default:
      return "❌ Failed";
  }
};

const normalizeResult = (result) => {
  switch (result) {
    case "ok":
      return "✅ OK";
    case "warning":
      return "⚠️ Warning";
    default:
      return "❌ Failed";
  }
};

let markdown = `# 🧠 BSM Agents Report\n\n`;
markdown += `**Run ID:** ${data.run_id || "unknown"}  \n`;
markdown += `**Status:** ${normalizeStatus(data.status)}\n\n`;
markdown += `## Agents Results\n`;
markdown += `| Agent | Result | Notes |\n`;
markdown += `|------|--------|-------|\n`;

for (const agent of data.agents || []) {
  markdown += `| ${agent.name || "unknown"} | ${normalizeResult(agent.result)} | ${agent.details || "—"} |\n`;
}

fs.writeFileSync(output, markdown);
console.log(`Markdown report generated: ${output}`);
