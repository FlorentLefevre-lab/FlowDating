import { NextResponse } from 'next/server';

// Endpoint pour vérifier quelles méthodes de paiement sont configurées
export async function GET() {
  return NextResponse.json({
    stripe: !!process.env.STRIPE_SECRET_KEY,
    paypal: !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
    lightning: false, // À implémenter plus tard
  });
}
