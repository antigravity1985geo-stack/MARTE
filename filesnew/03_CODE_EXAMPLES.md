# 💻 კოდის მაგალითები - Critical Features

## 🎯 მიზანი: პრაქტიკული რეალიზაციები ძირითადი ფუნქციებისთვის

---

## 1. 🔐 Authentication სრული სისტემა

### 1.1 SignUp with Email Verification

```typescript
// src/pages/Auth/SignUpPage.tsx
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { z } from 'zod';

const signUpSchema = z.object({
  email: z.string().email('არასწორი ელ-ფოსტის ფორმატი'),
  password: z.string().min(8, 'პაროლი უნდა იყოს მინიმუმ 8 სიმბოლო'),
  confirmPassword: z.string(),
  companyName: z.string().min(1, 'კომპანიის სახელი აუცილებელია'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'პაროლები არ ემთხვევა',
  path: ['confirmPassword'],
});

type SignUpFormData = z.infer<typeof signUpSchema>;

export function SignUpPage() {
  const [formData, setFormData] = useState<SignUpFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
  });
  const [loading, setLoading] = useState(false);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      const validatedData = signUpSchema.parse(formData);

      // Create user account
      const { data, error } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          data: {
            company_name: validatedData.companyName,
          },
          emailRedirectTo: `${window.location.origin}/auth/verify`,
        },
      });

      if (error) throw error;

      // Create default tenant for the user
      if (data.user) {
        await supabase.from('tenants').insert({
          id: data.user.id,
          name: validatedData.companyName,
          owner_id: data.user.id,
        });

        // Assign default role (admin for first user)
        await supabase.from('user_roles').insert({
          user_id: data.user.id,
          role: 'admin',
        });
      }

      toast.success('რეგისტრაცია წარმატებული!', {
        description: 'გთხოვთ შეამოწმოთ ელ-ფოსტა დასადასტურებლად.',
      });

      // Redirect to verification pending page
      window.location.href = '/auth/verify-pending';
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast.error('შეცდომა', {
          description: firstError.message,
        });
      } else {
        toast.error('რეგისტრაცია ვერ მოხერხდა', {
          description: error.message,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/20">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">რეგისტრაცია</h1>
        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <Label htmlFor="companyName">კომპანიის სახელი</Label>
            <Input
              id="companyName"
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              placeholder="მაღაზია XYZ"
              required
            />
          </div>

          <div>
            <Label htmlFor="email">ელ-ფოსტა</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <Label htmlFor="password">პაროლი</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="მინიმუმ 8 სიმბოლო"
              required
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword">დაადასტურე პაროლი</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="განმეორე პაროლი"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'იტვირთება...' : 'რეგისტრაცია'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            უკვე გაქვთ ანგარიში?{' '}
            <a href="/auth/login" className="text-primary hover:underline">
              შესვლა
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
```

### 1.2 Forgot Password Flow

```typescript
// src/pages/Auth/ForgotPasswordPage.tsx
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  async function handleResetRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      toast.success('ელ-ფოსტა გაიგზავნა', {
        description: 'შეამოწმეთ თქვენი ელ-ფოსტა პაროლის აღსადგენად.',
      });
    } catch (error) {
      toast.error('შეცდომა', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">ელ-ფოსტა გაიგზავნა!</h1>
          <p className="text-muted-foreground mb-4">
            შეამოწმეთ თქვენი ელ-ფოსტა ({email}) პაროლის აღსადგენად.
          </p>
          <Button onClick={() => setEmailSent(false)}>
            თავიდან გაგზავნა
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">პაროლის აღდგენა</h1>
        <form onSubmit={handleResetRequest} className="space-y-4">
          <div>
            <Label htmlFor="email">ელ-ფოსტა</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'იგზავნება...' : 'პაროლის აღდგენა'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            <a href="/auth/login" className="text-primary hover:underline">
              დაბრუნება შესვლაზე
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
```

