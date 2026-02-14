#!/bin/bash
# BSM Orchestrator - PR Merge Automation Script
# Created: 2026-02-07
# Purpose: Automate merging of approved PRs

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO="LexBANK/BSM"
APPROVED_PRS=(67 60 61)  # PRs approved for immediate merge

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  BSM Orchestrator - PR Merge Automation   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Function to check PR status
check_pr_status() {
    local pr_num=$1
    echo -e "${YELLOW}Checking PR #${pr_num}...${NC}"
    
    # Check if PR has conflicts
    gh pr view "$pr_num" --repo "$REPO" --json mergeable,mergeStateStatus
}

# Function to merge PR
merge_pr() {
    local pr_num=$1
    echo -e "${GREEN}Merging PR #${pr_num}...${NC}"
    
    # Merge with squash strategy
    gh pr merge "$pr_num" --repo "$REPO" --squash --delete-branch
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Successfully merged PR #${pr_num}${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed to merge PR #${pr_num}${NC}"
        return 1
    fi
}

# Main execution
echo -e "${BLUE}Step 1: Checking authentication...${NC}"
if ! gh auth status >/dev/null 2>&1; then
    echo -e "${RED}❌ Not authenticated with GitHub CLI${NC}"
    echo -e "${YELLOW}Run: gh auth login${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Authenticated${NC}"
echo ""

echo -e "${BLUE}Step 2: Checking approved PRs status...${NC}"
for pr in "${APPROVED_PRS[@]}"; do
    check_pr_status "$pr"
    echo ""
done

echo -e "${BLUE}Step 3: Merging approved PRs...${NC}"
echo -e "${YELLOW}This will merge PRs: ${APPROVED_PRS[*]}${NC}"
read -p "Continue? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Merge cancelled.${NC}"
    exit 0
fi

merged_count=0
failed_count=0

for pr in "${APPROVED_PRS[@]}"; do
    if merge_pr "$pr"; then
        ((merged_count++))
    else
        ((failed_count++))
    fi
    echo ""
done

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║            Merge Summary                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo -e "${GREEN}✅ Successfully merged: ${merged_count}${NC}"
echo -e "${RED}❌ Failed: ${failed_count}${NC}"
echo ""

if [ $failed_count -eq 0 ]; then
    echo -e "${GREEN}🎉 All PRs merged successfully!${NC}"
else
    echo -e "${YELLOW}⚠️  Some PRs failed to merge. Check logs above.${NC}"
fi

echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Update remaining PRs: gh pr list --repo $REPO"
echo "2. Review merge conflicts if any"
echo "3. Continue with next batch of PRs"
echo ""
echo -e "${GREEN}Done!${NC}"
