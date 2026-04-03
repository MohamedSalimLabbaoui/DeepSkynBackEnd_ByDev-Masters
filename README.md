# DeepSkyn Backend

<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="80" alt="NestJS Logo" />
</p>

<p align="center">
  AI-powered skincare analysis and social platform backend built with NestJS.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-10.x-E0234E?logo=nestjs" alt="NestJS" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-Prisma-2D3748?logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/Gemini-AI-4285F4?logo=google" alt="Gemini AI" />
  <img src="https://img.shields.io/badge/Socket.io-WebSockets-010101?logo=socket.io" alt="Socket.io" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Architecture](#architecture)
- [Testing](#testing)
- [License](#license)

---

## Overview

DeepSkyn is an intelligent skincare platform that combines AI-powered skin analysis, social features, and personalized skincare recommendations. The backend is built on [NestJS](https://nestjs.com) and exposes a RESTful API with real-time WebSocket support.

Key capabilities include:

- 🤖 **AI skin analysis** using Google Gemini to evaluate skin condition from photos
- 💬 **AI chatbot** for personalized skincare advice
- 🌦️ **Weather-aware recommendations** combining Open-Meteo data with AI advice
- 👥 **Social platform** with posts, stories, comments, likes, and a follow system
- 🔐 **Multi-provider authentication** (Email/Password, Google OAuth, Facebook OAuth, Keycloak, 2FA)
- 📊 **Churn analysis** to identify and re-engage at-risk users
- 🤟 **Sign language (LSF) translation** integration for accessibility
- 📰 **Dermatology article crawling** from medical sources

---

## Features

| Module | Description |
|---|---|
| **Auth** | JWT authentication, Keycloak, Google/Facebook OAuth, two-factor authentication (TOTP/QR), password reset |
| **Users** | User profiles, avatar, 3D avatar, cover photo, geolocation, public/private accounts |
| **Skin Profile** | Skin type, Fitzpatrick scale, concerns, sensitivities, health score, skin age |
| **Analysis** | AI skin analysis (Gemini), image processing, condition detection, recommendations |
| **Routine** | Manual and AI-generated skincare routines with step-by-step instructions |
| **Chat** | Context-aware skincare chatbot (premium and free tiers) |
| **Subscription** | Subscription plans, billing in TND, auto-renewal |
| **Posts** | Social posts with media, view/impression tracking |
| **Stories** | Temporary stories (24h expiry) and permanent highlights |
| **Comments** | Threaded comments on posts and stories |
| **Likes** | Like reactions on posts, comments, and stories |
| **Notifications** | Real-time push notifications via WebSocket |
| **Followers** | Follow/unfollow system |
| **Weather** | Location-based weather with AI skincare advice |
| **Crawling** | Automated dermatology article scraping and indexing |
| **Sign Translation** | French Sign Language (LSF) translation for posts |
| **Churn** | User engagement scoring and re-engagement campaigns |
| **Mail** | Transactional email (verification, password reset, notifications) |

---

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** [NestJS](https://nestjs.com) 10
- **Language:** TypeScript 5
- **Database:** PostgreSQL (via [Prisma](https://prisma.io) ORM 5)
- **Authentication:** Keycloak, Passport.js, JWT, Google OAuth 2.0, Facebook OAuth
- **AI:** Google Gemini API
- **Real-time:** Socket.io / WebSockets
- **Storage:** Supabase
- **Email:** Nodemailer
- **Web scraping:** Puppeteer + Cheerio
- **API docs:** Swagger / OpenAPI

---

## Prerequisites

- Node.js 20 or later
- npm 9 or later
- PostgreSQL 14 or later
- A Google Gemini API key (for AI features)
- (Optional) A Keycloak instance for enterprise SSO
- (Optional) Google and Facebook OAuth credentials

---

## Installation

```bash
# Clone the repository
git clone https://github.com/MohamedSalimLabbaoui/DeepSkynBackEnd_ByDev-Masters.git
cd DeepSkynBackEnd_ByDev-Masters

# Install dependencies
npm install
```

---

## Environment Configuration

Copy the example environment file and fill in your values:

```bash
cp .env.example .env   # create from a template if available, or create manually
```

Create a `.env` file at the project root with the following variables:

```dotenv
# ── Application ───────────────────────────────────────────
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# ── Database ──────────────────────────────────────────────
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/deepskyn

# ── Authentication ────────────────────────────────────────
JWT_SECRET=your_jwt_secret_here

# Keycloak (optional)
KEYCLOAK_AUTH_SERVER_URL=http://localhost:8080/auth
KEYCLOAK_REALM=deepskyn
KEYCLOAK_CLIENT_ID=deepskyn-backend
KEYCLOAK_SECRET=your_keycloak_secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Facebook OAuth
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_CALLBACK_URL=http://localhost:3000/auth/facebook/callback

# ── AI ────────────────────────────────────────────────────
GEMINI_API_KEY=your_gemini_api_key_here

# ── Storage ───────────────────────────────────────────────
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key

# ── Email ─────────────────────────────────────────────────
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=your_email@example.com
MAIL_PASSWORD=your_email_password
MAIL_FROM=noreply@deepskyn.com

# ── Sign Language Translation (optional) ──────────────────
SIGN_TRANSLATION_SERVICE_URL=http://localhost:8000
```

> See `.env.example.lsf` for additional sign-language service options and `.env.weather.example` for weather service notes.

---

## Database Setup

```bash
# Apply migrations and generate the Prisma client
npm run prisma:migrate

# (Alternative) push the schema directly without migrations
npm run db:push

# Seed the database with initial data
npm run prisma:seed

# Open Prisma Studio (database browser)
npm run prisma:studio
```

---

## Running the Application

```bash
# Development mode (with hot-reload)
npm run start:dev

# Standard start
npm run start

# Production mode (requires a prior build)
npm run build
npm run start:prod
```

The server starts on `http://localhost:3000` by default (configurable via `PORT`).

---

## API Documentation

Interactive Swagger documentation is available at:

```
http://localhost:3000/api
```

All endpoints require a **Bearer JWT** token unless otherwise noted. Obtain a token via the `/auth/login` or `/auth/google` endpoints.

### Main endpoint groups

| Tag | Base path | Description |
|---|---|---|
| Auth | `/auth` | Login, register, OAuth, 2FA, password reset |
| Users | `/users` | User CRUD and profile management |
| Skin Profiles | `/skin-profiles` | Skin type and condition data |
| Analyses | `/analyses` | AI skin analysis jobs |
| Routines | `/routines` | Skincare routines |
| Chat | `/chat` | AI chatbot conversations |
| Subscriptions | `/subscriptions` | Plan management |
| Posts | `/posts` | Social posts |
| Stories | `/stories` | Stories and highlights |
| Comments | `/comments` | Post and story comments |
| Likes | `/likes` | Reactions |
| Notifications | `/notifications` | In-app notifications |
| Weather | `/weather` | Weather + AI skincare tips |
| Sign Translation | `/sign-translation` | LSF translation |
| Crawling | `/crawling` | Dermatology articles |
| Churn | `/churn` | User engagement analytics |

---

## Architecture

```
src/
├── main.ts                  # Bootstrap (Swagger, CORS, global pipes)
├── app.module.ts            # Root module
├── config/                  # Keycloak and other configuration
├── prisma/                  # PrismaService and enums
├── auth/                    # Authentication (strategies, guards, decorators)
├── users/                   # User management
├── skin-profile/            # Skin profile CRUD
├── analysis/                # AI skin analysis
├── routine/                 # Skincare routines
├── chat/                    # AI chatbot
├── subscription/            # Subscription plans
├── posts/                   # Social posts
├── stories/                 # Stories & highlights
├── comments/                # Threaded comments
├── likes/                   # Reactions
├── notification/            # Real-time notifications (WebSocket gateway)
├── weather/                 # Weather service
├── sign-translation/        # LSF translation
├── churn/                   # Churn analysis
├── crawling/                # Article crawling
├── scraper/                 # Puppeteer scraper
└── mail/                    # Email service
```

The database schema defines **17 models** in PostgreSQL:
`User`, `Follower`, `Notification`, `SkinProfile`, `Analysis`, `Routine`, `ChatHistory`, `Subscription`, `Post`, `Like`, `Comment`, `CommentLike`, `DermatologyArticle`, `Story`, `StoryLike`, `StoryComment`, `SignTranslation`.

---

## Testing

```bash
# Unit tests
npm run test

# Unit tests in watch mode
npm run test:watch

# End-to-end tests
npm run test:e2e

# Test coverage report
npm run test:cov
```

---

## License

This project is **UNLICENSED** and proprietary to the Dev-Masters team.
