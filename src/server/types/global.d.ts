// Type declarations for modules without @types packages

declare module 'imap' {
  import { EventEmitter } from 'events';
  interface ImapMessage {
    on(event: string, listener: (...args: any[]) => void): this;
  }
  interface ImapOptions {
    user: string;
    password: string;
    host: string;
    port: number;
    tls: boolean;
    tlsOptions?: { rejectUnauthorized: boolean };
  }
  class Imap extends EventEmitter {
    constructor(options: ImapOptions);
    connect(): void;
    end(): void;
    destroy(): void;
    openBox(name: string | boolean, openReadOnly: boolean, callback: (err: Error | null, box: any) => void): void;
    search(criteria: any[], callback: (err: Error | null, uids: number[]) => void): void;
    fetch(uid: number[] | number, options: { bodies: string; struct: boolean; markSeen?: boolean }): this;
    once(event: string, listener: (...args: any[]) => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
  }
  export default Imap;
}

declare module 'ioredis' {
  import IORedis from 'ioredis/built/index';
  export = IORedis;
}

// Module declarations for relative imports used in the codebase
declare module './redis' {
  import IORedis from 'ioredis';
  export const redisClient: IORedis | null;
}

declare module './redis.js' {
  import IORedis from 'ioredis';
  export const redisClient: IORedis | null;
}

// Extend Socket types for custom server methods
import 'socket.io';
declare module 'socket.io' {
  interface Server {
    emitToBusiness?(businessId: string, event: string, data: any): void;
    emitToUser?(userId: string, event: string, data: any): void;
  }
  interface Socket {
    user?: any;
    businessId?: string;
    userId?: string;
    plan?: string;
  }
}
