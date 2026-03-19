-- ============================================================
-- SHIFT HANDOVER REPORT — საწყობი ERP / POS Module
-- ============================================================
-- Dependencies: cash_drawer_sessions, transactions,
--               transaction_payments, returns

-- ─── 1. shift_sales snapshot table ───────────────────────────
-- Materialised snapshot written at session close.
-- Saves recomputing on every report open.
CREATE TABLE IF NOT EXISTS shift_sales (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Link to the drawer session this report belongs to
  session_id          UUID NOT NULL UNIQUE REFERENCES cash_drawer_sessions(id) ON DELETE CASCADE,
  drawer_id           UUID NOT NULL REFERENCES cash_drawers(id),

  -- Period
  shift_start         TIMESTAMPTZ NOT NULL,
  shift_end           TIMESTAMPTZ NOT NULL,

  -- Cashiers active in this session (array of user ids)
  cashier_ids         UUID[]   NOT NULL DEFAULT '{}',
  cashier_names       TEXT[]   NOT NULL DEFAULT '{}',

  -- Transaction counts
  total_transactions  INT      NOT NULL DEFAULT 0,
  voided_transactions INT      NOT NULL DEFAULT 0,
  refund_transactions INT      NOT NULL DEFAULT 0,

  -- Revenue
  gross_sales         NUMERIC(14,2) NOT NULL DEFAULT 0,  -- before discounts
  total_discounts     NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_refunds       NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_sales           NUMERIC(14,2) NOT NULL DEFAULT 0,  -- gross - discounts - refunds
  total_tax           NUMERIC(14,2) NOT NULL DEFAULT 0,

  -- Payment breakdown
  cash_sales          NUMERIC(14,2) NOT NULL DEFAULT 0,
  card_sales          NUMERIC(14,2) NOT NULL DEFAULT 0,
  split_sales         NUMERIC(14,2) NOT NULL DEFAULT 0,  -- split transactions total
  other_sales         NUMERIC(14,2) NOT NULL DEFAULT 0,

  -- Cash drawer
  opening_float       NUMERIC(14,2) NOT NULL DEFAULT 0,
  cash_in             NUMERIC(14,2) NOT NULL DEFAULT 0,
  cash_out            NUMERIC(14,2) NOT NULL DEFAULT 0,
  expected_cash       NUMERIC(14,2) NOT NULL DEFAULT 0,
  declared_cash       NUMERIC(14,2),
  cash_variance       NUMERIC(14,2),

  -- Top products (JSON array of {product_id, name, qty, revenue})
  top_products        JSONB NOT NULL DEFAULT '[]',

  -- Hourly breakdown (JSON array of {hour, transactions, revenue})
  hourly_breakdown    JSONB NOT NULL DEFAULT '[]',

  -- Per-cashier stats (JSON array of {cashier_id, name, transactions, revenue, discounts})
  cashier_breakdown   JSONB NOT NULL DEFAULT '[]',

  generated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  generated_by        UUID REFERENCES auth.users(id)
);

-- ─── 2. void_logs (if not already existing) ──────────────────
CREATE TABLE IF NOT EXISTS void_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  transaction_id  UUID NOT NULL REFERENCES transactions(id),
  voided_by       UUID NOT NULL REFERENCES auth.users(id),
  reason          TEXT,
  amount          NUMERIC(12,2) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 3. Function: build_shift_report ─────────────────────────
