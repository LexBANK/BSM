import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import logger from "../utils/logger.js";

const execAsync = promisify(exec);

/**
 * BSM Build & Test Runner
 * Purpose: Execute build/test commands in isolated environment, collect errors, return summary
 */

/**
 * Parse stack trace from error output
 * @param {string} output - Error output containing stack trace
 * @returns {Array} Array of parsed stack trace lines
 */
function parseStackTrace(output) {
  const lines = output.split("\n");
  const stackLines = [];
  let inStack = false;

  for (const line of lines) {
    if (line.includes("at ") || line.includes("Error:") || line.includes("Failed")) {
      inStack = true;
    }
    if (inStack && line.trim()) {
      stackLines.push(line.trim());
    }
  }

  return stackLines;
}

/**
 * Analyze logs and extract key errors
 * @param {string} stdout - Standard output
 * @param {string} stderr - Standard error
 * @returns {Object} Analyzed log data
 */
function analyzeLogs(stdout, stderr) {
  const errors = [];
  const warnings = [];
  
  // Parse stderr for errors
  const stderrLines = stderr.split("\n");
  for (const line of stderrLines) {
    if (line.toLowerCase().includes("error")) {
      errors.push(line.trim());
    } else if (line.toLowerCase().includes("warn")) {
      warnings.push(line.trim());
    }
  }

  // Parse stdout for test failures
  const stdoutLines = stdout.split("\n");
  for (const line of stdoutLines) {
    if (line.toLowerCase().includes("failed") || line.toLowerCase().includes("failing")) {
      errors.push(line.trim());
    }
  }

  return {
    errors: errors.filter(e => e.length > 0),
    warnings: warnings.filter(w => w.length > 0),
    stackTrace: parseStackTrace(stderr + "\n" + stdout)
  };
}

/**
 * Execute a command and capture output
 * @param {string} command - Command to execute
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} Execution result
 */
async function executeCommand(command, options = {}) {
  const startTime = Date.now();
  const timeout = options.timeout || 120000; // 2 minutes default

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: options.cwd || process.cwd(),
      timeout,
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });

    const duration = Date.now() - startTime;
    const logs = analyzeLogs(stdout, stderr);

    return {
      success: true,
      command,
      duration,
      stdout,
      stderr,
      logs,
      exitCode: 0
    };
  } catch (err) {
    const duration = Date.now() - startTime;
    const logs = analyzeLogs(err.stdout || "", err.stderr || "");

    return {
      success: false,
      command,
      duration,
      stdout: err.stdout || "",
      stderr: err.stderr || "",
      logs,
      exitCode: err.code || 1,
      error: err.message
    };
  }
}

/**
 * Detect available package manager
 * @param {string} cwd - Working directory
 * @returns {string} Package manager name (npm, yarn, or null)
 */
function detectPackageManager(cwd) {
  if (fs.existsSync(path.join(cwd, "yarn.lock"))) {
    return "yarn";
  } else if (fs.existsSync(path.join(cwd, "package.json"))) {
    return "npm";
  }
  return null;
}

/**
 * Run build command
 * @param {Object} config - Build configuration
 * @returns {Promise<Object>} Build result
 */
