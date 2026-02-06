# 🚀 BSM-AgentOS Quick Start Guide

> Get your BSM-AgentOS platform up and running in minutes!

---

## Prerequisites

- **Node.js** 22+ and npm 10+
- **PostgreSQL** 16+ (or Docker)
- **Redis** 7+ (or Docker)
- **Git**

---

## Quick Installation

### Option 1: Using Docker (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/LexBANK/BSM.git
cd BSM

# 2. Copy environment file
cp .env.example .env

# 3. Edit .env with your API keys
nano .env  # or use your preferred editor

# 4. Start all services with Docker Compose
docker-compose up -d

# 5. Initialize database
docker-compose exec bsm-api npm run migrate:up
docker-compose exec bsm-api npm run seed

# 6. Check status
docker-compose ps

# ✅ Your BSM-AgentOS is ready!
# API: http://localhost:3000
# Dashboard: http://localhost:8501 (Streamlit)
# Grafana: http://localhost:3001 (if monitoring enabled)
```

### Option 2: Local Installation

```bash
# 1. Clone the repository
git clone https://github.com/LexBANK/BSM.git
cd BSM

# 2. Install dependencies
npm install

# 3. Set up PostgreSQL
createdb bsm
createuser bsm_user --pwprompt

# 4. Set up Redis
# Make sure Redis is running on localhost:6379

# 5. Copy and configure environment
cp .env.example .env
nano .env  # Add your API keys and database credentials

# 6. Run database migrations
npm run migrate:up

# 7. Seed initial data
npm run seed

# 8. Start the application
npm run dev

# ✅ Your BSM-AgentOS is ready!
# API: http://localhost:3000
```

---

## Post-Installation Setup

### 1. Generate Security Keys

```bash
# Generate JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate Encryption Key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add these to your .env file
```

### 2. Create Admin User

```bash
# Using API
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@lexdo.uk",
    "password": "YourStrongPassword123!",
    "role": "admin"
  }'
```

### 3. Test Your Installation

```bash
# Health check
curl http://localhost:3000/api/health

# Expected response:
# {"status":"healthy","timestamp":"..."}

# List agents
curl http://localhost:3000/api/agents

# Test authentication
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "YourStrongPassword123!"
  }'
```

---

## Essential Configuration

### Minimum Required Settings (.env)

```env
# Required
NODE_ENV=production
PORT=3000
OPENAI_BSM_KEY=sk-...your-key-here
DB_PASSWORD=your-db-password
JWT_SECRET=your-generated-jwt-secret
ENCRYPTION_KEY=your-generated-encryption-key
ADMIN_TOKEN=your-strong-admin-token

# Recommended
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
MAX_CONCURRENT_TASKS=10
```

---

## Feature Activation

### Enable ML Engine

```env
ML_ENABLED=true
ML_MODELS_DIR=./data/models
```

### Enable Security Hub

```env
SECURITY_HUB_ENABLED=true
AUDIT_LOGGING_ENABLED=true
THREAT_DETECTION_ENABLED=true
```

### Enable Monitoring

```env
PROMETHEUS_ENABLED=true
GRAFANA_ENABLED=true
```

---

## Access Points

### API Endpoints

| Endpoint | Purpose | Auth Required |
|----------|---------|---------------|
| `/api/health` | Health check | No |
| `/api/agents` | List agents | No |
| `/api/agents/run` | Execute agent | Yes |
| `/api/chat` | Chat interface | No |
| `/api/admin` | Admin panel | Yes (Admin) |
| `/api/ml/predict` | ML predictions | Yes |
| `/api/security/audit` | Audit logs | Yes (Admin) |

### Web Interfaces

- **Chat UI**: http://localhost:3000/chat
- **Admin UI**: http://localhost:3000/admin
- **Streamlit Dashboard**: http://localhost:8501
- **API Documentation**: http://localhost:3000/docs

---

## Creating Your First Agent

### 1. Create Agent Configuration

Create `data/agents/my-agent.yaml`:

```yaml
id: my-agent
name: My Custom Agent
role: Assistant that helps with specific tasks
description: |
  This agent specializes in...
modelProvider: openai
modelKey: bsm
modelName: gpt-4o-mini
capabilities:
  - analyze-text
  - generate-response
  - data-processing
actions:
  - create_file
  - update_file
status: active
```

### 2. Register Agent

```bash
# Update index
node -e "
const fs = require('fs');
const index = JSON.parse(fs.readFileSync('data/agents/index.json'));
index.agents.push('my-agent.yaml');
fs.writeFileSync('data/agents/index.json', JSON.stringify(index, null, 2));
"

# Or use API
curl -X POST http://localhost:3000/api/agents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d @my-agent.json
```

### 3. Test Agent

```bash
curl -X POST http://localhost:3000/api/agents/run \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "my-agent",
    "input": "Hello! What can you help me with?"
  }'
