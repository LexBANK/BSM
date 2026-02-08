import { modelRouter } from '../config/modelRouter.js';
import { nexusGateway } from '../gateways/nexusGateway.js';
import logger from '../utils/logger.js';
export class SecurityAgent {
constructor() {
this.id = 'security-agent';
this.name = 'Security Vulnerability Scanner';
this.role = 'CVE Hunter & Security Analyst';
this.version = '2.0';
}
async scan(payload) {
const { prNumber, dependencies, code, files } = payload;
const scanId = sec_${Date.now()};
logger.info({ scanId, prNumber }, 'Security scan started');

const results = {
  scanId,
  prNumber,
  timestamp: new Date().toISOString(),
  cves: [],
  secrets: [],
  codeVulns: [],
  summary: { critical: 0, high: 0, medium: 0, low: 0 }
};

if (dependencies?.length > 0) {
  results.cves = await this.searchCVEs(dependencies);
}

if (files) {
  results.secrets = this.scanSecrets(files);
}

if (code) {
  results.codeVulns = await this.analyzeCode(code);
}

results.summary = this.calculateSummary(results);

if (results.summary.critical > 0) {
  this.sendSecurityAlert(results);
}

return results;

}
async searchCVEs(dependencies) {
const depString = dependencies.map(d => ${d.name}@${d.version}).join(', ');
const result = await modelRouter.execute({
  system: 'You are a security researcher. Find CVEs and vulnerabilities.',
  user: `Find CVEs for: ${depString}. Include severity and fix versions.`
}, {
  task: 'security_scan',
  complexity: 'high',
  requiresSearch: true,
  searchQuery: `CVE vulnerabilities ${depString} 2024 2025`
});

return this.parseCVEs(result.output, result.citations);

}
parseCVEs(text, citations) {
const cves = [];
const pattern = /CVE-\d{4}-\d{4,7}/g;
let match;
while ((match = pattern.exec(text)) !== null) {
  const cveId = match[0];
  const context = text.substring(match.index - 100, match.index + 200);
  
  cves.push({
    id: cveId,
    severity: this.extractSeverity(context),
    description: context.substring(0, 150),
    sources: citations?.filter(c => context.toLowerCase().includes(c.title?.toLowerCase())) || []
  });
}

return cves;

}
scanSecrets(files) {
const patterns = {
'AWS Key': /AKIA[0-9A-Z]{16}/,
'Private Key': /-----BEGIN (RSA|EC|DSA|OPENSSH) PRIVATE KEY-----/,
'API Key': /['"]?(api[_-]?key|apikey)['"]?\s*[:=]\s*['"][a-zA-Z0-9]{32,}['"]/i,
'Database URL': /(postgres|mysql|mongodb):\/\/[^:]+:[^@]+@[^/]+/
};
const findings = [];

files.forEach(file => {
  Object.entries(patterns).forEach(([type, regex]) => {
    if (regex.test(file.content || '')) {
      findings.push({ type, file: file.filename, severity: 'CRITICAL' });
    }
  });
});

return findings;

}
async analyzeCode(code) {
const result = await modelRouter.execute({
system: 'Find security vulnerabilities: SQLi, XSS, CSRF, RCE',
user: Analyze code:\n${code.substring(0, 5000)}
}, {
task: 'security_scan',
complexity: 'critical'
});
return [];

}
extractSeverity(text) {
if (text.includes('CRITICAL') || text.includes('9.') || text.includes('10.')) return 'CRITICAL';
if (text.includes('HIGH') || text.includes('7.') || text.includes('8.')) return 'HIGH';
if (text.includes('MEDIUM') || text.includes('5.') || text.includes('6.')) return 'MEDIUM';
return 'LOW';
}
calculateSummary(results) {
const summary = { critical: 0, high: 0, medium: 0, low: 0 };
[...results.cves, ...results.secrets, ...results.codeVulns].forEach(item => {
  const sev = item.severity || 'MEDIUM';
  summary[sev.toLowerCase()] = (summary[sev.toLowerCase()] || 0) + 1;
});

return summary;

}
sendSecurityAlert(results) {
nexusGateway.sendUpdate('security_alert', {
type: 'critical_vulnerability',
prNumber: results.prNumber,
scanId: results.scanId,
criticalCount: results.summary.critical,
message: 🚨 ${results.summary.critical} Critical vulnerabilities found!
});
}
}
export const securityAgent = new SecurityAgent();
