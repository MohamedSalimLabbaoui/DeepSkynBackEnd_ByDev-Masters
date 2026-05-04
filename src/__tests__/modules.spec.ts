import { Test } from '@nestjs/testing';
import { ModuleMocker } from 'jest-mock';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../app.module';
import { AdminBiModule } from '../admin-bi/admin-bi.module';
import { AnalysisModule } from '../analysis/analysis.module';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';
import { ChurnModule } from '../churn/churn.module';
import { CommentsModule } from '../comments/comments.module';
import { ContextualAnalysisModule } from '../contextual-analysis/contextual-analysis.module';
import { CouponsModule } from '../coupons/coupons.module';
import { CrawlingModule } from '../crawling/crawling.module';
import { DigitalTwinModule } from '../digital-twin/digital-twin.module';
import { FaceVerificationModule } from '../face-verification/face-verification.module';
import { LikesModule } from '../likes/likes.module';
import { MailModule } from '../mail/mail.module';
import { N8nModule } from '../n8n/n8n.module';
import { NotificationModule } from '../notification/notification.module';
import { PostsModule } from '../posts/posts.module';
import { PredictiveRoutineModule } from '../predictive-routine/predictive-routine.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductScanModule } from '../product-scan/product-scan.module';
import { RoutineModule } from '../routine/routine.module';
import { ScraperModule } from '../scraper/scraper.module';
import { SharedModule } from '../shared/shared.module';
import { SignTranslationModule } from '../sign-translation/sign-translation.module';
import { SkinProfileModule } from '../skin-profile/skin-profile.module';
import { StoriesModule } from '../stories/stories.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsersModule } from '../users/users.module';
import { WeatherModule } from '../weather/weather.module';

type ModuleCase = {
  name: string;
  moduleType: new (...args: never[]) => unknown;
};

const moduleMocker = new ModuleMocker(global);

const MODULES: ModuleCase[] = [
  { name: 'AppModule', moduleType: AppModule },
  { name: 'AdminBiModule', moduleType: AdminBiModule },
  { name: 'AnalysisModule', moduleType: AnalysisModule },
  { name: 'AuthModule', moduleType: AuthModule },
  { name: 'ChatModule', moduleType: ChatModule },
  { name: 'ChurnModule', moduleType: ChurnModule },
  { name: 'CommentsModule', moduleType: CommentsModule },
  { name: 'ContextualAnalysisModule', moduleType: ContextualAnalysisModule },
  { name: 'CouponsModule', moduleType: CouponsModule },
  { name: 'CrawlingModule', moduleType: CrawlingModule },
  { name: 'DigitalTwinModule', moduleType: DigitalTwinModule },
  { name: 'FaceVerificationModule', moduleType: FaceVerificationModule },
  { name: 'LikesModule', moduleType: LikesModule },
  { name: 'MailModule', moduleType: MailModule },
  { name: 'N8nModule', moduleType: N8nModule },
  { name: 'NotificationModule', moduleType: NotificationModule },
  { name: 'PostsModule', moduleType: PostsModule },
  { name: 'PredictiveRoutineModule', moduleType: PredictiveRoutineModule },
  { name: 'PrismaModule', moduleType: PrismaModule },
  { name: 'ProductScanModule', moduleType: ProductScanModule },
  { name: 'RoutineModule', moduleType: RoutineModule },
  { name: 'ScraperModule', moduleType: ScraperModule },
  { name: 'SharedModule', moduleType: SharedModule },
  { name: 'SignTranslationModule', moduleType: SignTranslationModule },
  { name: 'SkinProfileModule', moduleType: SkinProfileModule },
  { name: 'StoriesModule', moduleType: StoriesModule },
  { name: 'SubscriptionModule', moduleType: SubscriptionModule },
  { name: 'SupabaseModule', moduleType: SupabaseModule },
  { name: 'UsersModule', moduleType: UsersModule },
  { name: 'WeatherModule', moduleType: WeatherModule },
];

describe('NestJS modules', () => {
  it.each(MODULES)('compiles %s', async ({ moduleType }) => {
    const moduleRef = await Test.createTestingModule({
      imports: [moduleType],
    })
      .useMocker((token) => {
        if (token === ConfigService) {
          return {
            get: jest.fn((_key: string, defaultValue?: unknown) => defaultValue ?? 'test'),
          };
        }

        if (typeof token === 'function') {
          const metadata = moduleMocker.getMetadata(token);
          if (!metadata) {
            return {};
          }
          const Mock = moduleMocker.generateFromMetadata(metadata);
          return new Mock();
        }

        return {};
      })
      .compile();

    expect(moduleRef).toBeDefined();
  });
});
