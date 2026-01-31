import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/db';
import { sendDonationNotificationEmail, sendDonationThankYouEmail } from '@/lib/email';
import Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature || !webhookSecret) {
      console.error('Missing signature or webhook secret');
      return NextResponse.json(
        { error: 'Missing signature or webhook secret' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    // Gérer les différents événements
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Vérifier que c'est un don
        if (session.metadata?.type === 'donation') {
          const userId = session.metadata.userId !== 'anonymous' ? session.metadata.userId : null;
          const amount = parseFloat(session.metadata.amount || '0');
          const customerEmail = session.customer_details?.email || session.metadata.userEmail;
          const customerName = session.customer_details?.name;

          console.log(`Don Stripe reçu: ${amount}€ de ${customerEmail || 'anonyme'}`);

          // Enregistrer le don en base de données
          const donation = await prisma.donation.create({
            data: {
              userId: userId || undefined,
              email: customerEmail || undefined,
              name: customerName || undefined,
              amount,
              currency: 'EUR',
              provider: 'STRIPE',
              providerOrderId: session.id,
              status: 'COMPLETED',
              completedAt: new Date(),
              metadata: {
                paymentIntent: session.payment_intent,
                paymentStatus: session.payment_status,
              },
            },
          });

          console.log(`Don enregistré en base: ${donation.id}`);

          // Envoyer email de notification aux admins
          await sendDonationNotificationEmail({
            donorName: customerName || undefined,
            donorEmail: customerEmail || undefined,
            amount,
            currency: 'EUR',
            provider: 'stripe',
            donationId: donation.id,
          });

          // Envoyer email de remerciement au donateur
          if (customerEmail) {
            await sendDonationThankYouEmail(
              customerEmail,
              customerName || undefined,
              amount,
              'EUR'
            );
          }

          // Marquer l'utilisateur comme donateur
          if (userId) {
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
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`PaymentIntent failed: ${paymentIntent.id}`);

        // Mettre à jour le don en échec si il existe
        if (paymentIntent.metadata?.donationId) {
          await prisma.donation.update({
            where: { id: paymentIntent.metadata.donationId },
            data: { status: 'FAILED' },
          });
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        console.log(`Charge refunded: ${charge.id}`);

        // Mettre à jour le don en remboursé
        const donation = await prisma.donation.findFirst({
          where: {
            providerOrderId: charge.payment_intent as string,
            provider: 'STRIPE',
          },
        });

        if (donation) {
          await prisma.donation.update({
            where: { id: donation.id },
            data: { status: 'REFUNDED' },
          });
          console.log(`Don ${donation.id} marqué comme remboursé`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
