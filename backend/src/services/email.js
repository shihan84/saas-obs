const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Send welcome email
const sendWelcomeEmail = async (email, firstName) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"SPX-GC SaaS" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Welcome to SPX-GC SaaS Platform!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Welcome to SPX-GC SaaS!</h1>
          <p>Hi ${firstName},</p>
          <p>Thank you for signing up for SPX-GC SaaS Platform. We're excited to have you on board!</p>
          
          <h2 style="color: #666;">Getting Started</h2>
          <ul>
            <li>Create your first SPX-GC instance</li>
            <li>Upload your graphics templates</li>
            <li>Configure your live production setup</li>
            <li>Integrate with OBS, vMix, or CasparCG</li>
          </ul>
          
          <h2 style="color: #666;">Your Trial</h2>
          <p>You're currently on a 14-day free trial. During this time, you can:</p>
          <ul>
            <li>Create up to 1 SPX-GC instance</li>
            <li>Use up to 10 templates</li>
            <li>Access 5GB of storage</li>
            <li>Make up to 1,000 API calls per month</li>
          </ul>
          
          <p>If you have any questions, feel free to reach out to our support team.</p>
          
          <p>Best regards,<br>The SPX-GC Team</p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${email}`);
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const transporter = createTransporter();
    
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: `"SPX-GC SaaS" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Reset Your Password - SPX-GC SaaS',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Reset Your Password</h1>
          <p>You requested a password reset for your SPX-GC SaaS account.</p>
          
          <p>Click the button below to reset your password:</p>
          
          <a href="${resetUrl}" 
             style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">
            Reset Password
          </a>
          
          <p>This link will expire in 1 hour for security reasons.</p>
          
          <p>If you didn't request this password reset, please ignore this email.</p>
          
          <p>Best regards,<br>The SPX-GC Team</p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

// Send subscription confirmation email
const sendSubscriptionConfirmationEmail = async (email, firstName, planName, amount) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"SPX-GC SaaS" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Subscription Confirmed - SPX-GC SaaS',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Subscription Confirmed!</h1>
          <p>Hi ${firstName},</p>
          <p>Your subscription to the <strong>${planName}</strong> plan has been confirmed.</p>
          
          <h2 style="color: #666;">Subscription Details</h2>
          <ul>
            <li><strong>Plan:</strong> ${planName}</li>
            <li><strong>Amount:</strong> $${amount}/month</li>
            <li><strong>Next billing date:</strong> ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</li>
          </ul>
          
          <p>You now have access to all the features included in your plan.</p>
          
          <p>If you have any questions about your subscription, please contact our support team.</p>
          
          <p>Best regards,<br>The SPX-GC Team</p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`Subscription confirmation email sent to ${email}`);
  } catch (error) {
    console.error('Error sending subscription confirmation email:', error);
    throw error;
  }
};

// Send subscription cancellation email
const sendSubscriptionCancellationEmail = async (email, firstName, planName, endDate) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"SPX-GC SaaS" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Subscription Cancelled - SPX-GC SaaS',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Subscription Cancelled</h1>
          <p>Hi ${firstName},</p>
          <p>Your subscription to the <strong>${planName}</strong> plan has been cancelled.</p>
          
          <h2 style="color: #666;">Important Information</h2>
          <ul>
            <li><strong>Access until:</strong> ${endDate}</li>
            <li>Your data will be preserved for 30 days after cancellation</li>
            <li>You can reactivate your subscription at any time</li>
          </ul>
          
          <p>We're sorry to see you go! If you change your mind, you can reactivate your subscription from your dashboard.</p>
          
          <p>If you have any questions, please contact our support team.</p>
          
          <p>Best regards,<br>The SPX-GC Team</p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`Subscription cancellation email sent to ${email}`);
  } catch (error) {
    console.error('Error sending subscription cancellation email:', error);
    throw error;
  }
};

// Send usage limit warning email
const sendUsageLimitWarningEmail = async (email, firstName, usageType, currentUsage, limit) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"SPX-GC SaaS" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Usage Limit Warning - SPX-GC SaaS',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #ff6b35;">Usage Limit Warning</h1>
          <p>Hi ${firstName},</p>
          <p>You're approaching your usage limit for <strong>${usageType}</strong>.</p>
          
          <h2 style="color: #666;">Current Usage</h2>
          <ul>
            <li><strong>Current usage:</strong> ${currentUsage}</li>
            <li><strong>Limit:</strong> ${limit}</li>
            <li><strong>Remaining:</strong> ${limit - currentUsage}</li>
          </ul>
          
          <p>Consider upgrading your plan to avoid service interruptions.</p>
          
          <p>If you have any questions, please contact our support team.</p>
          
          <p>Best regards,<br>The SPX-GC Team</p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`Usage limit warning email sent to ${email}`);
  } catch (error) {
    console.error('Error sending usage limit warning email:', error);
    throw error;
  }
};

// Send billing failure email
const sendBillingFailureEmail = async (email, firstName, planName, amount) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"SPX-GC SaaS" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Payment Failed - SPX-GC SaaS',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #dc3545;">Payment Failed</h1>
          <p>Hi ${firstName},</p>
          <p>We were unable to process your payment for the <strong>${planName}</strong> plan.</p>
          
          <h2 style="color: #666;">What you need to do</h2>
          <ul>
            <li>Update your payment method in your account settings</li>
            <li>Ensure your card has sufficient funds</li>
            <li>Check that your card hasn't expired</li>
          </ul>
          
          <p><strong>Amount due:</strong> $${amount}</p>
          
          <p>Your service will continue for a few more days, but please update your payment method to avoid any interruptions.</p>
          
          <p>If you need help, please contact our support team.</p>
          
          <p>Best regards,<br>The SPX-GC Team</p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`Billing failure email sent to ${email}`);
  } catch (error) {
    console.error('Error sending billing failure email:', error);
    throw error;
  }
};

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendSubscriptionConfirmationEmail,
  sendSubscriptionCancellationEmail,
  sendUsageLimitWarningEmail,
  sendBillingFailureEmail
}; 