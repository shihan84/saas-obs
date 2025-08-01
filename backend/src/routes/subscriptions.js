const express = require('express');
const Joi = require('joi');
const { PrismaClient } = require('@prisma/client');
const { requireSubscription } = require('../middleware/auth');
const { createStripeCustomer, createStripeSubscription } = require('../services/stripe');

const router = express.Router();
const prisma = new PrismaClient();

// Get available plans
router.get('/plans', async (req, res, next) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' }
    });

    res.json({ plans });
  } catch (error) {
    next(error);
  }
});

// Get current subscription
router.get('/current', async (req, res, next) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: req.user.id,
        status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] }
      },
      include: {
        plan: true
      }
    });

    res.json({ subscription });
  } catch (error) {
    next(error);
  }
});

// Subscribe to a plan
router.post('/subscribe', async (req, res, next) => {
  try {
    const { planId, paymentMethodId } = req.body;

    if (!planId || !paymentMethodId) {
      return res.status(400).json({ error: 'Plan ID and payment method are required' });
    }

    // Get the plan
    const plan = await prisma.plan.findUnique({
      where: { id: planId }
    });

    if (!plan || !plan.isActive) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Check if user already has an active subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        userId: req.user.id,
        status: { in: ['ACTIVE', 'TRIALING'] }
      }
    });

    if (existingSubscription) {
      return res.status(400).json({ error: 'You already have an active subscription' });
    }

    // Create or get Stripe customer
    let stripeCustomerId = req.user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await createStripeCustomer({
        email: req.user.email,
        name: `${req.user.firstName} ${req.user.lastName}`,
        metadata: {
          userId: req.user.id,
          organizationId: req.user.organizationId
        }
      });
      stripeCustomerId = customer.id;

      // Update user with Stripe customer ID
      await prisma.user.update({
        where: { id: req.user.id },
        data: { stripeCustomerId }
      });
    }

    // Create Stripe subscription
    const stripeSubscription = await createStripeSubscription({
      customerId: stripeCustomerId,
      priceId: plan.stripePriceId,
      paymentMethodId
    });

    // Create subscription in database
    const subscription = await prisma.subscription.create({
      data: {
        status: 'ACTIVE',
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId,
        stripePriceId: plan.stripePriceId,
        userId: req.user.id,
        planId: plan.id,
        organizationId: req.user.organizationId
      },
      include: {
        plan: true
      }
    });

    res.status(201).json({
      message: 'Subscription created successfully',
      subscription
    });
  } catch (error) {
    next(error);
  }
});

// Cancel subscription
router.post('/cancel', requireSubscription, async (req, res, next) => {
  try {
    const { cancelAtPeriodEnd = true } = req.body;

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: req.user.id,
        status: { in: ['ACTIVE', 'TRIALING'] }
      }
    });

    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    // Cancel in Stripe
    if (subscription.stripeSubscriptionId) {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      
      if (cancelAtPeriodEnd) {
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          cancel_at_period_end: true
        });
      } else {
        await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
      }
    }

    // Update subscription in database
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd,
        canceledAt: cancelAtPeriodEnd ? null : new Date(),
        status: cancelAtPeriodEnd ? 'ACTIVE' : 'CANCELED'
      },
      include: {
        plan: true
      }
    });

    res.json({
      message: cancelAtPeriodEnd 
        ? 'Subscription will be canceled at the end of the current period'
        : 'Subscription canceled immediately',
      subscription: updatedSubscription
    });
  } catch (error) {
    next(error);
  }
});

// Reactivate subscription
router.post('/reactivate', async (req, res, next) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: req.user.id,
        status: 'CANCELED'
      }
    });

    if (!subscription) {
      return res.status(404).json({ error: 'No canceled subscription found' });
    }

    // Reactivate in Stripe
    if (subscription.stripeSubscriptionId) {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: false
      });
    }

    // Update subscription in database
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: false,
        canceledAt: null,
        status: 'ACTIVE'
      },
      include: {
        plan: true
      }
    });

    res.json({
      message: 'Subscription reactivated successfully',
      subscription: updatedSubscription
    });
  } catch (error) {
    next(error);
  }
});

// Upgrade/downgrade subscription
router.post('/change-plan', requireSubscription, async (req, res, next) => {
  try {
    const { newPlanId } = req.body;

    if (!newPlanId) {
      return res.status(400).json({ error: 'New plan ID is required' });
    }

    const newPlan = await prisma.plan.findUnique({
      where: { id: newPlanId }
    });

    if (!newPlan || !newPlan.isActive) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const currentSubscription = await prisma.subscription.findFirst({
      where: {
        userId: req.user.id,
        status: { in: ['ACTIVE', 'TRIALING'] }
      },
      include: { plan: true }
    });

    if (!currentSubscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    // Update in Stripe
    if (currentSubscription.stripeSubscriptionId) {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      await stripe.subscriptions.update(currentSubscription.stripeSubscriptionId, {
        items: [{
          id: currentSubscription.stripePriceId,
          price: newPlan.stripePriceId,
        }],
        proration_behavior: 'create_prorations'
      });
    }

    // Update subscription in database
    const updatedSubscription = await prisma.subscription.update({
      where: { id: currentSubscription.id },
      data: {
        planId: newPlan.id,
        stripePriceId: newPlan.stripePriceId
      },
      include: {
        plan: true
      }
    });

    res.json({
      message: 'Plan changed successfully',
      subscription: updatedSubscription
    });
  } catch (error) {
    next(error);
  }
});

// Get subscription usage
router.get('/usage', requireSubscription, async (req, res, next) => {
  try {
    const subscription = req.subscription;
    const plan = subscription.plan;

    // Get current month usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const usage = await prisma.usageLog.groupBy({
      by: ['type'],
      where: {
        userId: req.user.id,
        timestamp: {
          gte: startOfMonth
        }
      },
      _sum: {
        value: true
      }
    });

    const usageMap = {};
    usage.forEach(item => {
      usageMap[item.type] = item._sum.value || 0;
    });

    res.json({
      subscription,
      plan,
      usage: usageMap,
      limits: plan.limits
    });
  } catch (error) {
    next(error);
  }
});

// Get subscription history
router.get('/history', async (req, res, next) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId: req.user.id },
      include: {
        plan: true,
        billingEvents: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ subscriptions });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 