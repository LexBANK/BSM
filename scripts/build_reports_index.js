#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const reportsDir = path.join("docs", "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const files = fs
  .readdirSync(reportsDir)
  .filter((file) => file.endsWith(".md"))
  .sort()
  .reverse();

let index = `# 📊 BSM Agents – Reports Index\n\n`;
index += `آخر تحديث: ${new Date().toISOString()}\n\n`;
index += `| التاريخ | التقرير |\n`;
index += `|-------|---------|\n`;

for (const file of files) {
  const run = file.replace("report_", "").replace(".md", "");
  index += `| ${run} | [عرض التقرير](reports/${file}) |\n`;
}

fs.writeFileSync(path.join("docs", "index.md"), index);
console.log("Index generated: docs/index.md");