-- Called at session close OR on-demand for live X-report.
-- p_session_id: the drawer session
-- p_save:       if true, upserts into shift_sales
CREATE OR REPLACE FUNCTION build_shift_report(
  p_session_id  UUID,
  p_save        BOOLEAN DEFAULT FALSE
)
RETURNS JSONB AS $$
DECLARE
  v_sess          cash_drawer_sessions%ROWTYPE;
  v_report        JSONB;
  v_shift_end     TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_sess FROM cash_drawer_sessions WHERE id = p_session_id;
  v_shift_end := COALESCE(v_sess.closed_at, now());

  WITH
  -- Transactions in this shift window on this drawer
  shift_txs AS (
    SELECT t.*
    FROM transactions t
    WHERE t.tenant_id = v_sess.tenant_id
      AND t.created_at >= v_sess.opened_at
      AND t.created_at <= v_shift_end
      AND t.status = 'completed'
  ),
  voided_txs AS (
    SELECT vl.*
    FROM void_logs vl
    WHERE vl.tenant_id = v_sess.tenant_id
      AND vl.created_at >= v_sess.opened_at
      AND vl.created_at <= v_shift_end
  ),
  refund_txs AS (
    SELECT r.*
    FROM returns r
    WHERE r.tenant_id = v_sess.tenant_id
      AND r.created_at >= v_sess.opened_at
      AND r.created_at <= v_shift_end
      AND r.status = 'completed'
  ),
  payment_agg AS (
    SELECT
      COALESCE(SUM(CASE WHEN tp.method = 'cash'  THEN tp.amount END), 0) AS cash_sales,
      COALESCE(SUM(CASE WHEN tp.method = 'card'  THEN tp.amount END), 0) AS card_sales,
      COALESCE(SUM(CASE WHEN tp.method NOT IN ('cash','card') THEN tp.amount END), 0) AS other_sales
    FROM transaction_payments tp
    JOIN shift_txs t ON t.id = tp.transaction_id
  ),
  top_prod AS (
    SELECT
      ti.product_id,
      ti.name AS product_name,
      SUM(ti.qty)        AS total_qty,
      SUM(ti.line_total) AS total_revenue
    FROM transaction_items ti
    JOIN shift_txs t ON t.id = ti.transaction_id
    GROUP BY ti.product_id, ti.name
    ORDER BY total_revenue DESC
    LIMIT 10
  ),
  hourly AS (
    SELECT
      DATE_TRUNC('hour', t.created_at) AS hr,
      COUNT(*)                          AS tx_count,
      SUM(t.total)                      AS revenue
    FROM shift_txs t
    GROUP BY 1
    ORDER BY 1
  ),
  cashier_stats AS (
    SELECT
      t.created_by                              AS cashier_id,
      up.full_name                              AS cashier_name,
      COUNT(*)                                  AS tx_count,
      SUM(t.total)                              AS revenue,
      COALESCE(SUM(t.discount_total), 0)        AS discounts
    FROM shift_txs t
    LEFT JOIN user_profiles up ON up.id = t.created_by
    GROUP BY t.created_by, up.full_name
  ),
  drawer_agg AS (
    SELECT
      COALESCE(SUM(CASE WHEN cdt.type = 'cash_in'  THEN cdt.amount END), 0) AS cash_in,
      COALESCE(SUM(CASE WHEN cdt.type = 'cash_out' THEN cdt.amount END), 0) AS cash_out
    FROM cash_drawer_transactions cdt
    WHERE cdt.session_id = p_session_id
      AND cdt.type IN ('cash_in','cash_out')
  )
  SELECT jsonb_build_object(
    'session_id',          p_session_id,
    'drawer_id',           v_sess.drawer_id,
    'shift_start',         v_sess.opened_at,
    'shift_end',           v_shift_end,
    'total_transactions',  (SELECT COUNT(*) FROM shift_txs),
    'voided_transactions', (SELECT COUNT(*) FROM voided_txs),
    'refund_transactions', (SELECT COUNT(*) FROM refund_txs),
    'gross_sales',         (SELECT COALESCE(SUM(subtotal), 0) FROM shift_txs),
    'total_discounts',     (SELECT COALESCE(SUM(discount_total), 0) FROM shift_txs),
    'total_refunds',       (SELECT COALESCE(SUM(refund_amount), 0) FROM refund_txs),
    'net_sales',           (SELECT COALESCE(SUM(total), 0) FROM shift_txs)
                           - (SELECT COALESCE(SUM(refund_amount), 0) FROM refund_txs),
    'total_tax',           (SELECT COALESCE(SUM(tax_total), 0) FROM shift_txs),
    'cash_sales',          (SELECT cash_sales  FROM payment_agg),
    'card_sales',          (SELECT card_sales  FROM payment_agg),
    'other_sales',         (SELECT other_sales FROM payment_agg),
    'opening_float',       v_sess.opening_float,
    'cash_in',             (SELECT cash_in  FROM drawer_agg),
    'cash_out',            (SELECT cash_out FROM drawer_agg),
    'expected_cash',       v_sess.expected_cash,
    'declared_cash',       v_sess.closing_declared,
    'cash_variance',       v_sess.variance,
    'top_products',        (SELECT COALESCE(jsonb_agg(row_to_json(tp.*)), '[]') FROM top_prod tp),
    'hourly_breakdown',    (SELECT COALESCE(jsonb_agg(row_to_json(h.*)),  '[]') FROM hourly h),
    'cashier_breakdown',   (SELECT COALESCE(jsonb_agg(row_to_json(c.*)),  '[]') FROM cashier_stats c)
  ) INTO v_report;

  -- Optionally persist
  IF p_save THEN
    INSERT INTO shift_sales (
      tenant_id, session_id, drawer_id, shift_start, shift_end,
      total_transactions, voided_transactions, refund_transactions,
      gross_sales, total_discounts, total_refunds, net_sales, total_tax,
      cash_sales, card_sales, other_sales,
      opening_float, cash_in, cash_out,
      expected_cash, declared_cash, cash_variance,
      top_products, hourly_breakdown, cashier_breakdown,
      generated_by
    )
    VALUES (
      v_sess.tenant_id,
      p_session_id, v_sess.drawer_id,
      v_sess.opened_at, v_shift_end,
      (v_report->>'total_transactions')::INT,
      (v_report->>'voided_transactions')::INT,
      (v_report->>'refund_transactions')::INT,
      (v_report->>'gross_sales')::NUMERIC,
      (v_report->>'total_discounts')::NUMERIC,
      (v_report->>'total_refunds')::NUMERIC,
      (v_report->>'net_sales')::NUMERIC,
      (v_report->>'total_tax')::NUMERIC,
      (v_report->>'cash_sales')::NUMERIC,
      (v_report->>'card_sales')::NUMERIC,
      (v_report->>'other_sales')::NUMERIC,
      (v_report->>'opening_float')::NUMERIC,
      (v_report->>'cash_in')::NUMERIC,
      (v_report->>'cash_out')::NUMERIC,
      (v_report->>'expected_cash')::NUMERIC,
      NULLIF(v_report->>'declared_cash', 'null')::NUMERIC,
      NULLIF(v_report->>'cash_variance', 'null')::NUMERIC,
      (v_report->'top_products'),
      (v_report->'hourly_breakdown'),
      (v_report->'cashier_breakdown'),
      auth.uid()
    )
    ON CONFLICT (session_id) DO UPDATE SET
      total_transactions  = EXCLUDED.total_transactions,
      net_sales           = EXCLUDED.net_sales,
      cash_variance       = EXCLUDED.cash_variance,
      top_products        = EXCLUDED.top_products,
      hourly_breakdown    = EXCLUDED.hourly_breakdown,
      cashier_breakdown   = EXCLUDED.cashier_breakdown,
      generated_at        = now();
  END IF;

  RETURN v_report;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Trigger: auto-build on session close ─────────────────────
CREATE OR REPLACE FUNCTION auto_build_shift_report()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'closed' AND OLD.status = 'open' THEN
    PERFORM build_shift_report(NEW.id, TRUE);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_shift_report ON cash_drawer_sessions;
CREATE TRIGGER trg_shift_report
  AFTER UPDATE ON cash_drawer_sessions
  FOR EACH ROW EXECUTE FUNCTION auto_build_shift_report();

-- ─── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_shift_sales_tenant   ON shift_sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shift_sales_session  ON shift_sales(session_id);
CREATE INDEX IF NOT EXISTS idx_shift_sales_drawer   ON shift_sales(drawer_id);
CREATE INDEX IF NOT EXISTS idx_shift_sales_start    ON shift_sales(shift_start DESC);
CREATE INDEX IF NOT EXISTS idx_void_logs_tenant     ON void_logs(tenant_id, created_at DESC);

-- ─── RLS ───────────────────────────────────────────────────────
ALTER TABLE shift_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE void_logs   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_shift_sales" ON shift_sales
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "tenant_void_logs" ON void_logs
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));
