import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Ajouter les pipes de validation globalement
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Configuration Swagger
  const config = new DocumentBuilder()
    .setTitle('DeepSkyn API')
    .setDescription('API Backend pour l\'application DeepSkyn - Intelligence Artificielle pour l\'analyse de la peau')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Auth', 'Authentication avec Keycloak')
    .addTag('Notifications', 'Gestion des notifications en temps réel')
    .addTag('Skin Profiles', 'Profils de peau des utilisateurs')
    .addTag('Analyses', 'Analyses de peau avec IA Gemini')
    .addTag('Routines', 'Routines de soins (manuelles et IA)')
    .addTag('Chat', 'Chatbot skincare avec IA')
    .addTag('Subscriptions', 'Gestion des abonnements')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 Application running on: http://localhost:${process.env.PORT ?? 3000}`);
  console.log(`📚 Swagger documentation: http://localhost:${process.env.PORT ?? 3000}/api`);
}
bootstrap();
