import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getContact } from '@/lib/ghl/client'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  // + in query strings decodes as space, normalize it back before trimming
  const phone = searchParams.get('phone')?.replace(/^\s/, '+').trim()

  if (!phone) {
    return NextResponse.json(
      { error: 'missing_phone', message: 'phone query parameter is required' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  // Look up lead by phone number
  const { data: lead, error } = await supabase
    .from('leads')
    .select('id, first_name, last_name, phone, email, vertical, status, assigned_broker_id')
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return NextResponse.json(
      { error: 'db_error', message: error.message },
      { status: 500 }
    )
  }

  if (!lead) {
    return NextResponse.json(
      { error: 'not_found', message: 'no lead found with this phone number' },
      { status: 404 }
    )
  }

  // Lead exists but not assigned
  if (!lead.assigned_broker_id) {
    return NextResponse.json({
      lead_id: lead.id,
      lead_name: [lead.first_name, lead.last_name].filter(Boolean).join(' ') || null,
      status: lead.status,
      assigned: false,
      broker: null,
    })
  }

  // Lead is assigned, fetch broker
  const { data: broker, error: brokerError } = await supabase
    .from('brokers')
    .select('id, first_name, last_name, email, phone, company_name, ghl_contact_id, contact_hours, timezone, weekend_pause')
    .eq('id', lead.assigned_broker_id)
    .single()

  if (brokerError || !broker) {
    return NextResponse.json(
      { error: 'broker_not_found', message: 'assigned broker record not found' },
      { status: 500 }
    )
  }

  // Fetch fresh broker details from GHL
  let ghlDetails = null
  if (broker.ghl_contact_id) {
    const ghlResult = await getContact(broker.ghl_contact_id)
    if (ghlResult.success && ghlResult.contact) {
      ghlDetails = ghlResult.contact
    }
  }

  return NextResponse.json({
    lead_id: lead.id,
    lead_name: [lead.first_name, lead.last_name].filter(Boolean).join(' ') || null,
    status: lead.status,
    assigned: true,
    broker: {
      id: broker.id,
      name: [broker.first_name, broker.last_name].filter(Boolean).join(' ') || null,
      email: ghlDetails?.email ?? broker.email,
      phone: ghlDetails?.phone ?? broker.phone,
      company: ghlDetails?.companyName ?? broker.company_name,
      ghl_contact_id: broker.ghl_contact_id,
      availability: {
        contact_hours: broker.contact_hours,
        timezone: broker.timezone,
        weekend_pause: broker.weekend_pause,
      },
    },
  })
}
