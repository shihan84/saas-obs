const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { getCustomerPaymentMethods, attachPaymentMethod, detachPaymentMethod, createSetupIntent } = require('../services/stripe');

const router = express.Router();
const prisma = new PrismaClient();

// Get payment methods
router.get('/payment-methods', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { stripeCustomerId: true }
    });

    if (!user.stripeCustomerId) {
      return res.json({ paymentMethods: [] });
    }

    const paymentMethods = await getCustomerPaymentMethods(user.stripeCustomerId);
    
    res.json({ paymentMethods });
  } catch (error) {
    next(error);
  }
});

// Add payment method
router.post('/payment-methods', async (req, res, next) => {
  try {
    const { paymentMethodId } = req.body;

    if (!paymentMethodId) {
      return res.status(400).json({ error: 'Payment method ID is required' });
    }

    let user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { stripeCustomerId: true }
    });

    if (!user.stripeCustomerId) {
      return res.status(400).json({ error: 'No Stripe customer found' });
    }

    const paymentMethod = await attachPaymentMethod(paymentMethodId, user.stripeCustomerId);

    res.json({
      message: 'Payment method added successfully',
      paymentMethod
    });
  } catch (error) {
    next(error);
  }
});

// Remove payment method
router.delete('/payment-methods/:paymentMethodId', async (req, res, next) => {
  try {
    const { paymentMethodId } = req.params;

    await detachPaymentMethod(paymentMethodId);

    res.json({
      message: 'Payment method removed successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Create setup intent for adding payment methods
router.post('/setup-intent', async (req, res, next) => {
  try {
    let user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { stripeCustomerId: true }
    });

    if (!user.stripeCustomerId) {
      return res.status(400).json({ error: 'No Stripe customer found' });
    }

    const setupIntent = await createSetupIntent(user.stripeCustomerId);

    res.json({
      clientSecret: setupIntent.client_secret
    });
  } catch (error) {
    next(error);
  }
});

// Get billing history
router.get('/history', async (req, res, next) => {
  try {
    const billingEvents = await prisma.billingEvent.findMany({
      where: {
        subscription: {
          userId: req.user.id
        }
      },
      include: {
        subscription: {
          include: {
            plan: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ billingEvents });
  } catch (error) {
    next(error);
  }
});

// Get upcoming invoice
router.get('/upcoming-invoice', async (req, res, next) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: req.user.id,
        status: { in: ['ACTIVE', 'TRIALING'] }
      },
      include: { plan: true }
    });

    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    // In a real implementation, you would fetch the upcoming invoice from Stripe
    const upcomingInvoice = {
      amount: subscription.plan.price,
      currency: subscription.plan.currency,
      nextBillingDate: subscription.currentPeriodEnd,
      plan: subscription.plan
    };

    res.json({ upcomingInvoice });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 