@echo off
echo ========================================
echo   BizzAuto - Quick Start Script
echo ========================================
echo.

echo [1/4] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)
echo ✓ Node.js found

echo.
echo [2/4] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed!
    pause
    exit /b 1
)
echo ✓ Dependencies installed

echo.
echo [3/4] Setting up database...
if not exist .env (
    echo Creating .env file from example...
    copy .env.example .env
    echo.
    echo IMPORTANT: Please edit .env file with your configuration
    echo Required: DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
    echo.
    pause
)

echo Generating Prisma client...
call npm run prisma:generate
if %errorlevel% neq 0 (
    echo ERROR: Prisma generate failed!
    pause
    exit /b 1
)

echo Running database migrations...
call npm run prisma:migrate
if %errorlevel% neq 0 (
    echo WARNING: Migration failed (database might not be running)
    echo You can skip this for demo mode
)
echo ✓ Database setup complete

echo.
echo [4/4] Starting BizzAuto...
echo.
echo ========================================
echo   Starting All Services...
echo ========================================
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:4000
echo.
echo Press Ctrl+C to stop all services
echo.

call npm run dev:all

pause