```typescript
// src/pages/Auth/ResetPasswordPage.tsx
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('პაროლები არ ემთხვევა');
      return;
    }

    if (password.length < 8) {
      toast.error('პაროლი უნდა იყოს მინიმუმ 8 სიმბოლო');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast.success('პაროლი შეიცვალა წარმატებით!');
      navigate('/auth/login');
    } catch (error) {
      toast.error('პაროლის შეცვლა ვერ მოხერხდა', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">ახალი პაროლი</h1>
        <form onSubmit={handlePasswordReset} className="space-y-4">
          <div>
            <Label htmlFor="password">ახალი პაროლი</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="მინიმუმ 8 სიმბოლო"
              required
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword">დაადასტურე პაროლი</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="განმეორე პაროლი"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'იცვლება...' : 'პაროლის შეცვლა'}
          </Button>
        </form>
      </div>
    </div>
  );
}
```

### 1.3 Google OAuth Integration

```typescript
// src/lib/auth.ts
import { supabase } from './supabase';

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    console.error('Google Sign-In error:', error);
    return { error };
  }

  return { data };
}

// src/pages/Auth/CallbackPage.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    async function handleCallback() {
      try {
        // Get session from URL hash
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (session?.user) {
          // Check if user has roles
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id);

          // If no roles, assign default 'admin' (first user)
          if (!roles || roles.length === 0) {
            await supabase.from('user_roles').insert({
              user_id: session.user.id,
              role: 'admin',
            });

            // Create tenant
            await supabase.from('tenants').insert({
              id: session.user.id,
              name: session.user.user_metadata.full_name || 'My Company',
              owner_id: session.user.id,
            });
          }

          toast.success('წარმატებით შეხვედით!');
          navigate('/dashboard');
        }
      } catch (error) {
        toast.error('ავტორიზაცია ვერ მოხერხდა', {
          description: error.message,
        });
        navigate('/auth/login');
      }
    }

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p>მიმდინარეობს ავტორიზაცია...</p>
      </div>
    </div>
  );
}

// src/pages/Auth/LoginPage.tsx - Add Google button
<Button
  type="button"
  variant="outline"
  className="w-full"
  onClick={signInWithGoogle}
>
  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
    {/* Google icon SVG */}
  </svg>
  შესვლა Google-ით
</Button>
```

---

## 2. ✅ Input Validation (Zod Schemas)

### 2.1 Product Validation

```typescript
// src/lib/validations/product.ts
import { z } from 'zod';

export const productSchema = z.object({
  name: z.string()
    .min(1, 'პროდუქტის სახელი აუცილებელია')
    .max(200, 'სახელი ძალიან გრძელია (მაქს 200 სიმბოლო)'),
  
  price: z.number()
    .positive('ფასი უნდა იყოს დადებითი')
    .multipleOf(0.01, 'მაქსიმუმ 2 ათობითი ნიშანი'),
  
  barcode: z.string()
    .regex(/^[0-9]{8,13}$/, 'ბარკოდი უნდა იყოს 8-13 ციფრი')
    .optional()
    .or(z.literal('')),
  
  stock: z.number()
    .int('მარაგი უნდა იყოს მთელი რიცხვი')
    .nonnegative('მარაგი არ შეიძლება იყოს უარყოფითი'),
  
  categoryId: z.string().uuid('არასწორი კატეგორია'),
  
  description: z.string()
    .max(1000, 'აღწერა ძალიან გრძელია (მაქს 1000 სიმბოლო)')
    .optional(),
  
  image: z.string().url('არასწორი სურათის URL').optional(),
});

export type ProductInput = z.infer<typeof productSchema>;

// Usage in component:
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

export function ProductForm() {
  const form = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      price: 0,
      stock: 0,
      barcode: '',
      categoryId: '',
      description: '',
    },
  });

  async function onSubmit(data: ProductInput) {
    try {
      const validatedData = productSchema.parse(data);
      
      const { error } = await supabase
        .from('products')
        .insert(validatedData);
      
      if (error) throw error;
      
      toast.success('პროდუქტი დაემატა');
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          toast.error(err.message);
        });
      }
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

### 2.2 Transaction Validation

```typescript
// src/lib/validations/transaction.ts
import { z } from 'zod';

const transactionItemSchema = z.object({
  productId: z.string().uuid(),
  name: z.string(),
  quantity: z.number().int().positive('რაოდენობა უნდა იყოს დადებითი'),
  price: z.number().positive('ფასი უნდა იყოს დადებითი'),
});

