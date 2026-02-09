#!/usr/bin/env node

/**
 * PR Health Analyzer
 * Analyzes all open PRs and generates a comprehensive health report
 */

import { integrityAgent } from '../src/agents/IntegrityAgent.js';
import { execSync } from 'child_process';

const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
const SEVEN_DAYS_AGO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

async function getPRsFromGitHub() {
  try {
    const output = execSync('gh pr list --json number,title,state,createdAt,updatedAt,author,isDraft,mergeable --limit 100', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    return JSON.parse(output);
  } catch (error) {
    console.error('Error fetching PRs:', error.message);
    console.error('Make sure GitHub CLI (gh) is installed and authenticated');
    return [];
  }
}

function categorizePR(pr) {
  const updated = new Date(pr.updatedAt);
  const created = new Date(pr.createdAt);
  const age = Date.now() - updated.getTime();
  const ageDays = Math.floor(age / (24 * 60 * 60 * 1000));

  let category = 'healthy';
  let issues = [];

  // Check staleness
  if (updated < THIRTY_DAYS_AGO) {
    category = 'stale';
    issues.push(`No updates for ${ageDays} days`);
  } else if (updated < SEVEN_DAYS_AGO) {
    category = 'aging';
    issues.push(`No updates for ${ageDays} days`);
  }

  // Check draft status
  if (pr.isDraft) {
    issues.push('Draft PR');
  }

  // Check mergeable
  if (pr.mergeable === 'CONFLICTING') {
    issues.push('Merge conflicts');
    category = 'blocked';
  }

  return {
    ...pr,
    category,
    issues,
    ageDays,
    needsAttention: issues.length > 0
  };
}

function generateReport(prs) {
  const categorized = prs.map(categorizePR);
  
  const stats = {
    total: prs.length,
    healthy: categorized.filter(pr => pr.category === 'healthy').length,
    aging: categorized.filter(pr => pr.category === 'aging').length,
    stale: categorized.filter(pr => pr.category === 'stale').length,
    blocked: categorized.filter(pr => pr.category === 'blocked').length,
    draft: categorized.filter(pr => pr.isDraft).length
  };

  // Calculate health score
  const healthScore = Math.max(0, 100 - (stats.stale * 5) - (stats.aging * 2) - (stats.blocked * 10));

  console.log('\n=== BSM Repository Health Report ===\n');
  console.log(`Total Open PRs: ${stats.total}`);
  console.log(`Health Score: ${healthScore}/100 ${getHealthEmoji(healthScore)}\n`);
  
  console.log('PR Status Breakdown:');
  console.log(`  ✅ Healthy: ${stats.healthy}`);
  console.log(`  ⚠️  Aging (7-30 days): ${stats.aging}`);
  console.log(`  🔴 Stale (>30 days): ${stats.stale}`);
  console.log(`  🚫 Blocked: ${stats.blocked}`);
  console.log(`  📝 Draft: ${stats.draft}\n`);

  // Show stale PRs
  if (stats.stale > 0) {
    console.log('=== Stale PRs (>30 days old) ===');
    categorized
      .filter(pr => pr.category === 'stale')
      .sort((a, b) => b.ageDays - a.ageDays)
      .forEach(pr => {
        console.log(`  #${pr.number}: ${pr.title}`);
        console.log(`    Age: ${pr.ageDays} days | Author: ${pr.author.login}`);
        console.log(`    Issues: ${pr.issues.join(', ')}\n`);
      });
  }

  // Show aging PRs
  if (stats.aging > 0) {
    console.log('=== Aging PRs (7-30 days old) ===');
    categorized
      .filter(pr => pr.category === 'aging')
      .sort((a, b) => b.ageDays - a.ageDays)
      .forEach(pr => {
        console.log(`  #${pr.number}: ${pr.title}`);
        console.log(`    Age: ${pr.ageDays} days | Author: ${pr.author.login}\n`);
      });
  }

  // Show blocked PRs
  if (stats.blocked > 0) {
    console.log('=== Blocked PRs ===');
    categorized
      .filter(pr => pr.category === 'blocked')
      .forEach(pr => {
        console.log(`  #${pr.number}: ${pr.title}`);
        console.log(`    Issues: ${pr.issues.join(', ')}\n`);
      });
  }

  // Recommendations
  console.log('\n=== Recommendations ===');
  if (stats.stale > 0) {
    console.log(`  • Review and close or update ${stats.stale} stale PR(s)`);
  }
  if (stats.aging > 0) {
    console.log(`  • Follow up on ${stats.aging} aging PR(s) before they become stale`);
  }
  if (stats.blocked > 0) {
    console.log(`  • Resolve merge conflicts in ${stats.blocked} blocked PR(s)`);
  }
  if (stats.healthy === stats.total) {
    console.log(`  ✅ All PRs are in good health! Keep up the great work.`);
  }

  return {
    stats,
    healthScore,
    categorized,
    timestamp: new Date().toISOString()
  };
}

function getHealthEmoji(score) {
  if (score >= 90) return '🟢';
  if (score >= 70) return '🟡';
  if (score >= 50) return '🟠';
  return '🔴';
}

async function main() {
  console.log('Fetching open PRs from GitHub...\n');
  
  const prs = await getPRsFromGitHub();
  
  if (prs.length === 0) {
    console.log('No open PRs found or unable to fetch PRs.');
    console.log('Make sure you have GitHub CLI installed: https://cli.github.com/');
    process.exit(0);
  }

  const report = generateReport(prs);

  // Optional: Save report to file
  if (process.argv.includes('--save')) {
    const fs = await import('fs');
    const reportFile = `reports/pr-health-${new Date().toISOString().split('T')[0]}.json`;
    await fs.promises.mkdir('reports', { recursive: true });
    await fs.promises.writeFile(reportFile, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to: ${reportFile}`);
  }

  console.log('\n✨ Analysis complete!\n');
  
  // Exit with appropriate code
  process.exit(report.healthScore < 70 ? 1 : 0);
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
