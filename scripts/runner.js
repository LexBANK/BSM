#!/usr/bin/env node
import { runAll } from "../src/runners/buildTestRunner.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * BSM Runner CLI
 * Usage: node scripts/runner.js [options]
 * 
 * Options:
 *   --target <local|ci>           Target environment (default: local)
 *   --output <path>               JSON output file path
 *   --markdown <path>             Markdown output file path
 *   --skip-build                  Skip build step
 *   --skip-tests                  Skip test step
 *   --skip-validation             Skip validation step
 *   --timeout <ms>                Command timeout in milliseconds (default: 120000)
 *   --help                        Show help
 */

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    target: "local",
    cwd: path.join(__dirname, "..")
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case "--help":
      case "-h":
        console.log(`
BSM Runner CLI

Usage: node scripts/runner.js [options]

Options:
  --target <local|ci>           Target environment (default: local)
  --output <path>               JSON output file path
  --markdown <path>             Markdown output file path
  --skip-build                  Skip build step
  --skip-tests                  Skip test step
  --skip-validation             Skip validation step
  --timeout <ms>                Command timeout in milliseconds (default: 120000)
  --help                        Show help

Examples:
  node scripts/runner.js --output runner-results.json
  node scripts/runner.js --target ci --skip-build
  node scripts/runner.js --output results.json --markdown summary.md
        `);
        process.exit(0);
        break;

      case "--target":
        config.target = args[++i];
        break;

      case "--output":
        config.outputJson = args[++i];
        // Make path absolute if relative
        if (!path.isAbsolute(config.outputJson)) {
          config.outputJson = path.join(process.cwd(), config.outputJson);
        }
        break;

      case "--markdown":
        config.outputMarkdown = args[++i];
        // Make path absolute if relative
        if (!path.isAbsolute(config.outputMarkdown)) {
          config.outputMarkdown = path.join(process.cwd(), config.outputMarkdown);
        }
        break;

      case "--skip-build":
        config.skipBuild = true;
        break;

      case "--skip-tests":
        config.skipTests = true;
        break;

      case "--skip-validation":
        config.skipValidation = true;
        break;

      case "--timeout":
        config.timeout = parseInt(args[++i], 10);
        break;

      default:
        if (arg.startsWith("-")) {
          console.error(`Unknown option: ${arg}`);
          console.error("Use --help for usage information");
          process.exit(1);
        }
    }
  }

  return config;
}

async function main() {
  try {
    const config = parseArgs();
    
    console.log("🚀 Starting BSM Runner...");
    console.log(`Target: ${config.target}`);
    console.log("");

    const result = await runAll(config);

    // Print summary to console
    console.log("\n" + "=".repeat(60));
    console.log("📊 Runner Summary");
    console.log("=".repeat(60));
    console.log(`Total: ${result.json.summary.total}`);
    console.log(`✅ Passed: ${result.json.summary.passed}`);
    console.log(`❌ Failed: ${result.json.summary.failed}`);
    console.log(`⊘ Skipped: ${result.json.summary.skipped}`);
    console.log("=".repeat(60));

    // Print individual results
    for (const [name, res] of Object.entries(result.results)) {
      const icon = res.skipped ? "⊘" : (res.success ? "✅" : "❌");
      const status = res.skipped ? "SKIPPED" : (res.success ? "PASSED" : "FAILED");
      console.log(`${icon} ${name.toUpperCase()}: ${status}`);
      
      if (!res.skipped && res.duration) {
        console.log(`   Duration: ${res.duration}ms`);
      }
      
      if (res.logs && res.logs.errors && res.logs.errors.length > 0) {
        console.log(`   Errors: ${res.logs.errors.length}`);
      }
    }

    console.log("");

    if (config.outputJson) {
      console.log(`📄 JSON output saved to: ${config.outputJson}`);
    }

    if (config.outputMarkdown) {
      console.log(`📝 Markdown output saved to: ${config.outputMarkdown}`);
    }

    // Exit with appropriate code
    const hasFailures = result.json.summary.failed > 0;
    process.exit(hasFailures ? 1 : 0);

  } catch (err) {
    console.error("❌ Runner failed:");
    console.error(err);
    process.exit(1);
  }
}

main();