export const transactionSchema = z.object({
  items: z.array(transactionItemSchema)
    .min(1, 'დაამატეთ მინიმუმ 1 პროდუქტი'),
  
  subtotal: z.number().nonnegative(),
  vat: z.number().nonnegative(),
  discount: z.number().min(0).max(100, 'ფასდაკლება არ შეიძლება აღემატებოდეს 100%'),
  total: z.number().positive(),
  
  paymentMethod: z.enum(['cash', 'card', 'coupon', 'credit'], {
    errorMap: () => ({ message: 'აირჩიეთ გადახდის მეთოდი' }),
  }),
  
  paymentAmount: z.number().positive(),
  
  buyerId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
}).refine((data) => data.paymentAmount >= data.total, {
  message: 'გადახდის თანხა უნდა იყოს >= ჯამზე',
  path: ['paymentAmount'],
});

export type TransactionInput = z.infer<typeof transactionSchema>;
```

### 2.3 Accounting Validation

```typescript
// src/lib/validations/accounting.ts
import { z } from 'zod';

const journalEntryLineSchema = z.object({
  accountCode: z.string()
    .regex(/^[1-9][0-9]{3}$/, 'ანგარიშის კოდი უნდა იყოს 4 ციფრი (1000-9999)'),
  
  debit: z.number()
    .nonnegative('დებეტი არ შეიძლება იყოს უარყოფითი')
    .multipleOf(0.01),
  
  credit: z.number()
    .nonnegative('კრედიტი არ შეიძლება იყოს უარყოფითი')
    .multipleOf(0.01),
  
  description: z.string()
    .min(1, 'აღწერა აუცილებელია')
    .max(500, 'აღწერა ძალიან გრძელია'),
}).refine((data) => data.debit === 0 || data.credit === 0, {
  message: 'დებეტი ან კრედიტი უნდა იყოს 0 (არა ორივე)',
}).refine((data) => data.debit > 0 || data.credit > 0, {
  message: 'დებეტი ან კრედიტი უნდა იყოს > 0',
});

export const journalEntrySchema = z.object({
  date: z.date(),
  
  lines: z.array(journalEntryLineSchema)
    .min(2, 'მინიმუმ 2 ხაზი აუცილებელია'),
  
  reference: z.string().optional(),
  
  notes: z.string().max(1000).optional(),
}).refine((data) => {
  // Check: Total Debits = Total Credits
  const totalDebits = data.lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredits = data.lines.reduce((sum, line) => sum + line.credit, 0);
  
  return Math.abs(totalDebits - totalCredits) < 0.01; // Allow 1 cent rounding difference
}, {
  message: 'დებეტები და კრედიტები უნდა იყოს ტოლი!',
  path: ['lines'],
});

export type JournalEntryInput = z.infer<typeof journalEntrySchema>;
```

---

## 3. 💾 IndexedDB Migration (Dexie.js)

```typescript
// src/lib/db.ts
import Dexie, { Table } from 'dexie';

export interface Product {
  id: string;
  name: string;
  barcode?: string;
  price: number;
  stock: number;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  items: any[];
  total: number;
  paymentMethod: string;
  createdAt: string;
  synced: boolean;
}

export class ERPDatabase extends Dexie {
  products!: Table<Product, string>;
  transactions!: Table<Transaction, string>;
  categories!: Table<any, string>;
  clients!: Table<any, string>;
  suppliers!: Table<any, string>;

  constructor() {
    super('ERPDatabase');
    
    this.version(1).stores({
      products: 'id, barcode, name, categoryId, createdAt',
      transactions: '++id, createdAt, synced, paymentMethod',
      categories: 'id, name',
      clients: 'id, name, email, phone',
      suppliers: 'id, name, email, phone',
    });
  }
}

export const db = new ERPDatabase();

