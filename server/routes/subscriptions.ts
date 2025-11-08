import type { Express } from 'express';
import { requireAuth } from '../middleware/auth';
import { db } from '../db';
import { subscriptions, users } from '../../shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createSubscriptionSchema = z.object({
  merchantName: z.string().min(1, 'Merchant name is required'),
  planName: z.string().optional(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid number'),
  currency: z.string().default('USD'),
  billingCycle: z.enum(['monthly', 'annual', 'quarterly', 'weekly']),
  category: z.enum([
    'ai_tools',
    'design',
    'video_editing',
    'productivity',
    'analytics',
    'marketing',
    'development',
    'finance',
    'entertainment',
    'education',
    'other'
  ]).optional(),
  firstBillingDate: z.string().optional(),
  nextBillingDate: z.string().optional(),
  trialEndDate: z.string().optional(),
  status: z.enum(['active', 'trial', 'cancelled', 'paused']).default('active'),
  cancellationUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

const updateSubscriptionSchema = z.object({
  merchantName: z.string().min(1).optional(),
  planName: z.string().optional(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  currency: z.string().optional(),
  billingCycle: z.enum(['monthly', 'annual', 'quarterly', 'weekly']).optional(),
  category: z.enum([
    'ai_tools',
    'design',
    'video_editing',
    'productivity',
    'analytics',
    'marketing',
    'development',
    'finance',
    'entertainment',
    'education',
    'other'
  ]).optional(),
  nextBillingDate: z.string().optional(),
  trialEndDate: z.string().optional(),
  status: z.enum(['active', 'trial', 'cancelled', 'paused']).optional(),
  cancelledDate: z.string().optional(),
  accessEndsDate: z.string().optional(),
  cancellationUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

export async function registerSubscriptionsRoutes(app: Express) {
  // ============================================================================
  // SUBSCRIPTION CRUD
  // ============================================================================

  /**
   * GET /api/subscriptions
   * List all subscriptions for the authenticated user
   */
  app.get('/api/subscriptions', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.uid;
    const { status, category } = req.query;

    // Build query with optional filters
    let query = db.select().from(subscriptions).where(eq(subscriptions.userId, userId));

    // Apply status filter
    if (status && typeof status === 'string') {
      query = query.where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, status as any)
        )
      );
    }

    // Apply category filter
    if (category && typeof category === 'string') {
      query = query.where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.category, category as any)
        )
      );
    }

    const userSubscriptions = await query.orderBy(desc(subscriptions.createdAt));

    res.json(userSubscriptions);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

/**
 * GET /api/subscriptions/stats
 * Get subscription statistics (total cost, count by category, etc.)
 */
  app.get('/api/subscriptions/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.uid;

    const userSubscriptions = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, 'active')
        )
      );

    // Calculate total monthly cost
    let totalMonthlyCost = 0;
    let totalAnnualCost = 0;

    for (const sub of userSubscriptions) {
      const amount = parseFloat(sub.amount);

      if (sub.billingCycle === 'monthly') {
        totalMonthlyCost += amount;
        totalAnnualCost += amount * 12;
      } else if (sub.billingCycle === 'annual') {
        totalMonthlyCost += amount / 12;
        totalAnnualCost += amount;
      } else if (sub.billingCycle === 'quarterly') {
        totalMonthlyCost += amount / 3;
        totalAnnualCost += amount * 4;
      } else if (sub.billingCycle === 'weekly') {
        totalMonthlyCost += amount * 4.33; // ~4.33 weeks per month
        totalAnnualCost += amount * 52;
      }
    }

    // Count by category
    const byCategory: Record<string, number> = {};
    for (const sub of userSubscriptions) {
      const cat = sub.category || 'other';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    }

    // Count by status
    const allSubs = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId));

    const byStatus: Record<string, number> = {};
    for (const sub of allSubs) {
      byStatus[sub.status] = (byStatus[sub.status] || 0) + 1;
    }

    res.json({
      totalSubscriptions: userSubscriptions.length,
      totalMonthlyCost: totalMonthlyCost.toFixed(2),
      totalAnnualCost: totalAnnualCost.toFixed(2),
      byCategory,
      byStatus,
    });
  } catch (error) {
    console.error('Error fetching subscription stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * GET /api/subscriptions/:id
 * Get a single subscription by ID
 */
  app.get('/api/subscriptions/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.uid;
    const subscriptionId = parseInt(req.params.id);

    if (isNaN(subscriptionId)) {
      return res.status(400).json({ error: 'Invalid subscription ID' });
    }

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.id, subscriptionId),
          eq(subscriptions.userId, userId)
        )
      )
      .limit(1);

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json(subscription);
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

