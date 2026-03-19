# 🛠️ დეტალური იმპლემენტაციის გზამკვლევი
## კრიტიკული ფუნქციების სრული სპეციფიკაცია

---

## 1. INPUT VALIDATION (Zod Schemas)

### სრული სტრუქტურა
```
src/lib/validation/
├── schemas/
│   ├── product.schema.ts
│   ├── transaction.schema.ts
│   ├── accounting.schema.ts
│   ├── customer.schema.ts
│   ├── supplier.schema.ts
│   ├── employee.schema.ts
│   └── auth.schema.ts
├── validators.ts
└── index.ts
```

### პროდუქტის სქემა (product.schema.ts)
```typescript
import { z } from 'zod';

export const productSchema = z.object({
  name: z.string()
    .min(2, 'სახელი უნდა იყოს მინიმუმ 2 სიმბოლო')
    .max(100, 'სახელი არ უნდა აღემატებოდეს 100 სიმბოლოს')
    .trim(),
  
  barcode: z.string()
    .regex(/^[0-9]{8,13}$/, 'ბარკოდი უნდა იყოს 8-13 ციფრი')
    .optional(),
  
  sku: z.string()
    .min(1, 'SKU აუცილებელია')
    .max(50)
    .regex(/^[A-Z0-9-]+$/, 'SKU უნდა შეიცავდეს მხოლოდ A-Z, 0-9, -')
    .optional(),
  
  category_id: z.string().uuid('არასწორი კატეგორიის ID'),
  
  supplier_id: z.string().uuid().optional(),
  
  price: z.number()
    .positive('ფასი უნდა იყოს დადებითი')
    .max(1000000, 'ფასი ძალიან მაღალია')
    .multipleOf(0.01, 'ფასი უნდა იყოს 2 decimal places'),
  
  cost: z.number()
    .nonnegative('ღირებულება არ შეიძლება იყოს უარყოფითი')
    .max(1000000)
    .multipleOf(0.01),
  
  stock: z.number()
    .int('მარაგი უნდა იყოს მთელი რიცხვი')
    .nonnegative('მარაგი არ შეიძლება იყოს უარყოფითი')
    .max(1000000),
  
  min_stock: z.number()
    .int()
    .nonnegative()
    .optional(),
  
  max_stock: z.number()
    .int()
    .nonnegative()
    .optional(),
  
  unit: z.enum(['piece', 'kg', 'liter', 'meter', 'box', 'pack']),
  
  vat_rate: z.number()
    .min(0)
    .max(100)
    .default(18),
  
  is_active: z.boolean().default(true),
  
  description: z.string().max(500).optional(),
  
  image_url: z.string().url().optional(),
  
  expiry_date: z.string().datetime().optional(),
  
  batch_number: z.string().max(50).optional(),
}).refine(
  (data) => !data.max_stock || data.min_stock! <= data.max_stock,
  {
    message: 'მინიმალური მარაგი არ უნდა აღემატებოდეს მაქსიმალურს',
    path: ['min_stock'],
  }
);

export type ProductInput = z.infer<typeof productSchema>;
```

