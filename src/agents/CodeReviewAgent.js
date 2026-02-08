import { modelRouter } from '../config/modelRouter.js';
import { nexusGateway } from '../gateways/nexusGateway.js';
import logger from '../utils/logger.js';
export class CodeReviewAgent {
constructor() {
this.id = 'code-review-agent';
this.name = 'Code Review Specialist';
this.role = 'Senior Software Engineer - Code Quality';
this.version = '2.0';
}
async review(payload) {
const { prNumber, files, diff, author } = payload;
logger.info({ prNumber, files: files?.length }, 'Starting code review');
const complexity = this.analyzeComplexity(files);

const result = await modelRouter.execute({
  system: `You are ${this.name}. ${this.role}

Review code for: Quality, Security, Performance, Maintainability.
Use SOLID principles. Be constructive., user: Review this PR #${prNumber} by ${author}:
Files changed: ${files?.length || 0}
Complexity: ${complexity}
Diff:
${diff?.substring(0, 8000)}
Provide:
1.  Overall score (0-10)
2.  Issues found (line numbers)
3.  Suggestions
4.  Approve/Request Changes`
}, {
task: 'code_review',
complexity: complexity > 300 ? 'critical' : complexity > 100 ? 'high' : 'medium'
});
const parsed = this.parseReview(result.output);
nexusGateway.sendUpdate('code_review_complete', {
agent: this.id,
prNumber,
score: parsed.score,
status: parsed.score >= 7 ? 'approved' : 'changes_requested',
issues: parsed.issues.length
});
return {
agentId: this.id,
prNumber,
score: parsed.score,
comments: parsed.comments,
issues: parsed.issues,
modelUsed: result.modelUsed,
timestamp: new Date().toISOString()
};
}
analyzeComplexity(files) {
if (!files) return 0;
return files.reduce((acc, f) => acc + (f.changes || 0), 0);
}
parseReview(text) {
const scoreMatch = text.match(/score[:\s]*(\d+(.\d+)?)/i) || text.match(/(\d+)/10/);
const score = scoreMatch ? parseFloat(scoreMatch[1]) : 5;
const issues = [];
const lines = text.split('\n');
lines.forEach(line => {
  if (line.includes('Line') || line.includes('line')) {
    const lineMatch = line.match(/line\s*(\d+)/i);
    if (lineMatch) {
      issues.push({ line: parseInt(lineMatch[1]), message: line.substring(0, 200) });
    }
  }
});

return { score, issues, comments: text };

}
}
export const codeReviewAgent = new CodeReviewAgent();
