#!/bin/bash

# PR Status Checker for BSM Repository
# Helps maintainers quickly check the status of open PRs

set -e

REPO="LexBANK/BSM"

echo "🔍 BSM Repository - PR Status Check"
echo "===================================="
echo ""

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
    echo "❌ Error: GitHub CLI (gh) is not installed"
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Error: Not authenticated with GitHub CLI"
    echo "Run: gh auth login"
    exit 1
fi

echo "📊 Summary Statistics"
echo "--------------------"

# Count total PRs
TOTAL_PRS=$(gh pr list --repo "$REPO" --limit 100 --json number --jq '. | length')
echo "Total Open PRs: $TOTAL_PRS"

# Count draft PRs
DRAFT_PRS=$(gh pr list --repo "$REPO" --limit 100 --json number,isDraft --jq '[.[] | select(.isDraft == true)] | length')
echo "Draft PRs: $DRAFT_PRS"

# Count ready PRs  
READY_PRS=$(gh pr list --repo "$REPO" --limit 100 --json number,isDraft --jq '[.[] | select(.isDraft == false)] | length')
echo "Ready for Review: $READY_PRS"

echo ""
echo "🎯 Phase 1 Priority PRs"
echo "----------------------"

# PR #78 - Meta
echo ""
echo "PR #78: [WIP] Fix and merge all open pull requests"
gh pr view 78 --repo "$REPO" --json state,isDraft,mergeable,url --jq '"  Status: \(.state) | Draft: \(.isDraft) | Mergeable: \(.mergeable // "unknown") | URL: \(.url)"' 2>/dev/null || echo "  ⚠️  Could not fetch PR #78"

# PR #77 - Documentation (PRIORITY)
echo ""
echo "PR #77: Add CLAUDE.md project documentation ⭐ PRIORITY"
gh pr view 77 --repo "$REPO" --json state,isDraft,mergeable,reviewDecision,url --jq '"  Status: \(.state) | Draft: \(.isDraft) | Mergeable: \(.mergeable // "unknown") | Review: \(.reviewDecision // "none") | URL: \(.url)"' 2>/dev/null || echo "  ⚠️  Could not fetch PR #77"

# PR #76 - Analysis
echo ""
echo "PR #76: List and analyze 10 open pull requests"
gh pr view 76 --repo "$REPO" --json state,isDraft,url --jq '"  Status: \(.state) | Draft: \(.isDraft) | URL: \(.url)"' 2>/dev/null || echo "  ⚠️  Could not fetch PR #76"

# PR #75 - Analysis
echo ""
echo "PR #75: Performance Analysis"
gh pr view 75 --repo "$REPO" --json state,isDraft,url --jq '"  Status: \(.state) | Draft: \(.isDraft) | URL: \(.url)"' 2>/dev/null || echo "  ⚠️  Could not fetch PR #75"

echo ""
echo "🔐 Phase 2 Priority PRs"
echo "----------------------"

# PR #58 - Security
echo ""
echo "PR #58: Security audit"
gh pr view 58 --repo "$REPO" --json state,isDraft,mergeable,reviewDecision,additions,deletions,url --jq '"  Status: \(.state) | Draft: \(.isDraft) | Mergeable: \(.mergeable // "unknown") | Changes: +\(.additions)/-\(.deletions) | Review: \(.reviewDecision // "none") | URL: \(.url)"' 2>/dev/null || echo "  ⚠️  Could not fetch PR #58"

# PR #69 - Performance  
echo ""
echo "PR #69: Performance improvements (865x faster)"
gh pr view 69 --repo "$REPO" --json state,isDraft,mergeable,url --jq '"  Status: \(.state) | Draft: \(.isDraft) | Mergeable: \(.mergeable // "unknown") | URL: \(.url)"' 2>/dev/null || echo "  ⚠️  Could not fetch PR #69"

# PR #74 - Claude Assistant
echo ""
echo "PR #74: Claude Assistant GitHub Actions"
gh pr view 74 --repo "$REPO" --json state,isDraft,mergeable,url --jq '"  Status: \(.state) | Draft: \(.isDraft) | Mergeable: \(.mergeable // "unknown") | URL: \(.url)"' 2>/dev/null || echo "  ⚠️  Could not fetch PR #74"

echo ""
echo "📋 All Open PRs (Last 30)"
echo "------------------------"
gh pr list --repo "$REPO" --limit 30 --json number,title,state,isDraft,author --jq '.[] | "PR #\(.number): \(.title) | Draft: \(.isDraft) | Author: \(.author.login)"'

echo ""
echo "✅ Status check complete!"
echo ""
echo "📖 Next Steps:"
echo "1. Review PR-MERGE-INSTRUCTIONS.md for detailed action plan"
echo "2. Open reports/pr-merge-dashboard.html for visual overview"  
echo "3. Start with Phase 1: Close meta PRs and merge #77"
echo ""
echo "🔗 Quick Actions:"
echo "  View PR #77:  gh pr view 77 --repo $REPO --web"
echo "  Merge PR #77: gh pr merge 77 --repo $REPO --squash"
echo "  Close PR #78: gh pr close 78 --repo $REPO"
echo ""
