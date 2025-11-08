# CodeCollab

> Real-time collaborative code editor with multi-language execution support

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11-blue)](https://python.org)
[![Rust](https://img.shields.io/badge/Rust-1.91-orange)](https://rust-lang.org)
[![Go](https://img.shields.io/badge/Go-1.21-cyan)](https://golang.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://typescriptlang.org)

## Features

### Core Functionality
- **Real-time Collaboration**: Multiple users can edit code simultaneously with live cursor tracking
- **10+ Programming Languages**: Python, JavaScript, TypeScript, Go, Rust, C, C++, Java, Zig, Elixir, V Lang
- **Code Execution**: Run code directly in the browser with isolated execution environments
- **Session Sharing**: Share sessions using 8-character codes
- **Persistent Storage**: MongoDB-backed session storage
- **Monaco Editor**: Full-featured code editor with syntax highlighting and IntelliSense

### Security
- JWT-based authentication
- Bcrypt password hashing
- CORS protection
- Environment-based configuration
- Isolated code execution
- Input validation and sanitization

## Prerequisites

- **Docker** (v20.10+) and **Docker Compose** (v2.0+)
- **Node.js** (v18+) and **npm** (v9+)
- **Rust** (v1.70+) and **Cargo**
- **Git**

### Optional (for language execution)
- Python 3.11+
- Node.js 18+
- Go 1.21+
- Rust 1.70+
- GCC/G++ (for C/C++)
- Java JDK 11+
- Zig 0.11+
- Elixir 1.12+
- V Lang 0.3+

## Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/mystichronicle/CodeCollab.git
cd CodeCollab
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Generate a secure secret key
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Update .env with the generated key
```

### 3. Build Execution Service
```bash
cd services/execution-service
cargo build --release
cd ../..
```

### 4. Install Frontend Dependencies
```bash
cd services/frontend
npm install
cd ../..
```

### 5. Start All Services
```bash
./startup.sh
```

### 6. Access Application
- **Frontend**: http://localhost:5173
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/v1/health

### Default Credentials
```
Email: admin@codecollab.dev
Password: admin123
```

**WARNING**: Change default credentials in production!

## Stopping Services

```bash
./shutdown.sh
```

## Architecture

### Services Overview

```
┌─────────────────┐
│    Frontend     │  React + TypeScript + Monaco Editor
│   Port: 5173    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API Gateway    │  FastAPI + Python
│   Port: 8000    │  (Authentication, Sessions, Routing)
└────────┬────────┘
         │
    ┌────┴────┬──────────┬────────────┐
    │         │          │            │
    ▼         ▼          ▼            ▼
┌────────┐ ┌────────┐ ┌──────┐ ┌──────────┐
│MongoDB │ │ Collab │ │ Exec │ │PostgreSQL│
│ :27017 │ │ :8002  │ │ :8004│ │  :5432   │
└────────┘ └────────┘ └──────┘ └──────────┘
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | React + TypeScript + Vite | User interface |
| **Editor** | Monaco Editor | Code editing |
| **API Gateway** | FastAPI (Python) | API routing & auth |
| **Collaboration** | Go + WebSockets | Real-time sync |
| **Execution** | Rust + Actix-web | Code execution |
| **Database** | MongoDB | Session storage |
| **Auth Database** | PostgreSQL | User management |
| **Cache** | Redis | Session caching |

## Project Structure

```
codecollab/
├── services/
│   ├── api-gateway/         # FastAPI backend
│   │   ├── app/
│   │   │   ├── api/v1/      # API endpoints
│   │   │   ├── core/        # Config, DB, security
│   │   │   ├── models/      # SQLAlchemy models
│   │   │   └── schemas/     # Pydantic schemas
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   ├── collab-service/      # Go WebSocket server
│   │   ├── cmd/server/
│   │   ├── Dockerfile
│   │   └── go.mod
│   │
│   ├── execution-service/   # Rust code executor
│   │   ├── src/
│   │   ├── Cargo.toml
│   │   └── Dockerfile
│   │
│   └── frontend/            # React application
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   └── services/
│       ├── package.json
│       └── vite.config.ts
│
├── docker-compose.yml       # Service orchestration
├── startup.sh               # Start script
├── shutdown.sh              # Stop script
├── .env.example             # Environment template
└── README.md                # This file
```

## Development

### Running Individual Services

**API Gateway:**
```bash
cd services/api-gateway
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Execution Service:**
```bash
cd services/execution-service
cargo run
```

**Frontend:**
```bash
cd services/frontend
npm run dev
```

**Collaboration Service:**
```bash
cd services/collab-service
go run cmd/server/main.go
```

### Building for Production

```bash
# Build all Docker images
docker-compose build

# Build execution service
cd services/execution-service
cargo build --release

# Build frontend
cd services/frontend
npm run build
```

## Testing

### Run All Tests
```bash
# Backend tests
cd services/api-gateway
pytest

# Frontend tests
cd services/frontend
npm test

# Execution service tests
cd services/execution-service
cargo test
```

### Manual Testing
```bash
# Health check
curl http://localhost:8000/api/v1/health

# Execute Python code
curl -X POST http://localhost:8004/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "print(\"Hello World\")", "language": "python"}'
```

## Supported Languages

| Language | Compiler/Interpreter | Execution Time* |
|----------|---------------------|-----------------|
| Python | python3 | ~30ms |
| JavaScript | node | ~80ms |
| C | gcc | ~40ms |
| Rust | rustc | ~120ms |
| C++ | g++ | ~320ms |
| Zig | zig | ~380ms |
| Elixir | elixir | ~390ms |
| Java | javac + java | ~660ms |
| TypeScript | ts-node | ~100ms |
| Go | go run | ~4s (first compile) |
| V Lang | v run | Fast |

*Average execution time for "Hello World" programs

## Security Considerations

### For Development
- Default credentials provided for testing
- Self-signed certificates acceptable
- CORS allows localhost origins

### For Production
1. **Change all default credentials**
2. **Set strong SECRET_KEY** (use `secrets.token_urlsafe(32)`)
3. **Use HTTPS** with valid SSL certificates
4. **Restrict CORS** to your domain only
5. **Enable rate limiting**
6. **Set up firewall** rules
7. **Regular security updates**
8. **Monitor logs** for suspicious activity
9. **Use environment variables** for secrets
10. **Enable database authentication**

### Environment Variables (Production)
```bash
# Required
SECRET_KEY=<64-char-random-string>
ENVIRONMENT=production
DATABASE_URL=postgresql://user:pass@host/db
MONGODB_URL=mongodb://user:pass@host/db

# Recommended
CORS_ORIGINS=https://yourdomain.com
ACCESS_TOKEN_EXPIRE_MINUTES=15
```

## Troubleshooting

### Port Already in Use
```bash
# Kill processes on specific ports
lsof -ti:5173 | xargs kill -9  # Frontend
lsof -ti:8000 | xargs kill -9  # API
lsof -ti:8004 | xargs kill -9  # Execution
```

### Docker Issues
```bash
# Reset Docker environment
docker-compose down -v
docker system prune -af
docker-compose up -d
```

### Database Connection Errors
```bash
# Check database status
docker-compose ps

# View logs
docker-compose logs mongodb
docker-compose logs postgres

# Restart databases
docker-compose restart mongodb postgres
```

### Execution Service Not Starting
```bash
# Rebuild execution service
cd services/execution-service
cargo clean
cargo build --release

# Check if binary exists
ls -la target/release/execution-service
```

## API Documentation

Once running, interactive API documentation is available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

**Authentication:**
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login and get JWT token

**Sessions:**
- `POST /api/v1/sessions` - Create new session
- `GET /api/v1/sessions` - List user's sessions
- `GET /api/v1/sessions/{id}` - Get session details
- `PUT /api/v1/sessions/{id}` - Update session
- `POST /api/v1/sessions/join-by-code/{code}` - Join by share code

**Code Execution:**
- `POST /api/v1/execute` - Execute code

**WebSocket:**
- `WS /ws/{sessionId}` - Connect to collaboration session

## Contributing

We welcome contributions! Please follow these steps:

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Monaco Editor** - Microsoft's excellent code editor
- **FastAPI** - Modern Python web framework
- **Actix-web** - Powerful Rust web framework
- **Motor** - Async MongoDB driver
- **Docker** - Containerization platform

## Support

- **Issues**: [GitHub Issues](https://github.com/mystichronicle/CodeCollab/issues)
- **Discussions**: [GitHub Discussions](https://github.com/mystichronicle/CodeCollab/discussions)

## Roadmap

- [x] Real-time collaboration
- [x] Multi-language support (10 languages)
- [x] Session sharing
- [x] MongoDB persistence
- [ ] AI code suggestions
- [ ] Git integration
- [ ] Terminal sharing
- [ ] Video chat
- [ ] Mobile app
- [ ] Plugin system

---
