import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import keycloakConfig from './config/keycloak.config';
import { ScraperModule } from './scraper/scraper.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { NotificationModule } from './notification/notification.module';
import { SkinProfileModule } from './skin-profile/skin-profile.module';
import { AnalysisModule } from './analysis/analysis.module';
import { RoutineModule } from './routine/routine.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { ChatModule } from './chat/chat.module';
import { PostsModule } from './posts/posts.module';
import { LikesModule } from './likes/likes.module';
import { CommentsModule } from './comments/comments.module';
import { MailModule } from './mail/mail.module';
import { ChurnModule } from './churn/churn.module';
import { CrawlingModule } from './crawling/crawling.module';
import { UsersModule } from './users/users.module';
import { WeatherModule } from './weather/weather.module';
import { StoriesModule } from './stories/stories.module';
import { SignTranslationModule } from './sign-translation/sign-translation.module';
import { ContextualAnalysisModule } from './contextual-analysis/contextual-analysis.module';
import { PredictiveRoutineModule } from './predictive-routine/predictive-routine.module';

@Module({
  imports: [
    UsersModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [keycloakConfig],
    }),
    PrismaModule,
    MailModule,
    ScraperModule,
    AuthModule,
    NotificationModule,
    SkinProfileModule,
    AnalysisModule,
    RoutineModule,
    SubscriptionModule,
    ChatModule,
    PostsModule,
    LikesModule,
    CommentsModule,
    ChurnModule,
    CrawlingModule,
    WeatherModule,
    StoriesModule,
    SignTranslationModule,
    ContextualAnalysisModule,
    PredictiveRoutineModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
