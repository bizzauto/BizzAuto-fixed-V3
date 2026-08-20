import { Request, Response } from 'express';
import { qs, qn } from './utils/query.js';

interface PushNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  icon?: string;
  image?: string;
  data?: Record<string, any>;
  status: 'pending' | 'sent' | 'failed';
  sentAt?: Date;
  createdAt: Date;
}

interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  browser: string;
  active: boolean;
}

class PushNotificationService {
  private subscriptions: PushSubscription[] = [];
  private notifications: PushNotification[] = [];

  // Subscribe to push notifications
  subscribe(userId: string, subscription: { endpoint: string; keys: any }, browser: string): PushSubscription {
    const sub: PushSubscription = {
      id: `push-${Date.now()}`,
      userId,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      browser,
      active: true,
    };
    this.subscriptions.push(sub);
    return sub;
  }

  // Unsubscribe
  unsubscribe(endpoint: string): boolean {
    const sub = this.subscriptions.find(s => s.endpoint === endpoint);
    if (sub) {
      sub.active = false;
      return true;
    }
    return false;
  }

  // Get user subscriptions
  getUserSubscriptions(userId: string): PushSubscription[] {
    return this.subscriptions.filter(s => s.userId === userId && s.active);
  }

  // Send push notification
  async send(userId: string, notification: { title: string; body: string; icon?: string; image?: string; data?: any }): Promise<PushNotification> {
    const subs = this.getUserSubscriptions(userId);
    
    const pushNotif: PushNotification = {
      id: `notif-${Date.now()}`,
      userId,
      title: notification.title,
      body: notification.body,
      icon: notification.icon,
      image: notification.image,
      data: notification.data,
      status: subs.length > 0 ? 'sent' : 'pending',
      sentAt: new Date(),
      createdAt: new Date(),
    };

    // In production, would use web-push library to send to each subscription
    // Example:
    // for (const sub of subs) {
    //   await webpush.sendNotification(sub.endpoint, JSON.stringify(pushNotif));
    // }

    this.notifications.push(pushNotif);
    return pushNotif;
  }

  // Send bulk notifications
  async sendBulk(userIds: string[], notification: { title: string; body: string }): Promise<PushNotification[]> {
    return Promise.all(userIds.map(userId => this.send(userId, notification)));
  }

  // Get notification history
  getHistory(userId: string, limit: number = 50): PushNotification[] {
    return this.notifications
      .filter(n => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // Get stats
  getStats(): { total: number; sent: number; failed: number; pending: number } {
    return {
      total: this.notifications.length,
      sent: this.notifications.filter(n => n.status === 'sent').length,
      failed: this.notifications.filter(n => n.status === 'failed').length,
      pending: this.notifications.filter(n => n.status === 'pending').length,
    };
  }

  // Schedule notification (simulated)
  schedule(userId: string, notification: { title: string; body: string }, scheduledAt: Date): PushNotification {
    const pushNotif: PushNotification = {
      id: `notif-${Date.now()}`,
      userId,
      title: notification.title,
      body: notification.body,
      status: 'pending',
      createdAt: scheduledAt,
    };
    this.notifications.push(pushNotif);
    return pushNotif;
  }
}

export const pushService = new PushNotificationService();

// Routes
export const subscribeToPush = (req: Request, res: Response) => {
  const { userId, subscription, browser } = req.body;
  const sub = pushService.subscribe(userId, subscription, browser);
  res.json({ success: true, data: sub });
};

export const unsubscribePush = (req: Request, res: Response) => {
  const { endpoint } = req.body;
  const result = pushService.unsubscribe(endpoint);
  res.json({ success: result });
};

export const sendPushNotification = async (req: Request, res: Response) => {
  const { userId, title, body, icon, image, data } = req.body;
  try {
    const notif = await pushService.send(userId, { title, body, icon, image, data });
    res.json({ success: true, data: notif });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const getPushHistory = (req: Request, res: Response) => {
  const { userId, limit } = req.params;
  const history = pushService.getHistory(qs(userId), qn(limit) || 50);
  res.json({ success: true, data: history });
};

export const getPushStats = (_req: Request, res: Response) => {
  const stats = pushService.getStats();
  res.json({ success: true, data: stats });
};

export const schedulePushNotification = (req: Request, res: Response) => {
  const { userId, title, body, scheduledAt } = req.body;
  const notif = pushService.schedule(userId, { title, body }, new Date(scheduledAt));
  res.json({ success: true, data: notif });
};