import { Request, Response } from 'express';
import { qs } from './utils/query.js';

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  assignedTo?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
}

interface ClientPortalAccess {
  id: string;
  clientId: string;
  userId: string;
  token: string;
  expiresAt: Date;
  permissions: ('view_invoices' | 'view_deals' | 'view_appointments' | 'make_payments')[];
  lastAccessed?: Date;
}

class ClientPortalService {
  private clients: Client[] = [];
  private accesses: ClientPortalAccess[] = [];

  // Create client
  createClient(data: Partial<Client>): Client {
    const client: Client = {
      id: `client-${Date.now()}`,
      name: data.name || '',
      email: data.email || '',
      phone: data.phone,
      company: data.company,
      assignedTo: data.assignedTo,
      status: 'active',
      createdAt: new Date(),
    };
    this.clients.push(client);
    return client;
  }

  // Get clients for user
  getClients(userId: string): Client[] {
    return this.clients.filter(c => c.assignedTo === userId);
  }

  // Generate portal access token
  generateAccess(clientId: string, userId: string, permissions: string[]): ClientPortalAccess {
    const access: ClientPortalAccess = {
      id: `access-${Date.now()}`,
      clientId,
      userId,
      token: `cp_${Math.random().toString(36).substring(2, 15)}`,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      permissions: permissions as any,
    };
    this.accesses.push(access);
    return access;
  }

  // Validate portal token
  validateToken(token: string): ClientPortalAccess | null {
    return this.accesses.find(a => a.token === token && a.expiresAt > new Date()) || null;
  }

  // Get portal data for client
  getPortalData(clientId: string) {
    const client = this.clients.find(c => c.id === clientId);
    if (!client) return null;

    return {
      client,
      invoices: [], // Would fetch from invoice service
      deals: [],
      appointments: [],
    };
  }

  // Revoke access
  revokeAccess(token: string): boolean {
    const access = this.accesses.find(a => a.token === token);
    if (access) {
      access.expiresAt = new Date();
      return true;
    }
    return false;
  }
}

export const clientPortalService = new ClientPortalService();

// Routes
export const createClient = (req: Request, res: Response) => {
  const client = clientPortalService.createClient(req.body);
  res.json({ success: true, data: client });
};

export const getClients = (req: Request, res: Response) => {
  const { userId } = req.params;
  const clients = clientPortalService.getClients(qs(userId));
  res.json({ success: true, data: clients });
};

export const generatePortalLink = (req: Request, res: Response) => {
  const { clientId, userId, permissions } = req.body;
  const access = clientPortalService.generateAccess(clientId, userId, permissions);
  const link = `${process.env.FRONTEND_URL}/portal/${access.token}`;
  res.json({ success: true, data: { link, token: access.token } });
};

export const accessPortal = (req: Request, res: Response) => {
  const { token } = req.params;
  const access = clientPortalService.validateToken(qs(token));
  if (!access) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
  
  const data = clientPortalService.getPortalData(access.clientId);
  res.json({ success: true, data: { ...data, permissions: access.permissions } });
};