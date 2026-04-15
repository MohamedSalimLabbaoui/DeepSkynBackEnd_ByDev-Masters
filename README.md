# DeepSkyn Backend API

Backend principal de la plateforme DeepSkyn, construit avec NestJS, Prisma et PostgreSQL.

Ce service centralise les fonctions coeur produit:
- authentification et gestion utilisateurs
- analyses cutanees assistees par IA
- routines skincare et recommandations
- social (posts, likes, commentaires, stories)
- abonnements et paiements Stripe
- notifications et services contextuels (meteo, traduction LSF, etc.)

## Sommaire

1. Vue d'ensemble
2. Stack technique
3. Architecture fonctionnelle
4. Prerequis
5. Installation locale
6. Configuration environnement
7. Base de donnees et Prisma
8. Lancement de l'application
9. Documentation API (Swagger)
10. Scripts utiles
11. Tests
12. Depannage rapide
13. Roadmap technique recommandee

## 1) Vue d'ensemble

DeepSkyn Backend est une API modulaire qui alimente:
- le frontend web (Vite/React)
- le mobile (React Native)
- des services Python annexes (ML et traduction vers langue des signes)

Le code suit l'organisation NestJS par modules metiers, avec une couche d'acces donnees Prisma.

## 2) Stack technique

- Runtime: Node.js + TypeScript
- Framework: NestJS v10
- ORM: Prisma
- Base de donnees: PostgreSQL
- Documentation API: Swagger
- Paiement: Stripe
- Auth: JWT, providers OAuth, integration Keycloak
- IA/ML: Gemini/OpenRouter/Groq + scripts Python dans ml
- Temps reel: WebSocket (Socket.IO)

## 3) Architecture fonctionnelle

Modules principaux declares dans AppModule:
- Auth
- Users
- Skin Profile
- Analysis
- Routine
- Predictive Routine
- Chat
- Subscription
- Coupons
- Posts / Likes / Comments / Stories
- Notification
- Weather
- Digital Twin
- Face Verification
- Sign Translation
- Crawling / Scraper
- Churn
- N8n
- Shared / Prisma / Mail

Fichier de reference:
- src/app.module.ts

## 4) Prerequis

- Node.js 18+ (Node 20 recommande)
- npm 9+
- PostgreSQL 14+
- (Optionnel) Python 3.10+ pour les scripts ml et le microservice LSF

## 5) Installation locale

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
```

Par defaut, l'API ecoute sur le port defini par PORT (fallback 3000).

## 6) Configuration environnement

Creer un fichier .env a la racine du backend.

### Variables minimales

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/deepskyn
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Variables frequemment utilisees dans ce projet

#### Auth / Keycloak

```env
KEYCLOAK_REALM=master
KEYCLOAK_AUTH_SERVER_URL=http://localhost:8180
KEYCLOAK_SSL_REQUIRED=external
KEYCLOAK_RESOURCE=nestjs-app
KEYCLOAK_SECRET=
```

#### Stripe

```env
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_API_VERSION=2025-02-24.acacia
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_ID_PREMIUM_MONTHLY=price_xxx
STRIPE_PRICE_ID_PREMIUM_YEARLY=price_xxx
```

#### IA (Gemini)

```env
GEMINI_API_KEY=xxx
GEMINI_API_KEY_2=xxx
GEMINI_API_KEY_3=xxx
GEMINI_PRIMARY_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODEL=gemini-1.5-flash
```

#### IA fallback (OpenRouter / Groq)

```env
OPENROUTER_API_KEY=xxx
OPENROUTER_API_KEY_2=xxx
OPENROUTER_API_KEY_3=xxx
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_TEXT_MODEL=openrouter/free
OPENROUTER_VISION_MODEL=nvidia/nemotron-nano-12b-v2-vl:free

GROQ_API_KEY=xxx
GROQ_API_KEY_2=xxx
GROQ_API_KEY_3=xxx
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_TEXT_MODEL=llama-3.3-70b-versatile
```

#### Traduction en langue des signes

```env
SIGN_TRANSLATION_SERVICE_URL=http://localhost:8000
```

Exemples disponibles:
- .env.example.lsf
- .env.weather.example

## 7) Base de donnees et Prisma

Le schema Prisma est situe dans prisma/schema.prisma.

Flux recommande:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Autres commandes:

```bash
npm run prisma:studio
npm run prisma:reset
npm run db:push
```

## 8) Lancement de l'application

Developpement:

```bash
npm run start:dev
```

Production:

```bash
npm run build
npm run start:prod
```

## 9) Documentation API (Swagger)

Une fois le serveur lance:
- Swagger UI: http://localhost:PORT/api

Le bootstrap Swagger est configure dans src/main.ts.

## 10) Scripts utiles

Scripts npm principaux (package.json):
- build
- start
- start:dev
- start:debug
- start:prod
- lint
- format
- test, test:watch, test:cov, test:e2e
- prisma:generate, prisma:migrate, prisma:migrate:prod, prisma:seed, prisma:studio, prisma:reset, db:push

Scripts annexes:
- QUICK_START_LSF.ps1
- QUICK_START_LSF.sh
- setup-scraper.bat
- setup-scraper.sh

## 11) Tests

```bash
npm run test
npm run test:e2e
npm run test:cov
```

## 12) Depannage rapide

- Erreur prisma client: lancer npm run prisma:generate
- Erreur migration: verifier DATABASE_URL puis relancer npm run prisma:migrate
- CORS frontend: verifier FRONTEND_URL et la configuration CORS de src/main.ts
- Webhook Stripe invalide: verifier STRIPE_WEBHOOK_SECRET et la route /webhook
- Sign translation indisponible: verifier SIGN_TRANSLATION_SERVICE_URL et le microservice Python sur le port 8000

## 13) Roadmap technique recommandee

- Ajouter un vrai .env.example global (pas seulement par fonctionnalite)
- Ajouter une section CI/CD avec commandes de build/test/migrate
- Ajouter des badges qualite (build, coverage, lint)
- Ajouter une matrice de compatibilite backend/frontend/mobile

---

## Scan backend effectue

Le present README est base sur un scan des fichiers suivants:
- package.json
- src/main.ts
- src/app.module.ts
- src/config/keycloak.config.ts
- prisma/schema.prisma
- QUICK_START_LSF.ps1
- QUICK_START_LSF.sh
- .env.example.lsf
- .env.weather.example
