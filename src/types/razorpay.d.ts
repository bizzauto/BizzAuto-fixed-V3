declare module 'razorpay' {
  interface RazorpayConfig {
    key_id: string;
    key_secret: string;
  }

  interface RazorpayOrder {
    id: string;
    entity: string;
    amount: number;
    amount_paid: number;
    amount_due: number;
    currency: string;
    receipt: string;
    offer_id: string | null;
    status: string;
    attempts: number;
    notes: Record<string, string>;
    created_at: number;
  }

  interface CreateOrderParams {
    amount: number;
    currency?: string;
    receipt?: string;
    notes?: Record<string, string>;
    [key: string]: any;
  }

  interface Orders {
    create(params: CreateOrderParams): Promise<RazorpayOrder>;
    fetch(orderId: string): Promise<RazorpayOrder>;
    fetchPayments(orderId: string): Promise<any[]>;
  }

  class Razorpay {
    constructor(config: RazorpayConfig);
    orders: Orders;
    payments: {
      fetch(paymentId: string): Promise<any>;
      capture(paymentId: string, amount: number, currency?: string): Promise<any>;
    };
    subscriptions: {
      create(params: any): Promise<any>;
      fetch(subscriptionId: string): Promise<any>;
      cancel(subscriptionId: string): Promise<any>;
    };
  }

  export = Razorpay;
}
