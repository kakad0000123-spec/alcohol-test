CREATE TABLE line_notify_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  date DATE NOT NULL,
  session TEXT NOT NULL,
  notified_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vendor_id, date, session)
);
