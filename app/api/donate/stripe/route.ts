import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body = await request.json();
    const { amount, successUrl, cancelUrl } = body;

    // Validation du montant (minimum 1€, maximum 10000€)
    const amountCents = Math.round(amount * 100);
    if (amountCents < 100 || amountCents > 1000000) {
      return NextResponse.json(
        { error: 'Montant invalide. Minimum 1€, maximum 10000€.' },
        { status: 400 }
      );
    }

    // Créer la session Stripe Checkout
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Don Flow Dating',
              description: `Merci pour votre soutien de ${amount}€ !`,
              images: ['https://flow.dating/logo.svg'],
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      success_url: successUrl || `${process.env.NEXTAUTH_URL}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXTAUTH_URL}/donate?canceled=true`,
      metadata: {
        type: 'donation',
        amount: amount.toString(),
        userId: session?.user?.id || 'anonymous',
        userEmail: session?.user?.email || 'anonymous',
      },
      // Pré-remplir l'email si l'utilisateur est connecté
      ...(session?.user?.email && {
        customer_email: session.user.email,
      }),
      // Options pour les dons
      submit_type: 'donate',
      billing_address_collection: 'auto',
    });

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la session de paiement' },
      { status: 500 }
    );
  }
}
