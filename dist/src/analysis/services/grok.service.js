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
var GrokService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GrokService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
let GrokService = GrokService_1 = class GrokService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(GrokService_1.name);
        this.maxRetries = 5;
        this.retryDelay = 1000;
        this.cooldownMs = 60_000;
        this.cooldownMap = new Map();
        this.disabledModels = new Set();
        this.textRotationBase = [
            'openrouter/free',
            'meta-llama/llama-3.3-70b-instruct:free',
            'google/gemma-3-27b-it:free',
            'google/gemma-3-12b-it:free',
            'nvidia/nemotron-nano-12b-v2-vl:free',
        ];
        this.visionRotationBase = [
            'nvidia/nemotron-nano-12b-v2-vl:free',
            'google/gemma-3-27b-it:free',
        ];
        this.openRouterBaseUrl =
            this.configService.get('OPENROUTER_BASE_URL') ||
                this.configService.get('GROK_BASE_URL') ||
                'https://openrouter.ai/api/v1';
        this.groqBaseUrl =
            this.configService.get('GROQ_BASE_URL') ||
                'https://api.groq.com/openai/v1';
        this.openRouterKeys = this.loadApiKeys('OPENROUTER_API_KEY');
        this.groqApiKeys = this.loadApiKeys('GROQ_API_KEY');
        this.textModel =
            this.configService.get('OPENROUTER_TEXT_MODEL') ||
                this.configService.get('GROK_TEXT_MODEL') ||
                'openrouter/free';
        this.visionModel =
            this.configService.get('OPENROUTER_VISION_MODEL') ||
                this.configService.get('GROK_VISION_MODEL') ||
                'nvidia/nemotron-nano-12b-v2-vl:free';
        this.groqTextModel =
            this.configService.get('GROQ_TEXT_MODEL') ||
                'llama-3.3-70b-versatile';
        if (this.openRouterKeys.length === 0) {
            this.logger.warn('OpenRouter is not configured. Set OPENROUTER_API_KEY.');
        }
        if (this.groqApiKeys.length === 0) {
            this.logger.warn('Groq is not configured. Set GROQ_API_KEY.');
        }
    }
    loadApiKeys(baseName) {
        const primary = this.configService.get(baseName);
        const fallback = baseName === 'OPENROUTER_API_KEY'
            ? this.configService.get('GROK_API_KEY')
            : undefined;
        const key = primary || fallback;
        return key && key.trim().length > 0 ? [key.trim()] : [];
    }
    async isAvailable() {
        if (this.openRouterKeys.length > 0) {
            try {
                const response = await axios_1.default.get(`${this.openRouterBaseUrl}/models`, {
                    timeout: 5000,
                    headers: {
                        Authorization: `Bearer ${this.openRouterKeys[0]}`,
                    },
                });
                if (response.status === 200) {
                    return true;
                }
            }
            catch (error) {
                this.logger.warn(`OpenRouter availability check failed: ${error.message}`);
            }
        }
        return this.groqApiKeys.length > 0;
    }
    async getAvailableModels() {
        if (this.openRouterKeys.length === 0) {
            return [];
        }
        try {
            const response = await axios_1.default.get(`${this.openRouterBaseUrl}/models`, {
                timeout: 10000,
                headers: {
                    Authorization: `Bearer ${this.openRouterKeys[0]}`,
                },
            });
            return response.data?.data?.map((m) => m.id) || [];
        }
        catch {
            return [];
        }
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    getCompletionUrl() {
        return this.openRouterBaseUrl.replace(/\/+$/, '') + '/chat/completions';
    }
    getGroqCompletionUrl() {
        return this.groqBaseUrl.replace(/\/+$/, '') + '/chat/completions';
    }
    cleanExpiredCooldowns() {
        const now = Date.now();
        for (const [model, until] of this.cooldownMap.entries()) {
            if (until <= now) {
                this.cooldownMap.delete(model);
            }
        }
    }
    getCooldownModels() {
        this.cleanExpiredCooldowns();
        const now = Date.now();
        return Array.from(this.cooldownMap.entries())
            .filter(([, until]) => until > now)
            .map(([model]) => model);
    }
    markModelCooldown(model) {
        const until = Date.now() + this.cooldownMs;
        this.cooldownMap.set(model, until);
    }
    removeModelForSession(model) {
        this.disabledModels.add(model);
        this.cooldownMap.delete(model);
    }
    getRotationModels(mode, requestedModel) {
        const primary = mode === 'vision' ? this.visionRotationBase : this.textRotationBase;
        const configured = mode === 'vision' ? this.visionModel : this.textModel;
        const merged = [requestedModel, configured, ...primary].filter((m) => !!m);
        this.cleanExpiredCooldowns();
        return Array.from(new Set(merged)).filter((model) => {
            if (this.disabledModels.has(model))
                return false;
            const cooldownUntil = this.cooldownMap.get(model);
            return !cooldownUntil || cooldownUntil <= Date.now();
        });
    }
    async requestCompletion(model, messages, temperature = 0.7, maxTokens = 2048, mode = 'text') {
        const endpoint = this.getCompletionUrl();
        const modelCandidates = this.getRotationModels(mode, model);
        if (modelCandidates.length === 0 && mode === 'vision') {
            throw new Error('No available OpenRouter vision models (all disabled or cooling down)');
        }
        let lastError;
        if (this.openRouterKeys.length > 0) {
            for (const currentModel of modelCandidates) {
                const apiKey = this.openRouterKeys[0];
                for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
                    try {
                        const response = await axios_1.default.post(endpoint, {
                            model: currentModel,
                            messages,
                            temperature,
                            max_tokens: maxTokens,
                        }, {
                            timeout: 120000,
                            headers: {
                                Authorization: `Bearer ${apiKey}`,
                                'Content-Type': 'application/json',
                                'HTTP-Referer': 'http://localhost',
                                'X-Title': 'DeepSkynBackEnd',
                            },
                        });
                        const content = response.data?.choices?.[0]?.message?.content;
                        if (content) {
                            return content;
                        }
                        throw new Error('Empty response from OpenRouter');
                    }
                    catch (error) {
                        lastError = error;
                        const axiosError = error;
                        const status = axiosError.response?.status;
                        this.logger.warn(`OpenRouter request failed (model=${currentModel}, attempt=${attempt}): ${axiosError.message}`);
                        if (status === 404) {
                            this.removeModelForSession(currentModel);
                            break;
                        }
                        if (status === 429) {
                            this.markModelCooldown(currentModel);
                            break;
                        }
                        if (attempt < this.maxRetries) {
                            await this.sleep(this.retryDelay * attempt);
                        }
                    }
                }
            }
        }
        if (mode === 'text') {
            return this.requestGroqCompletion(messages, temperature, maxTokens, lastError);
        }
        throw lastError || new Error('OpenRouter request failed after all retries');
    }
    async requestGroqCompletion(messages, temperature, maxTokens, previousError) {
        if (this.groqApiKeys.length === 0) {
            throw previousError || new Error('No Groq API key configured');
        }
        const endpoint = this.getGroqCompletionUrl();
        let lastError = previousError;
        const apiKey = this.groqApiKeys[0];
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const response = await axios_1.default.post(endpoint, {
                    model: this.groqTextModel,
                    messages,
                    temperature,
                    max_tokens: maxTokens,
                }, {
                    timeout: 120000,
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                });
                const content = response.data?.choices?.[0]?.message?.content;
                if (content) {
                    this.logger.log(`Groq fallback succeeded (model=${this.groqTextModel})`);
                    return content;
                }
                throw new Error('Empty response from Groq');
            }
            catch (error) {
                lastError = error;
                const axiosError = error;
                const status = axiosError.response?.status;
                this.logger.warn(`Groq request failed (model=${this.groqTextModel}, attempt=${attempt}): ${axiosError.message}`);
                if (attempt < this.maxRetries &&
                    (status === 429 || status === 500 || status === 503)) {
                    await this.sleep(this.retryDelay * attempt);
                    continue;
                }
                break;
            }
        }
        throw lastError || new Error('Groq request failed after all retries');
    }
    async generate(prompt, model) {
        return this.requestCompletion(model || this.textModel, [{ role: 'user', content: prompt }], 0.7, 2048, 'text');
    }
    async chat(messages, model) {
        const normalized = messages.map((m) => ({
            role: m.role,
            content: m.content,
        }));
        return this.requestCompletion(model || this.textModel, normalized, 0.7, 2048, 'text');
    }
    async analyzeImage(base64Image, prompt, model) {
        return this.requestCompletion(model || this.visionModel, [
            {
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    {
                        type: 'image_url',
                        image_url: {
                            url: `data:image/jpeg;base64,${base64Image}`,
                        },
                    },
                ],
            },
        ], 0.4, 4096, 'vision');
    }
    async getSkincareAdvice(conditions, concerns) {
        const conditionsList = conditions.length > 0 ? conditions.join(', ') : 'general skin health';
        const concernsList = concerns.length > 0 ? concerns.join(', ') : 'overall skincare';
        const prompt = `Tu es un dermatologue expert. Fournis des conseils de soins de la peau pour quelqu'un avec:\nConditions: ${conditionsList}\nPréoccupations: ${concernsList}\n\nDonne des conseils pratiques et actionnables en 3-4 phrases en français.`;
        return this.generate(prompt);
    }
    async chatSkincare(systemPrompt, conversationHistory, userMessage) {
        const messages = [
            {
                role: 'system',
                content: systemPrompt,
            },
        ];
        if (conversationHistory && conversationHistory.trim()) {
            const lines = conversationHistory.split('\n');
            for (const line of lines) {
                if (line.startsWith('Utilisateur:')) {
                    messages.push({
                        role: 'user',
                        content: line.replace('Utilisateur:', '').trim(),
                    });
                }
                else if (line.startsWith('Assistant:')) {
                    messages.push({
                        role: 'assistant',
                        content: line.replace('Assistant:', '').trim(),
                    });
                }
            }
        }
        messages.push({
            role: 'user',
            content: userMessage,
        });
        return this.chat(messages);
    }
};
exports.GrokService = GrokService;
exports.GrokService = GrokService = GrokService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GrokService);
//# sourceMappingURL=grok.service.js.map