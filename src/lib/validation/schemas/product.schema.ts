import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().min(1, 'სახელი აუცილებელია').max(100).trim(),
  name_en: z.string().max(100).optional().or(z.literal('')),
  name_ru: z.string().max(100).optional().or(z.literal('')),
  name_az: z.string().max(100).optional().or(z.literal('')),
  
  description: z.string().max(500).optional().or(z.literal('')),
  description_en: z.string().max(500).optional().or(z.literal('')),
  description_ru: z.string().max(500).optional().or(z.literal('')),
  description_az: z.string().max(500).optional().or(z.literal('')),
  
  barcode: z.string().optional().or(z.literal('')),
  sku: z.string().max(50).optional().or(z.literal('')),
  
  category_id: z.string().uuid('არასწორი კატეგორიის ID').optional().or(z.literal('')),
  supplier_id: z.string().uuid().optional().or(z.literal('')),
  
  sell_price: z.number().nonnegative('გასაყიდი ფასი არ შეიძლება იყოს უარყოფითი').max(1000000).multipleOf(0.01),
  buy_price: z.number().nonnegative('შესყიდვის ფასი არ შეიძლება იყოს უარყოფითი').max(1000000).multipleOf(0.01).default(0),
  
  // Legacy fields for backward compatibility if needed
  price: z.number().nonnegative().optional(),
  cost: z.number().nonnegative().optional(),
  
  type: z.enum(['product', 'service']).default('product'),
  
  stock: z.number().int('მარაგი უნდა იყოს მთელი რიცხვი').nonnegative('მარაგი არ შეიძლება იყოს უარყოფითი').max(1000000),
  min_stock: z.number().int().nonnegative().default(0),
  max_stock: z.number().int().nonnegative().optional(),
  
  unit: z.string().default('ცალი'),
  vat_rate: z.number().min(0).max(100).default(18),
  is_active: z.boolean().default(true),
  images: z.array(z.string()).optional().default([]),
  
  image_url: z.string().url().optional().or(z.literal('')),
  expiry_date: z.string().datetime().optional().or(z.literal('')),
  batch_number: z.string().max(50).optional().or(z.literal('')),
}).refine(
  (data) => !data.max_stock || !data.min_stock || data.min_stock <= data.max_stock,
  {
    message: 'მინიმალური მარაგი არ უნდა აღემატებოდეს მაქსიმალურს',
    path: ['min_stock'],
  }
);

export type ProductInput = z.infer<typeof productSchema>;