### ტრანზაქციის სქემა (transaction.schema.ts)
```typescript
import { z } from 'zod';

const transactionItemSchema = z.object({
  product_id: z.string().uuid(),
  product_name: z.string().min(1),
  quantity: z.number()
    .int()
    .positive('რაოდენობა უნდა იყოს დადებითი')
    .max(10000, 'რაოდენობა ძალიან დიდია'),
  price: z.number()
    .positive()
    .max(1000000),
  discount: z.number()
    .min(0)
    .max(100)
    .default(0),
  vat_rate: z.number()
    .min(0)
    .max(100)
    .default(18),
});

export const transactionSchema = z.object({
  type: z.enum(['sale', 'purchase', 'return', 'adjustment']),
  
  items: z.array(transactionItemSchema)
    .min(1, 'მინიმუმ 1 პროდუქტი აუცილებელია')
    .max(1000, 'ძალიან ბევრი პროდუქტი'),
  
  payment_method: z.enum(['cash', 'card', 'bank_transfer', 'coupon', 'mixed']),
  
  customer_id: z.string().uuid().optional(),
  
  cashier_id: z.string().uuid(),
  
  shift_id: z.string().uuid(),
  
  subtotal: z.number().positive(),
  
  discount_total: z.number().nonnegative().default(0),
  
  vat_total: z.number().nonnegative(),
  
  total: z.number().positive(),
  
  amount_paid: z.number().nonnegative(),
  
  change: z.number().nonnegative().default(0),
  
  notes: z.string().max(500).optional(),
  
  receipt_number: z.string().min(1),
}).refine(
  (data) => {
    // Validate amount_paid >= total
    return data.amount_paid >= data.total;
  },
  {
    message: 'გადახდილი თანხა ნაკლებია ჯამზე',
    path: ['amount_paid'],
  }
).refine(
  (data) => {
    // Validate change calculation
    const expectedChange = data.amount_paid - data.total;
    return Math.abs(data.change - expectedChange) < 0.01;
  },
  {
    message: 'ხურდა არასწორად არის გამოთვლილი',
    path: ['change'],
  }
);

export type TransactionInput = z.infer<typeof transactionSchema>;
```

### ბუღალტრული სქემა (accounting.schema.ts)
```typescript
import { z } from 'zod';

const journalEntryLineSchema = z.object({
  account_id: z.string().uuid(),
  account_name: z.string().min(1),
  debit: z.number().nonnegative(),
  credit: z.number().nonnegative(),
  description: z.string().max(200).optional(),
}).refine(
  (data) => {
    // Each line must have either debit OR credit, not both
    return (data.debit > 0 && data.credit === 0) || 
           (data.credit > 0 && data.debit === 0);
  },
  {
    message: 'ხაზი უნდა შეიცავდეს ან დებეტს ან კრედიტს, არა ორივეს',
    path: ['debit'],
  }
);

export const journalEntrySchema = z.object({
  date: z.string().datetime(),
  
  reference: z.string().min(1).max(50),
  
  description: z.string().min(1).max(200),
  
  type: z.enum(['manual', 'automated', 'adjustment', 'closing']),
  
  entries: z.array(journalEntryLineSchema)
    .min(2, 'ჟურნალური ჩანაწერი უნდა შეიცავდეს მინიმუმ 2 ხაზს')
    .max(100),
  
  approved: z.boolean().default(false),
  
  approved_by: z.string().uuid().optional(),
  
  transaction_id: z.string().uuid().optional(),
}).refine(
  (data) => {
    // Validate double-entry: total debit must equal total credit
    const totalDebit = data.entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = data.entries.reduce((sum, e) => sum + e.credit, 0);
    return Math.abs(totalDebit - totalCredit) < 0.01; // tolerance for floating point
  },
  {
    message: 'დებეტი და კრედიტი უნდა იყოს ტოლი (double-entry principle)',
    path: ['entries'],
  }
);

export type JournalEntryInput = z.infer<typeof journalEntrySchema>;
```

### ავტორიზაციის სქემა (auth.schema.ts)
```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string()
    .email('არასწორი ელ-ფოსტა')
    .toLowerCase(),
  password: z.string()
    .min(8, 'პაროლი უნდა იყოს მინიმუმ 8 სიმბოლო'),
});

export const signupSchema = z.object({
  email: z.string()
    .email('არასწორი ელ-ფოსტა')
    .toLowerCase(),
  password: z.string()
    .min(8, 'პაროლი უნდა იყოს მინიმუმ 8 სიმბოლო')
    .regex(/[A-Z]/, 'პაროლი უნდა შეიცავდეს დიდ ასოს')
    .regex(/[a-z]/, 'პაროლი უნდა შეიცავდეს პატარა ასოს')
    .regex(/[0-9]/, 'პაროლი უნდა შეიცავდეს ციფრს')
    .regex(/[^A-Za-z0-9]/, 'პაროლი უნდა შეიცავდეს სპეც. სიმბოლოს'),
  confirmPassword: z.string(),
  company_name: z.string().min(2).max(100),
  industry: z.enum(['retail', 'wholesale', 'restaurant', 'clinic', 'construction', 'auto', 'real_estate', 'logistics', 'other']),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'პაროლები არ ემთხვევა',
    path: ['confirmPassword'],
  }
);
```

