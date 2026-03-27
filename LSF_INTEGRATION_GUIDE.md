# Installation et Configuration - Traduction LSF

## 📋 Prérequis

- Python 3.10+
- pip ou conda
- Git

## 🚀 Étape 1 — Clone du repo spoken-to-signed-translation

```bash
git clone https://github.com/sign-language-processing/spoken-to-signed-translation.git
cd spoken-to-signed-translation
```

## 🐍 Étape 2 — Créer un environnement virtuel Python

### Linux/Mac
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### Windows (PowerShell)
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### Windows (CMD)
```cmd
python -m venv .venv
.venv\Scripts\activate
```

## 📦 Étape 3 — Installer les dépendances

```bash
# Upgrade pip
pip install --upgrade pip

# Installer le package spoken-to-signed-translation
pip install .

# Installer FastAPI et Uvicorn
pip install fastapi uvicorn
```

Optionnel — dépendances supplémentaires:
```bash
pip install python-multipart
pip install aiofiles
```

## 🎬 Étape 4 — Lancer le serveur FastAPI

Depuis le répertoire `DeepSkynBackEnd_ByDev-Masters/ml/`:

```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

**Vérifier le serveur :**
```bash
curl http://localhost:8000/health
```

Réponse attendue:
```json
{
  "status": "healthy",
  "pipeline_initialized": true,
  "supported_languages": ["fr", "en"]
}
```

## 🔧 Configuration Backend NestJS

### 1. Mettre à jour le .env

Ajouter la variable d'environnement:
```ini
# .env
SIGN_TRANSLATION_SERVICE_URL=http://localhost:8000
```

### 2. Générer et appliquer la migration Prisma

```bash
# Générer le modèle Prisma Client
npm run prisma:generate

# Appliquer la migration
npm run prisma:migrate
```

Une nouvelle table `sign_translations` sera créée dans la base de données.

### 3. Redémarrer le backend NestJS

```bash
npm run start:dev
```

## ⚛️ Configuration Frontend React

### 1. Ajouter les types TypeScript

Les types sont déjà dans `src/types/sign-translation.ts`

### 2. Utiliser le composant SignLanguageVideo

```typescript
import SignLanguageVideo from '@/components/sign-language-video';

export function VideoPostPage() {
  const postId = '123'; // ID du post vidéo

  return (
    <div>
      <h1>Mon Post</h1>
      <SignLanguageVideo 
        postId={postId}
        autoPlay={true}
        className="max-w-2xl"
      />
    </div>
  );
}
```

### 3. Configurar REACT_APP_API_URL

```bash
# .env.local ou .env
REACT_APP_API_URL=http://localhost:3001
```

## 🔗 Endpoints disponibles

### Backend NestJS (`http://localhost:3001`)

#### POST `/sign-translation/translate`
Traduit un texte en LSF

```bash
curl -X POST http://localhost:3001/sign-translation/translate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Bonjour, comment allez-vous?",
    "language": "fr"
  }'
```

#### POST `/sign-translation/videopost/:postId`
Traduit et sauvegarde le transcript d'un post

```bash
curl -X POST http://localhost:3001/sign-translation/videopost/post-123 \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "Bonjour, bienvenue sur DeepSkyn!",
    "language": "fr"
  }'
```

#### GET `/sign-translation/videopost/:postId`
Récupère les frames LSF d'un post

```bash
curl http://localhost:3001/sign-translation/videopost/post-123
```

### Microservice Python (`http://localhost:8000`)

#### GET `/` ou `/health`
Vérifier le statut du service

```bash
curl http://localhost:8000/health
```

#### POST `/translate`
Endpoint principal du microservice

```bash
curl -X POST http://localhost:8000/translate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello world",
    "language": "en"
  }'
```

#### GET `/info/languages`
Voir les langues supportées

```bash
curl http://localhost:8000/info/languages
```

## 📚 Structure des réponses

### Response Format

```typescript
{
  "frames": [
    {
      "hand_right_keypoints": [
        { "id": "kp_0", "x": 100.0, "y": 150.0, "z": 0.0 },
        { "id": "kp_1", "x": 105.0, "y": 155.0, "z": 0.0 },
        ...
      ],
      "hand_left_keypoints": [...],
      "pose_keypoints": [...]
    },
    ...
  ],
  "metadata": {
    "gloss": "HELLO-WORLD",
    "fps": 24,
    "total_frames": 12
  }
}
```

## 🐛 Dépannage

### Erreur: "Could not connect to http://localhost:8000"
- Vérifier que le serveur Python est lancé
- Vérifier que SIGN_TRANSLATION_SERVICE_URL est correctement configuré

### Erreur: "Language 'fr' not supported"
- Les langues doivent être importées dans le pipeline Python
- Vérifier les lexicons disponibles: `http://localhost:8000/info/languages`

### Erreur: "Translation pipeline failed"
- Vérifier que le package spoken-to-signed-translation est installé
- Vérifier les logs du serveur FastAPI

### Connection refused sur localhost:8000
```bash
# Vérifier le port
netstat -tlnp | grep 8000  # Linux/Mac
netstat -ano | findstr :8000  # Windows
```

## 🔐 Configuration Production

### Environment variables à ajouter au .env

```ini
# URL du microservice Python
SIGN_TRANSLATION_SERVICE_URL=https://lsf-service.yourdomain.com

# Limiter les langues acceptées
SUPPORTED_LANGUAGES=fr,en,de

# Cache (optionnel)
REDIS_URL=redis://localhost:6379

# Rate limiting
RATE_LIMIT_TRANSLATIONS=1000/hour
```

### Déploiement du microservice Python

Utiliser un serveur ASGI en production:
```bash
# Avec Gunicorn + Uvicorn workers
pip install gunicorn
gunicorn app:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## 📖 Ressources

- [spoken-to-signed-translation](https://github.com/sign-language-processing/spoken-to-signed-translation)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [NestJS HttpModule](https://docs.nestjs.com/techniques/http-module)
- [React Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)

## ✅ Checklist d'implémentation

- [ ] Clone du repo spoken-to-signed-translation
- [ ] Environnement virtuel Python créé
- [ ] Dépendances Python installées
- [ ] Serveur FastAPI lancé et accessible
- [ ] Migration Prisma appliquée
- [ ] Backend NestJS redémarré avec nouveau module
- [ ] Variables d'environnement configurées
- [ ] Tests des endpoints API
- [ ] Composant React intégré dans les vues
- [ ] Tests du rendu des keypoints sur canvas
