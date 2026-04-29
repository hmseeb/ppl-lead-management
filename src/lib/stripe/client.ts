import Stripe from 'stripe'

let cached: Stripe | null = null

function getStripeClient(): Stripe {
  if (cached) return cached
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  cached = new Stripe(key, {
    maxNetworkRetries: 3,
    timeout: 30000,
  })
  return cached
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    return Reflect.get(getStripeClient(), prop, receiver)
  },
})
