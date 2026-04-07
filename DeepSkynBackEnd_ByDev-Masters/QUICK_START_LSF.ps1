# Quick Start - Intégration LSF (Windows PowerShell)

# ============================================================================
# 🎬 PHASE 1: MICROSERVICE PYTHON FASTAPI
# ============================================================================

Write-Host "📦 PHASE 1: Setup Microservice Python" -ForegroundColor Green

# Clone the repository
git clone https://github.com/sign-language-processing/spoken-to-signed-translation.git
cd spoken-to-signed-translation

# Create virtual environment (Windows)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
python -m pip install --upgrade pip
pip install .
pip install fastapi uvicorn

# Copy FastAPI app
Copy-Item ../DeepSkynBackEnd_ByDev-Masters/ml/app.py .

# Start FastAPI server
Write-Host "🚀 Starting FastAPI server on http://localhost:8000" -ForegroundColor Cyan
uvicorn app:app --host 0.0.0.0 --port 8000 --reload

# In another PowerShell terminal, verify:
# Invoke-WebRequest http://localhost:8000/health | Select-Object -ExpandProperty Content | ConvertFrom-Json

# ============================================================================
# 🔧 PHASE 2: BACKEND NESTJS
# ============================================================================

Write-Host "🔧 PHASE 2: Setup Backend NestJS" -ForegroundColor Green

cd ../DeepSkynBackEnd_ByDev-Masters

# Install NPM dependencies (if needed)
npm install

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate
# Follow the prompts

# Update .env
Write-Host "⚙️ Updating .env with microservice URL..." -ForegroundColor Yellow
Add-Content -Path .env -Value "SIGN_TRANSLATION_SERVICE_URL=http://localhost:8000"

# Start NestJS
Write-Host "🚀 Starting NestJS server on http://localhost:3001" -ForegroundColor Cyan
npm run start:dev

# In another PowerShell terminal, test endpoints:
# $body = @{"text"="Bonjour"; "language"="fr"} | ConvertTo-Json
# Invoke-WebRequest `
#   -Uri "http://localhost:3001/sign-translation/translate" `
#   -Method POST `
#   -Headers @{"Content-Type"="application/json"} `
#   -Body $body

# ============================================================================
# ⚛️ PHASE 3: FRONTEND REACT
# ============================================================================

Write-Host "⚛️ PHASE 3: Setup Frontend React" -ForegroundColor Green

cd ../Git_DeepSkyn

# Install dependencies
npm install

# Create/Update .env.local
Write-Host "⚙️ Creating .env.local..." -ForegroundColor Yellow
$envContent = "REACT_APP_API_URL=http://localhost:3001"
Add-Content -Path .env.local -Value $envContent

# Start React dev server
Write-Host "🚀 Starting React dev server on http://localhost:5173" -ForegroundColor Cyan
npm run dev

# ============================================================================
# 🧪 TESTING
# ============================================================================

Write-Host "🧪 Testing the integration" -ForegroundColor Green

function Test-Port {
    param([int]$Port)
    $tcp = New-Object Net.Sockets.TcpClient
    try {
        $tcp.Connect('127.0.0.1', $Port)
        Write-Host "✅ Port $Port is open" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ Port $Port is closed" -ForegroundColor Red
        return $false
    } finally {
        $tcp.Close()
    }
}

# Test 1: Check if services are running
Write-Host "Checking services..." -ForegroundColor Cyan
Test-Port 8000  # Python Microservice
Test-Port 3001  # NestJS Backend
Test-Port 5173  # React Frontend

# Test 2: Python Microservice
Write-Host "Test 1: Python Microservice Health" -ForegroundColor Blue
Invoke-WebRequest http://localhost:8000/health -ErrorAction Continue

# Test 3: Translate Text via Microservice
Write-Host "Test 2: Translate Text (Microservice)" -ForegroundColor Blue
$body = @{
    text = "Hello world"
    language = "en"
} | ConvertTo-Json

Invoke-WebRequest `
    -Uri "http://localhost:8000/translate" `
    -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body $body `
    -ErrorAction Continue

# Test 4: NestJS Translate
Write-Host "Test 3: Translate Text (NestJS)" -ForegroundColor Blue
$body = @{
    text = "Bonjour le monde"
    language = "fr"
} | ConvertTo-Json

Invoke-WebRequest `
    -Uri "http://localhost:3001/sign-translation/translate" `
    -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body $body `
    -ErrorAction Continue