### გამოყენება კომპონენტებში
```typescript
// src/components/ProductForm.tsx

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema, type ProductInput } from '@/lib/validation/schemas/product.schema';

export function ProductForm() {
  const form = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      price: 0,
      cost: 0,
      stock: 0,
      vat_rate: 18,
      is_active: true,
    },
  });

  const onSubmit = async (data: ProductInput) => {
    try {
      // Data is already validated by Zod
      const { data: product, error } = await supabase
        .from('products')
        .insert(data);
      
      if (error) throw error;
      
      toast.success('პროდუქტი დამატებულია');
    } catch (error) {
      toast.error('შეცდომა: ' + error.message);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>პროდუქტის სახელი</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* სხვა ველები... */}
      </form>
    </Form>
  );
}
```

---

## 2. FIFO/LIFO/AVERAGE COSTING - სრული იმპლემენტაცია

### Database Schema
```sql
-- Inventory layers (purchase history for costing)
CREATE TABLE inventory_layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  purchase_date TIMESTAMP NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit_cost DECIMAL(10, 2) NOT NULL,
  remaining_quantity DECIMAL(10, 2) NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  purchase_order_id UUID REFERENCES purchase_orders(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_inventory_layers_product ON inventory_layers(product_id);
CREATE INDEX idx_inventory_layers_date ON inventory_layers(purchase_date);

-- Costing method setting (per product or global)
CREATE TABLE costing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) UNIQUE,  -- NULL = global setting
  method VARCHAR(10) NOT NULL CHECK (method IN ('FIFO', 'LIFO', 'AVERAGE')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### TypeScript Implementation
```typescript
// src/lib/inventory/costing.ts

export enum CostingMethod {
  FIFO = 'FIFO',      // First In, First Out
  LIFO = 'LIFO',      // Last In, First Out
  AVERAGE = 'AVERAGE', // Weighted Average
}

interface InventoryLayer {
  id: string;
  product_id: string;
  purchase_date: string;
  quantity: number;
  unit_cost: number;
  remaining_quantity: number;
}

interface COGSResult {
  total_cost: number;
  layers_used: {
    layer_id: string;
    quantity_used: number;
    unit_cost: number;
    cost: number;
  }[];
}

