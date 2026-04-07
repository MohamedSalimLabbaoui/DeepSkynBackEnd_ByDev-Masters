import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Helper to hash passwords
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

interface UserSeedData {
  email: string;
  password: string;
  name: string;
  skinType: 'dry' | 'oily' | 'combination' | 'normal' | 'sensitive';
  concerns: string[];
}

const testUsers: UserSeedData[] = [
  {
    email: 'john.doe@example.com',
    password: 'Password123!',
    name: 'John Doe',
    skinType: 'combination',
    concerns: ['acne', 'oiliness'],
  },
  {
    email: 'marie.smith@example.com',
    password: 'SecurePass456!',
    name: 'Marie Smith',
    skinType: 'dry',
    concerns: ['wrinkles', 'dryness', 'sensitivity'],
  },
  {
    email: 'alex.johnson@example.com',
    password: 'TestPassword789!',
    name: 'Alex Johnson',
    skinType: 'oily',
    concerns: ['acne', 'pores', 'shine'],
  },
  {
    email: 'emma.wilson@example.com',
    password: 'Admin12345!',
    name: 'Emma Wilson',
    skinType: 'sensitive',
    concerns: ['redness', 'irritation', 'sensitivity'],
  },
  {
    email: 'demo@deepskyn.com',
    password: 'Demo12345!',
    name: 'Demo User',
    skinType: 'normal',
    concerns: ['maintenance', 'prevention'],
  },
];

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🗑️  Clearing existing data...');
    await prisma.comment.deleteMany({});
    await prisma.like.deleteMany({});
    await prisma.post.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.chatHistory.deleteMany({});
    await prisma.routine.deleteMany({});
    await prisma.analysis.deleteMany({});
    await prisma.subscription.deleteMany({});
    await prisma.skinProfile.deleteMany({});
    await prisma.user.deleteMany({});
    console.log('✅ Data cleared\n');

    // Create users with related data
    for (const userData of testUsers) {
      console.log(`👤 Creating user: ${userData.email}`);

      const hashedPassword = await hashPassword(userData.password);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          name: userData.name,
          emailVerified: true,
          onboardingComplete: true,
          preferredLanguage: 'fr',
          gender: Math.random() > 0.5 ? 'male' : 'female',
          dateOfBirth: new Date('1990-01-15'),
          address: `${Math.floor(Math.random() * 1000)} Rue de la Peau`,
          city: 'Tunis',
          zipCode: '1000',
          country: 'Tunisia',
          latitude: 36.8065,
          longitude: 10.1815,
          role: 'user',
          isActive: true,
          interactionCount: Math.floor(Math.random() * 50),
          sessionCount: Math.floor(Math.random() * 20),
          churnRiskScore: Math.random(),
          churnRiskLevel:
            Math.random() > 0.7 ? 'low' : Math.random() > 0.4 ? 'medium' : 'high',
          lastActivity: new Date(),
        },
      });

      console.log(`  ✅ User created with ID: ${user.id}`);
      console.log(`     📧 Email: ${userData.email}`);
      console.log(`     🔑 Password: ${userData.password}`);

      // Create skin profile
      const skinProfile = await prisma.skinProfile.create({
        data: {
          userId: user.id,
          skinType: userData.skinType,
          fitzpatrickType: Math.floor(Math.random() * 6) + 1,
          concerns: userData.concerns,
          sensitivities: ['fragrances', 'alcohol'].slice(
            0,
            Math.random() > 0.5 ? 1 : 0,
          ),
          skinAge: Math.floor(Math.random() * 30) + 20,
          healthScore: Math.floor(Math.random() * 40) + 60,
          lastAnalysisAt: new Date(),
        },
      });
      console.log(`  🧴 Skin profile created`);

      // Create analysis
      const analysis = await prisma.analysis.create({
        data: {
          userId: user.id,
          images: [
            'https://example.com/skin-analysis-1.jpg',
            'https://example.com/skin-analysis-2.jpg',
          ],
          questionnaire: {
            fitzpatrickType: skinProfile.fitzpatrickType,
            skinType: userData.skinType,
          },
          results: {
            primaryConditions: userData.concerns,
            severity: 'moderate',
            recommendations: [
              'Use gentle cleanser twice daily',
              'Apply SPF 30+ daily',
              'Use moisturizer suited to your skin type',
            ],
          },
          healthScore: skinProfile.healthScore,
          skinAge: skinProfile.skinAge,
          conditions: userData.concerns,
          recommendations: {
            morningRoutine: ['Cleanser', 'Toner', 'Serum', 'Moisturizer', 'SPF'],
            eveningRoutine: ['Cleanser', 'Toner', 'Serum', 'Night Cream'],
          },
          status: 'completed',
          processingTime: Math.floor(Math.random() * 5000) + 1000,
        },
      });
      console.log(`  📊 Analysis created`);

      // Create routines
      const routineAM = await prisma.routine.create({
        data: {
          userId: user.id,
          name: 'Morning Skincare Routine',
          type: 'AM',
          steps: {
            morning: [
              { order: 1, product: 'Gentle Cleanser', duration: 2 },
              { order: 2, product: 'Hydrating Toner', duration: 1 },
              { order: 3, product: 'Vitamin C Serum', duration: 2 },
              {
                order: 4,
                product: 'Lightweight Moisturizer',
                duration: 2,
              },
              { order: 5, product: 'SPF 50 Sunscreen', duration: 2 },
            ],
          },
          ingredients: [
            'Vitamin C',
            'Hyaluronic Acid',
            'Niacinamide',
            'SPF',
          ],
          frequency: 'daily',
          estimatedTime: 10,
          isAIGenerated: true,
          isActive: true,
          notes: 'AI-generated based on skin profile',
        },
      });

      const routinePM = await prisma.routine.create({
        data: {
          userId: user.id,
          name: 'Evening Skincare Routine',
          type: 'PM',
          steps: {
            evening: [
              { order: 1, product: 'Makeup Remover', duration: 3 },
              { order: 2, product: 'Gentle Cleanser', duration: 2 },
              { order: 3, product: 'Hydrating Toner', duration: 1 },
              { order: 4, product: 'Retinol Serum', duration: 2 },
              { order: 5, product: 'Rich Night Cream', duration: 2 },
            ],
          },
          ingredients: ['Retinol', 'Hyaluronic Acid', 'Peptides', 'Ceramides'],
          frequency: 'daily',
          estimatedTime: 12,
          isAIGenerated: true,
          isActive: true,
          notes: 'AI-generated evening routine',
        },
      });
      console.log(`  🧖 Routines created (AM & PM)`);

      // Create subscription
      const subscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          plan:
            Math.random() > 0.7
              ? 'premium'
              : Math.random() > 0.4
                ? 'premium_yearly'
                : 'free',
          status: 'active',
          amount: Math.random() > 0.7 ? 4.99 : Math.random() > 0.4 ? 49.99 : 0,
          currency: 'TND',
          paymentMethod: Math.random() > 0.5 ? 'stripe' : 'paypal',
          autoRenew: true,
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        },
      });
      console.log(`  💳 Subscription created (${subscription.plan})`);

      // Create a sample post
      const post = await prisma.post.create({
        data: {
          userId: user.id,
          message: `Loving my new skincare routine! 🧴✨ My skin has never been better. #DeepSkyn #SkincareJourney #GlowUp`,
          media: 'https://example.com/skin-glow-photo.jpg',
        },
      });
      console.log(`  📸 Post created`);

      // Create likes on the post (from other users if available)
      if (testUsers.indexOf(userData) > 0) {
        const firstUser = await prisma.user.findFirst({
          where: { email: testUsers[0].email },
        });
        if (firstUser) {
          await prisma.like.create({
            data: {
              userId: firstUser.id,
              postId: post.id,
            },
          });
        }
      }

      // Create comments on the post
      if (testUsers.indexOf(userData) > 0) {
        const commenterUser = await prisma.user.findFirst({
          where: { email: testUsers[0].email },
        });
        if (commenterUser) {
          await prisma.comment.create({
            data: {
              userId: commenterUser.id,
              postId: post.id,
              comment:
                'This is amazing! Your skin looks so radiant! What products are you using?',
            },
          });
        }
      }

      // Create notifications
      const notifications = [
        {
          title: 'Welcome to DeepSkyn!',
          message: 'Your skin analysis is ready. Check your results now.',
          type: 'info',
        },
        {
          title: 'Daily Reminder',
          message:
            "Don't forget your evening skincare routine! 🧴✨",
          type: 'reminder',
        },
        {
          title: 'New AI Analysis',
          message:
            'Your weekly skin check is available. See how your skin has improved!',
          type: 'success',
        },
      ];

      for (const notif of notifications) {
        await prisma.notification.create({
          data: {
            userId: user.id,
            title: notif.title,
            message: notif.message,
            type: notif.type,
            isRead: Math.random() > 0.6,
          },
        });
      }
      console.log(`  🔔 Notifications created (3)`);

      // Create chat history
      await prisma.chatHistory.create({
        data: {
          userId: user.id,
          message: 'What should I do about my acne?',
          modelUsed: 'Gemini 2.5 Flash',
          assistantResponse:
            'Based on your skin profile, I recommend a gentle cleanser with salicylic acid, followed by a lightweight moisturizer with niacinamide. Also, use SPF 30+ daily.',
          context: {
            skinType: userData.skinType,
            concerns: userData.concerns,
          },
          isPremium: subscription.plan !== 'free',
        },
      });
      console.log(`  💬 Chat history created`);

      console.log(`\n✨ User ${userData.email} setup completed!\n`);
    }

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📋 Test Users Created:');
    console.log('─'.repeat(60));
    testUsers.forEach((user) => {
      console.log(`📧 ${user.email}`);
      console.log(`   🔑 Password: ${user.password}`);
      console.log(`   👤 Name: ${user.name}`);
      console.log('─'.repeat(60));
    });
    console.log('\n🌐 API Base URL: http://192.168.1.45:3000');
    console.log('🔗 Login Endpoint: POST /auth/login');
    console.log('📱 Use these credentials in the mobile app to test authentication\n');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeding
seedDatabase();
