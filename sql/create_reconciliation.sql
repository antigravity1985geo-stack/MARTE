-- =============================================
-- Phase 2.2: Advanced Financial Engine
-- Module 2: Auto-Reconciliation Engine
-- =============================================

-- Bank statements uploaded by user
CREATE TABLE IF NOT EXISTS bank_statement_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  filename text NOT NULL,
  upload_date timestamptz DEFAULT now(),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  total_lines integer DEFAULT 0,
  matched_lines integer DEFAULT 0
);

-- Individual lines from the bank statement
CREATE TABLE IF NOT EXISTS bank_statement_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid REFERENCES bank_statement_uploads(id) ON DELETE CASCADE,
  transaction_date date NOT NULL,
  description text,
  amount numeric(15,2) NOT NULL, -- positive for credit, negative for debit
  counterparty text,
  reference_number text,
  account_code text, -- if manually assigned
  match_id uuid REFERENCES journal_entries(id) ON DELETE SET NULL, -- linked system record
  match_status text DEFAULT 'unmatched' CHECK (match_status IN ('unmatched', 'matched', 'ignored', 'manual')),
  match_reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bank_statement_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own statement uploads" ON bank_statement_uploads FOR ALL TO authenticated USING (user_id = auth.uid());

ALTER TABLE bank_statement_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access lines via uploads" ON bank_statement_lines FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM bank_statement_uploads u WHERE u.id = bank_statement_lines.upload_id AND u.user_id = auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bank_lines_match ON bank_statement_lines(match_status);
CREATE INDEX IF NOT EXISTS idx_bank_lines_date ON bank_statement_lines(transaction_date);

-- Simple Auto-Match Helper
CREATE OR REPLACE FUNCTION auto_match_bank_lines(p_upload_id uuid) RETURNS integer AS $$
DECLARE
  v_match_count integer := 0;
  v_line record;
BEGIN
  FOR v_line IN SELECT * FROM bank_statement_lines WHERE upload_id = p_upload_id AND match_status = 'unmatched' LOOP
    -- Logic: find a journal entry with exact amount and close date (+/- 3 days)
    UPDATE bank_statement_lines bsl
    SET match_id = (
      SELECT je.id FROM journal_entries je
      JOIN journal_lines jl ON jl.journal_id = je.id
      WHERE (jl.debit - jl.credit) = v_line.amount
        AND je.date BETWEEN (v_line.transaction_date - interval '3 days') AND (v_line.transaction_date + interval '3 days')
      LIMIT 1
    ),
    match_status = CASE WHEN EXISTS (
      SELECT 1 FROM journal_entries je
      JOIN journal_lines jl ON jl.journal_id = je.id
      WHERE (jl.debit - jl.credit) = v_line.amount
        AND je.date BETWEEN (v_line.transaction_date - interval '3 days') AND (v_line.transaction_date + interval '3 days')
    ) THEN 'matched' ELSE 'unmatched' END,
    match_reason = 'Auto-matched by amount and date proximity'
    WHERE bsl.id = v_line.id;
    
    IF v_line.match_id IS NOT NULL THEN
      v_match_count := v_match_count + 1;
    END IF;
  END LOOP;
  
  -- Update stats
  UPDATE bank_statement_uploads SET matched_lines = v_match_count, status = 'completed' WHERE id = p_upload_id;
  
  RETURN v_match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