/**
 * POST /api/subscriptions
 * Create a new subscription manually
 */
  app.post('/api/subscriptions', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.uid;

    // Validate request body
    const validationResult = createSubscriptionSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
    }

    const data = validationResult.data;

    // Check user's subscription limit (free tier: 10 subscriptions)
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.firebaseId, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.subscriptionType === 'free') {
      const count = await db
        .select({ count: sql<number>`count(*)` })
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId));

      if (count[0].count >= 10) {
        return res.status(403).json({
          error: 'Free tier limit reached',
          message: 'Upgrade to Pro for unlimited subscriptions',
        });
      }
    }

    // Create subscription
    const [newSubscription] = await db
      .insert(subscriptions)
      .values({
        userId,
        merchantName: data.merchantName,
        planName: data.planName,
        amount: data.amount,
        currency: data.currency,
        billingCycle: data.billingCycle,
        category: data.category,
        firstBillingDate: data.firstBillingDate ? new Date(data.firstBillingDate) : null,
        nextBillingDate: data.nextBillingDate ? new Date(data.nextBillingDate) : null,
        trialEndDate: data.trialEndDate ? new Date(data.trialEndDate) : null,
        status: data.status,
        cancellationUrl: data.cancellationUrl,
        notes: data.notes,
        isManualEntry: true,
        confidence: 'high', // Manual entries are high confidence
      })
      .returning();

    res.status(201).json(newSubscription);
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

/**
 * PATCH /api/subscriptions/:id
 * Update an existing subscription
 */
  app.patch('/api/subscriptions/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.uid;
    const subscriptionId = parseInt(req.params.id);

    if (isNaN(subscriptionId)) {
      return res.status(400).json({ error: 'Invalid subscription ID' });
    }

    // Validate request body
    const validationResult = updateSubscriptionSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
    }

    const data = validationResult.data;

    // Check if subscription exists and belongs to user
    const [existing] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.id, subscriptionId),
          eq(subscriptions.userId, userId)
        )
      )
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Build update object with only provided fields
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.merchantName) updateData.merchantName = data.merchantName;
    if (data.planName !== undefined) updateData.planName = data.planName;
    if (data.amount) updateData.amount = data.amount;
    if (data.currency) updateData.currency = data.currency;
    if (data.billingCycle) updateData.billingCycle = data.billingCycle;
    if (data.category) updateData.category = data.category;
    if (data.nextBillingDate) updateData.nextBillingDate = new Date(data.nextBillingDate);
    if (data.trialEndDate) updateData.trialEndDate = new Date(data.trialEndDate);
    if (data.status) updateData.status = data.status;
    if (data.cancelledDate) updateData.cancelledDate = new Date(data.cancelledDate);
    if (data.accessEndsDate) updateData.accessEndsDate = new Date(data.accessEndsDate);
    if (data.cancellationUrl !== undefined) updateData.cancellationUrl = data.cancellationUrl;
    if (data.notes !== undefined) updateData.notes = data.notes;

    // Update subscription
    const [updated] = await db
      .update(subscriptions)
      .set(updateData)
      .where(eq(subscriptions.id, subscriptionId))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

/**
 * DELETE /api/subscriptions/:id
 * Delete a subscription
 */
  app.delete('/api/subscriptions/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.uid;
    const subscriptionId = parseInt(req.params.id);

    if (isNaN(subscriptionId)) {
      return res.status(400).json({ error: 'Invalid subscription ID' });
    }

    // Check if subscription exists and belongs to user
    const [existing] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.id, subscriptionId),
          eq(subscriptions.userId, userId)
        )
      )
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Delete subscription
    await db
      .delete(subscriptions)
      .where(eq(subscriptions.id, subscriptionId));

    res.json({ success: true, message: 'Subscription deleted successfully' });
  } catch (error) {
    console.error('Error deleting subscription:', error);
    res.status(500).json({ error: 'Failed to delete subscription' });
  }
});

/**
 * POST /api/subscriptions/:id/cancel
 * Mark a subscription as cancelled
 */
  app.post('/api/subscriptions/:id/cancel', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.uid;
    const subscriptionId = parseInt(req.params.id);

    if (isNaN(subscriptionId)) {
      return res.status(400).json({ error: 'Invalid subscription ID' });
    }

    const { accessEndsDate } = req.body;

    // Update subscription status
    const [updated] = await db
      .update(subscriptions)
      .set({
        status: 'cancelled',
        cancelledDate: new Date(),
        accessEndsDate: accessEndsDate ? new Date(accessEndsDate) : null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(subscriptions.id, subscriptionId),
          eq(subscriptions.userId, userId)
        )
      )
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
  });
}
