import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      id?: string;
      user?: {
        id: string;
        email: string;
        businessId: string;
        role: Role;
      };
    }
  }
}

export {};
