import { nexusGateway } from '../gateways/nexusGateway.js';
import logger from '../utils/logger.js';
export class IntegrityAgent {
constructor() {
this.id = 'integrity-agent';
this.name = 'Repository Integrity Guardian';
this.role = 'Health Monitor & Cleaner';
}
async check(payload) {
const { repoData, prs, issues } = payload;
logger.info('Running integrity check');

const checks = {
  stalePRs: this.findStalePRs(prs),
  oldIssues: this.findOldIssues(issues),
  missingDocs: this.checkDocumentation(repoData),
  largeFiles: this.checkLargeFiles(repoData)
};

const healthScore = this.calculateHealthScore(checks);

nexusGateway.sendUpdate('integrity_check', {
  healthScore,
  issuesFound: Object.values(checks).flat().length
});

return {
  agentId: this.id,
  healthScore,
  checks,
  recommendations: this.generateRecommendations(checks),
  timestamp: new Date().toISOString()
};

}
findStalePRs(prs) {
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
return (prs || []).filter(pr => new Date(pr.updatedAt) < thirtyDaysAgo && pr.state === 'open');
}
findOldIssues(issues) {
const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
return (issues || []).filter(issue => new Date(issue.createdAt) < ninetyDaysAgo && issue.state === 'open');
}
checkDocumentation(repoData) {
const requiredFiles = ['README.md', 'LICENSE', 'CONTRIBUTING.md'];
return requiredFiles.filter(f => !repoData.files?.includes(f));
}
checkLargeFiles(files) {
return (files || []).filter(f => f.size > 10 * 1024 * 1024);
}
calculateHealthScore(checks) {
let score = 100;
score -= checks.stalePRs.length * 5;
score -= checks.oldIssues.length * 2;
score -= checks.missingDocs.length * 10;
return Math.max(0, score);
}
generateRecommendations(checks) {
const recs = [];
if (checks.stalePRs.length > 0) recs.push(Close ${checks.stalePRs.length} stale PRs);
if (checks.oldIssues.length > 0) recs.push(Archive ${checks.oldIssues.length} old issues);
if (checks.missingDocs.length > 0) recs.push(Add missing docs: ${checks.missingDocs.join(', ')});
return recs;
}
}
export const integrityAgent = new IntegrityAgent();
