import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return jsonResponse({ error: 'Stripe not configured' }, 500);
    }

    const { sessionId } = await req.json();
    if (!sessionId) {
      return jsonResponse({ error: 'sessionId required' }, 400);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    const paid = session.payment_status === 'paid' || session.status === 'complete';
    if (!paid) {
      return jsonResponse({
        success: false,
        error: 'Payment not completed',
        session: {
          id: session.id,
          payment_status: session.payment_status,
          status: session.status,
        },
      }, 400);
    }

    return jsonResponse({
      success: true,
      session: {
        id: session.id,
        payment_status: session.payment_status,
        status: session.status,
        amount_total: session.amount_total,
        currency: session.currency,
        customer_email: session.customer_details?.email,
        client_reference_id: session.client_reference_id,
        metadata: session.metadata,
      },
    });
  } catch (error) {
    console.error('validate-checkout-session:', error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      500,
    );
  }
});