export async function runBuild(config = {}) {
  const cwd = config.cwd || process.cwd();
  const packageManager = config.packageManager || detectPackageManager(cwd);

  if (!packageManager) {
    return {
      success: false,
      error: "No package.json found",
      skipped: true
    };
  }

  // Check if build script exists
  const packageJsonPath = path.join(cwd, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  
  if (!packageJson.scripts || !packageJson.scripts.build) {
    logger.info("No build script found in package.json, skipping build");
    return {
      success: true,
      skipped: true,
      message: "No build script defined"
    };
  }

  const command = packageManager === "yarn" ? "yarn build" : "npm run build";
  logger.info({ command, cwd }, "Running build");

  const result = await executeCommand(command, { cwd, timeout: config.timeout });
  return result;
}

/**
 * Run test command
 * @param {Object} config - Test configuration
 * @returns {Promise<Object>} Test result
 */
export async function runTests(config = {}) {
  const cwd = config.cwd || process.cwd();
  const packageManager = config.packageManager || detectPackageManager(cwd);

  if (!packageManager) {
    return {
      success: false,
      error: "No package.json found",
      skipped: true
    };
  }

  // Check if test script exists
  const packageJsonPath = path.join(cwd, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  
  if (!packageJson.scripts || !packageJson.scripts.test) {
    logger.info("No test script found in package.json, skipping tests");
    return {
      success: true,
      skipped: true,
      message: "No test script defined"
    };
  }

  const command = packageManager === "yarn" ? "yarn test" : "npm test";
  logger.info({ command, cwd }, "Running tests");

  const result = await executeCommand(command, { cwd, timeout: config.timeout });
  return result;
}

/**
 * Run validation command
 * @param {Object} config - Validation configuration
 * @returns {Promise<Object>} Validation result
 */
export async function runValidation(config = {}) {
  const cwd = config.cwd || process.cwd();
  const packageManager = config.packageManager || detectPackageManager(cwd);

  if (!packageManager) {
    return {
      success: false,
      error: "No package.json found",
      skipped: true
    };
  }

  // Check if validate script exists
  const packageJsonPath = path.join(cwd, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  
  if (!packageJson.scripts || !packageJson.scripts.validate) {
    logger.info("No validate script found in package.json, skipping validation");
    return {
      success: true,
      skipped: true,
      message: "No validate script defined"
    };
  }

  const command = packageManager === "yarn" ? "yarn validate" : "npm run validate";
  logger.info({ command, cwd }, "Running validation");

  const result = await executeCommand(command, { cwd, timeout: config.timeout });
  return result;
}

/**
 * Generate JSON output for results
 * @param {Object} results - All execution results
 * @returns {Object} Formatted JSON output
 */
export function generateJSON(results) {
  const timestamp = new Date().toISOString();
  
  return {
    timestamp,
    summary: {
      total: Object.keys(results).length,
      passed: Object.values(results).filter(r => r.success && !r.skipped).length,
      failed: Object.values(results).filter(r => !r.success && !r.skipped).length,
      skipped: Object.values(results).filter(r => r.skipped).length
    },
    results
  };
}

/**
 * Generate Markdown summary
 * @param {Object} results - All execution results
 * @returns {string} Markdown formatted summary
 */
export function generateMarkdown(results) {
  const timestamp = new Date().toISOString();
  let md = `# BSM Runner Report\n\n`;
  md += `**Generated:** ${timestamp}\n\n`;
  
  // Summary
  md += `## Summary\n\n`;
  const passed = Object.values(results).filter(r => r.success && !r.skipped).length;
  const failed = Object.values(results).filter(r => !r.success && !r.skipped).length;
  const skipped = Object.values(results).filter(r => r.skipped).length;
  
  md += `- ✅ Passed: ${passed}\n`;
  md += `- ❌ Failed: ${failed}\n`;
  md += `- ⊘ Skipped: ${skipped}\n\n`;

  // Detailed results
  for (const [name, result] of Object.entries(results)) {
    md += `## ${name}\n\n`;
    
    if (result.skipped) {
      md += `**Status:** ⊘ Skipped\n`;
      md += `**Reason:** ${result.message || result.error || "N/A"}\n\n`;
      continue;
    }

    const status = result.success ? "✅ Passed" : "❌ Failed";
    md += `**Status:** ${status}\n`;
    md += `**Duration:** ${result.duration}ms\n`;
    
    if (result.command) {
      md += `**Command:** \`${result.command}\`\n`;
    }

    if (result.exitCode !== undefined) {
      md += `**Exit Code:** ${result.exitCode}\n`;
    }

    md += `\n`;

    // Show errors if any
    if (result.logs && result.logs.errors && result.logs.errors.length > 0) {
      md += `### Errors\n\n`;
      md += `\`\`\`\n`;
      md += result.logs.errors.join("\n");
      md += `\n\`\`\`\n\n`;
    }

    // Show warnings if any
    if (result.logs && result.logs.warnings && result.logs.warnings.length > 0) {
      md += `### Warnings\n\n`;
      md += `\`\`\`\n`;
      md += result.logs.warnings.join("\n");
      md += `\n\`\`\`\n\n`;
    }

    // Show stack trace for failures
    if (!result.success && result.logs && result.logs.stackTrace && result.logs.stackTrace.length > 0) {
      md += `### Stack Trace\n\n`;
      md += `\`\`\`\n`;
      md += result.logs.stackTrace.slice(0, 20).join("\n"); // Limit to first 20 lines
      md += `\n\`\`\`\n\n`;
    }
  }

  return md;
}

/**
 * Main runner function
 * @param {Object} config - Runner configuration
 * @returns {Promise<Object>} Complete run results
 */
export async function runAll(config = {}) {
  logger.info({ config }, "Starting BSM runner");
  
  const results = {};

  // Run validation
  if (config.skipValidation !== true) {
    results.validation = await runValidation(config);
  }

  // Run build
  if (config.skipBuild !== true) {
    results.build = await runBuild(config);
  }

  // Run tests
  if (config.skipTests !== true) {
    results.tests = await runTests(config);
  }

  const jsonOutput = generateJSON(results);
  const markdownOutput = generateMarkdown(results);

  // Save outputs if requested
  if (config.outputJson) {
    fs.writeFileSync(config.outputJson, JSON.stringify(jsonOutput, null, 2));
    logger.info({ file: config.outputJson }, "JSON output saved");
  }

  if (config.outputMarkdown) {
    fs.writeFileSync(config.outputMarkdown, markdownOutput);
    logger.info({ file: config.outputMarkdown }, "Markdown output saved");
  }

  logger.info("BSM runner completed");

  return {
    results,
    json: jsonOutput,
    markdown: markdownOutput
  };
}
