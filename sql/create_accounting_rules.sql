-- =============================================
-- Phase 2.2: Advanced Financial Engine
-- Module 1: Automated Double-Entry Rules
-- =============================================

-- Table to store rules mapping business events to accounting journals
CREATE TABLE IF NOT EXISTS accounting_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, -- e.g., "Default Cash Sale"
  event_type text NOT NULL, -- 'SALE', 'PURCHASE', 'EXPENSE', 'RECEIVING'
  payment_method text, -- Optional filter (e.g., 'cash', 'card', 'bog_qr')
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL, -- Optional product category filter
  debit_account_code text NOT NULL, -- e.g., '1010' for cash
  credit_account_code text NOT NULL, -- e.g., '6110' for revenue
  description_template text, -- e.g., "Auto-generated for POS Sale {{id}}"
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE accounting_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage accounting rules" ON accounting_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Index for fast lookups during transactions
CREATE INDEX IF NOT EXISTS idx_accounting_rules_lookup ON accounting_rules(event_type, payment_method) WHERE is_active = true;

-- Function to evaluate and apply rules (called programmatically or via trigger)
CREATE OR REPLACE FUNCTION apply_accounting_rules(
  p_event_type text,
  p_amount numeric,
  p_payment_method text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_description text DEFAULT ''
) RETURNS void AS $$
DECLARE
  v_rule record;
  v_journal_id uuid;
BEGIN
  -- Find the most specific active rule matching the criteria
  -- Priority: 1. Matches payment_method & category, 2. Matches payment_method, 3. Matches category, 4. Matches event_type only
  SELECT * INTO v_rule
  FROM accounting_rules
  WHERE event_type = p_event_type
    AND is_active = true
    AND (payment_method IS NULL OR payment_method = p_payment_method)
    AND (category_id IS NULL OR category_id = p_category_id)
  ORDER BY 
    (payment_method IS NOT NULL) DESC,
    (category_id IS NOT NULL) DESC
  LIMIT 1;

  IF FOUND THEN
    -- Generate the journal entry using the matched rule
    INSERT INTO journal_entries (date, description, reference_id, created_by)
    VALUES (CURRENT_DATE, COALESCE(v_rule.description_template, p_description, 'Auto rule applied: ' || v_rule.name), p_reference_id, auth.uid())
    RETURNING id INTO v_journal_id;

    -- Insert Debit line
    INSERT INTO journal_lines (journal_id, account_id, debit, credit)
    SELECT v_journal_id, a.id, p_amount, 0
    FROM accounts a WHERE a.code = v_rule.debit_account_code;

    -- Insert Credit line
    INSERT INTO journal_lines (journal_id, account_id, debit, credit)
    SELECT v_journal_id, a.id, 0, p_amount
    FROM accounts a WHERE a.code = v_rule.credit_account_code;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
