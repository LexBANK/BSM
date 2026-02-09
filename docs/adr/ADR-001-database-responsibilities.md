# ADR-001: Database per Responsibility for BSM Platform

## Status
Accepted

## Context
The BSM platform is a multi-agent AI system that operates across multiple contexts:
- Chat
- API
- Automation
- CI/GitHub

The system handles:
- Sensitive user and permission data
- High-frequency runtime state
- Dynamic agent configurations
- Security and audit events

Using a single database for all concerns was deemed risky in terms of:
- Security
- Scalability
- Performance
- Long-term maintainability

## Decision
We adopt a **Database per Responsibility** architecture, where each database serves a single, well-defined purpose.

### Database Mapping

| Database      | Responsibility |
|---------------|----------------|
| PostgreSQL    | Core data (users, roles, permissions) |
| Redis         | Runtime state (sessions, rate limiting, short-term memory) |
| MongoDB       | Agent state (manifests, execution state, non-sensitive history) |
| File-based Append-only Logs | Audit & security events |

Each database is accessed only through its dedicated service layer.

## Alternatives Considered

### 1. Single Database for All Data
- Rejected due to security risks, schema rigidity, and performance bottlenecks.

### 2. NoSQL Only
- Rejected due to lack of transactional guarantees and weak support for permissions and relationships.

### 3. Cloud-Managed Single Vendor (e.g., DynamoDB only)
- Rejected to avoid vendor lock-in and to retain architectural flexibility.

## Consequences

### Positive
- Clear separation of concerns
- Improved security boundaries
- Easier scaling and replacement of components
- Better compliance readiness (PDPL / SAMA-like requirements)

### Negative
- Slightly higher operational complexity
- Requires disciplined service boundaries

These trade-offs are acceptable and intentional.

## Notes
- Redis is strictly non-persistent.
- MongoDB must not store permissions or sensitive user data.
- Audit logs are append-only and must not be modified or queried by public APIs.