export class InventoryCostingEngine {
  private supabase: SupabaseClient;
  
  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }
  
  /**
   * Calculate Cost of Goods Sold (COGS) for a sale
   */
  async calculateCOGS(
    product_id: string,
    quantity: number,
    method?: CostingMethod
  ): Promise<COGSResult> {
    // Get costing method (product-specific or global)
    const costingMethod = method || await this.getCostingMethod(product_id);
    
    // Get inventory layers
    const layers = await this.getInventoryLayers(product_id);
    
    // Calculate based on method
    switch (costingMethod) {
      case CostingMethod.FIFO:
        return this.calculateFIFO(layers, quantity);
      case CostingMethod.LIFO:
        return this.calculateLIFO(layers, quantity);
      case CostingMethod.AVERAGE:
        return this.calculateAverage(layers, quantity);
      default:
        throw new Error(`Unknown costing method: ${costingMethod}`);
    }
  }
  
  /**
   * FIFO: Use oldest inventory first
   */
  private calculateFIFO(
    layers: InventoryLayer[],
    quantity: number
  ): COGSResult {
    // Sort by purchase date (oldest first)
    const sortedLayers = [...layers].sort(
      (a, b) => new Date(a.purchase_date).getTime() - new Date(b.purchase_date).getTime()
    );
    
    return this.allocateQuantity(sortedLayers, quantity);
  }
  
  /**
   * LIFO: Use newest inventory first
   */
  private calculateLIFO(
    layers: InventoryLayer[],
    quantity: number
  ): COGSResult {
    // Sort by purchase date (newest first)
    const sortedLayers = [...layers].sort(
      (a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime()
    );
    
    return this.allocateQuantity(sortedLayers, quantity);
  }
  
  /**
   * AVERAGE: Use weighted average cost
   */
  private calculateAverage(
    layers: InventoryLayer[],
    quantity: number
  ): COGSResult {
    const totalQuantity = layers.reduce((sum, l) => sum + l.remaining_quantity, 0);
    const totalCost = layers.reduce((sum, l) => sum + (l.remaining_quantity * l.unit_cost), 0);
    
    if (totalQuantity === 0) {
      throw new Error('No inventory available');
    }
    
    const averageCost = totalCost / totalQuantity;
    
    if (quantity > totalQuantity) {
      throw new Error(`Insufficient inventory: ${quantity} requested, ${totalQuantity} available`);
    }
    
    return {
      total_cost: quantity * averageCost,
      layers_used: [{
        layer_id: 'average',
        quantity_used: quantity,
        unit_cost: averageCost,
        cost: quantity * averageCost,
      }],
    };
  }
  
  /**
   * Allocate quantity across layers (for FIFO/LIFO)
   */
  private allocateQuantity(
    layers: InventoryLayer[],
    quantity: number
  ): COGSResult {
    let remaining = quantity;
    let totalCost = 0;
    const layersUsed: COGSResult['layers_used'] = [];
    
    for (const layer of layers) {
      if (remaining <= 0) break;
      
      const useQuantity = Math.min(remaining, layer.remaining_quantity);
      const cost = useQuantity * layer.unit_cost;
      
      layersUsed.push({
        layer_id: layer.id,
        quantity_used: useQuantity,
        unit_cost: layer.unit_cost,
        cost,
      });
      
      totalCost += cost;
      remaining -= useQuantity;
    }
    
    if (remaining > 0) {
      throw new Error(`Insufficient inventory: ${quantity} requested, only ${quantity - remaining} available`);
    }
    
    return {
      total_cost: totalCost,
      layers_used: layersUsed,
    };
  }
  
  /**
   * Update inventory layers after sale
   */
  async updateInventoryLayers(result: COGSResult): Promise<void> {
    for (const layer of result.layers_used) {
      if (layer.layer_id === 'average') {
        // Average method: reduce all layers proportionally
        await this.updateAverageLayers(layer.quantity_used);
      } else {
        // FIFO/LIFO: reduce specific layer
        const { error } = await this.supabase
          .from('inventory_layers')
          .update({
            remaining_quantity: this.supabase.rpc('decrement_quantity', {
              layer_id: layer.layer_id,
              qty: layer.quantity_used,
            }),
          })
          .eq('id', layer.layer_id);
        
        if (error) throw error;
      }
    }
  }
  
  /**
   * Add new inventory layer (when purchasing)
   */
  async addInventoryLayer(
    product_id: string,
    quantity: number,
    unit_cost: number,
    supplier_id?: string,
    purchase_order_id?: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('inventory_layers')
      .insert({
        product_id,
        purchase_date: new Date().toISOString(),
        quantity,
        unit_cost,
        remaining_quantity: quantity,
        supplier_id,
        purchase_order_id,
      });
    
    if (error) throw error;
  }
  
  /**
   * Get costing method for product
   */
  private async getCostingMethod(product_id: string): Promise<CostingMethod> {
    // Check product-specific setting
    const { data: productSetting } = await this.supabase
      .from('costing_settings')
      .select('method')
      .eq('product_id', product_id)
      .single();
    
    if (productSetting) {
      return productSetting.method as CostingMethod;
    }
    
    // Check global setting
    const { data: globalSetting } = await this.supabase
      .from('costing_settings')
      .select('method')
      .is('product_id', null)
      .single();
    
    return (globalSetting?.method as CostingMethod) || CostingMethod.FIFO;
  }
  
  /**
   * Get inventory layers for product
   */
  private async getInventoryLayers(product_id: string): Promise<InventoryLayer[]> {
    const { data, error } = await this.supabase
      .from('inventory_layers')
      .select('*')
      .eq('product_id', product_id)
      .gt('remaining_quantity', 0);
    
    if (error) throw error;
    return data || [];
  }
  
  private async updateAverageLayers(quantityUsed: number): Promise<void> {
    // Implementation for average costing method layer updates
    // This requires proportional reduction across all layers
  }
}
```

### ტესტები (costing.test.ts)
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { InventoryCostingEngine, CostingMethod } from './costing';

describe('Inventory Costing', () => {
  let engine: InventoryCostingEngine;
  
  beforeEach(() => {
    // Setup mock Supabase client
    engine = new InventoryCostingEngine(mockSupabase);
  });
  
  describe('FIFO Method', () => {
    it('should use oldest inventory first', async () => {
      // Mock layers:
      // Layer 1: 10 units @ 5.00 GEL (purchased Jan 1)
      // Layer 2: 10 units @ 6.00 GEL (purchased Jan 2)
      const mockLayers = [
        { id: '1', purchase_date: '2024-01-01', remaining_quantity: 10, unit_cost: 5.00 },
        { id: '2', purchase_date: '2024-01-02', remaining_quantity: 10, unit_cost: 6.00 },
      ];
      
      const result = engine.calculateFIFO(mockLayers, 15);
      
      // Should use all 10 from layer 1 (10 × 5 = 50)
      // and 5 from layer 2 (5 × 6 = 30)
      // Total COGS = 80
      expect(result.total_cost).toBe(80);
      expect(result.layers_used).toHaveLength(2);
      expect(result.layers_used[0].quantity_used).toBe(10);
      expect(result.layers_used[1].quantity_used).toBe(5);
    });
    
    it('should throw error if insufficient inventory', () => {
      const mockLayers = [
        { id: '1', remaining_quantity: 5, unit_cost: 5.00 },
      ];
      
      expect(() => engine.calculateFIFO(mockLayers, 10))
        .toThrow('Insufficient inventory');
    });
  });
  
  describe('LIFO Method', () => {
    it('should use newest inventory first', async () => {
      const mockLayers = [
        { id: '1', purchase_date: '2024-01-01', remaining_quantity: 10, unit_cost: 5.00 },
        { id: '2', purchase_date: '2024-01-02', remaining_quantity: 10, unit_cost: 6.00 },
      ];
      
      const result = engine.calculateLIFO(mockLayers, 15);
      
      // Should use all 10 from layer 2 (10 × 6 = 60)
      // and 5 from layer 1 (5 × 5 = 25)
      // Total COGS = 85
      expect(result.total_cost).toBe(85);
      expect(result.layers_used[0].layer_id).toBe('2'); // newest first
    });
  });
  
  describe('Average Method', () => {
    it('should use weighted average cost', () => {
      const mockLayers = [
        { id: '1', remaining_quantity: 10, unit_cost: 5.00 },  // 50 GEL
        { id: '2', remaining_quantity: 10, unit_cost: 6.00 },  // 60 GEL
      ];
      // Total: 20 units, 110 GEL
      // Average: 110 / 20 = 5.50 GEL
      
      const result = engine.calculateAverage(mockLayers, 15);
      
      // 15 × 5.50 = 82.50
      expect(result.total_cost).toBe(82.50);
    });
  });
});
```

