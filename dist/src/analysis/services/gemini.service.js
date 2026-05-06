"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var GeminiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
const grok_service_1 = require("./grok.service");
const prompt_compression_util_1 = require("./prompt-compression.util");
let GeminiService = GeminiService_1 = class GeminiService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(GeminiService_1.name);
        this.geminiBaseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
        this.maxRetries = 1;
        this.retryDelay = 2000;
        this.huggingFaceModelUrl = 'https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large';
        this.geminiApiKeys = this.loadApiKeys('GEMINI_API_KEY');
        this.geminiModels = [
            this.configService.get('GEMINI_PRIMARY_MODEL') ||
                'gemini-1.5-flash',
            this.configService.get('GEMINI_FALLBACK_MODEL') ||
                'gemini-1.5-pro',
        ].filter((value, index, arr) => !!value && arr.indexOf(value) === index);
        if (this.geminiApiKeys.length === 0) {
            this.logger.warn('Gemini is not configured. Set GEMINI_API_KEY.');
        }
        this.huggingFaceApiKey =
            this.configService.get('HUGGINGFACE_API_KEY') || '';
        this.grokService = new grok_service_1.GrokService(configService);
    }
    async queryHuggingFace(data, modelUrl = this.huggingFaceModelUrl) {
        try {
            const response = await axios_1.default.post(modelUrl, data, {
                headers: {
                    Authorization: `Bearer ${this.huggingFaceApiKey}`,
                    'Content-Type': 'application/octet-stream',
                },
                timeout: 30000,
            });
            return response.data;
        }
        catch (error) {
            this.logger.error(`Hugging Face request failed: ${modelUrl}`, error.message);
            throw error;
        }
    }
    async generateHairstyleImage(prompt) {
        try {
            const modelUrl = 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0';
            const response = await axios_1.default.post(modelUrl, { inputs: prompt }, {
                headers: {
                    Authorization: `Bearer ${this.huggingFaceApiKey}`,
                    'Content-Type': 'application/json',
                },
                responseType: 'arraybuffer',
                timeout: 45000,
            });
            const base64 = Buffer.from(response.data, 'binary').toString('base64');
            return `data:image/jpeg;base64,${base64}`;
        }
        catch (error) {
            this.logger.warn('Hugging Face image generation failed, falling back to Unsplash', error.message);
            return '';
        }
    }
    loadApiKeys(baseName) {
        const key = this.configService.get(baseName);
        return key && key.trim().length > 0 ? [key.trim()] : [];
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    isRetryableStatus(status) {
        return status === 429 || status === 500 || status === 503;
    }
    async requestGeminiWithFallback(requestBody, options) {
        if (this.geminiApiKeys.length === 0) {
            throw new Error('No Gemini API key configured');
        }
        const timeout = options?.timeout ?? 60000;
        const errors = [];
        const apiKey = this.geminiApiKeys[0];
        for (const model of this.geminiModels) {
            const url = `${this.geminiBaseUrl}/${model}:generateContent?key=${apiKey}`;
            for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
                try {
                    this.logger.debug(`Gemini request with model=${model}, attempt=${attempt}`);
                    const response = await axios_1.default.post(url, requestBody, {
                        headers: { 'Content-Type': 'application/json' },
                        timeout,
                    });
                    return response.data;
                }
                catch (error) {
                    const axiosError = error;
                    const status = axiosError.response?.status;
                    const canRetry = this.isRetryableStatus(status);
                    this.logger.warn(`Gemini failed (model=${model}, status=${status ?? 'n/a'}, attempt=${attempt}/${this.maxRetries})`);
                    if (canRetry && attempt < this.maxRetries) {
                        await this.sleep(this.retryDelay * attempt);
                        continue;
                    }
                    errors.push(`gemini:model=${model}, status=${status ?? 'n/a'}`);
                    break;
                }
            }
        }
        throw new Error(`All Gemini candidates failed: ${errors.join(' | ')}`);
    }
    async makeRequestWithRetry(requestFn, retries = this.maxRetries) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                return await requestFn();
            }
            catch (error) {
                const axiosError = error;
                if (axiosError.response?.status === 429) {
                    if (attempt < retries) {
                        const delay = this.retryDelay * attempt;
                        this.logger.warn(`Rate limited (429). Retrying in ${delay}ms... (attempt ${attempt}/${retries})`);
                        await this.sleep(delay);
                        continue;
                    }
                    throw new common_1.HttpException('API rate limit exceeded. Please try again later.', common_1.HttpStatus.TOO_MANY_REQUESTS);
                }
                if (axiosError.response?.status === 503 ||
                    axiosError.response?.status === 500) {
                    if (attempt < retries) {
                        const delay = this.retryDelay * attempt;
                        this.logger.warn(`Server error (${axiosError.response?.status}). Retrying in ${delay}ms...`);
                        await this.sleep(delay);
                        continue;
                    }
                }
                throw error;
            }
        }
        throw new Error('Max retries exceeded');
    }
    async analyzeSkinImages(imageUrls, questionnaire) {
        try {
            const prompt = this.buildAnalysisPrompt(questionnaire);
            const imageParts = await this.prepareImageParts(imageUrls);
            const requestBody = {
                contents: [
                    {
                        parts: [{ text: prompt }, ...imageParts],
                    },
                ],
                generationConfig: {
                    temperature: 0.4,
                    topK: 32,
                    topP: 1,
                    maxOutputTokens: 8192,
                },
                safetySettings: [
                    {
                        category: 'HARM_CATEGORY_HARASSMENT',
                        threshold: 'BLOCK_NONE',
                    },
                    {
                        category: 'HARM_CATEGORY_HATE_SPEECH',
                        threshold: 'BLOCK_NONE',
                    },
                    {
                        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                        threshold: 'BLOCK_NONE',
                    },
                    {
                        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                        threshold: 'BLOCK_NONE',
                    },
                ],
            };
            const response = await this.requestGeminiWithFallback(requestBody, {
                timeout: 120000,
            });
            const textResponse = response.candidates[0]?.content?.parts[0]?.text;
            if (!textResponse) {
                throw new Error('No response from Gemini API');
            }
            return this.parseAnalysisResponse(textResponse);
        }
        catch (error) {
            this.logger.error('Gemini analysis failed, trying OpenRouter fallback', error);
            try {
                const isGrokAvailable = await this.grokService.isAvailable();
                if (isGrokAvailable) {
                    this.logger.log('Using OpenRouter vision fallback for image analysis');
                    const fallbackPrompt = this.buildAnalysisPrompt(questionnaire);
                    const fallbackImageParts = await this.prepareImageParts(imageUrls);
                    if (fallbackImageParts.length > 0) {
                        const base64Image = fallbackImageParts[0].inlineData.data;
                        const grokResponse = await this.grokService.analyzeImage(base64Image, fallbackPrompt);
                        return this.parseAnalysisResponse(grokResponse);
                    }
                }
            }
            catch (grokError) {
                this.logger.error('OpenRouter fallback also failed', grokError);
            }
            throw error;
        }
    }
    async analyzeSkinImageBuffers(images, questionnaire) {
        if (!Array.isArray(images) || images.length === 0) {
            throw new Error('At least one image is required');
        }
        try {
            const prompt = this.buildAnalysisPrompt(questionnaire);
            const imageParts = images.map((item) => ({
                inlineData: {
                    mimeType: item.mimeType || 'image/jpeg',
                    data: item.buffer.toString('base64'),
                },
            }));
            const requestBody = {
                contents: [
                    {
                        parts: [{ text: prompt }, ...imageParts],
                    },
                ],
                generationConfig: {
                    temperature: 0.4,
                    topK: 32,
                    topP: 1,
                    maxOutputTokens: 8192,
                },
                safetySettings: [
                    {
                        category: 'HARM_CATEGORY_HARASSMENT',
                        threshold: 'BLOCK_NONE',
                    },
                    {
                        category: 'HARM_CATEGORY_HATE_SPEECH',
                        threshold: 'BLOCK_NONE',
                    },
                    {
                        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                        threshold: 'BLOCK_NONE',
                    },
                    {
                        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                        threshold: 'BLOCK_NONE',
                    },
                ],
            };
            const response = await this.requestGeminiWithFallback(requestBody, {
                timeout: 60000,
            });
            const textResponse = response.candidates[0]?.content?.parts[0]?.text;
            if (!textResponse) {
                throw new Error('No response from Gemini API');
            }
            return this.parseAnalysisResponse(textResponse);
        }
        catch (error) {
            this.logger.error('Buffered upload analysis failed, trying OpenRouter fallback', error);
            try {
                const isGrokAvailable = await this.grokService.isAvailable();
                if (isGrokAvailable) {
                    const fallbackPrompt = this.buildAnalysisPrompt(questionnaire);
                    const primaryImage = images[0];
                    const grokResponse = await this.grokService.analyzeImage(primaryImage.buffer.toString('base64'), fallbackPrompt);
                    return this.parseAnalysisResponse(grokResponse);
                }
            }
            catch (grokError) {
                this.logger.error('OpenRouter fallback also failed', grokError);
            }
            throw error;
        }
    }
    async analyzeRealTimeScan(base64Image, mimeType = 'image/jpeg') {
        try {
            const prompt = this.buildRealTimeScanPrompt();
            const requestBody = {
                contents: [
                    {
                        parts: [
                            { text: prompt },
                            {
                                inlineData: {
                                    mimeType,
                                    data: base64Image,
                                },
                            },
                        ],
                    },
                ],
                generationConfig: {
                    temperature: 0.4,
                    topK: 32,
                    topP: 1,
                    maxOutputTokens: 8192,
                },
            };
            const response = await this.requestGeminiWithFallback(requestBody, {
                timeout: 120000,
            });
            const textResponse = response.candidates[0]?.content?.parts[0]?.text;
            if (!textResponse) {
                throw new Error('No response from Gemini API');
            }
            return this.parseAnalysisResponse(textResponse);
        }
        catch (error) {
            this.logger.error('Real-time scan analysis failed, trying OpenRouter fallback', error);
            try {
                const isGrokAvailable = await this.grokService.isAvailable();
                if (isGrokAvailable) {
                    this.logger.log('Using OpenRouter vision fallback for real-time scan');
                    const prompt = this.buildRealTimeScanPrompt();
                    const grokResponse = await this.grokService.analyzeImage(base64Image, prompt);
                    return this.parseAnalysisResponse(grokResponse);
                }
            }
            catch (grokError) {
                this.logger.error('OpenRouter fallback also failed', grokError);
            }
            throw error;
        }
    }
    async analyzeRealTimeMultiAngleScan(images) {
        if (!Array.isArray(images) || images.length === 0) {
            throw new Error('At least one scan image is required');
        }
        try {
            const prompt = this.buildRealTimeScanPrompt();
            const imageParts = images.map((item) => ({
                inlineData: {
                    mimeType: item.mimeType || 'image/jpeg',
                    data: item.image,
                },
            }));
            const requestBody = {
                contents: [
                    {
                        parts: [{ text: prompt }, ...imageParts],
                    },
                ],
                generationConfig: {
                    temperature: 0.4,
                    topK: 32,
                    topP: 1,
                    maxOutputTokens: 8192,
                },
            };
            const response = await this.requestGeminiWithFallback(requestBody, {
                timeout: 30000,
            });
            const textResponse = response.candidates[0]?.content?.parts[0]?.text;
            if (!textResponse) {
                throw new Error('No response from Gemini API');
            }
            return this.parseAnalysisResponse(textResponse);
        }
        catch (error) {
            this.logger.error('Multi-angle real-time scan analysis failed, trying OpenRouter fallback', error);
            try {
                const isGrokAvailable = await this.grokService.isAvailable();
                if (isGrokAvailable) {
                    const prompt = this.buildRealTimeScanPrompt();
                    const primaryImage = images[0];
                    const grokResponse = await this.grokService.analyzeImage(primaryImage.image, prompt);
                    return this.parseAnalysisResponse(grokResponse);
                }
            }
            catch (grokError) {
                this.logger.error('OpenRouter fallback also failed', grokError);
            }
            throw error;
        }
    }
    buildAnalysisPrompt(questionnaire) {
        return (0, prompt_compression_util_1.buildCompactAnalysisPrompt)(questionnaire);
    }
    buildRealTimeScanPrompt() {
        return (0, prompt_compression_util_1.buildUltraCompactScanPrompt)();
    }
    async prepareImageParts(imageUrls) {
        const imageParts = [];
        for (const url of imageUrls) {
            try {
                const response = await axios_1.default.get(url, {
                    responseType: 'arraybuffer',
                    timeout: 10000,
                });
                const base64 = Buffer.from(response.data).toString('base64');
                const mimeType = response.headers['content-type'] || 'image/jpeg';
                imageParts.push({
                    inlineData: {
                        mimeType,
                        data: base64,
                    },
                });
            }
            catch (error) {
                this.logger.warn(`Failed to fetch image: ${url}`, error);
            }
        }
        return imageParts;
    }
    toNumber(value) {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed)
                return null;
            const normalized = trimmed.replace(',', '.');
            const parsed = Number(normalized);
            return Number.isFinite(parsed) ? parsed : null;
        }
        return null;
    }
    normalizeSkinAge(value) {
        const direct = this.toNumber(value);
        if (direct !== null) {
            return Math.max(10, Math.min(100, Math.round(direct)));
        }
        if (typeof value === 'string') {
            const matches = value.match(/\d+(?:[.,]\d+)?/g);
            if (matches?.length) {
                const nums = matches
                    .map((v) => this.toNumber(v))
                    .filter((n) => n !== null);
                if (nums.length === 1) {
                    return Math.max(10, Math.min(100, Math.round(nums[0])));
                }
                if (nums.length >= 2) {
                    const avg = (nums[0] + nums[1]) / 2;
                    return Math.max(10, Math.min(100, Math.round(avg)));
                }
            }
        }
        return 25;
    }
    normalizeHealthScore(value) {
        const num = this.toNumber(value);
        if (num === null)
            return 70;
        const normalized = num <= 10 ? num * 10 : num;
        return Math.max(0, Math.min(100, Math.round(normalized)));
    }
    normalizeMetric(value, fallbackDescription) {
        if (value && typeof value === 'object') {
            const maybeScore = this.toNumber(value.score);
            const maybeDescription = typeof value.description === 'string'
                ? value.description
                : fallbackDescription;
            return {
                score: maybeScore === null
                    ? 70
                    : Math.max(0, Math.min(100, Math.round(maybeScore <= 10 ? maybeScore * 10 : maybeScore))),
                description: maybeDescription,
            };
        }
        if (typeof value === 'string' && value.trim()) {
            return { score: 70, description: value.trim() };
        }
        return { score: 70, description: fallbackDescription };
    }
    parseAnalysisResponse(textResponse) {
        try {
            const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                skinType: parsed.skinType || 'normal',
                skinAge: this.normalizeSkinAge(parsed.skinAge),
                healthScore: this.normalizeHealthScore(parsed.healthScore),
                conditions: parsed.conditions || [],
                concerns: parsed.concerns || [],
                recommendations: {
                    products: parsed.recommendations?.products || [],
                    ingredients: parsed.recommendations?.ingredients || [],
                    lifestyle: parsed.recommendations?.lifestyle || [],
                    warnings: parsed.recommendations?.warnings || [],
                },
                detailedAnalysis: {
                    hydration: this.normalizeMetric(parsed.detailedAnalysis?.hydration, 'Normal hydration'),
                    texture: this.normalizeMetric(parsed.detailedAnalysis?.texture, 'Normal texture'),
                    pores: this.normalizeMetric(parsed.detailedAnalysis?.pores, 'Normal pore size'),
                    pigmentation: this.normalizeMetric(parsed.detailedAnalysis?.pigmentation, 'Even tone'),
                    wrinkles: this.normalizeMetric(parsed.detailedAnalysis?.wrinkles, 'Minimal wrinkles'),
                    acne: this.normalizeMetric(parsed.detailedAnalysis?.acne, 'Clear skin'),
                    redness: this.normalizeMetric(parsed.detailedAnalysis?.redness, 'No redness'),
                    elasticity: this.normalizeMetric(parsed.detailedAnalysis?.elasticity, 'Good elasticity'),
                },
                fitzpatrickType: Math.min(6, Math.max(1, parsed.fitzpatrickType || 3)),
                summary: parsed.summary || 'Analysis completed successfully.',
            };
        }
        catch (error) {
            this.logger.error('Failed to parse Gemini response', error);
            throw new Error('Failed to parse analysis response');
        }
    }
    async getSkincareAdvice(conditions, concerns) {
        const conditionsList = conditions?.length > 0 ? conditions.join(', ') : 'general skin health';
        const concernsList = concerns?.length > 0 ? concerns.join(', ') : 'overall skincare';
        const prompt = (0, prompt_compression_util_1.compressWhitespace)(`
Dermatologist. Advice for:
Cond:${conditionsList}
Concerns:${concernsList}
3-4 sentences, actionable.`);
        try {
            const response = await this.requestGeminiWithFallback({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1024,
                },
            }, { timeout: 60000 });
            return (response.candidates[0]?.content?.parts[0]?.text ||
                'Unable to generate advice.');
        }
        catch (error) {
            this.logger.error('Failed to get skincare advice from Gemini, trying OpenRouter', error);
            try {
                const isGrokAvailable = await this.grokService.isAvailable();
                if (isGrokAvailable) {
                    this.logger.log('Using OpenRouter fallback for skincare advice');
                    return await this.grokService.getSkincareAdvice(conditions, concerns);
                }
            }
            catch (grokError) {
                this.logger.error('OpenRouter fallback also failed', grokError);
            }
            return 'Unable to generate advice at this time. Please try again later.';
        }
    }
    async chat(systemPrompt, conversationHistory, userMessage) {
        const compressedHistory = conversationHistory?.length > 500
            ? '...' + conversationHistory.slice(-500)
            : conversationHistory || '-';
        const prompt = (0, prompt_compression_util_1.compressWhitespace)(`
${systemPrompt}
Hist:${compressedHistory}
User:${userMessage}
Rép:français,utile,pro.`);
        try {
            const response = await this.requestGeminiWithFallback({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                },
            }, { timeout: 3000000 });
            return (response.candidates[0]?.content?.parts[0]?.text ||
                "Je suis désolé, je n'ai pas pu générer une réponse.");
        }
        catch (error) {
            this.logger.error('Failed to generate chat response from Gemini, trying OpenRouter', error);
            try {
                const isGrokAvailable = await this.grokService.isAvailable();
                if (isGrokAvailable) {
                    this.logger.log('Using OpenRouter fallback for chat');
                    return await this.grokService.chatSkincare(systemPrompt, conversationHistory, userMessage);
                }
            }
            catch (grokError) {
                this.logger.error('OpenRouter fallback also failed', grokError);
            }
            throw error;
        }
    }
    async analyzeCosmeticProductImage(base64Image, skinProfile, mimeType = 'image/jpeg') {
        const prompt = (0, prompt_compression_util_1.compressWhitespace)(`
Dermatology expert for cosmetic products.
Analyze this product image and return ONLY valid JSON.
User profile:
- skinType: ${skinProfile?.skinType || 'unknown'}
- concerns: ${(skinProfile?.concerns || []).join(', ') || 'none'}
- sensitivities: ${(skinProfile?.sensitivities || []).join(', ') || 'none'}

Required JSON schema:
{
  "name": "string",
  "brand": "string",
  "category": "string",
  "ingredients": ["string"],
  "benefits": [{"title":"string","description":"string","matchPercentage":0}],
  "concerns": [{"title":"string","description":"string","severity":"low|medium|high"}],
  "skinTypeCompatibility": [{"skinType":"Dry|Oily|Combination|Sensitive|Normal","compatibility":0}],
  "recommendation": "string"
}

Rules:
- identify the most likely product name and brand from packaging text;
- infer ingredients only from visible/legible text; if unclear use empty array;
- compatibility and recommendation must be specific to the provided user profile;
- return JSON only, no markdown and no extra text.
`);
        const requestBody = {
            contents: [
                {
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType,
                                data: base64Image,
                            },
                        },
                    ],
                },
            ],
            generationConfig: {
                temperature: 0.2,
                topK: 32,
                topP: 1,
                maxOutputTokens: 4096,
            },
        };
        try {
            const response = await this.requestGeminiWithFallback(requestBody, {
                timeout: 120000,
            });
            const textResponse = response.candidates[0]?.content?.parts[0]?.text;
            if (!textResponse) {
                throw new Error('No response from Gemini API');
            }
            return this.parseCosmeticProductAnalysis(textResponse);
        }
        catch (error) {
            this.logger.error('Failed cosmetic product analysis', error);
            throw error;
        }
    }
    parseCosmeticProductAnalysis(textResponse) {
        try {
            const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in product analysis response');
            }
            const parsed = JSON.parse(jsonMatch[0]);
            const benefits = Array.isArray(parsed.benefits)
                ? parsed.benefits
                    .filter((item) => item && (item.title || item.description))
                    .map((item) => ({
                    title: String(item.title || 'Benefit'),
                    description: String(item.description || ''),
                    matchPercentage: Math.max(0, Math.min(100, Number(item.matchPercentage ?? 0) || 0)),
                }))
                : [];
            const concerns = Array.isArray(parsed.concerns)
                ? parsed.concerns
                    .filter((item) => item && (item.title || item.description))
                    .map((item) => {
                    const severityValue = String(item.severity || 'low').toLowerCase();
                    const severity = severityValue === 'high'
                        ? 'high'
                        : severityValue === 'medium'
                            ? 'medium'
                            : 'low';
                    return {
                        title: String(item.title || 'Concern'),
                        description: String(item.description || ''),
                        severity,
                    };
                })
                : [];
            const compatibility = Array.isArray(parsed.skinTypeCompatibility)
                ? parsed.skinTypeCompatibility
                    .filter((item) => item && item.skinType)
                    .map((item) => ({
                    skinType: String(item.skinType),
                    compatibility: Math.max(0, Math.min(100, Number(item.compatibility ?? 0) || 0)),
                }))
                : [];
            return {
                name: String(parsed.name || 'Unknown Product'),
                brand: String(parsed.brand || 'Unknown Brand'),
                category: String(parsed.category || 'Cosmetics'),
                ingredients: Array.isArray(parsed.ingredients)
                    ? parsed.ingredients
                        .map((item) => String(item).trim())
                        .filter((item) => item.length > 0)
                    : [],
                benefits,
                concerns,
                skinTypeCompatibility: compatibility,
                recommendation: String(parsed.recommendation ||
                    'Recommendation unavailable. Please verify ingredients manually.'),
            };
        }
        catch (error) {
            this.logger.error('Failed to parse cosmetic analysis response', error);
            throw new Error('Failed to parse cosmetic analysis response');
        }
    }
    async generateHairstyleTransfer(originalBase64, haircutTitle) {
        try {
            const modelUrl = 'https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5';
            const response = await axios_1.default.post(modelUrl, {
                inputs: `A professional studio portrait of the same person with a ${haircutTitle} hairstyle, matching face, high quality, realistic, sharp focus, 8k`,
                image: originalBase64,
                parameters: {
                    strength: 0.45,
                    guidance_scale: 7.5,
                    num_inference_steps: 30,
                },
            }, {
                headers: {
                    Authorization: `Bearer ${this.huggingFaceApiKey}`,
                    'Content-Type': 'application/json',
                },
                responseType: 'arraybuffer',
                timeout: 60000,
            });
            const base64 = Buffer.from(response.data, 'binary').toString('base64');
            return `data:image/jpeg;base64,${base64}`;
        }
        catch (error) {
            this.logger.warn('Hairstyle transfer failed, using text-to-image fallback', error.message);
            return this.generateHairstyleImage(`A professional studio portrait of a man with a ${haircutTitle} haircut, high quality`);
        }
    }
    async analyzeHairAndRecommend(base64Image, mimeType = 'image/jpeg') {
        const prompt = (0, prompt_compression_util_1.compressWhitespace)(`
Expert Hair Stylist AI. Analyze face shape and current hair from image.
Recommend the IDEAL haircut.
Return ONLY valid JSON in this format:
{
  "title": "Haircut name",
  "description": "Explanation in French (max 2 sentences) why it suits them."
}
No markdown, no talk, just the JSON object.`);
        const cleanBase64 = base64Image.includes('base64,')
            ? base64Image.split('base64,')[1]
            : base64Image;
        const requestBody = {
            contents: [
                {
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType,
                                data: cleanBase64,
                            },
                        },
                    ],
                },
            ],
            generationConfig: {
                temperature: 0.5,
                maxOutputTokens: 2048,
            },
        };
        try {
            const response = await this.requestGeminiWithFallback(requestBody, {
                timeout: 60000,
            });
            const textResponse = response.candidates[0]?.content?.parts[0]?.text;
            if (!textResponse) {
                throw new Error('No response from Gemini API');
            }
            let parsed;
            try {
                let jsonStr = textResponse.trim();
                const startIdx = jsonStr.indexOf('{');
                if (startIdx === -1)
                    throw new Error('No JSON object found');
                jsonStr = jsonStr.substring(startIdx);
                const lastBraceIdx = jsonStr.lastIndexOf('}');
                if (lastBraceIdx !== -1) {
                    jsonStr = jsonStr.substring(0, lastBraceIdx + 1);
                }
                else {
                    if (jsonStr.includes('"') && !jsonStr.endsWith('"}')) {
                        jsonStr += '"}';
                    }
                    else if (!jsonStr.endsWith('}')) {
                        jsonStr += '}';
                    }
                }
                parsed = JSON.parse(jsonStr);
            }
            catch (parseError) {
                this.logger.error('Failed to parse hair recommendation JSON', {
                    error: parseError.message,
                    rawResponse: textResponse,
                });
                parsed = {
                    title: 'Coupe Dégradée Classique',
                    description: "D'après votre structure faciale, un dégradé classique permet d'équilibrer vos traits tout en restant élégant et facile à entretenir.",
                };
            }
            const title = parsed.title || 'Coupe Classique';
            const description = parsed.description || 'Une coupe équilibrée pour votre visage.';
            let imageUrl = await this.generateHairstyleTransfer(cleanBase64, title);
            if (!imageUrl) {
                const keywords = title.toLowerCase();
                imageUrl =
                    'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=600&h=600&auto=format&fit=crop';
                if (keywords.includes('buzz'))
                    imageUrl =
                        'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=600&h=600&auto=format&fit=crop';
                else if (keywords.includes('pompadour') || keywords.includes('volume'))
                    imageUrl =
                        'https://images.unsplash.com/photo-1622286332618-f281a82a1314?q=80&w=600&h=600&auto=format&fit=crop';
                else if (keywords.includes('fade') || keywords.includes('dégradé'))
                    imageUrl =
                        'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=600&h=600&auto=format&fit=crop';
                else if (keywords.includes('long'))
                    imageUrl =
                        'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?q=80&w=600&h=600&auto=format&fit=crop';
                else if (keywords.includes('crew'))
                    imageUrl =
                        'https://images.unsplash.com/photo-1581803118522-7b72a50f7e9f?q=80&w=600&h=600&auto=format&fit=crop';
                else if (keywords.includes('undercut'))
                    imageUrl =
                        'https://images.unsplash.com/photo-1605497746444-ac961d13af4a?q=80&w=600&h=600&auto=format&fit=crop';
            }
            return { title, description, imageUrl };
        }
        catch (error) {
            this.logger.warn('Gemini hair analysis failed, trying Grok/OpenRouter fallback', error.message);
            try {
                const isGrokAvailable = await this.grokService.isAvailable();
                if (isGrokAvailable) {
                    const grokResponse = await this.grokService.analyzeImage(cleanBase64, prompt);
                    const jsonMatch = grokResponse.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        const title = parsed.title || 'Coupe Moderne';
                        const description = parsed.description || 'Une coupe adaptée à votre visage.';
                        let imageUrl = await this.generateHairstyleTransfer(cleanBase64, title);
                        if (!imageUrl) {
                            imageUrl =
                                'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=600&h=600&auto=format&fit=crop';
                        }
                        return { title, description, imageUrl };
                    }
                }
            }
            catch (grokError) {
                this.logger.error('Grok hair analysis fallback failed', grokError.message);
            }
            this.logger.warn('Grok failed, using Hugging Face BLIP fallback');
            try {
                const imageBuffer = Buffer.from(cleanBase64, 'base64');
                const captionResult = await this.queryHuggingFace(imageBuffer);
                const caption = Array.isArray(captionResult)
                    ? captionResult[0]?.generated_text
                    : captionResult?.generated_text;
                if (!caption)
                    throw new Error('Hugging Face failed to provide a caption');
                this.logger.log(`Hugging Face Caption: ${caption}`);
                const textPrompt = `Based on this description of a person: "${caption}". Recommend the ideal haircut. 
Return ONLY JSON: {"title": "...", "description": "in French, 2 sentences"}.`;
                const textResponse = await this.requestGeminiWithFallback({
                    contents: [{ parts: [{ text: textPrompt }] }],
                });
                const textBody = textResponse.candidates[0]?.content?.parts[0]?.text;
                const jsonMatch = textBody.match(/\{[\s\S]*\}/);
                const parsed = JSON.parse(jsonMatch[0]);
                const title = parsed.title || 'Coupe Moderne';
                const description = parsed.description || 'Une coupe adaptée à votre style.';
                let imageUrl = await this.generateHairstyleTransfer(cleanBase64, title);
                if (!imageUrl) {
                    const keywords = title.toLowerCase();
                    imageUrl =
                        'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=600&h=600&auto=format&fit=crop';
                    if (keywords.includes('buzz'))
                        imageUrl =
                            'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=600&h=600&auto=format&fit=crop';
                    else if (keywords.includes('pompadour'))
                        imageUrl =
                            'https://images.unsplash.com/photo-1622286332618-f281a82a1314?q=80&w=600&h=600&auto=format&fit=crop';
                    else if (keywords.includes('fade'))
                        imageUrl =
                            'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=600&h=600&auto=format&fit=crop';
                }
                return { title, description, imageUrl };
            }
            catch (fallbackError) {
                this.logger.error('Full fallback chain failed', fallbackError.message);
                return {
                    title: 'Coupe Moderne',
                    description: 'Nous recommandons une coupe structurée qui mettra en valeur les lignes de votre visage.',
                    imageUrl: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=600&h=600&auto=format&fit=crop',
                };
            }
        }
    }
};
exports.GeminiService = GeminiService;
exports.GeminiService = GeminiService = GeminiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GeminiService);
//# sourceMappingURL=gemini.service.js.map