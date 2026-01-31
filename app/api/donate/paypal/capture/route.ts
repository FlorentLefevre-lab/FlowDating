import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendDonationNotificationEmail, sendDonationThankYouEmail } from '@/lib/email';
import { auth } from '@/lib/auth';

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API_URL = process.env.NODE_ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

async function getPayPalAccessToken(): Promise<string> {
  const authString = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');

  const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authString}`,
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
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID manquant' },
        { status: 400 }
      );
    }

    const accessToken = await getPayPalAccessToken();

    // Capturer le paiement
    const captureResponse = await fetch(
      `${PAYPAL_API_URL}/v2/checkout/orders/${orderId}/capture`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const captureData = await captureResponse.json();

    if (!captureResponse.ok) {
      console.error('PayPal capture failed:', captureData);
      return NextResponse.json(
        { error: 'Erreur lors de la capture du paiement' },
        { status: 500 }
      );
    }

    // Le paiement a réussi
    const capturedAmount = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount;
    const payerEmail = captureData.payer?.email_address;
    const payerName = captureData.payer?.name?.given_name
      ? `${captureData.payer.name.given_name} ${captureData.payer.name.surname || ''}`
      : undefined;
    const userId = captureData.purchase_units?.[0]?.custom_id;
    const amount = parseFloat(capturedAmount?.value || '0');

    console.log(`Don PayPal reçu: ${amount}€ de ${payerEmail || 'anonyme'}`);

    // Enregistrer le don en base de données
    const donation = await prisma.donation.create({
      data: {
        userId: userId && userId !== 'anonymous' ? userId : undefined,
        email: payerEmail || session?.user?.email || undefined,
        name: payerName || session?.user?.name || undefined,
        amount,
        currency: capturedAmount?.currency_code || 'EUR',
        provider: 'PAYPAL',
        providerOrderId: captureData.id,
        status: 'COMPLETED',
        completedAt: new Date(),
        metadata: {
          payerId: captureData.payer?.payer_id,
          captureId: captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id,
        },
      },
    });

    console.log(`Don PayPal enregistré en base: ${donation.id}`);

    // Marquer l'utilisateur comme donateur
    if (userId && userId !== 'anonymous') {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: {
            hasDonated: true,
            firstDonationAt: new Date(),
          },
        });
        console.log(`Badge donateur activé pour userId: ${userId}`);
      } catch (dbError) {
        console.error('Erreur mise à jour utilisateur:', dbError);
      }
    }

    // Envoyer email de notification aux admins
    await sendDonationNotificationEmail({
      donorName: payerName,
      donorEmail: payerEmail,
      amount,
      currency: capturedAmount?.currency_code || 'EUR',
      provider: 'paypal',
      donationId: donation.id,
    });

    // Envoyer email de remerciement au donateur
    const donorEmail = payerEmail || session?.user?.email;
    if (donorEmail) {
      await sendDonationThankYouEmail(
        donorEmail,
        payerName || session?.user?.name || undefined,
        amount,
        capturedAmount?.currency_code || 'EUR'
      );
    }

    return NextResponse.json({
      success: true,
      orderId: captureData.id,
      status: captureData.status,
      amount: capturedAmount,
      donationId: donation.id,
    });
  } catch (error) {
    console.error('PayPal capture error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la capture du paiement PayPal' },
      { status: 500 }
    );
  }
}
