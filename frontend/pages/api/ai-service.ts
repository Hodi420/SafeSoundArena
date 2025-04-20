import type { NextApiRequest, NextApiResponse } from 'next';
import { requirePioneer } from '../../src/utils/requirePioneer';
import { checkPayment, createPaymentRequest, confirmPayment } from '../../src/utils/piPayments';

// Dummy AI function (replace with your real AI logic)
async function callAI(requestType: string, requestPayload: any) {
  return { message: `AI response for type: ${requestType}`, input: requestPayload };
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const user = (req as any).pioneer;
  const { requestType, requestPayload, paymentId } = req.body;

  // 1. If paymentId is provided, confirm it
  if (paymentId) {
    const confirmed = await confirmPayment(paymentId);
    if (!confirmed) return res.status(402).json({ error: 'Payment not confirmed' });
  }

  // 2. Check payment (1 Pi per requestType per hour)
  const paid = await checkPayment(user.pi_uid, requestType);
  if (!paid) {
    const paymentRequest = await createPaymentRequest(user.pi_uid, 1, requestType);
    return res.status(402).json({ paymentRequired: true, paymentRequest });
  }

  // 3. Process AI request
  const aiResult = await callAI(requestType, requestPayload);

  // 4. Return result
  return res.status(200).json({ result: aiResult });
};

export default requirePioneer(handler);
