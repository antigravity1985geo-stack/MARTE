# 🤖 AI ფუნქციები და Multi-Industry მოდულები
## დეტალური სპეციფიკაცია და იმპლემენტაციის გზამკვლევი

---

## PART 1: AI-POWERED FEATURES

### 1. DEMAND FORECASTING (მოთხოვნის პროგნოზირება)

#### ბიზნეს მიზანი
- შემცირდეს stock-outs (პროდუქტის ა

რყოფნა მარაგში)
- ოპტიმიზირდეს შესყიდვები
- შემცირდეს excess inventory
- **ROI:** +15-25% გაყიდვების ზრდა

#### Technical Approach

**Option 1: Simple Statistical Model (რეკომენდებული დასაწყისად)**
```typescript
// src/lib/ai/forecasting/simple.ts

interface SalesDataPoint {
  date: string;
  quantity: number;
}

export class SimpleForecasting {
  /**
   * Exponential Smoothing (მარტივი მაგრამ ეფექტური)
   */
  exponentialSmoothing(
    historicalSales: SalesDataPoint[],
    alpha: number = 0.3  // smoothing factor
  ): number[] {
    if (historicalSales.length === 0) return [];
    
    const smoothed: number[] = [historicalSales[0].quantity];
    
    for (let i = 1; i < historicalSales.length; i++) {
      const current = historicalSales[i].quantity;
      const previous = smoothed[i - 1];
      smoothed.push(alpha * current + (1 - alpha) * previous);
    }
    
    return smoothed;
  }
  
  /**
   * Moving Average (მოძრავი საშუალო)
   */
  movingAverage(
    historicalSales: SalesDataPoint[],
    window: number = 7  // last 7 days
  ): number[] {
    const result: number[] = [];
    
    for (let i = 0; i < historicalSales.length; i++) {
      const start = Math.max(0, i - window + 1);
      const subset = historicalSales.slice(start, i + 1);
      const avg = subset.reduce((sum, s) => sum + s.quantity, 0) / subset.length;
      result.push(avg);
    }
    
    return result;
  }
  
  /**
   * Detect Trend (ტრენდის გამოვლენა)
   */
  detectTrend(data: number[]): 'increasing' | 'stable' | 'decreasing' {
    if (data.length < 7) return 'stable';
    
    const recentAvg = data.slice(-7).reduce((a, b) => a + b, 0) / 7;
    const previousAvg = data.slice(-14, -7).reduce((a, b) => a + b, 0) / 7;
    
    const change = (recentAvg - previousAvg) / previousAvg;
    
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }
  
  /**
   * Detect Seasonality (სეზონურობის გამოვლენა)
   */
  detectSeasonality(
    salesData: SalesDataPoint[]
  ): { factor: number; pattern: string } {
    // Group by day of week
    const byDayOfWeek: { [key: number]: number[] } = {};
    
    salesData.forEach(sale => {
      const dayOfWeek = new Date(sale.date).getDay();
      if (!byDayOfWeek[dayOfWeek]) {
        byDayOfWeek[dayOfWeek] = [];
      }
      byDayOfWeek[dayOfWeek].push(sale.quantity);
    });
    
    // Find peak day
    let maxAvg = 0;
    let peakDay = 0;
    
    Object.entries(byDayOfWeek).forEach(([day, quantities]) => {
      const avg = quantities.reduce((a, b) => a + b, 0) / quantities.length;
      if (avg > maxAvg) {
        maxAvg = avg;
        peakDay = parseInt(day);
      }
    });
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const overallAvg = salesData.reduce((sum, s) => sum + s.quantity, 0) / salesData.length;
    
    return {
      factor: maxAvg / overallAvg,
      pattern: `Peak on ${dayNames[peakDay]}`,
    };
  }
  
  /**
   * Forecast next N days (მომდევნო N დღის პროგნოზი)
   */
  forecast(
    product_id: string,
    historicalSales: SalesDataPoint[],
    days: number = 7
  ): ForecastResult {
    const smoothed = this.exponentialSmoothing(historicalSales);
    const trend = this.detectTrend(smoothed);
    const seasonality = this.detectSeasonality(historicalSales);
    
    // Last value in smoothed series
    const lastValue = smoothed[smoothed.length - 1];
    
    // Adjust for trend
    let trendFactor = 1.0;
    if (trend === 'increasing') trendFactor = 1.1;
    if (trend === 'decreasing') trendFactor = 0.9;
    
    // Generate forecast
    const predicted: number[] = [];
    for (let i = 0; i < days; i++) {
      let forecast = lastValue * trendFactor;
      
      // Apply seasonality adjustment
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + i);
      const dayOfWeek = futureDate.getDay();
      
      // Simple seasonality: if weekend, add 20%
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        forecast *= 1.2;
      }
      
      predicted.push(Math.round(forecast));
    }
    
    // Calculate reorder point
    const avgDemand = predicted.reduce((a, b) => a + b, 0) / predicted.length;
    const safetyStock = avgDemand * 0.5; // 50% buffer
    const leadTime = 7; // days
    const reorderPoint = Math.round(avgDemand * leadTime + safetyStock);
    
    return {
      product_id,
      predicted_demand: predicted,
      confidence: this.calculateConfidence(historicalSales),
      seasonality_factor: seasonality.factor,
      trend,
      recommended_reorder_point: reorderPoint,
      recommended_order_quantity: Math.round(avgDemand * 14), // 2 weeks supply
    };
  }
  
  private calculateConfidence(data: SalesDataPoint[]): number {
    if (data.length < 30) return 0.5;
    if (data.length < 90) return 0.7;
    return 0.9;
  }
}

interface ForecastResult {
  product_id: string;
  predicted_demand: number[];
  confidence: number;
  seasonality_factor: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  recommended_reorder_point: number;
  recommended_order_quantity: number;
}
```

