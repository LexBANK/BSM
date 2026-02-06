#!/usr/bin/env node
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";
import { loadAgents } from "../src/services/agentsService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const args = process.argv.slice(2);
  let endpoint = process.env.KM_ENDPOINT || "";
  let outputFile = "";

  // Parse CLI arguments (simple parser for --key value format)
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if ((arg === "--endpoint" || arg === "-e") && i + 1 < args.length) {
      endpoint = args[i + 1];
      i++;
    } else if ((arg === "--out" || arg === "-o") && i + 1 < args.length) {
      outputFile = args[i + 1];
      i++;
    } else if (arg === "--help" || arg === "-h") {
      console.log("Usage: node agents/run.js [options]");
      console.log("Options:");
      console.log("  --endpoint, -e <url>   Knowledge management endpoint (env: KM_ENDPOINT)");
      console.log("  --out, -o <file>       Output file path for JSON results");
      console.log("  --help, -h             Show this help message");
      process.exit(0);
    }
  }

  console.log("BSM Agents CLI Runner");
  console.log("=====================");
  console.log(`Endpoint: ${endpoint || "(not set)"}`);
  console.log(`Output: ${outputFile || "(stdout)"}`);
  console.log("");

  try {
    // Load all agents from the system
    const agents = await loadAgents();
    console.log(`Loaded ${agents.length} agent(s):`);
    agents.forEach(agent => {
      console.log(`  - ${agent.id}: ${agent.name}`);
    });

    // Prepare results (currently only validates agent loading, not execution)
    const results = {
      timestamp: new Date().toISOString(),
      endpoint: endpoint,
      agents: agents.map(a => ({
        id: a.id,
        name: a.name,
        role: a.role,
        modelProvider: a.modelProvider || "openai",
        actions: a.actions || []
      })),
      summary: {
        total: agents.length,
        validated: agents.length,
        message: "All agents loaded and validated successfully"
      }
    };

    // Write output
    const output = JSON.stringify(results, null, 2);
    if (outputFile) {
      const outDir = dirname(outputFile);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
      fs.writeFileSync(outputFile, output, "utf8");
      console.log(`\nResults written to: ${outputFile}`);
    } else {
      console.log("\nResults:");
      console.log(output);
    }

    console.log("\n✅ Agent run completed successfully");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Error running agents:");
    console.error(err.message);
    if (err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

main();
