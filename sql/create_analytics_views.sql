-- =============================================
-- Phase 4: AI & Analytics Views
-- 1. ABC Analysis (პროდუქტების კლასიფიკაცია)
-- 2. Customer LTV (კლიენტების ღირებულება)
-- 3. Market Basket Analysis (ერთად გაყიდვადი)
-- =============================================

-- 1. ABC Analysis View
-- აჯამებს შემოსავალს თითოეული პროდუქტისთვის და ანაწილებს A, B, C კატეგორიებში
CREATE OR REPLACE VIEW product_abc_analysis AS
WITH product_revenue AS (
  SELECT 
    p.user_id,
    p.id as product_id,
    p.name as product_name,
    p.category_id,
    COALESCE(SUM(ti.quantity * ti.price), 0) as total_revenue,
    COUNT(ti.id) as transaction_count
  FROM public.products p
  LEFT JOIN public.transaction_items ti ON p.id::text = ti.product_id
  LEFT JOIN public.transactions t ON ti.transaction_id = t.id
  WHERE (t.type = 'sale' OR t.id IS NULL)
  GROUP BY p.user_id, p.id, p.name, p.category_id
),
revenue_metrics AS (
  SELECT 
    *,
    PERCENT_RANK() OVER (PARTITION BY user_id ORDER BY total_revenue DESC) as revenue_rank
  FROM product_revenue
)
SELECT 
  *,
  CASE 
    WHEN revenue_rank <= 0.2 THEN 'A' -- Top 20%
    WHEN revenue_rank <= 0.5 THEN 'B' -- Next 30%
    ELSE 'C'                          -- Bottom 50%
  END as abc_category
FROM revenue_metrics;

-- 2. Customer LTV (Lifetime Value) View
-- კლიენტის ჯამური აქტივობის ანალიზი
CREATE OR REPLACE VIEW customer_ltv AS
SELECT 
  c.user_id,
  c.id as client_id,
  c.name as client_name,
  c.email,
  c.phone,
  COUNT(t.id) as total_orders,
  COALESCE(SUM(t.total), 0) as total_spent,
  CASE WHEN COUNT(t.id) > 0 THEN SUM(t.total) / COUNT(t.id) ELSE 0 END as avg_order_value,
  MAX(t.date) as last_order_date,
  MIN(t.date) as first_order_date,
  EXTRACT(DAY FROM (now() - MIN(t.date))) as customer_days_age
FROM public.clients c
LEFT JOIN public.transactions t ON c.id::text = t.client_id
WHERE (t.type = 'sale' OR t.id IS NULL)
GROUP BY c.user_id, c.id, c.name, c.email, c.phone;

-- 3. Market Basket Analysis View
-- პოულობს პროდუქტებს, რომლებიც ყველაზე ხშირად იყიდება ერთად
CREATE OR REPLACE VIEW basket_analysis AS
SELECT 
  t.user_id,
  a.product_id as product_a_id,
  p1.name as product_a_name,
  b.product_id as product_b_id,
  p2.name as product_b_name,
  COUNT(*) as frequency
FROM public.transaction_items a
JOIN public.transaction_items b ON a.transaction_id = b.transaction_id AND a.product_id < b.product_id
JOIN public.products p1 ON a.product_id = p1.id::text
JOIN public.products p2 ON b.product_id = p2.id::text
JOIN public.transactions t ON a.transaction_id = t.id
WHERE t.type = 'sale'
GROUP BY t.user_id, a.product_id, p1.name, b.product_id, p2.name
HAVING COUNT(*) > 1
ORDER BY frequency DESC;

-- გაცემული უფლებები
GRANT SELECT ON product_abc_analysis TO authenticated;
GRANT SELECT ON customer_ltv TO authenticated;
GRANT SELECT ON basket_analysis TO authenticated;
