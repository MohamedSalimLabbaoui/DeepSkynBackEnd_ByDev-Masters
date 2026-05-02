# 🚀 DeepSkyn Backend — CI/CD Setup Guide

> **Branche cible :** `azizsaid`  
> **Stack :** NestJS · PostgreSQL · Keycloak · Python LSF · Docker · GitHub Actions · SonarQube · Kubernetes (kubeadm) · Render · Prometheus · Grafana

---

## 📁 Fichiers créés

```
DeepSkynBackEnd_ByDev-Masters/
├── .github/workflows/
│   ├── ci.yml                          ← Pipeline CI (lint → tests → SonarQube → Docker push)
│   └── cd.yml                          ← Pipeline CD (deploy Render → migrations → healthcheck)
├── k8s/
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secret.yaml                     ← Template — remplir avec vos vraies valeurs base64
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   └── hpa.yaml
├── monitoring/
│   ├── prometheus/
│   │   ├── prometheus.yml
│   │   └── alert.rules.yml
│   └── grafana/
│       ├── dashboards/deepskyn-overview.json
│       └── provisioning/
│           ├── datasources/prometheus.yml
│           └── dashboards/dashboard.yml
├── src/shared/
│   ├── metrics.service.ts              ← prom-client Registry + counters
│   ├── metrics.controller.ts           ← GET /metrics
│   └── metrics.middleware.ts           ← HTTP duration/count auto-recording
│   └── shared.module.ts               ← Mis à jour (enregistre metrics globalement)
├── src/auth/auth.service.spec.ts       ← Tests unitaires AuthService
├── src/skin-profile/skin-profile.service.spec.ts ← Tests unitaires SkinProfileService
├── Dockerfile                          ← Multi-stage build (Alpine, non-root, healthcheck)
├── .dockerignore
├── sonar-project.properties
└── docker-compose.monitoring.yml       ← Stack locale Prometheus + Grafana
```

---

## 1️⃣ GitHub Secrets — Configuration obligatoire

Aller dans : **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

### 🔐 Secrets Docker Hub

| Secret | Valeur |
|--------|--------|
| `DOCKERHUB_USERNAME` | Votre username Docker Hub |
| `DOCKERHUB_TOKEN` | Token généré sur hub.docker.com → Account Settings → Security |

> **Créer un token Docker Hub :**  
> hub.docker.com → Account Settings → Security → **New Access Token** → cocher `Read & Write`

---

### 🔐 Secrets SonarQube

| Secret | Valeur |
|--------|--------|
| `SONAR_TOKEN` | Token généré dans SonarQube |
| `SONAR_HOST_URL` | URL de votre instance (ex: `http://votre-ip:9000`) |

> **Installer SonarQube (Docker rapide) :**
> ```bash
> docker run -d --name sonarqube \
>   -p 9000:9000 \
>   -v sonarqube_data:/opt/sonarqube/data \
>   sonarqube:community
> ```
> - Ouvrir http://localhost:9000 → login `admin/admin` → changer le mot de passe
> - **Administration → Projects → Create Project → Manually**
>   - Project key : `deepskyn-backend`
>   - **Generate token** → copier la valeur → mettre dans `SONAR_TOKEN`
> - `SONAR_HOST_URL` = URL publique accessible depuis GitHub Actions

> [!IMPORTANT]
> SonarQube Community Edition ne supporte **pas** l'analyse de branches. La ligne `sonar.branch.name` dans `sonar-project.properties` est à supprimer si vous êtes en Community. Developer Edition ou SonarCloud la supportent.

---

### 🔐 Secrets Render (CD)

| Secret | Valeur |
|--------|--------|
| `RENDER_DEPLOY_HOOK_URL` | URL du deploy hook Render |
| `RENDER_API_KEY` | Clé API Render |
| `RENDER_SERVICE_ID` | ID du service Render (ex: `srv-xxxxxxxxxxxx`) |
| `RENDER_BACKEND_URL` | URL publique du backend (ex: `https://deepskyn-backend.onrender.com`) |
| `PROD_DATABASE_URL` | URL PostgreSQL de production (pour migrations) |

> **Configurer Render :**
> 1. render.com → **New → Web Service** → connecter le repo GitHub
> 2. Choisir la branche `azizsaid`
> 3. **Build Command :** `npm ci && npx prisma generate && npm run build`
> 4. **Start Command :** `node dist/main`
> 5. **Environment :** ajouter toutes les variables du `.env` (voir section Variables Render ci-dessous)
> 6. **Settings → Deploy Hook** → copier l'URL → `RENDER_DEPLOY_HOOK_URL`
> 7. **Account Settings → API Keys** → générer → `RENDER_API_KEY`
> 8. L'ID du service se trouve dans l'URL de la page du service Render

---

### 🔐 Secrets App (injectés dans CI pour les tests)

| Secret | Valeur |
|--------|--------|
| `DB_USERNAME` | `postgres` (CI utilise le service GitHub Actions) |
| `DB_PASSWORD` | `postgres_ci` (CI uniquement) |
| `GEMINI_API_KEY` | Votre clé Gemini |
| `OPENROUTER_API_KEY` | Votre clé OpenRouter |
| `GROQ_API_KEY` | Votre clé Groq |
| `SUPABASE_URL` | URL Supabase |
| `SUPABASE_ANON_KEY` | Clé anon Supabase |
| `SUPABASE_SERVICE_KEY` | Clé service Supabase |
| `STRIPE_SECRET_KEY` | Clé Stripe test |
| `STRIPE_WEBHOOK_SECRET` | Webhook secret Stripe |

> [!NOTE]
> Les tests unitaires **mockent** tous les services externes (Keycloak, AI, Stripe). Ces secrets ne sont nécessaires que pour les tests d'intégration/e2e futurs.

