# Repository Governance: Naming & Archival Policy

## Purpose
This policy prevents repository naming drift and stale links across docs, scripts, and automation.

## Canonical Repository
- **Canonical repository:** `LexBANK/BSM`
- All project references in documentation, scripts, CI, and onboarding material must point to `LexBANK/BSM`.
- `LexBANK/BSM` is the single source of truth for:
  - Source code
  - Issues
  - Pull requests
  - Project documentation

## Naming Policy
1. Use `BSM` consistently for repository references.
2. Do not introduce new `LexBANK/BSU` links in any file.
3. Any migration/legacy note must explicitly mark `LexBANK/BSU` as deprecated (historical only).

## Archival Policy for Legacy Name (`LexBANK/BSU`)
1. Treat `LexBANK/BSU` as an archived/legacy identifier.
2. If old references are discovered, update them in the same PR whenever possible.
3. If a legacy reference must remain temporarily (e.g., external dependency docs), annotate it with a deprecation note and create a follow-up issue.

## CI Enforcement
- CI runs `scripts/check_canonical_repo_links.sh` to fail builds if `LexBANK/BSU` is detected.
- This guard applies to core project paths (README/docs/scripts/.github) and should be extended as needed.

## Review Rule
During PR review, confirm:
- New links use `LexBANK/BSM`.
- No accidental reintroduction of `LexBANK/BSU`.
- Governance and onboarding docs remain aligned with this policy.
