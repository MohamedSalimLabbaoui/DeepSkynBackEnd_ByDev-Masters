#!/bin/bash
# Commandes Quick Start - Intégration LSF

# ============================================================================
# 🎬 PHASE 1: MICROSERVICE PYTHON FASTAPI
# ============================================================================

echo "📦 PHASE 1: Setup Microservice Python"

# Clone the sign language repository
git clone https://github.com/sign-language-processing/spoken-to-signed-translation.git
cd spoken-to-signed-translation

# Create virtual environment (Linux/Mac)
python3 -m venv .venv
source .venv/bin/activate

# Create virtual environment (Windows)
# python -m venv .venv
# .venv\Scripts\activate

# Install dependencies
pip install --upgrade pip
pip install .
pip install fastapi uvicorn

# Copy FastAPI app
cp ../DeepSkynBackEnd_ByDev-Masters/ml/app.py .

# Start FastAPI server
uvicorn app:app --host 0.0.0.0 --port 8000 --reload

# In another terminal, verify:
curl http://localhost:8000/health
# Expected: {"status":"healthy","pipeline_initialized":true,"supported_languages":["fr","en"]}

# ============================================================================
# 🔧 PHASE 2: BACKEND NESTJS
# ============================================================================

echo "🔧 PHASE 2: Setup Backend NestJS"

cd DeepSkynBackEnd_ByDev-Masters

# Install NPM dependencies (if not already done)
npm install

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate
# Follow the prompts

# Update .env with microservice URL
echo "SIGN_TRANSLATION_SERVICE_URL=http://localhost:8000" >> .env

# Start NestJS in development
npm run start:dev

# In another terminal, test the endpoints:
curl -X POST http://localhost:3001/sign-translation/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "Bonjour", "language": "fr"}'

# ============================================================================
# ⚛️ PHASE 3: FRONTEND REACT
# ============================================================================

echo "⚛️ PHASE 3: Setup Frontend React"

cd Git_DeepSkyn

# Install NPM dependencies (if not already done)
npm install

# Create/Update .env.local
echo "REACT_APP_API_URL=http://localhost:3001" >> .env.local

# Start development server
npm run dev

# ============================================================================
# 🧪 TESTING
# ============================================================================

echo "🧪 Testing the integration"

# Test 1: Python Microservice
echo "Test 1: Python Microservice Health"
curl http://localhost:8000/health

echo "Test 2: Translate Text"
curl -X POST http://localhost:8000/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "language": "en"}'

# Test 2: NestJS API
echo "Test 3: NestJS Translate Text"
curl -X POST http://localhost:3001/sign-translation/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "Bonjour le monde", "language": "fr"}'

echo "Test 4: NestJS Save Video Post"
curl -X POST http://localhost:3001/sign-translation/videopost/test-post-001 \
  -H "Content-Type: application/json" \
  -d '{"transcript": "Welcome to the platform", "language": "en"}'

echo "Test 5: NestJS Retrieve Translation"
curl http://localhost:3001/sign-translation/videopost/test-post-001

# Test 3: Run E2E Tests
echo "Test 6: Run E2E Tests (from DeepSkynBackEnd_ByDev-Masters)"
npm run test:e2e

# ============================================================================
# 🐳 DOCKER DEPLOYMENT (Optional)
# ============================================================================

echo "🐳 Docker Deployment (Optional)"

# Build and run microservice in Docker
cd DeepSkynBackEnd_ByDev-Masters/ml
docker build -t deepskyn-lsf:latest .
docker run -p 8000:8000 deepskyn-lsf:latest

# Or use docker-compose
docker-compose up -d

# ============================================================================
# 🔍 DEBUGGING COMMANDS
# ============================================================================

echo "🔍 Debugging Commands"

# Check if microservice is running
netstat -tlnp | grep 8000  # Linux/Mac
netstat -ano | findstr :8000  # Windows

# Check if NestJS is running
lsof -i :3001  # Linux/Mac
netstat -ano | findstr :3001  # Windows

# Check if React dev server is running
lsof -i :5173  # Linux/Mac (Vite)
netstat -ano | findstr :5173  # Windows

# View NestJS logs
npm run start:dev -- --debug

# View FastAPI logs
uvicorn app:app --log-level=debug

# Database: Check sign_translations table
npm run prisma:studio
# Opens http://localhost:5555

# ============================================================================
# 🚀 PRODUCTION DEPLOYMENT
# ============================================================================

echo "🚀 Production Deployment"

# Backend: Build for production
npm run build

# Start production server
npm run start:prod

# Frontend: Build for production
npm run build

# Microservice: With production ASGI server
pip install gunicorn
gunicorn app:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

# ============================================================================
# 📊 MONITORING & LOGS
# ============================================================================

echo "📊 Monitoring"

# View all logs
tail -f logs/*.log

# Monitor microservice performance
curl http://localhost:8000/info/about

# Check database stats
npm run prisma:studio

# View NestJS metrics (if Prometheus installed)
curl http://localhost:3001/metrics

# ============================================================================
# 🧹 CLEANUP
# ============================================================================

echo "🧹 Cleanup (if needed)"

# Stop all Docker containers
docker stop deepskyn-lsf

# Reset database
npm run prisma:reset

# Clear node_modules and reinstall
rm -rf node_modules
npm install

# ============================================================================
# 📋 QUICK REFERENCE
# ============================================================================

echo "📋 Quick Reference URLs"
echo "Python Microservice: http://localhost:8000"
echo "  Health: http://localhost:8000/health"
echo "  Docs: http://localhost:8000/docs"
echo ""
echo "NestJS Backend: http://localhost:3001"
echo "  Swagger: http://localhost:3001/api"
echo ""
echo "React Frontend: http://localhost:5173 (Vite)"
echo ""
echo "Prisma Studio: http://localhost:5555"
