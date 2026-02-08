import { modelRouter } from "../config/modelRouter.js";

export async function scanForCVEs(dependencies = []) {
  const depString = dependencies.map((d) => `${d.name} ${d.version}`).join(", ");

  const result = await modelRouter.execute(
    {
      user: `Analyze these dependencies for known vulnerabilities: ${depString}`
    },
    {
      task: "security_scan",
      complexity: "high",
      requiresSearch: true,
      searchQuery: `CVE vulnerabilities ${depString} 2024 2025 security advisories`
    }
  );

  const cves = extractCVEs(result.output);

  return {
    vulnerabilities: cves,
    sources: result.citations || [],
    recommendation: result.output,
    lastChecked: new Date().toISOString()
  };
}

export function extractCVEs(text = "") {
  const cvePattern = /CVE-\d{4}-\d{4,7}/g;
  return [...text.matchAll(cvePattern)].map((match) => match[0]);
}