**Option 2: AI API (OpenAI/Claude) - უფრო ზუსტი**
```typescript
// src/lib/ai/forecasting/advanced.ts

export class AIForecasting {
  async forecast(
    product_id: string,
    product_name: string,
    historicalSales: SalesDataPoint[],
    days: number = 7
  ): Promise<ForecastResult> {
    const prompt = `
თქვენ ხართ demand forecasting ექსპერტი. გაანალიზეთ ეს გაყიდვების მონაცემები და მიაწოდეთ პროგნოზი.

პროდუქტი: ${product_name}
ისტორიული გაყიდვები (ბოლო 90 დღე):
${historicalSales.map(s => `${s.date}: ${s.quantity} ცალი`).join('\\n')}

გთხოვთ მიაწოდოთ:
1. პროგნოზი შემდეგი ${days} დღისთვის
2. ტრენდის ანალიზი (increasing/stable/decreasing)
3. სეზონურობის ფაქტორი
4. რეკომენდებული reorder point
5. რეკომენდებული შესყიდვის რაოდენობა
6. ნდობის დონე (0-1)

გაითვალისწინეთ:
- დღესასწაულები (ახალი წელი, შობა, და ა.შ.)
- კვირის დღეები (შაბათ-კვირა vs სამუშაო დღეები)
- სეზონური ფაქტორები (ზამთარი/ზაფხული)

პასუხი მოგვეცით JSON ფორმატში.
`;

    const response = await fetch('/api/ai/forecast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    
    const data = await response.json();
    return JSON.parse(data.result);
  }
}
```

#### UI Component
```typescript
// src/components/ForecastDashboard.tsx

export function ForecastDashboard({ product_id }: { product_id: string }) {
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(false);
  
  const generateForecast = async () => {
    setLoading(true);
    try {
      // Fetch historical sales
      const { data: sales } = await supabase
        .from('transactions')
        .select('created_at, items')
        .gte('created_at', daysAgo(90))
        .order('created_at');
      
      // Aggregate by product and date
      const salesData = aggregateSales(sales, product_id);
      
      // Generate forecast
      const forecasting = new SimpleForecasting();
      const result = forecasting.forecast(product_id, salesData, 14);
      
      setForecast(result);
    } catch (error) {
      toast.error('შეცდომა: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>📊 Demand Forecast</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <Spinner />}
        
        {forecast && (
          <>
            {/* Trend Badge */}
            <Badge variant={
              forecast.trend === 'increasing' ? 'success' :
              forecast.trend === 'decreasing' ? 'destructive' :
              'secondary'
            }>
              {forecast.trend === 'increasing' ? '📈 იზრდება' :
               forecast.trend === 'decreasing' ? '📉 მცირდება' :
               '➡️ სტაბილური'}
            </Badge>
            
            {/* Forecast Chart */}
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={forecast.predicted_demand.map((qty, i) => ({
                day: `Day ${i + 1}`,
                quantity: qty,
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="quantity" 
                  stroke="#10b981" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
            
            {/* Recommendations */}
            <div className="mt-4 space-y-2">
              <Alert>
                <AlertDescription>
                  <strong>რეკომენდებული Reorder Point:</strong> {forecast.recommended_reorder_point} ცალი
                </AlertDescription>
              </Alert>
              
              <Alert>
                <AlertDescription>
                  <strong>რეკომენდებული შესყიდვის რაოდენობა:</strong> {forecast.recommended_order_quantity} ცალი
                </AlertDescription>
              </Alert>
              
              <Alert variant={forecast.confidence > 0.7 ? 'success' : 'warning'}>
                <AlertDescription>
                  <strong>ნდობის დონე:</strong> {(forecast.confidence * 100).toFixed(0)}%
                </AlertDescription>
              </Alert>
            </div>
          </>
        )}
        
        <Button onClick={generateForecast} className="mt-4">
          Generate Forecast
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

### 2. PRICE OPTIMIZATION (ფასების ოპტიმიზაცია)

#### Algorithm
```typescript
// src/lib/ai/pricing.ts

