import Stripe from 'stripe'

function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  return new Stripe(key, {
    maxNetworkRetries: 3,
    timeout: 30000,
  })
}

export const stripe = getStripeClient()
