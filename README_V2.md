# 🤖 BSM-AgentOS v2.0.0

[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-22+-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Ready-blue.svg)](https://kubernetes.io/)

**The Smartest AI Agent Platform Globally** - A comprehensive, production-ready AI agent ecosystem with multi-agent orchestration, advanced ML capabilities, enterprise security, and real-time monitoring.

---

## 🌟 What is BSM-AgentOS?

BSM-AgentOS is a next-generation AI agent platform that combines:
- **Multi-Agent Orchestration**: Coordinate complex tasks across multiple specialized AI agents
- **Enterprise Security**: Built-in authentication, encryption, and comprehensive audit logging
- **ML Intelligence**: Predictive models, sentiment analysis, and automated recommendations
- **Real-Time Dashboard**: Streamlit-based monitoring and management interface
- **Cloud-Ready**: Deploy to Docker, Kubernetes, or any cloud provider
- **Scalable Architecture**: Handle thousands of concurrent users with horizontal scaling

## ✨ Key Features

### 🎯 Core Capabilities
- ✅ **Multi-Agent System** - Coordinate specialized agents for complex workflows
- ✅ **Priority Task Queue** - Intelligent task scheduling with concurrency control
- ✅ **Event-Driven Architecture** - Real-time inter-component communication
- ✅ **Plugin System** - Extensible architecture for custom functionality

### 🔐 Enterprise Security
- ✅ **JWT Authentication** - Secure session management
- ✅ **AES-256 Encryption** - Protect sensitive data at rest
- ✅ **Comprehensive Audit Logs** - Track all security events
- ✅ **Role-Based Access Control** - Fine-grained permissions
- ✅ **Rate Limiting** - Prevent API abuse

### 🧠 ML & AI
- ✅ **Sentiment Analysis** - Understand text sentiment and tone
- ✅ **Task Classification** - Automatically categorize tasks
- ✅ **Agent Recommendation** - Suggest the best agent for each task
- ✅ **Model Registry** - Centralized ML model management
- ✅ **Inference Service** - Fast, scalable predictions

### 📊 Monitoring & Operations
- ✅ **Interactive Dashboard** - Streamlit-based UI for monitoring
- ✅ **Health Checks** - Automatic service health monitoring
- ✅ **Metrics Collection** - Track performance and usage
- ✅ **Log Aggregation** - Centralized logging with Pino
- ✅ **Event Tracking** - Audit trail for all operations

### 🚀 Deployment & DevOps
- ✅ **Docker Support** - Multi-stage builds for optimization
- ✅ **Docker Compose** - Complete stack deployment
- ✅ **Kubernetes Ready** - Production-grade orchestration
- ✅ **CI/CD Pipeline** - Automated testing and deployment
- ✅ **Database Migrations** - Version-controlled schema changes

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Dashboard  │  │   Chat UI   │  │  Admin UI   │         │
│  │ (Streamlit) │  │  (Vue 3)    │  │  (HTML/JS)  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└──────────────────────────────────────────────────────────────┘
                           │ REST API
┌──────────────────────────────────────────────────────────────┐
│                    API GATEWAY                               │
│   Express.js │ CORS │ Rate Limiting │ Authentication        │
└──────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────────────────────────────────────────┐
│                 APPLICATION LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Core Engine  │  │Security Hub  │  │  ML Engine   │      │
│  │ - TaskQueue  │  │ - Auth       │  │ - Inference  │      │
│  │ - EventBus   │  │ - Encryption │  │ - Registry   │      │
│  │ - AgentMgr   │  │ - AuditLog   │  │ - Training   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────────────────────────────────────────┐
│                    AGENT LAYER                               │
│        Multi-Agent System │ Orchestration │ Execution       │
└──────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────────────────────────────────────────┐
│                     DATA LAYER                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ PostgreSQL   │  │    Redis     │  │  Vector DB   │      │
│  │ (Primary)    │  │   (Cache)    │  │  (ML/Embed)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/LexBANK/BSM.git
cd BSM

# 2. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 3. Deploy with one command
./scripts/deploy.sh

# 4. Access the platform
# API: http://localhost:3000
# Dashboard: http://localhost:8501
```

### Option 2: Local Development

```bash
# Prerequisites: Node.js 22+, PostgreSQL 14+, Redis 7+

# 1. Install dependencies
npm install

# 2. Setup database
npm run migrate:up

# 3. Start the server
npm start

# 4. Start the dashboard (new terminal)
npm run dashboard
```

See [Complete Setup Guide](docs/SETUP-GUIDE.md) for detailed instructions.

## 📦 What's Included

### Core Components
- **Core Engine** (`src/core/`) - Multi-agent orchestration and task management
- **Security Hub** (`src/security/`) - Authentication, encryption, audit logging
- **ML Engine** (`src/ml/`) - Machine learning inference and model management
- **API Server** (`src/`) - RESTful API with Express.js
- **Dashboard** (`src/dashboard/streamlit/`) - Interactive monitoring interface

### Database Layer
- **Schemas** (`data/schemas/`) - PostgreSQL database schemas
- **Migrations** (`scripts/db-migrate.js`) - Version-controlled schema updates
- **Models** (`data/models/`) - Data access layer

### Infrastructure
- **Docker** (`Dockerfile`, `docker-compose.yml`) - Containerization
- **Kubernetes** (`deployment/kubernetes/`) - Orchestration configs
- **CI/CD** (`.github/workflows/`) - Automated testing and deployment

### Documentation
- [Architecture Guide](docs/ARCHITECTURE.md)
- [Complete Blueprint](docs/BSM-AGENTOS-BLUEPRINT.md)
- [Setup Guide](docs/SETUP-GUIDE.md)
- [Implementation Guides](docs/)

## 🔧 Configuration

### Environment Variables

```bash
# Security (REQUIRED)
ADMIN_TOKEN=<16+ characters>
JWT_SECRET=<32+ characters>
ENCRYPTION_KEY=<64 hex characters>

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bsm_agentos
DB_USER=postgres
DB_PASSWORD=<your-password>

# AI Provider
OPENAI_BSM_KEY=<your-openai-key>

# Redis Cache
REDIS_URL=redis://localhost:6379
```

Generate secure keys:
```bash
# JWT Secret (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Encryption Key (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

See [.env.example](.env.example) for all available options.

## 📊 API Endpoints

### Public Endpoints
```
GET  /api/health              - System health check
GET  /api/agents              - List all agents
POST /api/agents/run          - Execute an agent
GET  /api/knowledge           - List knowledge items
POST /api/chat                - Chat with agents
POST /api/chat/direct         - Direct GPT chat
```

### Admin Endpoints (requires authentication)
```
GET  /api/admin/agents        - Agent management
GET  /api/admin/knowledge     - Knowledge management
GET  /api/admin/tasks         - Task monitoring
GET  /api/admin/security      - Security dashboard
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## 📈 Deployment

### Docker Compose (Development/Production)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Kubernetes (Production)

```bash
# Deploy to cluster
kubectl apply -f deployment/kubernetes/

# Check status
kubectl get pods -n bsm-agentos

# Scale API servers
kubectl scale deployment bsm-api --replicas=5
```

### Cloud Platforms
- **AWS**: ECS, EKS, Lambda
- **Google Cloud**: GKE, Cloud Run
- **Azure**: AKS, Container Instances
- **Render.com**: Direct deployment (render.yaml included)

## 🔐 Security

### Best Practices
- ✅ Strong admin token (16+ characters)
- ✅ Unique JWT secret (32+ characters)
- ✅ AES-256 encryption for sensitive data
- ✅ HTTPS/TLS in production
- ✅ Regular security audits
- ✅ Dependency updates
- ✅ Rate limiting enabled
- ✅ CORS properly configured

### Security Features
- JWT-based authentication
- AES-256-GCM encryption
- Comprehensive audit logging
- Rate limiting
- CORS protection
- Input validation
- SQL injection prevention
- XSS protection

## 📚 Documentation

- [📖 Complete Setup Guide](docs/SETUP-GUIDE.md)
- [🏗️ Architecture Documentation](docs/ARCHITECTURE.md)
- [📘 Platform Blueprint](docs/BSM-AGENTOS-BLUEPRINT.md)
- [🔧 Implementation Phase 1](docs/IMPLEMENTATION-PHASE1.md)
- [🔒 Security Hub Guide](docs/SECURITY-HUB-IMPLEMENTATION.md)
- [⚙️ Core Engine Guide](docs/CORE-ENGINE-IMPLEMENTATION.md)

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📊 Project Stats

- **Total Files**: 100+
- **Lines of Code**: 15,000+
- **Components**: 12 major subsystems
- **Test Coverage**: 85%+ (goal)
- **Docker Images**: 2 (API + Dashboard)
- **Kubernetes Resources**: 10+
- **Documentation**: 50,000+ words

## 🆘 Support

### Get Help
- 📧 Email: support@lexdo.uk
- 🐛 Issues: [GitHub Issues](https://github.com/LexBANK/BSM/issues)
- 📚 Docs: [Documentation](docs/)

### Commercial Support
Contact us for enterprise support, custom development, and training:
- 🌐 Website: https://www.lexdo.uk
- 📧 Email: dev@lexdo.uk

## 📄 License

Copyright © 2026 LexBANK. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

## 🙏 Acknowledgments

- Built with ❤️ by the LexBANK team
- Powered by OpenAI GPT models
- Inspired by modern AI agent architectures
- Community-driven development

---

<div align="center">
  <strong>BSM-AgentOS v2.0.0</strong><br>
  The Smartest AI Agent Platform Globally<br>
  <br>
  <a href="https://www.lexdo.uk">Website</a> •
  <a href="docs/SETUP-GUIDE.md">Documentation</a> •
  <a href="https://github.com/LexBANK/BSM/issues">Issues</a>
</div>
