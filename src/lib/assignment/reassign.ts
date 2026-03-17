import { createAdminClient } from '@/lib/supabase/admin'
import { assignLead } from './assign'
import { dispatchDelivery } from '@/lib/delivery/dispatcher'

export interface ReassignmentSummary {
  processed: number
  assigned: number
  failed: number
  errors: string[]
}

/**
 * Processes the unassigned queue by running each lead through the scoring
 * engine against currently eligible orders. Called automatically when an
 * order is activated, unpaused, or created.
 */
export async function reassignUnassignedLeads(): Promise<ReassignmentSummary> {
  const supabase = createAdminClient()
  const summary: ReassignmentSummary = { processed: 0, assigned: 0, failed: 0, errors: [] }

  // 1. Fetch all unresolved queue entries with lead data
  const { data: queueEntries, error: queueError } = await supabase
    .from('unassigned_queue')
    .select('id, lead_id')
    .eq('resolved', false)
    .order('created_at', { ascending: true })

  if (queueError) {
    console.error('reassignUnassignedLeads: failed to fetch queue:', queueError.message)
    return summary
  }

  if (!queueEntries || queueEntries.length === 0) {
    return summary
  }

  // 2. Process each queued lead through the assignment engine
  for (const entry of queueEntries) {
    summary.processed++

    try {
      const assignment = await assignLead(entry.lead_id)

      if (assignment.status === 'assigned' && assignment.broker_id) {
        // Mark queue entry as resolved
        await supabase
          .from('unassigned_queue')
          .update({ resolved: true, resolved_at: new Date().toISOString() })
          .eq('id', entry.id)

        // Log auto-reassignment in activity log
        await supabase.from('activity_log').insert({
          event_type: 'auto_reassignment',
          lead_id: entry.lead_id,
          broker_id: assignment.broker_id,
          order_id: assignment.order_id ?? null,
          details: {
            source: 'unassigned_queue',
            queue_entry_id: entry.id,
          },
        })

        // Dispatch delivery (fire-and-forget)
        dispatchDelivery(
          entry.lead_id,
          assignment.broker_id,
          assignment.order_id!,
        ).catch((err) => {
          console.error(`reassign delivery failed for lead ${entry.lead_id}:`, err)
        })

        summary.assigned++
      }
      // If still unassigned, leave the queue entry alone for next attempt
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'unknown error'
      summary.failed++
      summary.errors.push(`lead ${entry.lead_id}: ${reason}`)
      console.error(`reassignUnassignedLeads: failed for lead ${entry.lead_id}:`, reason)
    }
  }

  if (summary.assigned > 0) {
    console.log(
      `reassignUnassignedLeads: ${summary.assigned}/${summary.processed} leads auto-reassigned`
    )
  }

  return summary
}
