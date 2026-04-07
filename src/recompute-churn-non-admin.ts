import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { ChurnService } from './churn/churn.service';

const EXCLUDED_ROLES = [
  'admin',
  'ADMIN',
  'realm-admin',
  'super_admin',
  'administrator',
];

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const prisma = app.get(PrismaService);
    const churnService = app.get(ChurnService);

    const reset = await prisma.user.updateMany({
      where: {
        role: {
          in: EXCLUDED_ROLES,
        },
      },
      data: {
        churnRiskScore: null,
        churnRiskLevel: null,
        lastChurnAnalysis: null,
      },
    });

    const result = await churnService.analyzeAllUsers();

    console.log('CHURN_RECOMPUTE_DONE');
    console.log(
      JSON.stringify(
        {
          adminUsersReset: reset.count,
          analyzedUsers: result.totalUsers,
          atRiskCount: result.atRiskCount,
          criticalCount: result.criticalCount,
        },
        null,
        2,
      ),
    );
  } finally {
    await app.close();
  }
}

run().catch((error) => {
  console.error('CHURN_RECOMPUTE_FAILED');
  console.error(error);
  process.exit(1);
});
