const express = require('express');
const Joi = require('joi');
const { PrismaClient } = require('@prisma/client');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(1).max(50),
  lastName: Joi.string().min(1).max(50),
  email: Joi.string().email()
});

// Get user profile
router.get('/profile', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        organization: true,
        subscriptions: {
          where: { status: { in: ['ACTIVE', 'TRIALING'] } },
          include: { plan: true }
        }
      }
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt
      },
      organization: user.organization,
      subscription: user.subscriptions[0] || null
    });
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put('/profile', async (req, res, next) => {
  try {
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { firstName, lastName, email } = value;

    // Check if email is already taken by another user
    if (email && email !== req.user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return res.status(409).json({ error: 'Email already taken' });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        firstName: firstName || req.user.firstName,
        lastName: lastName || req.user.lastName,
        email: email || req.user.email
      }
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get organization users (admin only)
router.get('/organization', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { organizationId: req.user.organizationId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ users });
  } catch (error) {
    next(error);
  }
});

// Invite user to organization (admin only)
router.post('/invite', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { email, firstName, lastName, role = 'USER' } = req.body;

    if (!email || !firstName || !lastName) {
      return res.status(400).json({ error: 'Email, first name, and last name are required' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Create invitation token
    const invitationToken = require('crypto').randomBytes(32).toString('hex');

    // In a real implementation, you would store the invitation in the database
    // and send an email with the invitation link

    res.json({
      message: 'Invitation sent successfully',
      invitationToken
    });
  } catch (error) {
    next(error);
  }
});

// Update user role (admin only)
router.put('/:userId/role', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { role } = req.body;

    if (!['ADMIN', 'USER', 'VIEWER'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await prisma.user.findFirst({
      where: {
        id: req.params.userId,
        organizationId: req.user.organizationId
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { role }
    });

    res.json({
      message: 'User role updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role
      }
    });
  } catch (error) {
    next(error);
  }
});

// Deactivate user (admin only)
router.put('/:userId/deactivate', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        id: req.params.userId,
        organizationId: req.user.organizationId
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot deactivate yourself' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false }
    });

    res.json({
      message: 'User deactivated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        isActive: updatedUser.isActive
      }
    });
  } catch (error) {
    next(error);
  }
});

// Reactivate user (admin only)
router.put('/:userId/reactivate', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        id: req.params.userId,
        organizationId: req.user.organizationId
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { isActive: true }
    });

    res.json({
      message: 'User reactivated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        isActive: updatedUser.isActive
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get user API keys
router.get('/api-keys', async (req, res, next) => {
  try {
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ apiKeys });
  } catch (error) {
    next(error);
  }
});

// Create API key
router.post('/api-keys', async (req, res, next) => {
  try {
    const { name, permissions } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'API key name is required' });
    }

    const key = require('crypto').randomBytes(32).toString('hex');

    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        key,
        permissions: permissions || ['read'],
        userId: req.user.id,
        organizationId: req.user.organizationId
      }
    });

    res.status(201).json({
      message: 'API key created successfully',
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        key: apiKey.key, // Only show the key once
        permissions: apiKey.permissions,
        createdAt: apiKey.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
});

// Delete API key
router.delete('/api-keys/:keyId', async (req, res, next) => {
  try {
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: req.params.keyId,
        userId: req.user.id
      }
    });

    if (!apiKey) {
      return res.status(404).json({ error: 'API key not found' });
    }

    await prisma.apiKey.delete({
      where: { id: apiKey.id }
    });

    res.json({ message: 'API key deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 