#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const dateFlagIndex = args.indexOf('--date');
const dryRun = args.includes('--dry-run');

const dateInput = dateFlagIndex >= 0 ? args[dateFlagIndex + 1] : undefined;
const date = normalizeDate(dateInput);

const reportDir = resolve(process.cwd(), 'reports');
const reportPath = resolve(reportDir, `ios-chat-readiness-${date}.md`);
const generatedAt = new Date().toISOString();

const report = `# iOS Chat Readiness Report — ${date}

- Generated at: ${generatedAt}
- Runbook: docs/IOS-CHAT-READINESS.md
- Scope: Safari on iOS 16/17/18

## 1) Compatibility Matrix Status

| Area | iOS 16 | iOS 17 | iOS 18 | Notes |
|---|---|---|---|---|
| Chat UI render | ⬜ | ⬜ | ⬜ | |
| Input focus behavior | ⬜ | ⬜ | ⬜ | |
| Keyboard overlap | ⬜ | ⬜ | ⬜ | |
| Scroll restore | ⬜ | ⬜ | ⬜ | |
| Safe-area insets | ⬜ | ⬜ | ⬜ | |
| Offline/online retry | ⬜ | ⬜ | ⬜ | |
| Timeout handling | ⬜ | ⬜ | ⬜ | |
| Duplicate submit guard | ⬜ | ⬜ | ⬜ | |

## 2) Mandatory UI Tests

- [ ] Keyboard overlap
- [ ] Input focus
- [ ] Scroll restore
- [ ] Safe-area

## 3) Mandatory Network Tests

- [ ] Offline/online retry
- [ ] Timeout handling
- [ ] Duplicate submit guard

## 4) Metrics Snapshot

| Metric | Value | Target | Status |
|---|---:|---:|---|
| Error rate | TBD | < 1.5% | ⬜ |
| Median response latency (p50) | TBD | < 1800ms | ⬜ |
| Reconnect success rate | TBD | > 95% | ⬜ |

## 5) Risks & Action Items

- Risks:
  - TBD
- Actions:
  - TBD

## 6) Sign-off

- QA: ⬜
- Engineering: ⬜
- Product: ⬜
`;

if (dryRun) {
  console.log(reportPath);
  process.exit(0);
}

mkdirSync(reportDir, { recursive: true });
writeFileSync(reportPath, report, 'utf8');
console.log(`Generated ${reportPath}`);

function normalizeDate(rawDate) {
  if (!rawDate) {
    return new Date().toISOString().slice(0, 7);
  }

  if (/^\d{4}-\d{2}$/.test(rawDate)) {
    return rawDate;
  }

  throw new Error('Invalid --date format. Use YYYY-MM.');
}
