#!/usr/bin/env bash
set -euo pipefail

LOG_DIR="reports/logs"
mkdir -p "$LOG_DIR"

timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log() { echo "$(timestamp) [INFO] $*" | tee -a "$LOG_DIR/run_agents.log"; }
warn() { echo "$(timestamp) [WARN] $*" | tee -a "$LOG_DIR/run_agents.log"; }
err() { echo "$(timestamp) [ERROR] $*" | tee -a "$LOG_DIR/run_agents.log"; }

log "Starting run_agents.sh"

# Validate environment
if [ -z "${KM_ENDPOINT:-}" ] || [ -z "${KM_TOKEN:-}" ]; then
  err "KM_ENDPOINT or KM_TOKEN not set. Exiting."
  exit 2
fi

# Optional: install project deps if package.json exists
if [ -f package.json ]; then
  log "Installing npm dependencies"
  npm ci
fi

# Run the actual agent command(s)
# Replace the following with the real commands used by your agents
if [ -x ./scripts/agents_main.sh ]; then
  log "Running agents_main.sh"
  ./scripts/agents_main.sh "$@"
else
  log "No agents_main.sh found; running placeholder tasks"
  mkdir -p reports
  echo "Report generated at $(timestamp)" > reports/agents_report.txt
fi

log "Finished run_agents.sh"
