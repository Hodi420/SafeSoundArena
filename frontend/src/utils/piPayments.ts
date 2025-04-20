// Utility functions for Pi Network payment integration (mocked for now)
// In production, use the official Pi SDK and a database for payment logs

interface PaymentRecord {
  userId: string;
  requestType: string;
  paymentId: string;
  amount: number;
  confirmed: boolean;
  timestamp: number;
}

// In-memory payment log for demo (replace with DB in production)
const payments: PaymentRecord[] = [];

export async function checkPayment(userId: string, requestType: string): Promise<boolean> {
  // Check if a confirmed payment exists for this user/requestType in the last hour
  const now = Date.now();
  return payments.some(p => p.userId === userId && p.requestType === requestType && p.confirmed && (now - p.timestamp < 60 * 60 * 1000));
}

export async function createPaymentRequest(userId: string, amount: number, requestType: string) {
  // In real use, create a payment request via Pi SDK and return its details
  const paymentId = `pi_${userId}_${Date.now()}`;
  payments.push({ userId, requestType, paymentId, amount, confirmed: false, timestamp: Date.now() });
  return { paymentId, amount, requestType };
}

export async function confirmPayment(paymentId: string) {
  // In real use, verify with Pi Network (webhook or polling)
  const payment = payments.find(p => p.paymentId === paymentId);
  if (payment) payment.confirmed = true;
  return !!payment;
}