# Test 5: Save Video Post
Write-Host "Test 4: Save Video Post" -ForegroundColor Blue
$body = @{
    transcript = "Welcome to the platform"
    language = "en"
} | ConvertTo-Json

Invoke-WebRequest `
    -Uri "http://localhost:3001/sign-translation/videopost/test-post-001" `
    -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body $body `
    -ErrorAction Continue

# Test 6: Retrieve Translation
Write-Host "Test 5: Retrieve Translation" -ForegroundColor Blue
Invoke-WebRequest `
    -Uri "http://localhost:3001/sign-translation/videopost/test-post-001" `
    -Method GET `
    -ErrorAction Continue

# ============================================================================
# 🐳 DOCKER DEPLOYMENT (Optional)
# ============================================================================

Write-Host "🐳 Docker Deployment (Optional)" -ForegroundColor Green

# Build microservice Docker image
cd ../DeepSkynBackEnd_ByDev-Masters/ml
docker build -t deepskyn-lsf:latest .

# Run microservice in Docker
docker run -p 8000:8000 deepskyn-lsf:latest

# Or use docker-compose
docker-compose up -d

# ============================================================================
# 🔍 DEBUGGING COMMANDS
# ============================================================================

Write-Host "🔍 Debugging Commands" -ForegroundColor Green

# Check if ports are in use
netstat -ano | findstr :8000  # Python Microservice
netstat -ano | findstr :3001  # NestJS
netstat -ano | findstr :5173  # React (Vite)

# Kill a process on a specific port
# Get-Process | Where-Object {$_.Id -eq PID} | Stop-Process -Force

# View environment variables
Get-ChildItem env:SIGN_TRANSLATION_SERVICE_URL

# ============================================================================
# 🚀 PRODUCTION DEPLOYMENT
# ============================================================================

Write-Host "🚀 Production Deployment" -ForegroundColor Green

# Build NestJS for production
npm run build

# Start NestJS in production
npm run start:prod

# Build React for production
npm run build
# Output will be in dist/

# Serve React build
npx serve -s dist -l 3000

# Python: Install production ASGI server
pip install gunicorn
gunicorn app:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

# ============================================================================
# 📊 MONITORING & LOGS
# ============================================================================

Write-Host "📊 Monitoring" -ForegroundColor Green

# Open Prisma Studio
npm run prisma:studio
# Opens http://localhost:5555

# View NestJS API docs (Swagger)
# http://localhost:3001/api

# View Python API docs (Swagger)
# http://localhost:8000/docs

# ============================================================================
# 🧹 CLEANUP
# ============================================================================

Write-Host "🧹 Cleanup Commands" -ForegroundColor Yellow

# Stop Docker container
# docker stop deepskyn-lsf

# Reset database
# npm run prisma:reset

# Delete node_modules and reinstall
# Remove-Item -Recurse -Force node_modules
# npm install

# ============================================================================
# 📋 QUICK REFERENCE
# ============================================================================

$references = @"
📋 QUICK REFERENCE URLS & COMMANDS
==================================

Services:
  Python Microservice: http://localhost:8000
  - Health Check: http://localhost:8000/health
  - API Docs: http://localhost:8000/docs

  NestJS Backend: http://localhost:3001
  - Swagger Docs: http://localhost:3001/api
  - Health: http://localhost:3001/health

  React Frontend: http://localhost:5173 (Vite)

Database:
  Prisma Studio: http://localhost:5555

Useful Commands:
  Check port: netstat -ano | findstr :8000
  Test API: Invoke-WebRequest http://localhost:8000/health
  Migrate DB: npm run prisma:migrate
  Run tests: npm run test:e2e

Logs Location:
  Backend: console output from npm run start:dev
  Frontend: browser console (F12)
  Python: console output from uvicorn

Environment Variables:
  Backend:   see .env
  Frontend:  see .env.local
  Python:    create .env in the sls folder
"@

Write-Host $references -ForegroundColor Cyan

Write-Host "✅ Setup complete! Ready to use LSF translation." -ForegroundColor Green
