@echo off
REM Script de démarrage rapide du scraper pour Windows

echo.
echo ======================================
echo 🚀 Démarrage du module de scraping
echo ======================================
echo.

echo 📦 Verification des dependances...
npm list cheerio puppeteer-extra puppeteer-extra-plugin-stealth >nul 2>&1

if errorlevel 1 (
    echo ⚠️  Installation des dependances...
    call npm install
) else (
    echo ✅ Dependances OK
)

echo.
echo 🔨 Compilation du projet...
call npm run build

if errorlevel 1 (
    echo ❌ Erreur de compilation
    exit /b 1
)
echo ✅ Compilation reussie

echo.
echo 📂 Verification du repertoire scraped-data...
if not exist "scraped-data" mkdir scraped-data
echo ✅ Repertoire OK

echo.
echo ======================================
echo ✨ Pret ! Demarrez l'application avec:
echo.
echo   npm run start:dev
echo.
echo Puis acces au scraper sur:
echo   http://localhost:3000
echo.
echo Endpoint de scraping:
echo   POST http://localhost:3000/scraper/scrape-dermaceutic
echo.
echo Consultez QUICK_START.md pour plus d'informations
echo ======================================
echo.

pause