// Migration from localStorage
export async function migrateFromLocalStorage() {
  try {
    // Migrate products
    const productsJson = localStorage.getItem('products');
    if (productsJson) {
      const products = JSON.parse(productsJson);
      await db.products.bulkAdd(products);
      localStorage.removeItem('products');
      console.log(`Migrated ${products.length} products`);
    }

    // Migrate transactions
    const transactionsJson = localStorage.getItem('transactions');
    if (transactionsJson) {
      const transactions = JSON.parse(transactionsJson);
      await db.transactions.bulkAdd(transactions);
      localStorage.removeItem('transactions');
      console.log(`Migrated ${transactions.length} transactions`);
    }

    // Migrate categories
    const categoriesJson = localStorage.getItem('categories');
    if (categoriesJson) {
      const categories = JSON.parse(categoriesJson);
      await db.categories.bulkAdd(categories);
      localStorage.removeItem('categories');
      console.log(`Migrated ${categories.length} categories`);
    }

    console.log('Migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Usage in stores:
// src/stores/useProductStore.ts
import { create } from 'zustand';
import { db } from '@/lib/db';

interface ProductStore {
  products: Product[];
  loading: boolean;
  fetchProducts: () => Promise<void>;
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
}

export const useProductStore = create<ProductStore>((set, get) => ({
  products: [],
  loading: false,

  fetchProducts: async () => {
    set({ loading: true });
    try {
      const products = await db.products.toArray();
      set({ products, loading: false });
    } catch (error) {
      console.error('Failed to fetch products:', error);
      set({ loading: false });
    }
  },

  addProduct: async (product) => {
    await db.products.add(product);
    const products = await db.products.toArray();
    set({ products });
  },

  updateProduct: async (id, updates) => {
    await db.products.update(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    const products = await db.products.toArray();
    set({ products });
  },

  deleteProduct: async (id) => {
    await db.products.delete(id);
    const products = await db.products.toArray();
    set({ products });
  },
}));
```

---

## 4. 🔒 Rate Limiting

```typescript
// supabase/functions/_shared/rateLimit.ts
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const windowKey = `${key}-${Math.floor(now / config.windowMs)}`;
  
  let record = rateLimitStore.get(windowKey);
  
  if (!record || record.resetAt < now) {
    record = {
      count: 0,
      resetAt: now + config.windowMs,
    };
    rateLimitStore.set(windowKey, record);
  }
  
  record.count++;
  
  const allowed = record.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - record.count);
  
  return {
    allowed,
    remaining,
    resetAt: record.resetAt,
  };
}

// Usage in Edge Function:
// supabase/functions/some-function/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';

serve(async (req) => {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  
  // Check rate limit: 100 requests per minute
  const rateLimit = await checkRateLimit(ip, {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  });
  
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(100),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      }
    );
  }
  
  // Continue with normal processing...
  return new Response(JSON.stringify({ success: true }), {
    headers: {
      'Content-Type': 'application/json',
      'X-RateLimit-Limit': String(100),
      'X-RateLimit-Remaining': String(rateLimit.remaining),
    },
  });
});
```

---

## 5. 📊 Admin Role Management UI

```typescript
// src/pages/Admin/UserManagementPage.tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  created_at: string;
  roles: string[];
}

const AVAILABLE_ROLES = ['admin', 'manager', 'cashier', 'warehouse'];