interface PriceElasticity {
  price: number;
  quantity: number;
  revenue: number;
}

export class PriceOptimizer {
  /**
   * Calculate price elasticity of demand
   */
  calculateElasticity(
    priceHistory: PriceElasticity[]
  ): number {
    if (priceHistory.length < 2) return -1;
    
    const sorted = [...priceHistory].sort((a, b) => a.price - b.price);
    
    // % change in quantity / % change in price
    const qtyChange = (sorted[sorted.length - 1].quantity - sorted[0].quantity) / sorted[0].quantity;
    const priceChange = (sorted[sorted.length - 1].price - sorted[0].price) / sorted[0].price;
    
    return qtyChange / priceChange;
  }
  
  /**
   * Find optimal price to maximize revenue
   */
  optimizePrice(
    product_id: string,
    current_price: number,
    cost: number,
    competitorPrices: number[],
    historicalData: PriceElasticity[]
  ): PriceRecommendation {
    const elasticity = this.calculateElasticity(historicalData);
    
    // Try different price points
    const testPrices = [
      current_price * 0.9,
      current_price * 0.95,
      current_price,
      current_price * 1.05,
      current_price * 1.1,
    ];
    
    let optimalPrice = current_price;
    let maxRevenue = 0;
    
    testPrices.forEach(price => {
      const priceChange = (price - current_price) / current_price;
      const qtyMultiplier = 1 + (elasticity * priceChange);
      
      const avgCurrentQty = historicalData.reduce((sum, h) => sum + h.quantity, 0) / historicalData.length;
      const projectedQty = avgCurrentQty * qtyMultiplier;
      const projectedRevenue = price * projectedQty;
      
      if (projectedRevenue > maxRevenue && price >= cost * 1.2) { // min 20% margin
        maxRevenue = projectedRevenue;
        optimalPrice = price;
      }
    });
    
    const avgCompetitorPrice = competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length;
    
    // Calculate expected revenue increase
    const currentRevenue = current_price * (historicalData[historicalData.length - 1]?.quantity || 0);
    const expectedIncrease = ((maxRevenue - currentRevenue) / currentRevenue) * 100;
    
    return {
      current_price,
      recommended_price: optimalPrice,
      expected_revenue_increase: expectedIncrease,
      price_elasticity: elasticity,
      competitor_prices: competitorPrices,
      avg_competitor_price: avgCompetitorPrice,
      margin_at_recommended_price: ((optimalPrice - cost) / optimalPrice) * 100,
    };
  }
}

interface PriceRecommendation {
  current_price: number;
  recommended_price: number;
  expected_revenue_increase: number;
  price_elasticity: number;
  competitor_prices: number[];
  avg_competitor_price: number;
  margin_at_recommended_price: number;
}
```

---

### 3. INVOICE OCR (ინვოისის სკანირება)

```typescript
// src/lib/ai/ocr.ts

export class InvoiceOCR {
  /**
   * Extract data from invoice image using AI
   */
  async scanInvoice(imageFile: File): Promise<InvoiceData> {
    // Convert image to base64
    const base64 = await this.fileToBase64(imageFile);
    
    // Call AI API (OpenAI Vision, Google Cloud Vision, AWS Textract)
    const response = await fetch('/api/ai/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: base64,
        prompt: `
Extract information from this invoice image:

Please provide in JSON format:
{
  "supplier_name": string,
  "supplier_tin": string,  // Tax ID
  "invoice_number": string,
  "invoice_date": string (YYYY-MM-DD),
  "due_date": string (YYYY-MM-DD),
  "items": [
    {
      "name": string,
      "quantity": number,
      "unit_price": number,
      "total": number
    }
  ],
  "subtotal": number,
  "vat": number,
  "total": number
}
        `,
      }),
    });
    
    const data = await response.json();
    return JSON.parse(data.result);
  }
  
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

