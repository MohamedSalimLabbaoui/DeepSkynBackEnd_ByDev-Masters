"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
const express_1 = require("express");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use('/webhook', (0, express_1.json)({
        verify: (req, _res, buf) => {
            req.rawBody = buf;
        },
        limit: '5mb',
    }));
    app.use((0, express_1.json)({ limit: '50mb' }));
    app.use((0, express_1.urlencoded)({ extended: true, limit: '50mb' }));
    app.enableCors({
        origin: [
            process.env.FRONTEND_URL || 'http://localhost:5173',
            'http://localhost:4173',
            'http://localhost:8081',
            'http://localhost:19006',
            'http://localhost:4200',
        ],
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    const config = new swagger_1.DocumentBuilder()
        .setTitle('DeepSkyn API')
        .setDescription("API Backend pour l'application DeepSkyn - Intelligence Artificielle pour l'analyse de la peau")
        .setVersion('1.0')
        .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT token',
        in: 'header',
    }, 'JWT-auth')
        .addTag('Auth', 'Authentication avec Keycloak')
        .addTag('Notifications', 'Gestion des notifications en temps réel')
        .addTag('Skin Profiles', 'Profils de peau des utilisateurs')
        .addTag('Analyses', 'Analyses de peau avec IA Gemini')
        .addTag('Routines', 'Routines de soins (manuelles et IA)')
        .addTag('Chat', 'Chatbot skincare avec IA')
        .addTag('Subscriptions', 'Gestion des abonnements')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api', app, document);
    await app.listen(process.env.PORT ?? 3000);
    console.log(`🚀 Application running on: http://localhost:${process.env.PORT ?? 3000}`);
    console.log(`📚 Swagger documentation: http://localhost:${process.env.PORT ?? 3000}/api`);
}
bootstrap();
//# sourceMappingURL=main.js.map