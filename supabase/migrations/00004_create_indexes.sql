-- Performance indexes for all new tables

CREATE INDEX idx_orders_status_broker ON orders(status, broker_id);
CREATE INDEX idx_orders_active_assignment ON orders(status, last_assigned_at)
  WHERE status = 'active';
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_ghl_contact_id ON leads(ghl_contact_id);
CREATE INDEX idx_leads_assigned_broker ON leads(assigned_broker_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX idx_activity_log_type ON activity_log(event_type, created_at DESC);
CREATE INDEX idx_unassigned_queue_resolved ON unassigned_queue(resolved)
  WHERE resolved = false;
