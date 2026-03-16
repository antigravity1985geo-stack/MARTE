-- Create Real Estate Tables

-- 1. Properties
CREATE TABLE IF NOT EXISTS public.re_properties (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    type text NOT NULL CHECK (type IN ('apartment', 'house', 'land', 'commercial')),
    address text NOT NULL,
    area decimal,
    rooms integer,
    price decimal NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold', 'rented', 'pending')),
    images text[] DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Deals (Sales, Rentals, Mortgages)
CREATE TABLE IF NOT EXISTS public.re_deals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    property_id uuid REFERENCES public.re_properties(id) ON DELETE SET NULL,
    client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
    type text NOT NULL CHECK (type IN ('sale', 'rental', 'mortgage', 'pawn')),
    amount decimal NOT NULL DEFAULT 0,
    date timestamptz DEFAULT now(),
    status text NOT NULL DEFAULT 'completed' CHECK (status IN ('draft', 'pending', 'completed', 'cancelled')),
    created_at timestamptz DEFAULT now()
);

-- 3. Pawn Loans (Specific for გირაო)
CREATE TABLE IF NOT EXISTS public.re_pawn_loans (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    deal_id uuid REFERENCES public.re_deals(id) ON DELETE CASCADE,
    interest_rate decimal NOT NULL DEFAULT 0,
    duration_months integer NOT NULL DEFAULT 0,
    collateral_value decimal NOT NULL DEFAULT 0,
    start_date date DEFAULT CURRENT_DATE,
    end_date date,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.re_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.re_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.re_pawn_loans ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies (Tenant-based isolation)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 're_properties' AND policyname = 'Users can view their own tenant properties') THEN
        CREATE POLICY "Users can view their own tenant properties" ON public.re_properties
        FOR SELECT USING (tenant_id = (SELECT auth.uid()));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 're_properties' AND policyname = 'Users can insert their own tenant properties') THEN
        CREATE POLICY "Users can insert their own tenant properties" ON public.re_properties
        FOR INSERT WITH CHECK (tenant_id = (SELECT auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 're_properties' AND policyname = 'Users can update their own tenant properties') THEN
        CREATE POLICY "Users can update their own tenant properties" ON public.re_properties
        FOR UPDATE USING (tenant_id = (SELECT auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 're_properties' AND policyname = 'Users can delete their own tenant properties') THEN
        CREATE POLICY "Users can delete their own tenant properties" ON public.re_properties
        FOR DELETE USING (tenant_id = (SELECT auth.uid()));
    END IF;

    -- Deals Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 're_deals' AND policyname = 'Users can view their own tenant deals') THEN
        CREATE POLICY "Users can view their own tenant deals" ON public.re_deals
        FOR SELECT USING (tenant_id = (SELECT auth.uid()));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 're_deals' AND policyname = 'Users can insert their own tenant deals') THEN
        CREATE POLICY "Users can insert their own tenant deals" ON public.re_deals
        FOR INSERT WITH CHECK (tenant_id = (SELECT auth.uid()));
    END IF;

    -- Pawn Loans Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 're_pawn_loans' AND policyname = 'Users can view their own tenant pawn loans') THEN
        CREATE POLICY "Users can view their own tenant pawn loans" ON public.re_pawn_loans
        FOR SELECT USING (tenant_id = (SELECT auth.uid()));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 're_pawn_loans' AND policyname = 'Users can insert their own tenant pawn loans') THEN
        CREATE POLICY "Users can insert their own tenant pawn loans" ON public.re_pawn_loans
        FOR INSERT WITH CHECK (tenant_id = (SELECT auth.uid()));
    END IF;
END $$;
