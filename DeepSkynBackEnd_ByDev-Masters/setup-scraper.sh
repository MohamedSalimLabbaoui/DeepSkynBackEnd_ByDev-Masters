#!/bin/bash
# Script de démarrage rapide du scraper

echo "🚀 Démarrage du module de scraping Dermaceutic..."
echo ""

# Vérifier les dépendances
echo "📦 Vérification des dépendances..."
npm list cheerio puppeteer-extra puppeteer-extra-plugin-stealth > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo "✅ Dépendances OK"
else
  echo "⚠️  Installation des dépendances..."
  npm install
fi

echo ""
echo "🔨 Compilation du projet..."
npm run build

if [ $? -eq 0 ]; then
  echo "✅ Compilation réussie"
else
  echo "❌ Erreur de compilation"
  exit 1
fi

echo ""
echo "📂 Vérification du répertoire scraped-data..."
mkdir -p scraped-data
echo "✅ Répertoire OK"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Prêt ! Démarrez l'application avec:"
echo ""
echo "  npm run start:dev"
echo ""
echo "Puis accédez au scraper sur:"
echo "  http://localhost:3000"
echo ""
echo "Endpoint de scraping:"
echo "  POST http://localhost:3000/scraper/scrape-dermaceutic"
echo ""
echo "Consultez QUICK_START.md pour plus d'informations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
