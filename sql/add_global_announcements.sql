-- ==========================================
-- MARTE Phase 3: Global Announcements
-- ==========================================

CREATE TABLE public.global_announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'urgent', 'success')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- RLS Policies
ALTER TABLE public.global_announcements ENABLE ROW LEVEL SECURITY;

-- Everyone can read active announcements
CREATE POLICY "Anyone can view active announcements"
    ON public.global_announcements
    FOR SELECT
    USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- Only superadmins can manage announcements
CREATE POLICY "Superadmins can manage announcements"
    ON public.global_announcements
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND forms_access = 'all' -- We use forms_access/is_superadmin equivalent depending on existing structure.
        )
    );

-- Add to publication for realtime updates if needed
ALTER PUBLICATION supabase_realtime ADD TABLE global_announcements;