interface InvoiceData {
  supplier_name: string;
  supplier_tin: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  items: {
    name: string;
    quantity: number;
    unit_price: number;
    total: number;
  }[];
  subtotal: number;
  vat: number;
  total: number;
}
```

---

## PART 2: MULTI-INDUSTRY MODULES

### 1. CONSTRUCTION MODULE (მშენებლობა)

#### Database Schema
```sql
-- Projects
CREATE TABLE construction_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  name VARCHAR(200) NOT NULL,
  location TEXT,
  client_id UUID REFERENCES clients(id),
  start_date DATE,
  estimated_completion DATE,
  actual_completion DATE,
  budget DECIMAL(12, 2),
  actual_cost DECIMAL(12, 2) DEFAULT 0,
  status VARCHAR(20) CHECK (status IN ('planning', 'in_progress', 'on_hold', 'completed')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Project Phases
CREATE TABLE project_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES construction_projects(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  budget DECIMAL(10, 2),
  actual_cost DECIMAL(10, 2) DEFAULT 0,
  completion_percentage INT DEFAULT 0,
  status VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Bill of Quantities (BOQ)
CREATE TABLE boq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES construction_projects(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES project_phases(id),
  item_code VARCHAR(50),
  description TEXT NOT NULL,
  unit VARCHAR(20),  -- m2, m3, kg, piece, etc.
  quantity DECIMAL(10, 2) NOT NULL,
  unit_rate DECIMAL(10, 2) NOT NULL,
  total_cost DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * unit_rate) STORED,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Material Orders
CREATE TABLE material_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES construction_projects(id),
  supplier_id UUID REFERENCES suppliers(id),
  order_date DATE NOT NULL,
  delivery_date DATE,
  delivery_location TEXT,
  total_cost DECIMAL(10, 2),
  status VARCHAR(20) CHECK (status IN ('ordered', 'partially_delivered', 'delivered', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE material_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES material_orders(id) ON DELETE CASCADE,
  material_name VARCHAR(200) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(20),
  unit_price DECIMAL(10, 2),
  total_price DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  delivered_quantity DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Subcontractors
CREATE TABLE subcontractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  name VARCHAR(200) NOT NULL,
  company_name VARCHAR(200),
  specialty VARCHAR(100),  -- 'electrician', 'plumber', 'mason', etc.
  phone VARCHAR(20),
  email VARCHAR(100),
  hourly_rate DECIMAL(10, 2),
  rating DECIMAL(2, 1),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE project_labor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES construction_projects(id),
  phase_id UUID REFERENCES project_phases(id),
  subcontractor_id UUID REFERENCES subcontractors(id),
  work_date DATE,
  hours DECIMAL(5, 2),
  hourly_rate DECIMAL(10, 2),
  total_cost DECIMAL(10, 2) GENERATED ALWAYS AS (hours * hourly_rate) STORED,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### UI Components
```typescript
// src/pages/construction/ProjectDashboard.tsx

export function ConstructionProjectDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Active Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">12</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Total Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₾2.5M</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Completion Avg</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">67%</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>On Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">75%</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Gantt Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Project Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <GanttChart projects={projects} />
        </CardContent>
      </Card>
      
      {/* Projects Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectsTable projects={projects} />
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### 2. CLINIC MODULE (სამედიცინო)

#### Database Schema
```sql
-- Patients
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  personal_number VARCHAR(11) UNIQUE NOT NULL,  -- Georgian ID
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender VARCHAR(10),
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  blood_type VARCHAR(5),
  allergies TEXT[],
  chronic_conditions TEXT[],
  emergency_contact_name VARCHAR(200),
  emergency_contact_phone VARCHAR(20),
  insurance_provider VARCHAR(200),
  insurance_policy_number VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Appointments
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  doctor_id UUID REFERENCES employees(id),  -- assuming doctors are employees
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  duration_minutes INT DEFAULT 30,
  type VARCHAR(50) CHECK (type IN ('checkup', 'follow_up', 'emergency', 'surgery', 'consultation')),
  status VARCHAR(20) CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Medical Records
CREATE TABLE medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  appointment_id UUID REFERENCES appointments(id),
  doctor_id UUID REFERENCES employees(id),
  visit_date DATE NOT NULL,
  chief_complaint TEXT,
  symptoms TEXT[],
  diagnosis TEXT,
  treatment_plan TEXT,
  notes TEXT,
  attachments JSONB,  -- URLs to uploaded files
  created_at TIMESTAMP DEFAULT NOW()
);

-- Prescriptions
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_record_id UUID REFERENCES medical_records(id),
  patient_id UUID REFERENCES patients(id),
  doctor_id UUID REFERENCES employees(id),
  issue_date DATE NOT NULL,
  medications JSONB NOT NULL,  -- Array of {name, dosage, frequency, duration}
  instructions TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Lab Tests
CREATE TABLE lab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  medical_record_id UUID REFERENCES medical_records(id),
  test_type VARCHAR(100) NOT NULL,
  ordered_by UUID REFERENCES employees(id),
  ordered_date DATE NOT NULL,
  performed_date DATE,
  results JSONB,
  status VARCHAR(20) CHECK (status IN ('ordered', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 3. AUTO SERVICE MODULE (ავტოსერვისი)

#### Database Schema
```sql
-- Vehicles
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  license_plate VARCHAR(20) UNIQUE NOT NULL,
  vin VARCHAR(17) UNIQUE,
  make VARCHAR(50) NOT NULL,
  model VARCHAR(50) NOT NULL,
  year INT NOT NULL,
  color VARCHAR(30),
  engine_type VARCHAR(50),
  transmission VARCHAR(20),
  owner_id UUID REFERENCES clients(id),
  current_mileage INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Service Jobs
CREATE TABLE service_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES vehicles(id),
  customer_id UUID REFERENCES clients(id),
  mechanic_id UUID REFERENCES employees(id),
  job_date DATE NOT NULL,
  mileage_at_service INT,
  status VARCHAR(20) CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  estimated_completion_date DATE,
  actual_completion_date DATE,
  total_labor_cost DECIMAL(10, 2) DEFAULT 0,
  total_parts_cost DECIMAL(10, 2) DEFAULT 0,
  total_cost DECIMAL(10, 2) GENERATED ALWAYS AS (total_labor_cost + total_parts_cost) STORED,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Service Items (what was done)
CREATE TABLE service_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES service_jobs(id) ON DELETE CASCADE,
  service_type VARCHAR(100) NOT NULL,  -- 'Oil Change', 'Brake Pads', etc.
  description TEXT,
  labor_hours DECIMAL(5, 2),
  labor_rate DECIMAL(10, 2),
  labor_cost DECIMAL(10, 2) GENERATED ALWAYS AS (labor_hours * labor_rate) STORED,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Parts Used
CREATE TABLE service_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES service_jobs(id) ON DELETE CASCADE,
  part_id UUID REFERENCES products(id),  -- Reference to parts inventory
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2),
  total_price DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Service History (for quick lookup)
CREATE MATERIALIZED VIEW vehicle_service_history AS
SELECT 
  v.id AS vehicle_id,
  v.license_plate,
  v.make,
  v.model,
  COUNT(sj.id) AS total_services,
  MAX(sj.job_date) AS last_service_date,
  SUM(sj.total_cost) AS total_spent
FROM vehicles v
LEFT JOIN service_jobs sj ON v.id = sj.vehicle_id AND sj.status = 'completed'
GROUP BY v.id, v.license_plate, v.make, v.model;
```

---

## IMPLEMENTATION TIMELINE

### AI Features (Phase 2)
- **Week 1-2:** Demand Forecasting (simple algorithm)
- **Week 3-4:** Price Optimization
- **Week 5-6:** Invoice OCR integration
- **Week 7:** Testing & refinement

### Multi-Industry Modules (Phase 2-3)
- **Construction:** 4 კვირა
  - Week 1: Database schema + basic CRUD
  - Week 2: BOQ & Material Orders
  - Week 3: Gantt chart & project tracking
  - Week 4: Reports & analytics

- **Clinic:** 3 კვირა
  - Week 1: Patient management + appointments
  - Week 2: Medical records + prescriptions
  - Week 3: Lab tests + reports

- **Auto Service:** 2.5 კვირა
  - Week 1: Vehicle database + service jobs
  - Week 2: Parts tracking + labor management
  - Week 2.5: Service history + reminders

---

## კონკურენტული უპირატესობა

### AI Features
- **პირველი ქართულ ბაზარზე** 🏆
- Demand forecasting → +15-25% გაყიდვები
- Price optimization → +10-20% მოგება
- Invoice OCR → 90% დროის დაზოგვა

### Multi-Industry
- **Construction:** უზარმაზარი ბაზარი, სუსტი კონკურენცია
- **Clinic:** კარგი margin, მაღალი retention
- **Auto Service:** recurring revenue, loyalty

**ROI:**
- AI Features: 6-12 თვე payback period
- Industry Modules: immediate (pricing premium)

მზად ვარ დეტალურად დავეხმარო იმპლემენტაციაში! 💪
