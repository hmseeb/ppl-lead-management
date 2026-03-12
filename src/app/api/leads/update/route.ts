import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

const leadUpdateSchema = z.object({
  ghl_contact_id: z.string().min(1),
  ai_call_notes: z.string().optional(),
  ai_call_status: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  business_name: z.string().optional(),
  vertical: z.string().optional(),
  credit_score: z.coerce.number().int().min(300).max(850).optional(),
  funding_amount: z.coerce.number().positive().optional(),
  funding_purpose: z.string().optional(),
  state: z.string().optional(),
})

// Fields owned by the assignment engine, never touched by PATCH
const PROTECTED_FIELDS = [
  'assigned_broker_id',
  'assigned_order_id',
  'assigned_at',
  'status',
] as const

export async function PATCH(request: NextRequest) {
  // 1. Parse JSON body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  // 2. Validate with Zod
  const parsed = leadUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_error', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { ghl_contact_id, ...fields } = parsed.data
  const supabase = createAdminClient()

  // 3. Find existing lead by ghl_contact_id
  const { data: lead, error: findError } = await supabase
    .from('leads')
    .select('id')
    .eq('ghl_contact_id', ghl_contact_id)
    .maybeSingle()

  if (findError) {
    return NextResponse.json(
      { error: 'database_error', message: findError.message },
      { status: 500 }
    )
  }

  if (!lead) {
    return NextResponse.json(
      { error: 'lead_not_found', ghl_contact_id },
      { status: 404 }
    )
  }

  // 4. Build update object, stripping undefined values and protected fields
  const updateFields: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && !PROTECTED_FIELDS.includes(key as typeof PROTECTED_FIELDS[number])) {
      updateFields[key] = value
    }
  }

  // Also store the raw update payload for audit
  updateFields.raw_payload = body

  // 5. Update the lead
  const { error: updateError } = await supabase
    .from('leads')
    .update(updateFields)
    .eq('id', lead.id)

  if (updateError) {
    return NextResponse.json(
      { error: 'update_error', message: updateError.message },
      { status: 500 }
    )
  }

  // 6. Return success
  return NextResponse.json({
    lead_id: lead.id,
    updated_fields: Object.keys(updateFields),
  })
}
