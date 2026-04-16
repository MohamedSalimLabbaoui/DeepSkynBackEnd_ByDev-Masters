import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSnapshotDto, SimulateProductDto, UpdateSimulationDto } from './dto/twin.dto';
import { RateLimiterService } from '../shared/services/rate-limiter.service';
import { CacheService } from '../shared/services/cache.service';

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: {
        text?: string;
      }[];
    };
  }[];
}

@Injectable()
export class DigitalTwinService {
  private readonly logger = new Logger(DigitalTwinService.name);

  constructor(
    private prisma: PrismaService,
    private rateLimiter: RateLimiterService,
    private cache: CacheService,
  ) {}

  // 🎯 Initialiser ou récupérer le Digital Twin
  async getOrCreateTwin(userId: string) {
    let twin = await this.prisma.digitalTwin.findUnique({
      where: { userId },
    });

    if (!twin) {
      this.logger.log(`Creating new Digital Twin for user ${userId}`);
      twin = await this.prisma.digitalTwin.create({
        data: {
          userId,
          currentState: {},
          trendAnalysis: {},
          confidence: 0.1, // Basse confiance au début
        },
      });
    }

    return twin;
  }

  // 📸 Capturer un snapshot de l'état de peau
  async captureSnapshot(userId: string, dto: CreateSnapshotDto) {
    const snapshot = await this.prisma.skinSnapshot.create({
      data: {
        userId,
        imageUrl: dto.imageUrl,
        healthScore: dto.healthScore,
        skinAge: dto.skinAge,
        conditions: dto.conditions || {},
        metrics: dto.metrics || {},
        environmental: dto.environmental,
        lifestyle: dto.lifestyle,
        productsUsed: dto.productsUsed,
        notes: dto.notes,
        isBaseline: dto.isBaseline || false,
      },
    });

    // Mettre à jour le Digital Twin avec ce nouveau snapshot
    await this.updateTwinFromSnapshot(userId);

    this.logger.log(`Snapshot captured for user ${userId}: ${snapshot.id}`);
    return snapshot;
  }