---

## 2️⃣ Variables d'environnement Render (Production)

Dans Render → votre service → **Environment**, ajouter :

```env
NODE_ENV=production
PORT=3000

# Keycloak (doit pointer vers l'instance publique Keycloak)
KEYCLOAK_AUTH_SERVER_URL=https://votre-keycloak-public.com
KEYCLOAK_REALM=master
KEYCLOAK_RESOURCE=app
KEYCLOAK_SECRET=<votre-secret>
KEYCLOAK_ADMIN_USER=admin
KEYCLOAK_ADMIN_PASSWORD=<votre-mdp>

# PostgreSQL (base de prod — Render PostgreSQL ou Supabase)
DATABASE_URL=postgresql://user:pass@host:5432/deepskyn?schema=public

# Python LSF (URL publique du service déployé)
SIGN_TRANSLATION_SERVICE_URL=https://votre-lsf-service.com

# ... toutes les autres variables du .env
```

> [!WARNING]
> **Keycloak sur Docker local** n'est pas accessible depuis Render (cloud). Pour la production, Keycloak doit être déployé sur un serveur public (VPS, autre service Render, Railway, etc.) ou utilisez Keycloak as a Service (Cloud IAM).

---

## 3️⃣ Kubernetes (kubeadm) — Déploiement

### Prérequis
```bash
# Sur le master node :
kubeadm init --pod-network-cidr=10.244.0.0/16
kubectl apply -f https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/kube-flannel.yml

# Installer nginx ingress controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.0/deploy/static/provider/cloud/deploy.yaml
```

### Remplir le fichier Secret
```bash
# Encoder vos valeurs en base64
echo -n "postgresql://postgres:pass@host:5432/deepskyn" | base64

# Ou générer le secret directement depuis le .env
kubectl create secret generic deepskyn-backend-secret \
  --from-env-file=.env \
  --namespace=deepskyn \
  --dry-run=client -o yaml > k8s/secret.yaml

# ⚠️ Ne jamais commiter secret.yaml avec de vraies valeurs !
```

### Appliquer les manifests
```bash
# 1. Namespace
kubectl apply -f k8s/namespace.yaml

# 2. Config & Secrets
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml        # après avoir rempli les valeurs

# 3. Déploiement
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml

# Vérifier
kubectl get pods -n deepskyn
kubectl get svc -n deepskyn
kubectl logs -f deployment/deepskyn-backend -n deepskyn
```

> **Remplacer l'image dans deployment.yaml :**
> ```yaml
> image: VOTRE_DOCKERHUB_USERNAME/deepskyn-backend:latest
> ```

---

## 4️⃣ Prometheus + Grafana (local)

```bash
# Démarrer la stack monitoring
docker-compose -f docker-compose.monitoring.yml up -d

# Accès
# Prometheus : http://localhost:9090
# Grafana    : http://localhost:3001  (admin / admin)
```

> **Dans Grafana :**
> 1. La datasource Prometheus est **auto-provisionnée** au démarrage
> 2. Le dashboard **"DeepSkyn Backend Overview"** est chargé automatiquement
> 3. Folder : `DeepSkyn`

> [!NOTE]
> Le endpoint `/metrics` du backend NestJS est exposé automatiquement via `MetricsService` + `MetricsController` (enregistrés dans `SharedModule`). Prometheus scrape ce endpoint toutes les 10 secondes.

---

## 5️⃣ Flux des Pipelines

```mermaid
graph TD
    A[Push → branche azizsaid] --> B[CI: Lint ESLint]
    B --> C[CI: Unit Tests + Coverage<br/>PostgreSQL + Keycloak services]
    C --> D[CI: SonarQube Scan<br/>+ Quality Gate]
    D --> E[CI: Docker Build & Push<br/>→ Docker Hub]
    E --> F{CI réussie ?}
    F -->|✅ Oui| G[CD: Trigger Render Deploy Hook]
    F -->|❌ Non| H[❌ Arrêt — pas de déploiement]
    G --> I[CD: Poll Render API<br/>attend status=live]
    I --> J[CD: Health Check<br/>GET /api → 200]
    J --> K[CD: Prisma migrate deploy<br/>→ prod DB]
    K --> L[✅ Déploiement terminé]
```

---

## 6️⃣ Ajouter prom-client aux dépendances (déjà installé)

```bash
# Déjà exécuté — prom-client v15.x est dans package.json
npm install prom-client --save
```

Pour vérifier les métriques localement :
```bash
npm run start:dev
curl http://localhost:3000/metrics
```

---

## 7️⃣ Lancer les tests localement

```bash
# Tests unitaires
npm run test

# Tests avec couverture (génère coverage/lcov.info pour SonarQube)
npm run test:cov

# Tests en watch mode
npm run test:watch
```

---

## ✅ Checklist finale

- [ ] Secrets GitHub configurés (Docker Hub, SonarQube, Render, App keys)
- [ ] SonarQube instance accessible depuis GitHub Actions
- [ ] `sonar-project.properties` — supprimer `sonar.branch.name` si Community Edition
- [ ] `k8s/secret.yaml` — remplir les valeurs base64 (ne jamais commiter)
- [ ] `k8s/deployment.yaml` — remplacer `YOUR_DOCKERHUB_USERNAME`
- [ ] `k8s/ingress.yaml` — remplacer `api.deepskyn.com` par votre domaine
- [ ] Keycloak accessible publiquement pour la production Render
- [ ] Python LSF service déployé et URL configurée
- [ ] `docker-compose.monitoring.yml` lancé pour monitoring local
- [ ] `npm run test:cov` passe localement avant le premier push