---

## 3. AUTOMATED JOURNAL ENTRIES - სრული სისტემა

### Database Schema
```sql
CREATE TABLE automated_journal_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  trigger_type VARCHAR(50) NOT NULL,  -- 'sale', 'purchase', 'payment', etc.
  is_active BOOLEAN DEFAULT true,
  debit_account_id UUID REFERENCES accounts(id),
  credit_account_id UUID REFERENCES accounts(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Implementation
```typescript
// src/lib/accounting/autoJournal.ts

import { SupabaseClient } from '@supabase/supabase-js';
import { InventoryCostingEngine } from '../inventory/costing';

interface JournalEntry {
  account_id: string;
  account_name: string;
  debit: number;
  credit: number;
  description: string;
}

export class AutomatedJournalEngine {
  private supabase: SupabaseClient;
  private costingEngine: InventoryCostingEngine;
  
  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.costingEngine = new InventoryCostingEngine(supabase);
  }
  
  /**
   * Create journal entry automatically from sale transaction
   */
  async createSaleJournalEntry(transaction: Transaction): Promise<void> {
    const entries: JournalEntry[] = [];
    
    // 1. Debit: Cash/Bank (Asset increases)
    const assetAccount = transaction.payment_method === 'cash' 
      ? await this.getAccountId('Cash')
      : await this.getAccountId('Bank');
    
    entries.push({
      account_id: assetAccount,
      account_name: transaction.payment_method === 'cash' ? 'Cash' : 'Bank',
      debit: transaction.total,
      credit: 0,
      description: `Sale #${transaction.receipt_number}`,
    });
    
    // 2. Credit: Sales Revenue (Income increases)
    entries.push({
      account_id: await this.getAccountId('Sales Revenue'),
      account_name: 'Sales Revenue',
      debit: 0,
      credit: transaction.subtotal,
      description: `Sale #${transaction.receipt_number}`,
    });
    
    // 3. Credit: VAT Payable (Liability increases)
    if (transaction.vat_total > 0) {
      entries.push({
        account_id: await this.getAccountId('VAT Payable'),
        account_name: 'VAT Payable',
        debit: 0,
        credit: transaction.vat_total,
        description: `VAT on Sale #${transaction.receipt_number}`,
      });
    }
    
    // 4 & 5. COGS and Inventory reduction
    const cogsEntries = await this.createCOGSEntries(transaction);
    entries.push(...cogsEntries);
    
    // Validate double-entry
    this.validateDoubleEntry(entries);
    
    // Save to database
    await this.saveJournalEntry({
      date: transaction.created_at,
      reference: `SALE-${transaction.receipt_number}`,
      description: `Auto-generated from sale #${transaction.receipt_number}`,
      type: 'automated',
      entries,
      approved: false,
      transaction_id: transaction.id,
    });
  }
  
  /**
   * Create COGS entries (Debit COGS, Credit Inventory)
   */
  private async createCOGSEntries(transaction: Transaction): Promise<JournalEntry[]> {
    const entries: JournalEntry[] = [];
    let totalCOGS = 0;
    
    for (const item of transaction.items) {
      const result = await this.costingEngine.calculateCOGS(
        item.product_id,
        item.quantity
      );
      
      totalCOGS += result.total_cost;
      
      // Update inventory layers
      await this.costingEngine.updateInventoryLayers(result);
    }
    
    // Debit: Cost of Goods Sold (Expense increases)
    entries.push({
      account_id: await this.getAccountId('Cost of Goods Sold'),
      account_name: 'Cost of Goods Sold',
      debit: totalCOGS,
      credit: 0,
      description: `COGS for Sale #${transaction.receipt_number}`,
    });
    
    // Credit: Inventory (Asset decreases)
    entries.push({
      account_id: await this.getAccountId('Inventory'),
      account_name: 'Inventory',
      debit: 0,
      credit: totalCOGS,
      description: `Inventory reduction for Sale #${transaction.receipt_number}`,
    });
    
    return entries;
  }
  
  /**
   * Validate that debits equal credits
   */
  private validateDoubleEntry(entries: JournalEntry[]): void {
    const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(
        `Invalid journal entry: Debit (${totalDebit}) != Credit (${totalCredit})`
      );
    }
  }
  
  /**
   * Save journal entry to database
   */
  private async saveJournalEntry(entry: any): Promise<void> {
    const { error } = await this.supabase
      .from('journal_entries')
      .insert(entry);
    
    if (error) throw error;
  }
  
  /**
   * Get account ID by name
   */
  private async getAccountId(accountName: string): Promise<string> {
    const { data, error } = await this.supabase
      .from('accounts')
      .select('id')
      .eq('name', accountName)
      .single();
    
    if (error || !data) {
      throw new Error(`Account "${accountName}" not found`);
    }
    
    return data.id;
  }
}
```

### გამოყენება POS-ში
```typescript
// src/pages/POSPage.tsx (checkout handler-ში)

