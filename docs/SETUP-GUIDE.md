# BSM-AgentOS: Complete Setup Guide

## 🚀 Quick Start (5 Minutes)

### Option 1: Docker Compose (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/LexBANK/BSM.git
cd BSM

# 2. Copy environment template
cp .env.example .env

# 3. Edit .env and add your API keys (at minimum):
# - OPENAI_BSM_KEY
# - ADMIN_TOKEN (make it strong!)
# - JWT_SECRET
# - ENCRYPTION_KEY

# 4. Deploy everything
./scripts/deploy.sh
# Select option 1 (Docker Compose)

# 5. Access the platform
# - API: http://localhost:3000
# - Dashboard: http://localhost:8501
```

### Option 2: Local Development

```bash
# 1. Prerequisites
# - Node.js 22+
# - PostgreSQL 14+
# - Redis 7+

# 2. Clone and setup
git clone https://github.com/LexBANK/BSM.git
cd BSM
npm install

# 3. Setup environment
cp .env.example .env
# Edit .env with your credentials

# 4. Initialize database
npm run migrate:up

# 5. Start the server
npm start

# 6. Start the dashboard (in another terminal)
pip install -r src/dashboard/streamlit/requirements.txt
npm run dashboard
```

## 📦 What's Included

### Core Components

1. **Core Engine** - Multi-agent orchestration and task management
2. **Security Hub** - Authentication, encryption, and audit logging
3. **ML Engine** - Predictive models and inference service
4. **Dashboard** - Streamlit-based monitoring interface
5. **API Server** - RESTful API for all operations
6. **Database Layer** - PostgreSQL with full schema

### Architecture Layers

```
┌─────────────────────────────────────────┐
│         Client Layer                    │
│  Dashboard | Chat | Admin | Mobile      │
├─────────────────────────────────────────┤
│         API Gateway                     │
│  Express | CORS | Rate Limit | Auth    │
├─────────────────────────────────────────┤
│      Application Layer                  │
│  Core Engine | Security Hub | ML       │
├─────────────────────────────────────────┤
│         Agent Layer                     │
│  Multi-Agent System | Orchestration    │
├─────────────────────────────────────────┤
│         Data Layer                      │
│  PostgreSQL | Redis | Vector DB        │
├─────────────────────────────────────────┤
│      Infrastructure                     │
│  Docker | Kubernetes | CI/CD           │
└─────────────────────────────────────────┘
```

## 🏗️ System Architecture

### Database Schema

- **agents** - Agent configurations and metadata
- **tasks** - Task queue and execution history
- **users** - User accounts and authentication
- **sessions** - Active user sessions
- **knowledge** - Knowledge base documents
- **audit_logs** - Security and compliance logs

### API Endpoints

```
GET  /api/health              - System health check
GET  /api/agents              - List all agents
POST /api/agents/run          - Execute an agent
GET  /api/knowledge           - List knowledge items
POST /api/chat                - Chat interface
GET  /api/admin/agents        - Admin: Agent management
```

### Core Engine Features

- **Task Queue**: Priority-based with concurrency control
- **Event Bus**: Inter-component communication
- **Agent Manager**: Lifecycle and execution management
- **Plugin System**: Extensible architecture

### Security Features

- **Authentication**: JWT-based with session management
- **Encryption**: AES-256-GCM for sensitive data
- **Audit Logging**: Comprehensive security trails
- **Rate Limiting**: API abuse prevention
- **CORS Protection**: Origin validation

### ML Capabilities

- **Sentiment Analysis**: Text classification
- **Task Classification**: Automatic categorization
- **Agent Recommendation**: Best agent selection
- **Model Registry**: Centralized model management

## 🔧 Configuration

### Required Environment Variables

```bash
# Security (REQUIRED)
ADMIN_TOKEN=<16+ character string>
JWT_SECRET=<32+ character string>
ENCRYPTION_KEY=<64 hex characters>

# AI Provider (REQUIRED for agents)
OPENAI_BSM_KEY=<your OpenAI API key>

# Database (if not using Docker Compose)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bsm_agentos
DB_USER=postgres
DB_PASSWORD=<your password>

# Redis (if not using Docker Compose)
REDIS_URL=redis://localhost:6379
```

### Optional Configuration

See `.env.example` for all available options including:
- Cloud provider settings (AWS/GCP/Azure)
- Monitoring (Prometheus/Grafana)
- External integrations (Slack, Discord)
- Feature flags

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## 📊 Monitoring

### Access the Dashboard

```bash
# Start the dashboard
npm run dashboard

# Access at http://localhost:8501
```

### Dashboard Features

- **System Overview**: Health, uptime, metrics
- **Agent Management**: View and execute agents
- **Task Queue**: Monitor task execution
- **Security**: Audit logs and events
- **ML Models**: Model management and inference

## 🚀 Deployment

### Docker Compose (Production)

```bash
# Build and deploy
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Kubernetes (Scalable)

```bash
# Apply configurations
kubectl apply -f deployment/kubernetes/

# Check status
kubectl get pods -n bsm-agentos

# View logs
kubectl logs -f deployment/bsm-api -n bsm-agentos
```

## 📈 Scaling

### Horizontal Scaling

```bash
# Scale API servers
docker-compose up -d --scale api=3

# Or with Kubernetes
kubectl scale deployment bsm-api --replicas=5
```

### Performance Optimization

1. **Enable Redis Caching**: Set `REDIS_URL` in `.env`
2. **Database Connection Pooling**: Configured automatically
3. **Task Concurrency**: Adjust `MAX_CONCURRENT_TASKS`
4. **Rate Limits**: Configure per environment

## 🔐 Security Best Practices

### Production Checklist

- [ ] Set strong `ADMIN_TOKEN` (16+ characters)
- [ ] Generate unique `JWT_SECRET` (32+ characters)
- [ ] Generate `ENCRYPTION_KEY` (64 hex chars)
- [ ] Enable SSL/TLS (set `DB_SSL=true`)
- [ ] Configure CORS origins properly
- [ ] Enable audit logging
- [ ] Set up monitoring
- [ ] Regular security scans
- [ ] Keep dependencies updated

### Generate Secure Keys

```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Encryption Key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Ensure PostgreSQL is running
   - Check `DB_*` environment variables
   - Verify network connectivity

2. **Authentication Errors**
   - Check `ADMIN_TOKEN` is set
   - Verify JWT_SECRET is configured
   - Clear browser cookies/cache

3. **Agent Execution Fails**
   - Verify OpenAI API key is valid
   - Check agent configuration YAML
   - Review logs for specific errors

### Logs

```bash
# Docker logs
docker-compose logs -f api

# Application logs (local)
tail -f logs/app.log

# Dashboard logs
docker-compose logs -f dashboard
```

## 📚 Documentation

- [Architecture](docs/ARCHITECTURE.md) - System design and components
- [Blueprint](docs/BSM-AGENTOS-BLUEPRINT.md) - Complete platform blueprint
- [Implementation Guide](docs/IMPLEMENTATION-PHASE1.md) - Step-by-step guide
- [API Documentation](docs/API.md) - API reference (coming soon)

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

Copyright © 2026 LexBANK. All rights reserved.

## 🆘 Support

For issues and questions:
- GitHub Issues: https://github.com/LexBANK/BSM/issues
- Email: support@lexdo.uk

---

**Built with ❤️ by LexBANK | Powered by AI**
