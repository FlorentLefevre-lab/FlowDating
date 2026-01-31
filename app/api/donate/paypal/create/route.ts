import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API_URL = process.env.NODE_ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

async function getPayPalAccessToken(): Promise<string> {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');

  const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`PayPal auth failed: ${data.error_description}`);
  }

  return data.access_token;
}

export async function POST(request: NextRequest) {
  try {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      return NextResponse.json(
        { error: 'PayPal non configuré' },
        { status: 500 }
      );
    }

    const session = await auth();
    const body = await request.json();
    const { amount } = body;

    // Validation du montant
    if (!amount || amount < 1 || amount > 10000) {
      return NextResponse.json(
        { error: 'Montant invalide. Minimum 1€, maximum 10000€.' },
        { status: 400 }
      );
    }

    const accessToken = await getPayPalAccessToken();

    // Créer la commande PayPal
    const orderResponse = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'EUR',
              value: amount.toFixed(2),
            },
            description: `Don Flow Dating - ${amount}€`,
            custom_id: session?.user?.id || 'anonymous',
          },
        ],
        application_context: {
          brand_name: 'Flow Dating',
          landing_page: 'BILLING',
          user_action: 'PAY_NOW',
          return_url: `${process.env.NEXTAUTH_URL}/donate/success?provider=paypal`,
          cancel_url: `${process.env.NEXTAUTH_URL}/donate?canceled=true`,
        },
      }),
    });

    const orderData = await orderResponse.json();

    if (!orderResponse.ok) {
      console.error('PayPal order creation failed:', orderData);
      return NextResponse.json(
        { error: 'Erreur lors de la création de la commande PayPal' },
        { status: 500 }
      );
    }

    // Trouver le lien d'approbation
    const approveLink = orderData.links?.find(
      (link: { rel: string; href: string }) => link.rel === 'approve'
    );

    return NextResponse.json({
      orderId: orderData.id,
      approveUrl: approveLink?.href,
    });
  } catch (error) {
    console.error('PayPal create order error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la commande PayPal' },
      { status: 500 }
    );
  }
}
