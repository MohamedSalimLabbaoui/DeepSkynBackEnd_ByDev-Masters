"""
FastAPI wrapper pour le pipeline de traduction texto → langue des signes
Wraps the spoken-to-signed-translation package
"""

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import logging
from typing import List, Optional, Dict, Any
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Sign Language Translation API",
    description="API pour la traduction de texte en langage des signes (LSF)",
    version="1.0.0"
)

# CORS configuration for NestJS frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # À restreindre en production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# Data Models
# ============================================================================

class Keypoint(BaseModel):
    """Représente un keypoint 3D (articulation)"""
    id: str
    x: float
    y: float
    z: float


class Frame(BaseModel):
    """Représente une frame de la séquence LSF"""
    hand_right_keypoints: List[Keypoint]
    hand_left_keypoints: List[Keypoint]
    pose_keypoints: List[Keypoint]


class SignTranslationMetadata(BaseModel):
    """Métadonnées de la traduction"""
    gloss: str = Field(..., description="Représentation textuelle de la langue des signes")
    fps: int = Field(24, description="Frames per second")
    total_frames: int = Field(..., description="Nombre total de frames")


class TranslateRequest(BaseModel):
    """Requête de traduction"""
    text: str = Field(..., min_length=1, description="Le texte à traduire")
    language: str = Field("fr", description="Code langue ISO 639-1 (fr, en, etc.)")


class TranslateResponse(BaseModel):
    """Réponse de traduction"""
    frames: List[Frame]
    metadata: SignTranslationMetadata


class ErrorResponse(BaseModel):
    """Réponse d'erreur"""
    error: str
    detail: Optional[str] = None
    status_code: int


# ============================================================================
# Global state
# ============================================================================

translation_pipeline = None
supported_languages = {"fr", "en"}  # À étendre


# ============================================================================
# Startup/Shutdown events
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialise le pipeline de traduction au démarrage"""
    global translation_pipeline
    try:
        logger.info("Initializing spoken-to-signed translation pipeline...")
        
        # Import du package spoken-to-signed-translation
        try:
            from sign_language_processing.spoken_to_signed_translation import pipeline as sls_pipeline
            translation_pipeline = sls_pipeline

            logger.info("✓ Translation pipeline initialized successfully")
        except ImportError as e:
            logger.error(f"✗ Failed to import sign_language_processing: {e}")
            logger.warning("Running in DEMO mode - will return mock data")
            translation_pipeline = None

    except Exception as e:
        logger.error(f"Startup error: {e}")
        raise


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup au shutdown"""
    global translation_pipeline
    translation_pipeline = None
    logger.info("Translation pipeline shutdown")


# ============================================================================
# Helper functions
# ============================================================================

def generate_mock_translation(text: str, language: str) -> TranslateResponse:
    """
    Génère une traduction de démonstration avec données fictives
    Utilisé quand le modèle n'est pas disponible
    """
    # Créer des keypoints de démonstration (simple skeleton)
    demo_keypoints = [
        Keypoint(id=f"kp_{i}", x=float(i) * 50 + 100, y=150.0, z=0.0)
        for i in range(5)
    ]

    # Créer quelques frames de démonstration
    demo_frames = [
        Frame(
            hand_right_keypoints=demo_keypoints.copy(),
            hand_left_keypoints=demo_keypoints.copy(),
            pose_keypoints=demo_keypoints.copy()
        )
        for _ in range(12)  # 12 frames @ 24fps = 0.5 secondes
    ]

    # Générer un gloss simplifié
    gloss = text.upper().replace(" ", "-")[:50]  # Limiter la longueur

    return TranslateResponse(
        frames=demo_frames,
        metadata=SignTranslationMetadata(
            gloss=gloss,
            fps=24,
            total_frames=len(demo_frames)
        )
    )


def translate_with_pipeline(text: str, language: str) -> TranslateResponse:
    """
    Effectue la traduction en utilisant le pipeline réel
    """
    global translation_pipeline

    if translation_pipeline is None:
        logger.warning("Pipeline is None, using mock translation")
        return generate_mock_translation(text, language)

    try:
        # Appeler le pipeline du package spoken-to-signed-translation
        # NOTE: Cette implémentation dépend de l'API réelle du package
        # À adapter selon la documentation de spoken-to-signed-translation

        # Example: result = translation_pipeline.translate(text, lang=language)
        # La structure de result dépend du package utilisé

        # Pour maintenant, retourner une traduction mock
        logger.info(f"Translating '{text}' to {language}")
        return generate_mock_translation(text, language)

    except Exception as e:
        logger.error(f"Translation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Translation failed: {str(e)}"
        )


# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/", tags=["health"])
async def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "Sign Language Translation API",
        "version": "1.0.0",
        "pipeline_ready": translation_pipeline is not None
    }


@app.get("/health", tags=["health"])
async def health():
    """Extended health check"""
    return {
        "status": "healthy",
        "pipeline_initialized": translation_pipeline is not None,
        "supported_languages": list(supported_languages)
    }


@app.post(
    "/translate",
    response_model=TranslateResponse,
    status_code=status.HTTP_200_OK,
    tags=["translation"],
    responses={
        400: {"model": ErrorResponse, "description": "Invalid input or unsupported language"},
        503: {"model": ErrorResponse, "description": "Service unavailable"},
    }
)
async def translate(request: TranslateRequest):
    """
    Traduit un texte en langage des signes
    
    **Parameters:**
    - `text`: Le texte à traduire (minimum 1 caractère)
    - `language`: Code langue ISO (défaut: "fr")
    
    **Returns:**
    - `frames`: Liste des frames LSF
    - `metadata`: Gloss, FPS, total_frames
    
    **Example:**
    ```json
    {
        "text": "Bonjour, comment allez-vous?",
        "language": "fr"
    }
    ```
    """
    
    try:
        # Valider la langue
        if request.language not in supported_languages:
            logger.warning(f"Unsupported language requested: {request.language}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Language '{request.language}' not supported. Supported: {supported_languages}"
            )

        # Valider le texte
        if not request.text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Text cannot be empty"
            )

        # Effectuer la traduction
        logger.info(f"Processing translation request: {len(request.text)} chars, lang={request.language}")
        result = translate_with_pipeline(request.text, request.language)

        logger.info(f"Translation successful: {result.metadata.total_frames} frames generated")
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during translation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during translation"
        )


@app.post(
    "/translate/batch",
    response_model=List[TranslateResponse],
    status_code=status.HTTP_200_OK,
    tags=["translation"],
    responses={
        400: {"model": ErrorResponse, "description": "Invalid batch"},
    }
)
async def translate_batch(requests: List[TranslateRequest]):
    """
    Traduit plusieurs textes en batch
    
    **Parameters:**
    - `requests`: Liste de requêtes de traduction
    
    **Returns:**
    - Liste de réponses de traduction
    """
    if not requests:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Batch requests cannot be empty"
        )

    if len(requests) > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 100 requests per batch"
        )

    results = []
    for idx, req in enumerate(requests):
        try:
            result = translate_with_pipeline(req.text, req.language)
            results.append(result)
        except Exception as e:
            logger.error(f"Batch item {idx} failed: {e}")
            # Continuer avec les autres requêtes
            results.append(None)

    return [r for r in results if r is not None]


@app.get("/info/languages", tags=["info"])
async def get_supported_languages():
    """Retourne les langues supportées"""
    return {
        "supported_languages": list(supported_languages),
        "default_language": "fr",
        "note": "Add more languages by importing additional lexicons"
    }


@app.get("/info/about", tags=["info"])
async def get_about():
    """Informations sur l'API"""
    return {
        "name": "Sign Language Translation API",
        "version": "1.0.0",
        "description": "FastAPI wrapper for spoken-to-signed-translation",
        "based_on": "github.com/sign-language-processing/spoken-to-signed-translation",
        "endpoints": {
            "POST /translate": "Translate text to sign language",
            "POST /translate/batch": "Batch translate multiple texts",
            "GET /": "Health check",
            "GET /health": "Extended health check",
        }
    }


# ============================================================================
# Error handlers
# ============================================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom HTTP exception handler"""
    return {
        "error": exc.detail,
        "status_code": exc.status_code,
        "path": str(request.url)
    }


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """General exception handler"""
    logger.error(f"Unhandled exception: {exc}")
    return {
        "error": "Internal server error",
        "status_code": 500,
        "detail": str(exc) if logger.level == logging.DEBUG else "An error occurred"
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
