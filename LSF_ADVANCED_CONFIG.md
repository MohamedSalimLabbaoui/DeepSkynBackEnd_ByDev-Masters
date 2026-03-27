"""
Configuration et features avancées pour le service LSF
Cache, Rate Limiting, Monitoring
"""

# service-config.ts - NestJS
# À ajouter à sign-translation.module.ts pour les features avancées

import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule } from '@nestjs/throttler';

/**
# EXAMPLE: Advanced Module Configuration

@Module({
  imports: [
    HttpModule,
    PrismaModule,
    
    // Cache pour les traductions
    CacheModule.register({
      isGlobal: true,
      ttl: 86400, // 24 heures en secondes
      max: 1000,  // Max 1000 entrées
    }),
    
    // Rate limiting - 100 requêtes par minute
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 100,
    }),
  ],
  controllers: [SignTranslationController],
  providers: [SignTranslationService],
  exports: [SignTranslationService],
})
export class SignTranslationModule {}
*/

# Installation des dépendances optionnelles
npm install @nestjs/cache-manager cache-manager
npm install @nestjs/throttler

# Usage dans le service avec cache

/**
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

export class SignTranslationService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    // ... autres injectables
  ) {}

  async translateText(dto: TranslateTextDto): Promise<SignTranslationResponse> {
    const cacheKey = `lsf_${dto.text}_${dto.language}`;
    
    // Vérifier le cache
    const cached = await this.cacheManager.get<SignTranslationResponse>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for key: ${cacheKey}`);
      return cached;
    }
    
    // Appeler le microservice
    const result = await this.callMicroserviceWithRetry(
      dto.text,
      dto.language,
    );
    
    // Stocker en cache
    await this.cacheManager.set(cacheKey, result, 86400000); // 24h en ms
    
    return result;
  }
}
*/

# Monitoring avec Prometheus (optionnel)

npm install @nestjs/terminus prom-client

/**
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';
import { register } from 'prom-client';

@Controller('metrics')
export class MetricsController {
  @Get('prometheus')
  getMetrics() {
    return register.metrics();
  }
}
*/

# Database Optimization Query

-- PostgreSQL: Index pour les recherches fréquentes
CREATE INDEX idx_sign_translations_postId ON sign_translations(postId);
CREATE INDEX idx_sign_translations_status ON sign_translations(status);
CREATE INDEX idx_sign_translations_createdAt ON sign_translations(createdAt DESC);

-- Pour les recherches par langue
CREATE INDEX idx_sign_translations_language ON sign_translations(language);

-- Pour les statistiques
CREATE INDEX idx_sign_translations_user_created ON sign_translations(postId, createdAt);