```

---

## Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

---

## Development Workflow

### 1. Start Development Server

```bash
npm run dev
# Server will auto-reload on file changes
```

### 2. Access Logs

```bash
# View application logs
tail -f logs/bsm.log

# Docker logs
docker-compose logs -f bsm-api
```

### 3. Database Operations

```bash
# Run migrations
npm run migrate:up

# Rollback migration
npm run migrate:down

# Reset database
npm run migrate:down && npm run migrate:up && npm run seed
```

---

## Monitoring & Metrics

### View Real-time Metrics

```bash
# Start Streamlit dashboard
npm run dashboard

# Access Grafana (if enabled)
# http://localhost:3001
# Default: admin / admin (change immediately!)
```

### Check System Status

```bash
curl http://localhost:3000/api/health/detailed

# Response includes:
# - Core engine status
# - Database connection
# - Redis connection
# - Active agents
# - Running tasks
```

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

```bash
# Check PostgreSQL is running
pg_isready

# Check credentials in .env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bsm
DB_USER=bsm_user
DB_PASSWORD=your-password
```

#### 2. Redis Connection Failed

```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Check REDIS_URL in .env
REDIS_URL=redis://localhost:6379
```

#### 3. Agent Execution Failed

```bash
# Check OpenAI API key
echo $OPENAI_BSM_KEY

# Verify in .env
OPENAI_BSM_KEY=sk-...

# Check agent configuration
npm run validate
```

#### 4. Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process or change PORT in .env
PORT=3001
```

### Getting Help

- 📖 **Documentation**: [docs/](./docs/)
- 🐛 **Issues**: [GitHub Issues](https://github.com/LexBANK/BSM/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/LexBANK/BSM/discussions)
- 📧 **Email**: support@lexdo.uk

---

## Next Steps

### 1. Explore the Platform

- ✅ Complete the [Tutorial](./docs/TUTORIAL.md)
- ✅ Read the [Architecture Guide](./docs/BSM-AGENTOS-BLUEPRINT.md)
- ✅ Review [Security Best Practices](./docs/SECURITY-DEPLOYMENT.md)

### 2. Customize Your Setup

- ✅ Configure agents for your use case
- ✅ Set up monitoring dashboards
- ✅ Integrate with your systems
- ✅ Deploy to production

### 3. Advanced Features

- ✅ Create custom plugins
- ✅ Build ML models
- ✅ Design complex workflows
- ✅ Set up multi-environment deployment

---

## Production Deployment

### Prerequisites for Production

- [ ] Change all default passwords
- [ ] Generate strong security keys
- [ ] Configure SSL/TLS certificates
- [ ] Set up database backups
- [ ] Configure monitoring alerts
- [ ] Review security checklist

### Deployment Options

1. **Kubernetes**: See [docs/deployment/kubernetes-setup.md](./docs/deployment/kubernetes-setup.md)
2. **AWS**: See [docs/deployment/aws-deployment.md](./docs/deployment/aws-deployment.md)
3. **Docker Swarm**: See [docs/deployment/docker-swarm.md](./docs/deployment/docker-swarm.md)
4. **Render.com**: Already configured via `render.yaml`

---

## Performance Tuning

### Optimize for Production

```env
# Increase concurrent tasks
MAX_CONCURRENT_TASKS=50

# Optimize database connections
DB_MAX_CONNECTIONS=100

# Enable caching
REDIS_CACHE_TTL=3600

# Set production log level
LOG_LEVEL=warn
```

### Scale Horizontally

```bash
# Use Docker Compose scaling
docker-compose up -d --scale bsm-api=3

# Or Kubernetes
kubectl scale deployment bsm-api --replicas=5
```

---

## Security Checklist

Before going to production:

- [ ] Change `ADMIN_TOKEN` to strong value (32+ characters)
- [ ] Generate and set `JWT_SECRET` (64+ hex characters)
- [ ] Generate and set `ENCRYPTION_KEY` (64 hex characters)
- [ ] Change all default passwords (database, Redis, Grafana)
- [ ] Enable HTTPS/TLS
- [ ] Configure firewall rules
- [ ] Set up rate limiting
- [ ] Enable audit logging
- [ ] Configure secret scanning
- [ ] Set up backup procedures
- [ ] Review and update CORS origins
- [ ] Enable security headers
- [ ] Set up monitoring alerts

---

## Support & Community

### Get Involved

- ⭐ **Star** the project on GitHub
- 🐛 **Report bugs** via Issues
- 💡 **Request features** via Discussions
- 🤝 **Contribute** via Pull Requests
- 📢 **Share** your success stories

### Stay Updated

- 📰 [Changelog](./CHANGELOG.md)
- 📝 [Release Notes](https://github.com/LexBANK/BSM/releases)
- 🐦 Follow us on social media

---

**🎉 Congratulations! You're now ready to build amazing AI agent applications with BSM-AgentOS!**

---

*Last Updated: 2026-02-06*  
*Version: 2.0.0*
