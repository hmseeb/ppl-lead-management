import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { brokerSchema } from '@/lib/schemas/broker'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = brokerSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    const {
      ghl_contact_id,
      first_name,
      last_name,
      email,
      phone,
      company_name,
      state,
      primary_vertical,
      secondary_vertical,
      batch_size,
      deal_amount,
    } = result.data

    // Idempotency: check if broker with this ghl_contact_id already exists
    const { data: existing } = await supabase
      .from('brokers')
      .select('id, first_name, last_name')
      .eq('ghl_contact_id', ghl_contact_id)
      .single()

    if (existing) {
      return NextResponse.json(
        {
          broker_id: existing.id,
          broker_name: `${existing.first_name} ${existing.last_name}`,
          status: 'exists',
        },
        { status: 200 }
      )
    }

    // Insert new broker
    const { data: broker, error } = await supabase
      .from('brokers')
      .insert({
        ghl_contact_id,
        first_name,
        last_name,
        email: email.toLowerCase(),
        phone: phone || null,
        company_name: company_name || null,
        state: state || null,
        primary_vertical: primary_vertical || null,
        secondary_vertical: secondary_vertical || null,
        batch_size,
        deal_amount,
        token: `tok-${crypto.randomUUID()}`,
        assignment_status: 'active',
        status: 'completed',
      })
      .select('id, first_name, last_name')
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create broker', details: error.message },
        { status: 500 }
      )
    }

    // Log activity
    await supabase.from('activity_log').insert({
      event_type: 'broker_created',
      broker_id: broker.id,
      details: { first_name, last_name, email, source: 'api' },
    })

    return NextResponse.json(
      {
        broker_id: broker.id,
        broker_name: `${broker.first_name} ${broker.last_name}`,
        status: 'created',
      },
      { status: 201 }
    )
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
