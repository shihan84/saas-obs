const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create subscription plans
  const plans = [
    {
      name: 'Starter',
      slug: 'starter',
      description: 'Perfect for small productions and individual creators',
      price: 29.00,
      currency: 'USD',
      interval: 'MONTHLY',
      features: {
        instances: 1,
        templates: 10,
        storage: '5GB',
        support: 'Email',
        apiCalls: 1000,
        customBranding: false,
        whiteLabel: false
      },
      limits: {
        maxInstances: 1,
        maxTemplates: 10,
        storage: 5 * 1024 * 1024 * 1024, // 5GB in bytes
        apiCalls: 1000,
        maxUsers: 1
      },
      stripePriceId: 'price_starter_monthly' // Replace with actual Stripe price ID
    },
    {
      name: 'Professional',
      slug: 'professional',
      description: 'Ideal for growing production companies and teams',
      price: 99.00,
      currency: 'USD',
      interval: 'MONTHLY',
      features: {
        instances: 5,
        templates: 50,
        storage: '25GB',
        support: 'Priority',
        apiCalls: 10000,
        customBranding: true,
        whiteLabel: false
      },
      limits: {
        maxInstances: 5,
        maxTemplates: 50,
        storage: 25 * 1024 * 1024 * 1024, // 25GB in bytes
        apiCalls: 10000,
        maxUsers: 5
      },
      stripePriceId: 'price_professional_monthly' // Replace with actual Stripe price ID
    },
    {
      name: 'Enterprise',
      slug: 'enterprise',
      description: 'For large organizations with unlimited needs',
      price: 299.00,
      currency: 'USD',
      interval: 'MONTHLY',
      features: {
        instances: 'Unlimited',
        templates: 'Unlimited',
        storage: '100GB',
        support: '24/7',
        apiCalls: 'Unlimited',
        customBranding: true,
        whiteLabel: true
      },
      limits: {
        maxInstances: -1, // Unlimited
        maxTemplates: -1, // Unlimited
        storage: 100 * 1024 * 1024 * 1024, // 100GB in bytes
        apiCalls: -1, // Unlimited
        maxUsers: -1 // Unlimited
      },
      stripePriceId: 'price_enterprise_monthly' // Replace with actual Stripe price ID
    }
  ];

  console.log('📋 Creating subscription plans...');
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan
    });
  }

  // Create yearly plans
  const yearlyPlans = [
    {
      name: 'Starter (Yearly)',
      slug: 'starter-yearly',
      description: 'Perfect for small productions and individual creators - Save 20%',
      price: 279.00, // 29 * 12 * 0.8 (20% discount)
      currency: 'USD',
      interval: 'YEARLY',
      features: {
        instances: 1,
        templates: 10,
        storage: '5GB',
        support: 'Email',
        apiCalls: 1000,
        customBranding: false,
        whiteLabel: false
      },
      limits: {
        maxInstances: 1,
        maxTemplates: 10,
        storage: 5 * 1024 * 1024 * 1024,
        apiCalls: 1000,
        maxUsers: 1
      },
      stripePriceId: 'price_starter_yearly'
    },
    {
      name: 'Professional (Yearly)',
      slug: 'professional-yearly',
      description: 'Ideal for growing production companies and teams - Save 20%',
      price: 949.00, // 99 * 12 * 0.8 (20% discount)
      currency: 'USD',
      interval: 'YEARLY',
      features: {
        instances: 5,
        templates: 50,
        storage: '25GB',
        support: 'Priority',
        apiCalls: 10000,
        customBranding: true,
        whiteLabel: false
      },
      limits: {
        maxInstances: 5,
        maxTemplates: 50,
        storage: 25 * 1024 * 1024 * 1024,
        apiCalls: 10000,
        maxUsers: 5
      },
      stripePriceId: 'price_professional_yearly'
    },
    {
      name: 'Enterprise (Yearly)',
      slug: 'enterprise-yearly',
      description: 'For large organizations with unlimited needs - Save 20%',
      price: 2869.00, // 299 * 12 * 0.8 (20% discount)
      currency: 'USD',
      interval: 'YEARLY',
      features: {
        instances: 'Unlimited',
        templates: 'Unlimited',
        storage: '100GB',
        support: '24/7',
        apiCalls: 'Unlimited',
        customBranding: true,
        whiteLabel: true
      },
      limits: {
        maxInstances: -1,
        maxTemplates: -1,
        storage: 100 * 1024 * 1024 * 1024,
        apiCalls: -1,
        maxUsers: -1
      },
      stripePriceId: 'price_enterprise_yearly'
    }
  ];

  console.log('📅 Creating yearly subscription plans...');
  for (const plan of yearlyPlans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan
    });
  }

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 