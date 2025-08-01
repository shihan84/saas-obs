const express = require('express');
const Joi = require('joi');
const { PrismaClient } = require('@prisma/client');
const { requireSubscription, rateLimitByPlan } = require('../middleware/auth');
const { spawnInstance, stopInstance, getInstanceStatus } = require('../services/instanceManager');

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const createInstanceSchema = Joi.object({
  name: Joi.string().required().min(1).max(100),
  description: Joi.string().optional().max(500),
  config: Joi.object().optional()
});

// Get all instances for user
router.get('/', async (req, res, next) => {
  try {
    const instances = await prisma.instance.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });

    // Get real-time status for each instance
    const instancesWithStatus = await Promise.all(
      instances.map(async (instance) => {
        try {
          const status = await getInstanceStatus(instance.id);
          return { ...instance, realStatus: status };
        } catch (error) {
          return { ...instance, realStatus: 'ERROR' };
        }
      })
    );

    res.json({ instances: instancesWithStatus });
  } catch (error) {
    next(error);
  }
});

// Get single instance
router.get('/:id', async (req, res, next) => {
  try {
    const instance = await prisma.instance.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    // Get real-time status
    try {
      const status = await getInstanceStatus(instance.id);
      instance.realStatus = status;
    } catch (error) {
      instance.realStatus = 'ERROR';
    }

    res.json({ instance });
  } catch (error) {
    next(error);
  }
});

// Create new instance
router.post('/', requireSubscription, rateLimitByPlan, async (req, res, next) => {
  try {
    const { error, value } = createInstanceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, description, config } = value;

    // Check instance limits based on subscription
    const subscription = req.subscription;
    const plan = subscription.plan;
    const limits = plan.limits;

    const currentInstanceCount = await prisma.instance.count({
      where: { userId: req.user.id }
    });

    if (currentInstanceCount >= limits.maxInstances) {
      return res.status(403).json({ 
        error: `Plan limit reached. Maximum ${limits.maxInstances} instances allowed.` 
      });
    }

    // Find available port
    const usedPorts = await prisma.instance.findMany({
      select: { port: true }
    });
    
    const usedPortSet = new Set(usedPorts.map(i => i.port));
    let port = 5656;
    while (usedPortSet.has(port)) {
      port++;
    }

    // Create instance in database
    const instance = await prisma.instance.create({
      data: {
        name,
        description,
        port,
        status: 'STOPPED',
        config: config || {},
        userId: req.user.id,
        organizationId: req.user.organizationId
      }
    });

    // Log usage
    await prisma.usageLog.create({
      data: {
        type: 'INSTANCE_HOURS',
        value: 0,
        userId: req.user.id,
        organizationId: req.user.organizationId
      }
    });

    res.status(201).json({
      message: 'Instance created successfully',
      instance
    });
  } catch (error) {
    next(error);
  }
});

// Start instance
router.post('/:id/start', async (req, res, next) => {
  try {
    const instance = await prisma.instance.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    if (instance.status === 'RUNNING') {
      return res.status(400).json({ error: 'Instance is already running' });
    }

    // Update status to starting
    await prisma.instance.update({
      where: { id: instance.id },
      data: { status: 'STARTING' }
    });

    // Start the instance
    try {
      await spawnInstance(instance);
      
      // Update status to running
      await prisma.instance.update({
        where: { id: instance.id },
        data: { status: 'RUNNING' }
      });

      res.json({
        message: 'Instance started successfully',
        instance: { ...instance, status: 'RUNNING' }
      });
    } catch (error) {
      // Update status to error
      await prisma.instance.update({
        where: { id: instance.id },
        data: { status: 'ERROR' }
      });

      throw error;
    }
  } catch (error) {
    next(error);
  }
});

// Stop instance
router.post('/:id/stop', async (req, res, next) => {
  try {
    const instance = await prisma.instance.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    if (instance.status === 'STOPPED') {
      return res.status(400).json({ error: 'Instance is already stopped' });
    }

    // Update status to stopping
    await prisma.instance.update({
      where: { id: instance.id },
      data: { status: 'STOPPING' }
    });

    // Stop the instance
    try {
      await stopInstance(instance.id);
      
      // Update status to stopped
      await prisma.instance.update({
        where: { id: instance.id },
        data: { status: 'STOPPED' }
      });

      res.json({
        message: 'Instance stopped successfully',
        instance: { ...instance, status: 'STOPPED' }
      });
    } catch (error) {
      // Update status to error
      await prisma.instance.update({
        where: { id: instance.id },
        data: { status: 'ERROR' }
      });

      throw error;
    }
  } catch (error) {
    next(error);
  }
});

// Restart instance
router.post('/:id/restart', async (req, res, next) => {
  try {
    const instance = await prisma.instance.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    // Stop first
    if (instance.status !== 'STOPPED') {
      await stopInstance(instance.id);
    }

    // Start again
    await spawnInstance(instance);

    // Update status
    await prisma.instance.update({
      where: { id: instance.id },
      data: { status: 'RUNNING' }
    });

    res.json({
      message: 'Instance restarted successfully',
      instance: { ...instance, status: 'RUNNING' }
    });
  } catch (error) {
    next(error);
  }
});

// Update instance configuration
router.put('/:id', async (req, res, next) => {
  try {
    const { name, description, config } = req.body;

    const instance = await prisma.instance.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const updatedInstance = await prisma.instance.update({
      where: { id: instance.id },
      data: {
        name: name || instance.name,
        description: description !== undefined ? description : instance.description,
        config: config ? { ...instance.config, ...config } : instance.config
      }
    });

    res.json({
      message: 'Instance updated successfully',
      instance: updatedInstance
    });
  } catch (error) {
    next(error);
  }
});

// Delete instance
router.delete('/:id', async (req, res, next) => {
  try {
    const instance = await prisma.instance.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    // Stop instance if running
    if (instance.status === 'RUNNING') {
      try {
        await stopInstance(instance.id);
      } catch (error) {
        console.error('Error stopping instance:', error);
      }
    }

    // Delete from database
    await prisma.instance.delete({
      where: { id: instance.id }
    });

    res.json({
      message: 'Instance deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get instance logs
router.get('/:id/logs', async (req, res, next) => {
  try {
    const instance = await prisma.instance.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    // In a real implementation, you would fetch logs from the instance
    // For now, we'll return a placeholder
    const logs = [
      {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: 'Instance logs would be fetched here'
      }
    ];

    res.json({ logs });
  } catch (error) {
    next(error);
  }
});

// Get instance metrics
router.get('/:id/metrics', async (req, res, next) => {
  try {
    const instance = await prisma.instance.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    // In a real implementation, you would fetch metrics from the instance
    // For now, we'll return placeholder metrics
    const metrics = {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      uptime: instance.status === 'RUNNING' ? Date.now() - instance.createdAt.getTime() : 0,
      requests: Math.floor(Math.random() * 1000)
    };

    res.json({ metrics });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 