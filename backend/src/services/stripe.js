const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create a new Stripe customer
const createStripeCustomer = async (customerData) => {
  try {
    const customer = await stripe.customers.create({
      email: customerData.email,
      name: customerData.name,
      metadata: customerData.metadata
    });

    return customer;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw error;
  }
};

// Create a new Stripe subscription
const createStripeSubscription = async (subscriptionData) => {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: subscriptionData.customerId,
      items: [{ price: subscriptionData.priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      default_payment_method: subscriptionData.paymentMethodId
    });

    return subscription;
  } catch (error) {
    console.error('Error creating Stripe subscription:', error);
    throw error;
  }
};

// Create a payment intent
const createPaymentIntent = async (amount, currency = 'usd', customerId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return paymentIntent;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};

// Create a setup intent for saving payment methods
const createSetupIntent = async (customerId) => {
  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });

    return setupIntent;
  } catch (error) {
    console.error('Error creating setup intent:', error);
    throw error;
  }
};

// Get customer payment methods
const getCustomerPaymentMethods = async (customerId) => {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    return paymentMethods.data;
  } catch (error) {
    console.error('Error getting payment methods:', error);
    throw error;
  }
};

// Attach payment method to customer
const attachPaymentMethod = async (paymentMethodId, customerId) => {
  try {
    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    return paymentMethod;
  } catch (error) {
    console.error('Error attaching payment method:', error);
    throw error;
  }
};

// Detach payment method from customer
const detachPaymentMethod = async (paymentMethodId) => {
  try {
    const paymentMethod = await stripe.paymentMethods.detach(paymentMethodId);
    return paymentMethod;
  } catch (error) {
    console.error('Error detaching payment method:', error);
    throw error;
  }
};

// Get subscription details
const getSubscription = async (subscriptionId) => {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('Error getting subscription:', error);
    throw error;
  }
};

// Update subscription
const updateSubscription = async (subscriptionId, updates) => {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, updates);
    return subscription;
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
};

// Cancel subscription
const cancelSubscription = async (subscriptionId, cancelAtPeriodEnd = true) => {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: cancelAtPeriodEnd,
    });

    return subscription;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
};

// Reactivate subscription
const reactivateSubscription = async (subscriptionId) => {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    return subscription;
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    throw error;
  }
};

// Create invoice
const createInvoice = async (customerId, subscriptionId) => {
  try {
    const invoice = await stripe.invoices.create({
      customer: customerId,
      subscription: subscriptionId,
      auto_advance: true,
    });

    return invoice;
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw error;
  }
};

// Pay invoice
const payInvoice = async (invoiceId, paymentMethodId) => {
  try {
    const invoice = await stripe.invoices.pay(invoiceId, {
      payment_method: paymentMethodId,
    });

    return invoice;
  } catch (error) {
    console.error('Error paying invoice:', error);
    throw error;
  }
};

// Handle webhook events
const handleWebhookEvent = async (event) => {
  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('Error handling webhook event:', error);
    throw error;
  }
};

// Webhook event handlers
const handleSubscriptionCreated = async (subscription) => {
  console.log('Subscription created:', subscription.id);
  // Update subscription status in database
};

const handleSubscriptionUpdated = async (subscription) => {
  console.log('Subscription updated:', subscription.id);
  // Update subscription in database
};

const handleSubscriptionDeleted = async (subscription) => {
  console.log('Subscription deleted:', subscription.id);
  // Update subscription status in database
};

const handleInvoicePaymentSucceeded = async (invoice) => {
  console.log('Invoice payment succeeded:', invoice.id);
  // Update billing status in database
};

const handleInvoicePaymentFailed = async (invoice) => {
  console.log('Invoice payment failed:', invoice.id);
  // Update billing status in database
};

module.exports = {
  createStripeCustomer,
  createStripeSubscription,
  createPaymentIntent,
  createSetupIntent,
  getCustomerPaymentMethods,
  attachPaymentMethod,
  detachPaymentMethod,
  getSubscription,
  updateSubscription,
  cancelSubscription,
  reactivateSubscription,
  createInvoice,
  payInvoice,
  handleWebhookEvent
}; 