'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function RealtimeListener() {
  const router = useRouter()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastRefreshRef = useRef<number>(0)

  const debouncedRefresh = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    const elapsed = Date.now() - lastRefreshRef.current

    // If it's been over 2s since last refresh, fire immediately
    if (elapsed > 2000) {
      lastRefreshRef.current = Date.now()
      router.refresh()
      return
    }

    // Otherwise debounce with 500ms delay
    timeoutRef.current = setTimeout(() => {
      lastRefreshRef.current = Date.now()
      router.refresh()
    }, 500)
  }, [router])

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('dashboard-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        debouncedRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        debouncedRefresh
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_log' },
        debouncedRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deliveries' },
        debouncedRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'unassigned_queue' },
        debouncedRefresh
      )
      .subscribe()

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      supabase.removeChannel(channel)
    }
  }, [debouncedRefresh])

  return null
}
