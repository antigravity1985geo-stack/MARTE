-- ============================================================
-- PATIENT QUEUE & WAITING ROOM — საწყობი ERP / Clinic
-- ============================================================

-- ─── 1. Queue counters (doctor rooms / service points) ────────
CREATE TABLE IF NOT EXISTS queue_counters (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,        -- "ექიმი ბერიძე", "კაბინეტი #2"
  code          TEXT NOT NULL,        -- 'A', 'B', 'C' — used in ticket number
  doctor_id     UUID REFERENCES auth.users(id),
  room_number   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  is_open       BOOLEAN NOT NULL DEFAULT FALSE, -- shift is open
  opened_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. Queue tickets ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS queue_tickets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  counter_id      UUID NOT NULL REFERENCES queue_counters(id),
  ticket_number   TEXT NOT NULL,        -- 'A-001', 'B-034'
  display_number  INT  NOT NULL,        -- sequential per counter per day

  -- Patient link (optional — walk-ins have none)
  patient_id      UUID,
  patient_name    TEXT,
  patient_phone   TEXT,

  -- Appointment link
  appointment_id  UUID,

  -- Service info
  service_type    TEXT,                 -- 'consultation', 'treatment', 'xray', 'payment'
  priority        INT NOT NULL DEFAULT 0, -- 0=normal, 1=priority, 2=emergency

  -- Timing
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  called_at       TIMESTAMPTZ,          -- when called to counter
  started_at      TIMESTAMPTZ,          -- when service started
  completed_at    TIMESTAMPTZ,          -- when done
  no_show_at      TIMESTAMPTZ,          -- if patient didn't come after call

  -- Status
  status          TEXT NOT NULL DEFAULT 'waiting'
                  CHECK (status IN (
                    'waiting',          -- in queue
                    'called',           -- being called on display
                    'serving',          -- currently at counter
                    'completed',        -- done
                    'no_show',          -- called but didn't come
                    'cancelled'         -- cancelled before call
                  )),

  -- Wait time tracking (minutes)
  wait_minutes    INT GENERATED ALWAYS AS (
    CASE WHEN called_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (called_at - issued_at)) / 60
    ELSE NULL END
  ) STORED,

  service_minutes INT GENERATED ALWAYS AS (
    CASE WHEN completed_at IS NOT NULL AND started_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (completed_at - started_at)) / 60
    ELSE NULL END
  ) STORED,

  notes           TEXT,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 3. Auto ticket number ────────────────────────────────────
-- Resets daily per counter: A-001, A-002 … next day starts A-001 again
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
  v_counter queue_counters%ROWTYPE;
  v_seq     INT;
BEGIN
  SELECT * INTO v_counter FROM queue_counters WHERE id = NEW.counter_id;

  SELECT COALESCE(MAX(display_number), 0) + 1 INTO v_seq
  FROM queue_tickets
  WHERE counter_id = NEW.counter_id
    AND issued_at::DATE = CURRENT_DATE;

  NEW.display_number := v_seq;
  NEW.ticket_number  := v_counter.code || '-' || LPAD(v_seq::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ticket_number ON queue_tickets;
CREATE TRIGGER trg_ticket_number
  BEFORE INSERT ON queue_tickets
  FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();

-- ─── 4. Updated_at trigger ────────────────────────────────────
CREATE OR REPLACE FUNCTION queue_touch_updated()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_qt_updated ON queue_tickets;
CREATE TRIGGER trg_qt_updated BEFORE UPDATE ON queue_tickets
  FOR EACH ROW EXECUTE FUNCTION queue_touch_updated();

-- ─── 5. RPC: call next ticket ─────────────────────────────────
CREATE OR REPLACE FUNCTION call_next_ticket(
  p_counter_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_ticket queue_tickets%ROWTYPE;
BEGIN
  -- Mark previous 'called' tickets as no_show
  UPDATE queue_tickets SET
    status     = 'no_show',
    no_show_at = NOW(),
    updated_at = NOW()
  WHERE counter_id = p_counter_id
    AND status     = 'called';

  -- Get next waiting ticket (priority first, then FIFO)
  SELECT * INTO v_ticket
  FROM queue_tickets
  WHERE counter_id = p_counter_id
    AND status     = 'waiting'
    AND issued_at::DATE = CURRENT_DATE
  ORDER BY priority DESC, issued_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'რიგი ცარიელია');
  END IF;

  UPDATE queue_tickets SET
    status    = 'called',
    called_at = NOW(),
    updated_at= NOW()
  WHERE id = v_ticket.id;

  RETURN jsonb_build_object(
    'ok',            true,
    'ticket_id',     v_ticket.id,
    'ticket_number', v_ticket.ticket_number,
    'patient_name',  v_ticket.patient_name,
    'counter_id',    p_counter_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 6. RPC: recall ticket (show again on screen) ─────────────
CREATE OR REPLACE FUNCTION recall_ticket(p_ticket_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE queue_tickets SET
    status = 'called', called_at = NOW(), updated_at = NOW()
  WHERE id = p_ticket_id AND status IN ('called','no_show');
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 7. Analytics view ────────────────────────────────────────
CREATE OR REPLACE VIEW queue_daily_stats AS
SELECT
  issued_at::DATE                                          AS day,
  counter_id,
  qc.name                                                  AS counter_name,
  COUNT(*)                                                 AS total_tickets,
  COUNT(*) FILTER (WHERE status = 'completed')             AS completed,
  COUNT(*) FILTER (WHERE status = 'no_show')               AS no_shows,
  ROUND(AVG(wait_minutes) FILTER (WHERE wait_minutes IS NOT NULL), 1) AS avg_wait_min,
  ROUND(AVG(service_minutes) FILTER (WHERE service_minutes IS NOT NULL), 1) AS avg_service_min,
  MAX(display_number)                                      AS max_queue_number
FROM queue_tickets qt
JOIN queue_counters qc ON qc.id = qt.counter_id
GROUP BY 1, 2, 3;

-- ─── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_qt_counter_status  ON queue_tickets(counter_id, status, issued_at);
CREATE INDEX IF NOT EXISTS idx_qt_tenant_today    ON queue_tickets(tenant_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_qt_patient         ON queue_tickets(patient_id) WHERE patient_id IS NOT NULL;

-- ─── RLS ───────────────────────────────────────────────────────
ALTER TABLE queue_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_tickets  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "t_counters" ON queue_counters
  USING (tenant_id=(SELECT tenant_id FROM user_profiles WHERE id=auth.uid()));
CREATE POLICY "t_tickets" ON queue_tickets
  USING (tenant_id=(SELECT tenant_id FROM user_profiles WHERE id=auth.uid()));

-- ─── Realtime ──────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE queue_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE queue_counters;

-- ─── Seed ──────────────────────────────────────────────────────
-- INSERT INTO queue_counters (tenant_id, name, code, room_number) VALUES
--   ('<tid>', 'ექიმი ბერიძე',  'A', '101'),
--   ('<tid>', 'ექიმი ჯავახია', 'B', '102'),
--   ('<tid>', 'გადახდა',        'C', 'სალარო');
