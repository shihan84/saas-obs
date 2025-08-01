const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        organization: true,
        subscriptions: {
          where: { status: 'ACTIVE' },
          include: { plan: true }
        }
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

const requireSubscription = (requiredPlan = null) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const activeSubscription = req.user.subscriptions.find(sub => 
      sub.status === 'ACTIVE' || sub.status === 'TRIALING'
    );

    if (!activeSubscription) {
      return res.status(403).json({ error: 'Active subscription required' });
    }

    if (requiredPlan && activeSubscription.plan.slug !== requiredPlan) {
      return res.status(403).json({ error: `Plan ${requiredPlan} required` });
    }

    req.subscription = activeSubscription;
    next();
  };
};

const rateLimitByPlan = (req, res, next) => {
  const subscription = req.subscription;
  if (!subscription) {
    return res.status(403).json({ error: 'Active subscription required' });
  }

  const limits = subscription.plan.limits;
  const currentUsage = req.user.usageLogs?.filter(log => 
    log.type === 'API_CALLS' && 
    new Date(log.timestamp).getMonth() === new Date().getMonth()
  ).reduce((sum, log) => sum + log.value, 0) || 0;

  if (currentUsage >= limits.apiCalls) {
    return res.status(429).json({ error: 'API rate limit exceeded' });
  }

  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  requireSubscription,
  rateLimitByPlan
}; 