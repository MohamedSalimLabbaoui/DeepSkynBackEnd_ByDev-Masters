"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const analysis_service_1 = require("./analysis.service");
const analysis_controller_1 = require("./analysis.controller");
const analysis_test_controller_1 = require("./analysis-test.controller");
const gemini_service_1 = require("./services/gemini.service");
const grok_service_1 = require("./services/grok.service");
const supabase_service_1 = require("./services/supabase.service");
const prisma_module_1 = require("../prisma/prisma.module");
const skin_profile_module_1 = require("../skin-profile/skin-profile.module");
const notification_module_1 = require("../notification/notification.module");
const subscription_module_1 = require("../subscription/subscription.module");
const digital_twin_module_1 = require("../digital-twin/digital-twin.module");
let AnalysisModule = class AnalysisModule {
};
exports.AnalysisModule = AnalysisModule;
exports.AnalysisModule = AnalysisModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            prisma_module_1.PrismaModule,
            skin_profile_module_1.SkinProfileModule,
            notification_module_1.NotificationModule,
            subscription_module_1.SubscriptionModule,
            digital_twin_module_1.DigitalTwinModule,
        ],
        controllers: [analysis_controller_1.AnalysisController, analysis_test_controller_1.AnalysisTestController],
        providers: [analysis_service_1.AnalysisService, gemini_service_1.GeminiService, grok_service_1.GrokService, supabase_service_1.SupabaseService],
        exports: [analysis_service_1.AnalysisService, gemini_service_1.GeminiService, grok_service_1.GrokService, supabase_service_1.SupabaseService],
    })
], AnalysisModule);
//# sourceMappingURL=analysis.module.js.map