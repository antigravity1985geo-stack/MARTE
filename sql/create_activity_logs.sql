-- =============================================
-- აქტივობის ლოგი
-- =============================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text NOT NULL DEFAULT '',
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text DEFAULT '',
  entity_name text DEFAULT '',
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- ადმინებს შეუძლიათ ყველა ლოგის ნახვა
CREATE POLICY "Admins can view all activity logs" ON activity_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ნებისმიერ ავტორიზებულ მომხმარებელს შეუძლია ლოგის ჩაწერა
CREATE POLICY "Authenticated users can insert logs" ON activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ინდექსი სწრაფი ძებნისთვის
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type);
