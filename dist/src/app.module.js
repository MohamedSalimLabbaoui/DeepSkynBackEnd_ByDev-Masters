"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const keycloak_config_1 = require("./config/keycloak.config");
const scraper_module_1 = require("./scraper/scraper.module");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const notification_module_1 = require("./notification/notification.module");
const skin_profile_module_1 = require("./skin-profile/skin-profile.module");
const analysis_module_1 = require("./analysis/analysis.module");
const routine_module_1 = require("./routine/routine.module");
const subscription_module_1 = require("./subscription/subscription.module");
const chat_module_1 = require("./chat/chat.module");
const posts_module_1 = require("./posts/posts.module");
const likes_module_1 = require("./likes/likes.module");
const comments_module_1 = require("./comments/comments.module");
const mail_module_1 = require("./mail/mail.module");
const churn_module_1 = require("./churn/churn.module");
const crawling_module_1 = require("./crawling/crawling.module");
const users_module_1 = require("./users/users.module");
const weather_module_1 = require("./weather/weather.module");
const stories_module_1 = require("./stories/stories.module");
const sign_translation_module_1 = require("./sign-translation/sign-translation.module");
const contextual_analysis_module_1 = require("./contextual-analysis/contextual-analysis.module");
const predictive_routine_module_1 = require("./predictive-routine/predictive-routine.module");
const face_verification_module_1 = require("./face-verification/face-verification.module");
const shared_module_1 = require("./shared/shared.module");
const digital_twin_module_1 = require("./digital-twin/digital-twin.module");
const n8n_module_1 = require("./n8n/n8n.module");
const admin_bi_module_1 = require("./admin-bi/admin-bi.module");
const product_scan_module_1 = require("./product-scan/product-scan.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            shared_module_1.SharedModule,
            users_module_1.UsersModule,
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
                load: [keycloak_config_1.default],
            }),
            prisma_module_1.PrismaModule,
            mail_module_1.MailModule,
            scraper_module_1.ScraperModule,
            auth_module_1.AuthModule,
            notification_module_1.NotificationModule,
            skin_profile_module_1.SkinProfileModule,
            analysis_module_1.AnalysisModule,
            routine_module_1.RoutineModule,
            subscription_module_1.SubscriptionModule,
            chat_module_1.ChatModule,
            posts_module_1.PostsModule,
            likes_module_1.LikesModule,
            comments_module_1.CommentsModule,
            churn_module_1.ChurnModule,
            crawling_module_1.CrawlingModule,
            weather_module_1.WeatherModule,
            stories_module_1.StoriesModule,
            sign_translation_module_1.SignTranslationModule,
            contextual_analysis_module_1.ContextualAnalysisModule,
            predictive_routine_module_1.PredictiveRoutineModule,
            face_verification_module_1.FaceVerificationModule,
            digital_twin_module_1.DigitalTwinModule,
            n8n_module_1.N8nModule,
            admin_bi_module_1.AdminBiModule,
            product_scan_module_1.ProductScanModule,
        ],
        controllers: [],
        providers: [],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map