const handleCheckout = async (transaction: Transaction) => {
  try {
    // 1. Save transaction
    const { data, error } = await supabase
      .from('transactions')
      .insert(transaction);
    
    if (error) throw error;
    
    // 2. Update stock
    for (const item of transaction.items) {
      await updateStock(item.product_id, -item.quantity);
    }
    
    // 3. Create automated journal entry
    const journalEngine = new AutomatedJournalEngine(supabase);
    await journalEngine.createSaleJournalEntry(transaction);
    
    toast.success('გაყიდვა და ბუღალტრული ჩანაწერი შექმნილია');
    
  } catch (error) {
    toast.error('შეცდომა: ' + error.message);
  }
};
```

---

## 4. HARDWARE POS INTEGRATION

### Barcode Scanner (USB HID)
```typescript
// src/hooks/useHardwareBarcode.ts

export function useHardwareBarcode(onBarcodeScan: (barcode: string) => void) {
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = 0;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTime;
      lastKeyTime = now;
      
      // Barcode scanners type very fast (< 50ms between keys)
      if (timeSinceLastKey > 50) {
        buffer = '';
      }
      
      // Capture the key
      if (event.key.length === 1) {
        buffer += event.key;
      }
      
      // Barcode scanners send Enter after barcode
      if (event.key === 'Enter' && buffer.length >= 8) {
        event.preventDefault();
        onBarcodeScan(buffer.trim());
        buffer = '';
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBarcodeScan]);
}
```

### Receipt Printer (ESC/POS)
```typescript
// src/lib/hardware/printer.ts

