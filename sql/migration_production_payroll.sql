-- =============================================
-- Phase 2.3: Production & Payroll Enhancements
-- წარმოება: რეცეპტის დაკავშირება პროდუქტთან
-- პეიროლი: საგადასახადო სვეტების დამატება
-- =============================================

-- 1. წარმოების გაუმჯობესება
-- დავამატოთ product_id რეცეპტებში, რათა ვიცოდეთ რას აწარმოებს ეს რეცეპტი
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;

-- 2. პეიროლის გაუმჯობესება
-- დავამატოთ საგადასახადო სვეტები სახელფასო უწყისებში
ALTER TABLE salary_slips ADD COLUMN IF NOT EXISTS income_tax numeric(12,2) DEFAULT 0;
ALTER TABLE salary_slips ADD COLUMN IF NOT EXISTS pension_contribution numeric(12,2) DEFAULT 0;
ALTER TABLE salary_slips ADD COLUMN IF NOT EXISTS gross_salary numeric(12,2) DEFAULT 0;

-- განვაახლოთ net_salary-ს გაანგარიშება (თუ საჭიროა, მაგრამ უმჯობესია ჰუკში მოხდეს)
-- შენიშვნა: net_salary ბაზაში GENERATED სვეტია (base_salary + bonus - deductions).
-- ჩვენს შემთხვევაში deductions მოიცავს გადასახადებსაც.
