const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Get usage analytics
router.get('/usage', async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    
    let startDate;
    const now = new Date();
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const usage = await prisma.usageLog.groupBy({
      by: ['type'],
      where: {
        userId: req.user.id,
        timestamp: {
          gte: startDate
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

    res.json({ usage: usageMap, period, startDate });
  } catch (error) {
    next(error);
  }
});

// Get instance analytics
router.get('/instances', async (req, res, next) => {
  try {
    const instances = await prisma.instance.findMany({
      where: { userId: req.user.id },
      include: {
        _count: {
          select: {
            // Add any related counts if needed
          }
        }
      }
    });

    const analytics = {
      total: instances.length,
      running: instances.filter(i => i.status === 'RUNNING').length,
      stopped: instances.filter(i => i.status === 'STOPPED').length,
      error: instances.filter(i => i.status === 'ERROR').length,
      instances: instances.map(instance => ({
        id: instance.id,
        name: instance.name,
        status: instance.status,
        createdAt: instance.createdAt,
        uptime: instance.status === 'RUNNING' 
          ? Date.now() - instance.createdAt.getTime() 
          : 0
      }))
    };

    res.json(analytics);
  } catch (error) {
    next(error);
  }
});

// Get subscription analytics
router.get('/subscription', async (req, res, next) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: req.user.id,
        status: { in: ['ACTIVE', 'TRIALING'] }
      },
      include: { plan: true }
    });

    if (!subscription) {
      return res.json({ subscription: null });
    }

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

    const limits = subscription.plan.limits;
    const analytics = {
      subscription,
      usage: usageMap,
      limits,
      utilization: {
        apiCalls: limits.apiCalls ? (usageMap.API_CALLS || 0) / limits.apiCalls * 100 : 0,
        storage: limits.storage ? (usageMap.STORAGE_USED || 0) / limits.storage * 100 : 0,
        instances: limits.maxInstances ? (usageMap.INSTANCE_HOURS || 0) / limits.maxInstances * 100 : 0
      }
    };

    res.json(analytics);
  } catch (error) {
    next(error);
  }
});

// Get organization analytics (admin only)
router.get('/organization', async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const users = await prisma.user.count({
      where: { organizationId: req.user.organizationId }
    });

    const instances = await prisma.instance.count({
      where: { organizationId: req.user.organizationId }
    });

    const activeInstances = await prisma.instance.count({
      where: { 
        organizationId: req.user.organizationId,
        status: 'RUNNING'
      }
    });

    const totalUsage = await prisma.usageLog.groupBy({
      by: ['type'],
      where: {
        organizationId: req.user.organizationId,
        timestamp: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      },
      _sum: {
        value: true
      }
    });

    const usageMap = {};
    totalUsage.forEach(item => {
      usageMap[item.type] = item._sum.value || 0;
    });

    const analytics = {
      users,
      instances,
      activeInstances,
      usage: usageMap,
      period: 'current_month'
    };

    res.json(analytics);
  } catch (error) {
    next(error);
  }
});

// Get cost analytics
router.get('/costs', async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    
    let startDate;
    const now = new Date();
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const billingEvents = await prisma.billingEvent.findMany({
      where: {
        subscription: {
          userId: req.user.id
        },
        createdAt: {
          gte: startDate
        }
      },
      include: {
        subscription: {
          include: { plan: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const totalCost = billingEvents.reduce((sum, event) => sum + event.amount, 0);
    const paidEvents = billingEvents.filter(event => 
      event.type === 'INVOICE_PAID' || event.type === 'SUBSCRIPTION_CREATED'
    );

    const analytics = {
      totalCost,
      paidAmount: paidEvents.reduce((sum, event) => sum + event.amount, 0),
      events: billingEvents,
      period
    };

    res.json(analytics);
  } catch (error) {
    next(error);
  }
});

// Get performance analytics
router.get('/performance', async (req, res, next) => {
  try {
    const instances = await prisma.instance.findMany({
      where: { userId: req.user.id },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Calculate performance metrics
    const performance = {
      totalInstances: instances.length,
      averageUptime: 0,
      reliability: 0,
      instances: instances.map(instance => {
        const uptime = instance.status === 'RUNNING' 
          ? Date.now() - instance.createdAt.getTime()
          : 0;
        
        return {
          id: instance.id,
          name: instance.name,
          status: instance.status,
          uptime,
          uptimeHours: Math.floor(uptime / (1000 * 60 * 60))
        };
      })
    };

    // Calculate average uptime
    const runningInstances = performance.instances.filter(i => i.status === 'RUNNING');
    if (runningInstances.length > 0) {
      performance.averageUptime = runningInstances.reduce((sum, i) => sum + i.uptimeHours, 0) / runningInstances.length;
    }

    // Calculate reliability (percentage of time instances are running)
    const totalTime = Date.now() - Math.min(...instances.map(i => i.createdAt.getTime()));
    const totalUptime = performance.instances.reduce((sum, i) => sum + i.uptime, 0);
    performance.reliability = totalTime > 0 ? (totalUptime / totalTime) * 100 : 0;

    res.json(performance);
  } catch (error) {
    next(error);
  }
});

module.exports = router; 