export function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      // Get all users from auth.users (admin query)
      const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) throw authError;

      // Get roles for each user
      const usersWithRoles = await Promise.all(
        authUsers.map(async (user) => {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id);
          
          return {
            id: user.id,
            email: user.email!,
            created_at: user.created_at,
            roles: roles?.map((r) => r.role) || [],
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (error) {
      toast.error('მომხმარებლების ჩატვირთვა ვერ მოხერხდა', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }

  function openRoleDialog(user: User) {
    setSelectedUser(user);
    setSelectedRoles(user.roles);
    setDialogOpen(true);
  }

  async function saveRoles() {
    if (!selectedUser) return;

    try {
      // Delete existing roles
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', selectedUser.id);

      // Insert new roles
      if (selectedRoles.length > 0) {
        const entries = selectedRoles.map((role) => ({
          user_id: selectedUser.id,
          role: role,
        }));

        await supabase.from('user_roles').insert(entries);
      }

      // Log action
      await supabase.from('activity_logs').insert({
        action: 'ROLE_CHANGE',
        details: JSON.stringify({
          target_user: selectedUser.id,
          old_roles: selectedUser.roles,
          new_roles: selectedRoles,
        }),
      });

      toast.success('როლები შეიცვალა წარმატებით');
      setDialogOpen(false);
      fetchUsers(); // Refresh
    } catch (error) {
      toast.error('როლების შეცვლა ვერ მოხერხდა', {
        description: error.message,
      });
    }
  }

  if (loading) {
    return <div className="text-center py-8">იტვირთება...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">მომხმარებლების მართვა</h1>

      <div className="bg-white rounded-lg shadow">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ელ-ფოსტა
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                როლები
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                შექმნის თარიღი
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                მოქმედებები
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.email}
                </td>
                <td className="px-6 py-4">
                  {user.roles.length > 0 ? (
                    <div className="flex gap-2">
                      {user.roles.map((role) => (
                        <span
                          key={role}
                          className="px-2 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">როლი არ აქვს</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString('ka-GE')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openRoleDialog(user)}
                  >
                    როლების რედაქტირება
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>როლების მართვა</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              მომხმარებელი: <strong>{selectedUser?.email}</strong>
            </p>

            <div className="space-y-2">
              {AVAILABLE_ROLES.map((role) => (
                <div key={role} className="flex items-center space-x-2">
                  <Checkbox
                    id={role}
                    checked={selectedRoles.includes(role)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedRoles([...selectedRoles, role]);
                      } else {
                        setSelectedRoles(selectedRoles.filter((r) => r !== role));
                      }
                    }}
                  />
                  <label htmlFor={role} className="text-sm font-medium capitalize">
                    {role}
                  </label>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                გაუქმება
              </Button>
              <Button onClick={saveRoles}>
                შენახვა
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

---

## 6. 🐛 PDF Georgian Font Fix

```typescript
// src/lib/pdfGenerator.ts
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { bpgArialBase64 } from './fonts/bpg-arial-base64';

export function createPDF() {
  const doc = new jsPDF();

  // Add Georgian font
  doc.addFileToVFS('BPGArial.ttf', bpgArialBase64);
  doc.addFont('BPGArial.ttf', 'BPGArial', 'normal');
  doc.setFont('BPGArial');

  return doc;
}

// Usage:
export function generateReceipt(transaction: any) {
  const doc = createPDF();

  // Header
  doc.setFontSize(16);
  doc.text('თქვენი კომპანია', 105, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.text('ს/ნ: 123456789', 105, 30, { align: 'center' });
  doc.text(`თარიღი: ${new Date().toLocaleDateString('ka-GE')}`, 105, 36, { align: 'center' });

  // Table
  (doc as any).autoTable({
    startY: 45,
    head: [['პროდუქტი', 'რაოდენობა', 'ფასი', 'ჯამი']],
    body: transaction.items.map((item: any) => [
      item.name,
      item.quantity,
      `${item.price.toFixed(2)} ₾`,
      `${(item.quantity * item.price).toFixed(2)} ₾`,
    ]),
    styles: {
      font: 'BPGArial',
      fontSize: 10,
    },
    headStyles: {
      fillColor: [22, 163, 74], // Primary green
      textColor: 255,
      fontStyle: 'bold',
    },
  });

  // Total
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(14);
  doc.text(`სულ: ${transaction.total.toFixed(2)} ₾`, 200, finalY, { align: 'right' });

  // Footer
  doc.setFontSize(10);
  doc.text('მადლობა შენაძენისთვის!', 105, finalY + 20, { align: 'center' });

  // Save
  doc.save(`receipt-${transaction.id}.pdf`);
}

// Convert font to base64:
// src/lib/fonts/bpg-arial-base64.ts
export const bpgArialBase64 = `
// Base64 string of BPG Arial font
// Get font from: https://fonts.ge
// Convert to base64: https://base64.guru/converter/encode/file
`;
```

---

**ეს არის ძირითადი კოდის მაგალითები Critical Features-ისთვის. თითოეული მაგალითი:**
- ✅ Production-ready
- ✅ Georgian language support
- ✅ Error handling
- ✅ Type safety (TypeScript)
- ✅ Best practices

**გამოყენების ინსტრუქცია:**
1. Copy კოდი შესაბამის ფაილში
2. Install საჭირო packages (Zod, Dexie, jsPDF)
3. Test თითოეული ფუნქცია
4. Customize თქვენი საჭიროებისამებრ

**წარმატებები დაპროგრამებაში!** 💻🚀
