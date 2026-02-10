#!/usr/bin/env node

/**
 * Stale PR Cleanup Script
 * Helps identify and manage stale pull requests
 */

import { execSync } from 'child_process';

const SIXTY_DAYS_AGO = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

async function getStalePRs() {
  try {
    const output = execSync('gh pr list --json number,title,updatedAt,author,url --limit 100', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    const prs = JSON.parse(output);
    
    return prs.filter(pr => {
      const updated = new Date(pr.updatedAt);
      return updated < THIRTY_DAYS_AGO;
    }).map(pr => ({
      ...pr,
      daysSinceUpdate: Math.floor((Date.now() - new Date(pr.updatedAt).getTime()) / (24 * 60 * 60 * 1000)),
      isVeryStale: new Date(pr.updatedAt) < SIXTY_DAYS_AGO
    }));
  } catch (error) {
    console.error('Error fetching PRs:', error.message);
    console.error('Make sure GitHub CLI (gh) is installed and authenticated');
    return [];
  }
}

function generateCloseComment(pr) {
  return `This pull request has been automatically closed due to inactivity (${pr.daysSinceUpdate} days since last update).

The repository maintainers have determined this PR is stale and no longer relevant. If you believe this PR should be reopened:

1. Address any merge conflicts with the current main branch
2. Update the PR description with current status
3. Tag a maintainer with @mention requesting review

Thank you for your contribution! 🙏`;
}

function generateWarningComment(pr) {
  return `⚠️ **Stale PR Warning**

This pull request has not been updated in ${pr.daysSinceUpdate} days and will be automatically closed in ${60 - pr.daysSinceUpdate} days if no activity occurs.

To keep this PR active:
- Push new commits
- Respond to review comments
- Update the PR description
- Or comment if you're still working on it

Need help? Check our [PR Health Guide](../blob/main/docs/PR-HEALTH-GUIDE.md).`;
}

async function main() {
  const command = process.argv[2] || 'list';
  
  console.log('🔍 Scanning for stale pull requests...\n');
  
  const stalePRs = await getStalePRs();
  
  if (stalePRs.length === 0) {
    console.log('✅ No stale pull requests found!');
    return;
  }

  const veryStale = stalePRs.filter(pr => pr.isVeryStale);
  const moderatelyStale = stalePRs.filter(pr => !pr.isVeryStale);

  console.log(`Found ${stalePRs.length} stale PR(s):`);
  console.log(`  - ${veryStale.length} very stale (>60 days)`);
  console.log(`  - ${moderatelyStale.length} moderately stale (30-60 days)\n`);

  if (command === 'list') {
    console.log('=== Very Stale PRs (>60 days) ===');
    veryStale.forEach(pr => {
      console.log(`\n#${pr.number}: ${pr.title}`);
      console.log(`  Days since update: ${pr.daysSinceUpdate}`);
      console.log(`  Author: ${pr.author.login}`);
      console.log(`  URL: ${pr.url}`);
    });

    console.log('\n=== Moderately Stale PRs (30-60 days) ===');
    moderatelyStale.forEach(pr => {
      console.log(`\n#${pr.number}: ${pr.title}`);
      console.log(`  Days since update: ${pr.daysSinceUpdate}`);
      console.log(`  Author: ${pr.author.login}`);
      console.log(`  URL: ${pr.url}`);
    });

    console.log('\n💡 Usage:');
    console.log('  node scripts/cleanup-stale-prs.js warn     # Post warning comments');
    console.log('  node scripts/cleanup-stale-prs.js close    # Close very stale PRs');
    console.log('  node scripts/cleanup-stale-prs.js list     # List stale PRs (default)');
  }

  if (command === 'warn') {
    console.log('⚠️ Posting warning comments to moderately stale PRs...\n');
    
    for (const pr of moderatelyStale) {
      try {
        const comment = generateWarningComment(pr);
        // Properly escape for shell: backslashes first, then quotes
        const escapedComment = comment.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        execSync(`gh pr comment ${pr.number} --body "${escapedComment}"`, {
          stdio: 'inherit'
        });
        console.log(`✅ Posted warning to #${pr.number}`);
      } catch (error) {
        console.error(`❌ Failed to comment on #${pr.number}:`, error.message);
      }
    }
    
    console.log(`\n✅ Posted ${moderatelyStale.length} warning comments`);
  }

  if (command === 'close') {
    console.log('🚫 Closing very stale PRs...\n');
    
    for (const pr of veryStale) {
      try {
        const comment = generateCloseComment(pr);
        // Properly escape for shell: backslashes first, then quotes
        const escapedComment = comment.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        execSync(`gh pr close ${pr.number} --comment "${escapedComment}"`, {
          stdio: 'inherit'
        });
        console.log(`✅ Closed #${pr.number}`);
      } catch (error) {
        console.error(`❌ Failed to close #${pr.number}:`, error.message);
      }
    }
    
    console.log(`\n✅ Closed ${veryStale.length} very stale PRs`);
  }

  if (command === 'dry-run') {
    console.log('\n=== DRY RUN: Would close these PRs ===');
    veryStale.forEach(pr => {
      console.log(`#${pr.number}: ${pr.title} (${pr.daysSinceUpdate} days old)`);
    });
    
    console.log('\n=== DRY RUN: Would warn these PRs ===');
    moderatelyStale.forEach(pr => {
      console.log(`#${pr.number}: ${pr.title} (${pr.daysSinceUpdate} days old)`);
    });
  }
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
