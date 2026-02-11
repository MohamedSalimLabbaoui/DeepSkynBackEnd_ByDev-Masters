import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Créer un utilisateur admin
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@deepskyn.com' },
    update: {},
    create: {
      email: 'admin@deepskyn.com',
      name: 'Admin DeepSkyn',
      role: 'admin',
      emailVerified: true,
      onboardingComplete: true,
      preferredLanguage: 'fr',
      settings: {
        theme: 'light',
        notifications: {
          email: true,
          push: true,
        },
      },
    },
  });

  console.log('✅ Admin user created:', adminUser.email);

  // Créer un utilisateur test
  const testUser = await prisma.user.upsert({
    where: { email: 'test@deepskyn.com' },
    update: {},
    create: {
      email: 'test@deepskyn.com',
      name: 'Test User',
      role: 'user',
      emailVerified: true,
      onboardingComplete: true,
      preferredLanguage: 'fr',
      dateOfBirth: new Date('1990-01-15'),
      gender: 'female',
      settings: {
        theme: 'dark',
        notifications: {
          email: true,
          push: false,
        },
      },
    },
  });

  console.log('✅ Test user created:', testUser.email);

  // Créer un profil de peau pour l'utilisateur test
  const skinProfile = await prisma.skinProfile.upsert({
    where: { userId: testUser.id },
    update: {},
    create: {
      userId: testUser.id,
      skinType: 'combination',
      fitzpatrickType: 3,
      concerns: ['acne', 'hyperpigmentation', 'dryness'],
      sensitivities: ['fragrances', 'alcohol'],
      skinAge: 28,
      healthScore: 72,
    },
  });

  console.log('✅ Skin profile created for:', testUser.email);

  // Créer un abonnement gratuit pour l'utilisateur test
  const subscription = await prisma.subscription.upsert({
    where: { userId: testUser.id },
    update: {},
    create: {
      userId: testUser.id,
      plan: 'free',
      status: 'active',
      currency: 'TND',
    },
  });

  console.log('✅ Subscription created for:', testUser.email);

  // Créer une routine de soins pour l'utilisateur test
  const morningRoutine = await prisma.routine.create({
    data: {
      userId: testUser.id,
      name: 'Routine Matinale',
      type: 'AM',
      isAIGenerated: true,
      isActive: true,
      steps: [
        {
          order: 1,
          step: 'Nettoyage',
          product: 'Nettoyant doux moussant',
          duration: '60 seconds',
        },
        {
          order: 2,
          step: 'Tonique',
          product: 'Lotion tonique hydratante',
          duration: '30 seconds',
        },
        {
          order: 3,
          step: 'Sérum',
          product: 'Sérum Vitamine C',
          duration: '30 seconds',
        },
        {
          order: 4,
          step: 'Crème hydratante',
          product: 'Crème jour SPF 30',
          duration: '30 seconds',
        },
      ],
      notes: 'Routine générée par AI basée sur votre profil de peau',
    },
  });

  console.log('✅ Morning routine created');

  // Créer une notification pour l'utilisateur test
  const notification = await prisma.notification.create({
    data: {
      userId: testUser.id,
      title: 'Bienvenue sur DeepSkyn!',
      message:
        'Votre compte a été créé avec succès. Commencez votre analyse de peau dès maintenant.',
      type: 'success',
      isRead: false,
      actionUrl: '/analysis/new',
    },
  });

  console.log('✅ Welcome notification created');

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
