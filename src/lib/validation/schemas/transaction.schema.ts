import { z } from 'zod';

const transactionItemSchema = z.object({
  product_id: z.string().uuid(),
  product_name: z.string().min(1),
  quantity: z.number()
    .positive('რაოდენობა უნდა იყოს დადებითი')
    .max(10000, 'რაოდენობა ძალიან დიდია'),
  price: z.number()
    .positive('ფასი უნდა იყოს დადებითი')
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
  
  customer_id: z.string().uuid().optional().or(z.literal('')),
  
  cashier_id: z.string().uuid(),
  
  shift_id: z.string().uuid().optional(),
  
  subtotal: z.number().positive(),
  
  discount_total: z.number().nonnegative().default(0),
  
  vat_total: z.number().nonnegative(),
  
  total: z.number().positive(),
  
  amount_paid: z.number().nonnegative(),
  
  change: z.number().nonnegative().default(0),
  
  notes: z.string().max(500).optional().or(z.literal('')),
  
  receipt_number: z.string().min(1),
}).refine(
  (data) => {
    // Return validation allows negative or zero values in edge cases, but for sales:
    if (data.type === 'sale') {
      return data.amount_paid >= data.total;
    }
    return true; // Other types might not need this strict validation
  },
  {
    message: 'გადახდილი თანხა ნაკლებია ჯამზე',
    path: ['amount_paid'],
  }
).refine(
  (data) => {
    if (data.type === 'sale' && data.amount_paid >= data.total) {
      const expectedChange = Number((data.amount_paid - data.total).toFixed(2));
      const actualChange = Number(data.change.toFixed(2));
      return Math.abs(actualChange - expectedChange) <= 0.02; // Small tolerance for floating point errors
    }
    return true;
  },
  {
    message: 'ხურდა არასწორად არის გამოთვლილი',
    path: ['change'],
  }
);

export type TransactionInput = z.infer<typeof transactionSchema>;
