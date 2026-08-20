import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import crypto from 'crypto';

const router = Router();

const PLATFORM_MARGIN_PERCENT = 0.10; // 10% margin

// Provider-specific rates (INR per minute)
const PROVIDER_RATES: Record<string, number> = {
  twilio: 1.25,
  plivo: 0.75,
  browser_only: 0,
};

// POST /api/dograh/webhook/:businessId
router.post('/:businessId', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const payload = req.body;

    // Verify webhook signature if secret is configured
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { dograhWebhookSecret: true },
    });

    if (business?.dograhWebhookSecret) {
      const signature = req.headers['x-webhook-signature'] as string;
      if (signature) {
        const expected = crypto
          .createHmac('sha256', business.dograhWebhookSecret)
          .update(JSON.stringify(payload))
          .digest('hex');
        const sigBuf = Buffer.from(expected, 'hex');
        const userSigBuf = Buffer.from(signature, 'hex');
        if (sigBuf.length !== userSigBuf.length || !crypto.timingSafeEqual(sigBuf, userSigBuf)) {
          console.warn('Dograh webhook signature mismatch for business:', businessId);
          return res.status(401).json({ success: false, error: 'Invalid webhook signature' });
        }
      } else {
        return res.status(401).json({ success: false, error: 'Missing webhook signature' });
      }
    }

    const {
      run_id,
      workflow_id,
      workflow_name,
      call_time,
      initial_context,
      gathered_context,
      cost_info,
      recording_url,
      transcript_url,
      annotations,
    } = payload;

    // Find existing CallLog or create one
    const callLogId = gathered_context?.callLogId;
    let callLog = callLogId
      ? await prisma.callLog.findUnique({ where: { id: callLogId } })
      : null;

    // Try to find by phone number if not found by ID
    if (!callLog && initial_context?.phone) {
      callLog = await prisma.callLog.findFirst({
        where: {
          businessId,
          OR: [
            { calleeNumber: initial_context.phone },
            { callerNumber: initial_context.phone },
          ],
          status: { in: ['ringing', 'active'] },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Create CallLog if still not found
    if (!callLog) {
      callLog = await prisma.callLog.create({
        data: {
          businessId,
          dograhRunId: run_id?.toString(),
          workflowId: workflow_id,
          workflowName: workflow_name || 'Voice Agent',
          direction: 'inbound',
          status: 'completed',
          callType: 'phone',
          callerNumber: initial_context?.phone || 'unknown',
          calleeNumber: initial_context?.to || null,
          startedAt: call_time ? new Date(call_time) : new Date(),
        },
      });
    }

    // Calculate duration from cost_info or annotations
    const duration = annotations?.duration_seconds || gathered_context?.duration || 0;

    // Update CallLog with completion data
    await prisma.callLog.update({
      where: { id: callLog.id },
      data: {
        status: 'completed',
        duration,
        recordingUrl: recording_url || null,
        transcriptUrl: transcript_url || null,
        costInfo: cost_info || null,
        gatheredContext: gathered_context || null,
        annotations: annotations || null,
        endedAt: new Date(),
      },
    });

    // Create Activity for CRM if contact is linked
    if (callLog.contactId) {
      await prisma.activity.create({
        data: {
          businessId,
          contactId: callLog.contactId,
          type: 'call',
          title: `${callLog.direction === 'incoming' ? 'Incoming' : 'Outbound'} call - ${workflow_name || 'Voice Agent'}`,
          description: gathered_context?.summary || `Duration: ${duration}s`,
          metadata: {
            callLogId: callLog.id,
            dograhRunId: run_id,
            recordingUrl: recording_url,
            costInfo: cost_info,
          },
        } as any,
      });
    }

    // Wallet deduction with 10% platform margin
    // Get business telephony provider for rate calculation
    const bizSettings = await prisma.business.findUnique({
      where: { id: businessId },
      select: { telephonyProvider: true },
    });
    const provider = bizSettings?.telephonyProvider || 'twilio';

    if (cost_info?.telephony_cost || cost_info?.total_cost || duration > 0) {
      // Calculate cost: use Dograh cost_info if available, else estimate from provider rates
      let twilioCost = 0;
      if (cost_info?.telephony_cost || cost_info?.total_cost) {
        twilioCost = parseFloat(String(cost_info.telephony_cost || cost_info.total_cost || 0));
      } else if (duration > 0 && PROVIDER_RATES[provider]) {
        // Estimate cost from duration and provider rate
        const durationMinutes = duration / 60;
        twilioCost = durationMinutes * PROVIDER_RATES[provider];
      }

      if (twilioCost > 0) {
        const platformMargin = twilioCost * PLATFORM_MARGIN_PERCENT;
        const totalDeduction = twilioCost + platformMargin;

        const wallet = await prisma.wallet.findUnique({
          where: { businessId },
        });

        if (wallet && wallet.balance >= totalDeduction) {
          const newBalance = Math.round((wallet.balance - totalDeduction) * 100) / 100;

          // Deduct from wallet
          await prisma.wallet.update({
            where: { id: wallet.id },
            data: {
              balance: newBalance,
              totalSpent: { increment: totalDeduction },
              totalMarginPaid: { increment: platformMargin },
            },
          });

          // Create wallet transaction
          const transaction = await prisma.walletTransaction.create({
            data: {
              walletId: wallet.id,
              businessId,
              type: 'call_deduction',
              amount: -totalDeduction,
              balance: newBalance,
              callLogId: callLog.id,
              description: `Call to ${callLog.calleeNumber || 'N/A'} - ${duration}s`,
              metadata: {
                twilioCost,
                platformMargin,
                duration,
                phone: callLog.calleeNumber,
                workflowName: workflow_name,
              },
            },
          });

          // Record platform earning
          await prisma.platformEarning.create({
            data: {
              businessId,
              walletTxnId: transaction.id,
              twilioCost,
              platformMargin,
              totalCharged: totalDeduction,
              type: 'call_margin',
              callLogId: callLog.id,
            },
          });
        } else {
          // Insufficient balance - log warning
          console.warn(
            `Insufficient wallet balance for business ${businessId}. ` +
            `Required: ₹${totalDeduction}, Available: ₹${wallet?.balance || 0}`
          );
        }
      }
    }

    res.json({ status: 'ok' });
  } catch (error: any) {
    console.error('Dograh webhook error:', error);
    // Always return 200 to prevent retries
    res.json({ status: 'ok' });
  }
});

export default router;