  // 🔄 Mettre à jour le Digital Twin basé sur l'historique
  async updateTwinFromSnapshot(userId: string) {
    const twin = await this.getOrCreateTwin(userId);

    // Récupérer les 30 derniers snapshots
    const recentSnapshots = await this.prisma.skinSnapshot.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 30,
    });

    if (recentSnapshots.length === 0) {
      return twin;
    }

    const latest = recentSnapshots[0];
    const baseline = recentSnapshots.find(s => s.isBaseline) || recentSnapshots[recentSnapshots.length - 1];

    // Calculer l'état actuel
    const currentState = {
      healthScore: latest.healthScore,
      skinAge: latest.skinAge,
      conditions: latest.conditions,
      metrics: latest.metrics,
      lastUpdated: latest.timestamp,
    };

    // Analyse des tendances
    const trendAnalysis = this.analyzeTrends(recentSnapshots);

    // Patterns saisonniers (si > 90 jours de données)
    const seasonalPatterns = recentSnapshots.length >= 12 
      ? this.analyzeSeasonalPatterns(recentSnapshots)
      : null;

    // Calcul du taux d'amélioration
    const improvementRate = this.calculateImprovementRate(baseline, latest);

    // Confiance basée sur la quantité de données
    const confidence = Math.min(recentSnapshots.length / 30, 1);

    // Mise à jour du twin
    const updated = await this.prisma.digitalTwin.update({
      where: { userId },
      data: {
        currentState,
        trendAnalysis,
        seasonalPatterns,
        improvementRate,
        confidence,
        baselineEstablished: recentSnapshots.some(s => s.isBaseline),
        baselineDate: baseline?.timestamp,
        lastUpdated: new Date(),
      },
    });

    this.logger.log(`Digital Twin updated for user ${userId}, confidence: ${confidence.toFixed(2)}`);
    return updated;
  }

  // 📊 Analyser les tendances
  private analyzeTrends(snapshots: any[]) {
    if (snapshots.length < 2) {
      return { trend: 'insufficient_data' };
    }

    const latest = snapshots[0];
    const oldest = snapshots[snapshots.length - 1];

    const healthScoreTrend = latest.healthScore - oldest.healthScore;
    const daysDiff = Math.floor(
      (latest.timestamp.getTime() - oldest.timestamp.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Tendances par condition
    const conditionTrends: Record<string, any> = {};
    
    if (latest.conditions && oldest.conditions) {
      for (const key of Object.keys(latest.conditions)) {
        const latestVal = latest.conditions[key]?.severity || 0;
        const oldestVal = oldest.conditions[key]?.severity || 0;
        conditionTrends[key] = {
          change: latestVal - oldestVal,
          direction: latestVal > oldestVal ? 'worsening' : latestVal < oldestVal ? 'improving' : 'stable',
        };
      }
    }

    return {
      timeframe: `${daysDiff} days`,
      healthScoreChange: healthScoreTrend,
      healthScoreTrend: healthScoreTrend > 5 ? 'improving' : healthScoreTrend < -5 ? 'declining' : 'stable',
      conditionTrends,
      dataPoints: snapshots.length,
    };
  }

  // 🌍 Analyser les patterns saisonniers
  private analyzeSeasonalPatterns(snapshots: any[]) {
    // Grouper par mois
    const monthlyData: Record<number, any[]> = {};

    snapshots.forEach(snap => {
      const month = snap.timestamp.getMonth(); // 0-11
      if (!monthlyData[month]) monthlyData[month] = [];
      monthlyData[month].push(snap);
    });

    const patterns = Object.entries(monthlyData).map(([month, snaps]) => {
      const avgHealth = snaps.reduce((sum, s) => sum + s.healthScore, 0) / snaps.length;
      const dominantConditions = this.getDominantConditions(snaps);

      return {
        month: parseInt(month),
        avgHealthScore: Math.round(avgHealth),
        dominantConditions,
        sampleSize: snaps.length,
      };
    });

    return patterns;
  }

  private getDominantConditions(snapshots: any[]): string[] {
    const conditionCounts: Record<string, number> = {};

    snapshots.forEach(snap => {
      if (snap.conditions) {
        Object.keys(snap.conditions).forEach(cond => {
          conditionCounts[cond] = (conditionCounts[cond] || 0) + 1;
        });
      }
    });

    return Object.entries(conditionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cond]) => cond);
  }

  // 📈 Calculer le taux d'amélioration
  private calculateImprovementRate(baseline: any, latest: any): number {
    if (!baseline || !latest) return 0;
    
    const change = latest.healthScore - baseline.healthScore;
    return (change / baseline.healthScore) * 100;
  }

  // 🔮 Générer une prédiction future
  async predictFuture(userId: string, daysAhead: number = 7) {
    const cacheKey = `prediction:${userId}:${daysAhead}`;
    
    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const twin = await this.getOrCreateTwin(userId);

        if (twin.confidence < 0.1) { // Lowered from 0.3 to 0.1 (10%)
          throw new NotFoundException('Not enough data to make reliable predictions. Please add more snapshots.');
        }

        const snapshots = await this.prisma.skinSnapshot.findMany({
          where: { userId },
          orderBy: { timestamp: 'desc' },
          take: 30,
        });

        // Utiliser Gemini pour prédiction intelligente
        const predictionData = await this.generateAIPrediction(twin, snapshots, daysAhead);
        const normalizedPredictedState = this.normalizePredictedState(
          twin,
          predictionData.predictedState,
          daysAhead,
        );

        // Sauvegarder la prédiction
        const prediction = await this.prisma.skinPrediction.create({
          data: {
            userId,
            predictionDate: new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000),
            predictedState: normalizedPredictedState,
            confidence: predictionData.confidence,
            basedOnDays: snapshots.length,
            factors: predictionData.factors,
            preventiveTips: predictionData.preventiveTips,
            warnings: predictionData.warnings,
          },
        });

        this.logger.log(`Prediction generated for user ${userId}, ${daysAhead} days ahead`);
        return prediction;
      },
      10 * 60 * 1000, // Cache 10min
    );
  }

  // 🤖 Générer prédiction avec AI
  private async generateAIPrediction(twin: any, snapshots: any[], daysAhead: number) {
    const prompt = `Tu es un expert skin-care marketing + dermatologie. Analyse le jumeau numérique et projette UNIQUEMENT le résultat après application régulière de la routine recommandée.

ÉTAT ACTUEL:
${JSON.stringify(twin.currentState, null, 2)}

TENDANCES RÉCENTES:
${JSON.stringify(twin.trendAnalysis, null, 2)}

HISTORIQUE (${snapshots.length} snapshots):
${snapshots.slice(0, 5).map(s => `- ${s.timestamp.toISOString()}: Health ${s.healthScore}, SkinAge ${s.skinAge ?? 'N/A'}`).join('\n')}

TÂCHE:
Prédit l'état du visage dans ${daysAhead} jours APRÈS routine. Ton ton doit rester positif et orienté amélioration.
N'inclus AUCUNE remarque sur des défauts (acné, rougeurs, etc.), pas de section "warnings", pas de risques.
Retourne UNIQUEMENT un JSON valide avec cette structure:
{
  "predictedState": {
    "healthScore": number (0-100),
    "skinAge": number,
    "radianceScore": number (0-100),
    "confidence": number (0-1)
  },
  "factors": {
    "routineImpact": "description orientée amélioration",
    "consistencyNote": "description courte"
  },
  "preventiveTips": ["étape routine 1", "étape routine 2", "étape routine 3"],
  "warnings": [],
  "confidence": number (0-1)
}`;

    try {
      const response: GeminiResponse = await this.rateLimiter.queueRequest(
        'gemini-prediction', // key
        async () => {
          const result = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.3,
                  maxOutputTokens: 1000,
                },
              }),
            }
          );
          return await result.json();
        },
        'low', // Basse priorité
      );

      const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}') + 1;
      const jsonStr = text.substring(jsonStart, jsonEnd);
      const parsed = JSON.parse(jsonStr);

      return {
        predictedState: this.normalizePredictedState(twin, parsed.predictedState, daysAhead),
        confidence: parsed.confidence || 0.5,
        factors: parsed.factors || {},
        preventiveTips: parsed.preventiveTips || [],
        warnings: [],
      };
    } catch (error) {
      this.logger.warn(`AI prediction failed, using rule-based fallback: ${error.message}`);
      return this.ruleBasedPrediction(twin, snapshots, daysAhead);
    }
  }

  // 📏 Prédiction basée sur règles (fallback)
  private ruleBasedPrediction(twin: any, snapshots: any[], daysAhead: number) {
    const trend = twin.trendAnalysis?.healthScoreTrend || 'stable';
    const current = twin.currentState?.healthScore || 50;

    let predictedHealth = current;
    if (trend === 'improving') predictedHealth += daysAhead * 0.5;
    else if (trend === 'declining') predictedHealth -= daysAhead * 0.5;

    predictedHealth = Math.max(0, Math.min(100, predictedHealth));

    return {
      predictedState: {
        healthScore: Math.round(predictedHealth),
        skinAge: Math.max(14, Math.round((twin.currentState?.skinAge ?? 30) - Math.min(3, daysAhead / 7))),
        radianceScore: Math.max(40, Math.min(100, Math.round(predictedHealth + 6))),
        confidence: 0.6,
      },
      confidence: 0.6,
      factors: {
        routineImpact: 'Routine appliquée de façon régulière, amélioration progressive projetée.',
        consistencyNote: 'La régularité quotidienne maximise le résultat attendu.',
      },
      preventiveTips: [
        'Nettoyage doux matin/soir',
        'Hydratation quotidienne adaptée',
        'Protection solaire chaque matin',
      ],
      warnings: [],
    };
  }

  private normalizePredictedState(twin: any, predictedState: any, daysAhead: number) {
    const currentHealth = Number(twin?.currentState?.healthScore);
    const baselineHealth = Number.isFinite(currentHealth) ? currentHealth : 55;
    const currentSkinAge = Number(twin?.currentState?.skinAge);
    const baselineSkinAge = Number.isFinite(currentSkinAge) ? currentSkinAge : 30;

    const toNumber = (value: unknown) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const rawHealth = toNumber(predictedState?.healthScore);
    const rawRadiance = toNumber(predictedState?.radianceScore);
    const rawSkinAge = toNumber(predictedState?.skinAge);
    const rawConfidence = toNumber(predictedState?.confidence);

    return {
      healthScore: Math.max(0, Math.min(100, Math.round(rawHealth ?? baselineHealth + 4))),
      skinAge: Math.max(
        14,
        Math.min(90, Math.round(rawSkinAge ?? baselineSkinAge - Math.min(3, daysAhead / 7))),
      ),
      radianceScore: Math.max(
        0,
        Math.min(100, Math.round(rawRadiance ?? (rawHealth ?? baselineHealth) + 6)),
      ),
      confidence: Math.max(0, Math.min(1, rawConfidence ?? 0.6)),
    };
  }

  private clampVisualFilters(filters: Record<string, any>) {
    const toNum = (value: unknown, fallback: number) => {
      const num = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(num) ? num : fallback;
    };

    // Conservative ranges to avoid "dirty/over-processed" output.
    return {
      smoothness: Math.min(38, Math.max(6, toNum(filters.smoothness, 18))),
      brightness: Math.min(14, Math.max(-6, toNum(filters.brightness, 6))),
      redness: Math.min(0, Math.max(-20, toNum(filters.redness, -10))),
      saturation: Math.min(8, Math.max(-8, toNum(filters.saturation, 1))),
      acneReduction: Math.min(34, Math.max(6, toNum(filters.acneReduction, 14))),
      hydration: Math.min(36, Math.max(8, toNum(filters.hydration, 18))),
      evenness: Math.min(32, Math.max(6, toNum(filters.evenness, 14))),
    };
  }

  // 🧪 Simuler l'effet d'un produit
  async simulateProduct(userId: string, dto: SimulateProductDto) {
    const twin = await this.getOrCreateTwin(userId);

    if (twin.confidence < 0.1) { // Lowered from 0.3 to 0.1 (10%)
      throw new NotFoundException('Not enough skin data for reliable product simulation.');
    }

    const simulationPeriod = dto.simulationPeriod || 14;

    // Générer simulation avec AI
    const simulationData = await this.generateProductSimulation(twin, dto, simulationPeriod);

    const simulation = await this.prisma.productSimulation.create({
      data: {
        userId,
        productName: dto.productName,
        productCategory: dto.productCategory,
        productIngredients: dto.productIngredients,
        simulationPeriod,
        startState: twin.currentState,
        predictedState: simulationData.predictedState,
        expectedChanges: {
          ...simulationData.expectedChanges,
          visualFilters: simulationData.visualFilters, // Include visual filters for frontend
          reasoning: simulationData.reasoning,
        },
        riskFactors: simulationData.riskFactors,
        successProbability: simulationData.successProbability,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
      },
    });

    this.logger.log(`Product simulation created for user ${userId}: ${simulation.id}`);
    return simulation;
  }

  // 🤖 Générer simulation produit avec AI
  private async generateProductSimulation(twin: any, product: SimulateProductDto, days: number) {
    const prompt = `Tu es un expert en dermatologie cosmétique. Simule l'effet d'un produit sur la peau.

PROFIL PEAU ACTUEL:
${JSON.stringify(twin.currentState, null, 2)}

TENDANCES:
${JSON.stringify(twin.trendAnalysis, null, 2)}

PRODUIT À TESTER:
- Nom: ${product.productName}
- Catégorie: ${product.productCategory}
- Ingrédients: ${product.productIngredients.join(', ')}
- Durée test: ${days} jours

TÂCHE:
Simule l'effet probable de ce produit après ${days} jours. Retourne UNIQUEMENT un JSON valide:
{
  "predictedState": {
    "healthScore": number (0-100),
    "conditions": {"acne": {"severity": "low|medium|high"}, ...}
  },
  "expectedChanges": {
    "positive": ["amélioration 1", "amélioration 2"],
    "negative": ["effet secondaire possible"],
    "neutral": ["pas d'impact sur X"]
  },
  "riskFactors": ["risque 1 si applicable"],
  "successProbability": number (0-1),
  "reasoning": "explication courte",
  "visualFilters": {
    "smoothness": number (20-80, augmente pour peau plus lisse - SOIS GÉNÉREUX, vise 40-60 pour effets visibles),
    "brightness": number (-20 à +40, éclat du teint - vise 20-35 pour bons résultats),
    "redness": number (-80 à 0, réduction des rougeurs - vise -30 à -50 si anti-rougeur),
    "saturation": number (-20 à +20, vitalité de la peau),
    "acneReduction": number (20-70, réduction visuelle de l'acné - sois généreux si anti-acné),
    "hydration": number (30-70, aspect hydraté/rebondi - vise 50+ pour hydratants),
    "evenness": number (25-60, uniformité du teint - vise 40+ pour produits éclaircissants)
  }
}

IMPORTANT: Les valeurs visualFilters doivent être ÉLEVÉES (40-60 en moyenne) pour des résultats visuels clairs. Ne sois pas timide avec les valeurs!`;

    try {
      const response: GeminiResponse = await this.rateLimiter.queueRequest(
        'gemini-product-simulation', // key
        async () => {
          const result = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.4,
                  maxOutputTokens: 1200,
                },
              }),
            }
          );
          return await result.json();
        },
        'normal',
      );

      const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}') + 1;
      const jsonStr = text.substring(jsonStart, jsonEnd);
      const parsed = JSON.parse(jsonStr);

      return {
        predictedState: parsed.predictedState || twin.currentState,
        expectedChanges: parsed.expectedChanges || {},
        riskFactors: parsed.riskFactors || [],
        successProbability: parsed.successProbability || 0.5,
        visualFilters: this.clampVisualFilters(parsed.visualFilters || {
          smoothness: 40,      // Valeurs par défaut plus élevées
          brightness: 25,
          redness: -35,
          saturation: 8,
          acneReduction: 35,
          hydration: 45,
          evenness: 35,
        }),
        reasoning: parsed.reasoning || '',
      };
    } catch (error) {
      this.logger.warn(`AI simulation failed, using rule-based: ${error.message}`);
      return this.ruleBasedSimulation(twin, product);
    }
  }

  // 📏 Simulation basée sur règles (fallback)
  private ruleBasedSimulation(twin: any, product: SimulateProductDto) {
    const current = twin.currentState?.healthScore || 50;
    
    // Estimation basique selon catégorie - VALEURS AMPLIFIÉES pour effets très visibles
    let healthChange = 0;
    const risks: string[] = [];
    const visualFilters = {
      smoothness: 25,      // Base plus élevée
      brightness: 15,      // Base plus élevée
      redness: -25,        // Réduction plus forte
      saturation: 5,       // Légère amélioration de saturation
      acneReduction: 25,   // Base plus élevée
      hydration: 30,       // Base plus élevée
      evenness: 25,        // Base plus élevée
    };

    if (product.productCategory === 'serum') {
      healthChange = 8;
      visualFilters.brightness = 35;        // Très lumineux
      visualFilters.smoothness = 50;        // Très lisse
      visualFilters.hydration = 45;
      visualFilters.evenness = 40;
    }
    if (product.productCategory === 'moisturizer') {
      healthChange = 6;
      visualFilters.hydration = 60;         // Très hydraté
      visualFilters.smoothness = 45;
      visualFilters.brightness = 20;
      visualFilters.evenness = 35;
    }
    if (product.productCategory === 'cleanser') {
      healthChange = 4;
      visualFilters.evenness = 45;          // Très uniforme
      visualFilters.acneReduction = 40;     // Forte réduction
      visualFilters.brightness = 25;
      visualFilters.redness = -35;
    }
    if (product.productCategory === 'sunscreen') {
      healthChange = 5;
      visualFilters.evenness = 40;
      visualFilters.brightness = 30;
      visualFilters.hydration = 35;
    }
    if (product.productCategory === 'exfoliant') {
      healthChange = 7;
      visualFilters.smoothness = 65;        // Très très lisse
      visualFilters.evenness = 55;
      visualFilters.acneReduction = 50;
      visualFilters.brightness = 30;
    }

    // Check ingredients effects - BONUS TRÈS MARQUÉS
    const ingredientLower = product.productIngredients.map(i => i.toLowerCase()).join(' ');
    
    if (ingredientLower.includes('vitamin c') || ingredientLower.includes('vitamine c')) {
      visualFilters.brightness = Math.max(visualFilters.brightness, 45);
      visualFilters.evenness = Math.max(visualFilters.evenness, 50);
      visualFilters.hydration = Math.max(visualFilters.hydration, 40);
      healthChange += 3;
    }
    if (ingredientLower.includes('hyaluronic') || ingredientLower.includes('hyaluronique')) {
      visualFilters.hydration = Math.max(visualFilters.hydration, 70);
      visualFilters.smoothness = Math.max(visualFilters.smoothness, 45);
      visualFilters.brightness = Math.max(visualFilters.brightness, 25);
      healthChange += 2;
    }
    if (ingredientLower.includes('retinol') || ingredientLower.includes('rétinol')) {
      visualFilters.smoothness = Math.max(visualFilters.smoothness, 60);
      visualFilters.acneReduction = Math.max(visualFilters.acneReduction, 55);
      visualFilters.evenness = Math.max(visualFilters.evenness, 45);
      risks.push('Possible irritation initiale avec le rétinol - normalisation après 2 semaines');
      healthChange += 4;
    }
    if (ingredientLower.includes('niacinamide')) {
      visualFilters.redness = Math.min(visualFilters.redness, -50);
      visualFilters.evenness = Math.max(visualFilters.evenness, 50);
      visualFilters.brightness = Math.max(visualFilters.brightness, 30);
      healthChange += 3;
    }
    if (ingredientLower.includes('salicylic') || ingredientLower.includes('salicylique')) {
      visualFilters.acneReduction = Math.max(visualFilters.acneReduction, 60);
      visualFilters.smoothness = Math.max(visualFilters.smoothness, 40);
      visualFilters.redness = Math.min(visualFilters.redness, -40);
      healthChange += 3;
    }
    if (ingredientLower.includes('peptide')) {
      visualFilters.smoothness = Math.max(visualFilters.smoothness, 50);
      visualFilters.evenness = Math.max(visualFilters.evenness, 45);
      healthChange += 3;
    }
    if (ingredientLower.includes('glycolic') || ingredientLower.includes('lactic')) {
      visualFilters.smoothness = Math.max(visualFilters.smoothness, 55);
      visualFilters.brightness = Math.max(visualFilters.brightness, 40);
      visualFilters.acneReduction = Math.max(visualFilters.acneReduction, 45);
      risks.push('Exfoliation chimique - utiliser progressivement');
      healthChange += 4;
    }

    // Check ingredients à risque
    const sensitiveIngredients = ['retinol', 'aha', 'bha', 'vitamin c'];
    const hasSensitive = product.productIngredients.some(ing => 
      sensitiveIngredients.some(si => ing.toLowerCase().includes(si))
    );

    if (hasSensitive) {
      risks.push('Possible irritation with active ingredients');
      healthChange -= 2;
    }

    const predicted = Math.max(0, Math.min(100, current + healthChange));

    return {
      predictedState: {
        healthScore: Math.round(predicted),
        conditions: twin.currentState?.conditions || {},
      },
      expectedChanges: {
        positive: healthChange > 0 ? ['Amélioration potentielle de la peau'] : [],
        negative: risks,
        neutral: [],
      },
      riskFactors: risks,
      successProbability: 0.6,
      visualFilters: this.clampVisualFilters(visualFilters),
      reasoning: 'Simulation basée sur les ingrédients et la catégorie du produit',
    };
  }

  // 📜 Récupérer l'état complet du Digital Twin
  async getTwinState(userId: string) {
    const twin = await this.getOrCreateTwin(userId);

    const recentSnapshots = await this.prisma.skinSnapshot.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    const activePredictions = await this.prisma.skinPrediction.findMany({
      where: {
        userId,
        predictionDate: { gte: new Date() },
      },
      orderBy: { predictionDate: 'asc' },
      take: 5,
    });

    const activeSimulations = await this.prisma.productSimulation.findMany({
      where: {
        userId,
        status: { in: ['SIMULATED', 'TESTING'] },
        validUntil: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return {
      twin,
      recentSnapshots,
      predictions: activePredictions,
      productSimulations: activeSimulations,
      insights: this.generateInsights(twin, recentSnapshots),
    };
  }

  // 💡 Générer insights
  private generateInsights(twin: any, snapshots: any[]) {
    const insights: string[] = [];

    if (twin.confidence < 0.3) {
      insights.push('📊 Add more snapshots to improve prediction accuracy');
    }

    if (twin.improvementRate > 10) {
      insights.push(`✨ Your skin is improving at ${twin.improvementRate.toFixed(1)}% rate!`);
    } else if (twin.improvementRate < -10) {
      insights.push(`⚠️ Your skin health declined by ${Math.abs(twin.improvementRate).toFixed(1)}%`);
    }

    if (twin.trendAnalysis?.healthScoreTrend === 'improving') {
      insights.push('📈 Positive trend detected - keep up your routine!');
    } else if (twin.trendAnalysis?.healthScoreTrend === 'declining') {
      insights.push('📉 Declining trend - consider adjusting your routine');
    }

    if (snapshots.length >= 30) {
      insights.push('🎯 High confidence predictions available');
    }

    return insights;
  }

  // ✅ Mettre à jour simulation avec résultats réels
  async updateSimulation(userId: string, simulationId: string, dto: UpdateSimulationDto) {
    const simulation = await this.prisma.productSimulation.findFirst({
      where: { id: simulationId, userId },
    });

    if (!simulation) {
      throw new NotFoundException('Simulation not found');
    }

    const updated = await this.prisma.productSimulation.update({
      where: { id: simulationId },
      data: {
        status: dto.status,
        actualResults: dto.actualResults,
        feedback: dto.feedback,
      },
    });

    this.logger.log(`Simulation ${simulationId} updated to ${dto.status}`);
    return updated;
  }

  // 📊 Récupérer historique des snapshots
  async getSnapshots(userId: string, limit: number = 30) {
    return this.prisma.skinSnapshot.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  // 🔍 Comparer deux snapshots
  async compareSnapshots(userId: string, snapshotId1: string, snapshotId2: string) {
    const [snap1, snap2] = await Promise.all([
      this.prisma.skinSnapshot.findFirst({ where: { id: snapshotId1, userId } }),
      this.prisma.skinSnapshot.findFirst({ where: { id: snapshotId2, userId } }),
    ]);

    if (!snap1 || !snap2) {
      throw new NotFoundException('One or both snapshots not found');
    }

    const healthScoreDiff = snap2.healthScore - snap1.healthScore;
    const timeDiff = Math.floor(
      (snap2.timestamp.getTime() - snap1.timestamp.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      snapshot1: snap1,
      snapshot2: snap2,
      comparison: {
        timeDifference: `${timeDiff} days`,
        healthScoreChange: healthScoreDiff,
        trend: healthScoreDiff > 0 ? 'improving' : healthScoreDiff < 0 ? 'declining' : 'stable',
        conditionChanges: this.compareConditions(snap1.conditions, snap2.conditions),
      },
    };
  }

  private compareConditions(cond1: any, cond2: any): Record<string, string> {
    const changes: Record<string, string> = {};

    const allKeys = new Set([...Object.keys(cond1 || {}), ...Object.keys(cond2 || {})]);

    allKeys.forEach(key => {
      const val1 = cond1?.[key]?.severity || 'none';
      const val2 = cond2?.[key]?.severity || 'none';

      if (val1 !== val2) {
        changes[key] = `${val1} → ${val2}`;
      }
    });

    return changes;
  }
}