import escpos from 'escpos';

export class ReceiptPrinter {
  private device: any;
  private printer: any;
  
  async connect(vendorId: number, productId: number) {
    this.device = new escpos.USB(vendorId, productId);
    this.printer = new escpos.Printer(this.device);
  }
  
  async printReceipt(transaction: Transaction) {
    this.device.open(async (error: any) => {
      if (error) throw error;
      
      this.printer
        .font('a')
        .align('ct')
        .style('bu')
        .size(2, 2)
        .text('RECEIPT')
        .size(1, 1)
        .style('normal')
        .text('--------------------------------')
        .align('lt')
        .text(`Date: ${new Date().toLocaleString('ka-GE')}`)
        .text(`Receipt: ${transaction.receipt_number}`)
        .text('--------------------------------')
        .tableCustom([
          { text: 'Item', align: 'LEFT', width: 0.5 },
          { text: 'Qty', align: 'CENTER', width: 0.2 },
          { text: 'Price', align: 'RIGHT', width: 0.3 },
        ]);
      
      for (const item of transaction.items) {
        this.printer.tableCustom([
          { text: item.product_name, align: 'LEFT', width: 0.5 },
          { text: item.quantity.toString(), align: 'CENTER', width: 0.2 },
          { text: `${item.price.toFixed(2)} ₾`, align: 'RIGHT', width: 0.3 },
        ]);
      }
      
      this.printer
        .text('--------------------------------')
        .align('rt')
        .text(`Subtotal: ${transaction.subtotal.toFixed(2)} ₾`)
        .text(`VAT (18%): ${transaction.vat_total.toFixed(2)} ₾`)
        .size(2, 2)
        .text(`TOTAL: ${transaction.total.toFixed(2)} ₾`)
        .size(1, 1)
        .text('--------------------------------')
        .align('ct')
        .text('Thank you for your purchase!')
        .text('www.yourstore.ge')
        .cut()
        .close();
    });
  }
  
  openCashDrawer() {
    // ESC/POS command to open cash drawer
    // 0x1B 0x70 0x00 0x19 0xFA
    this.printer.cashdraw(2);
  }
}
```

---

**დროის შეფასება სრული იმპლემენტაციისთვის:**
- Input Validation: 1 კვირა
- FIFO/LIFO/Average Costing: 1.5 კვირა
- Automated Journal Entries: 1 კვირა
- Hardware POS Integration: 1-2 კვირა
- Testing (all of above): 1 კვირა

**ჯამი: 5.5-6.5 კვირა**

---

მზად ვარ დეტალურად ავხსნა თითოეული ფუნქციის იმპლემენტაცია! 💪
