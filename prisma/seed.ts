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

async function main() {
  console.log('🌱 Starting database seeding...\n');

  try {
    const stripePriceMonthly = process.env.STRIPE_PRICE_ID_PREMIUM_MONTHLY ?? null;
    const stripePriceYearly = process.env.STRIPE_PRICE_ID_PREMIUM_YEARLY ?? null;

    // Seed subscription plans (upsert)
    await prisma.subscriptionPlan.upsert({
      where: { code: 'free' },
      update: {
        name: 'Free',
        price: 0,
        currency: 'TND',
        durationDays: -1,
        features: [
          '3 analyses per month',
          '3 AI routines per month',
          'Unlimited manual routines',
          'AI chat limited to 10 messages/day',
          'General guidance',
        ],
        stripePriceId: null,
        isActive: true,
      },
      create: {
        code: 'free',
        name: 'Free',
        price: 0,
        currency: 'TND',
        durationDays: -1,
        features: [
          '3 analyses per month',
          '3 AI routines per month',
          'Unlimited manual routines',
          'AI chat limited to 10 messages/day',
          'General guidance',
        ],
        stripePriceId: null,
        isActive: true,
      },
    });

    await prisma.subscriptionPlan.upsert({
      where: { code: 'premium' },
      update: {
        name: 'Premium Monthly',
        price: 19.99,
        currency: 'TND',
        durationDays: 30,
        features: [
          'Unlimited analyses',
          'AI personalized routines',
          'Unlimited AI chat',
          'Advanced tracking',
          'Product recommendations',
          'Priority support',
        ],
        stripePriceId: stripePriceMonthly,
        isActive: true,
      },
      create: {
        code: 'premium',
        name: 'Premium Monthly',
        price: 19.99,
        currency: 'TND',
        durationDays: 30,
        features: [
          'Unlimited analyses',
          'AI personalized routines',
          'Unlimited AI chat',
          'Advanced tracking',
          'Product recommendations',
          'Priority support',
        ],
        stripePriceId: stripePriceMonthly,
        isActive: true,
      },
    });

    await prisma.subscriptionPlan.upsert({
      where: { code: 'premium_yearly' },
      update: {
        name: 'Premium Yearly',
        price: 199.99,
        currency: 'TND',
        durationDays: 365,
        features: ['All Premium features', '2 months free', 'Early access to new features'],
        stripePriceId: stripePriceYearly,
        isActive: true,
      },
      create: {
        code: 'premium_yearly',
        name: 'Premium Yearly',
        price: 199.99,
        currency: 'TND',
        durationDays: 365,
        features: ['All Premium features', '2 months free', 'Early access to new features'],
        stripePriceId: stripePriceYearly,
        isActive: true,
      },
    });

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
          role: 'user',
          isActive: true,
        },
      });

      console.log(`   ✅ User created with ID: ${user.id}`);
      console.log(`   📧 Email: ${userData.email}`);
      console.log(`   🔑 Password: ${userData.password}`);

      // Create skin profile
      await prisma.skinProfile.create({
        data: {
          userId: user.id,
          skinType: userData.skinType,
          fitzpatrickType: Math.floor(Math.random() * 6) + 1,
          concerns: userData.concerns,
          sensitivities: ['fragrances', 'alcohol'],
          skinAge: Math.floor(Math.random() * 30) + 20,
          healthScore: Math.floor(Math.random() * 40) + 60,
          lastAnalysisAt: new Date(),
        },
      });
      console.log(`   🧴 Skin profile created`);

      // Create subscription
      await prisma.subscription.create({
        data: {
          userId: user.id,
          plan: Math.random() > 0.7 ? 'premium' : 'free',
          status: 'active',
          currency: 'TND',
          autoRenew: true,
        },
      });
      console.log(`   💳 Subscription created`);

      console.log(`\n✨ User ${userData.email} setup completed!\n`);
    }

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📋 Test Users Created:');
    console.log('─'.repeat(70));
    testUsers.forEach((user) => {
      console.log(`📧 ${user.email.padEnd(35)} 🔑 ${user.password}`);
    });
    console.log('─'.repeat(70));
    console.log('\n🌐 API Base URL: http://192.168.1.45:3000');
    console.log('🔗 Login Endpoint: POST /auth/login');
    console.log('📝 Send: {"username": "email@example.com", "password": "..."}\n');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
