import { z } from 'zod';

const journalEntryLineSchema = z.object({
  account_id: z.string().uuid(),
  account_name: z.string().min(1),
  debit: z.number().nonnegative(),
  credit: z.number().nonnegative(),
  description: z.string().max(200).optional().or(z.literal('')),
}).refine(
  (data) => {
    // Each line must have either debit OR credit (one > 0, other = 0)
    return (data.debit > 0 && data.credit === 0) || 
           (data.credit > 0 && data.debit === 0) ||
           (data.debit === 0 && data.credit === 0); // Allow empty lines for UX but will be removed
  },
  {
    message: 'ხაზი უნდა შეიცავდეს ან დებეტს ან კრედიტს, არა ორივეს',
    path: ['debit'],
  }
);

export const journalEntrySchema = z.object({
  date: z.string().datetime().or(z.string()), // Accept ISO string
  
  reference: z.string().min(1).max(50),
  
  description: z.string().min(1).max(200),
  
  type: z.enum(['manual', 'automated', 'adjustment', 'closing']).default('manual'),
  
  entries: z.array(journalEntryLineSchema)
    .min(2, 'ჟურნალური ჩანაწერი უნდა შეიცავდეს მინიმუმ 2 ხაზს')
    .max(100),
  
  approved: z.boolean().default(false),
  
  approved_by: z.string().uuid().optional().or(z.literal('')),
  
  transaction_id: z.string().uuid().optional().or(z.literal('')),
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
).refine(
  (data) => {
    // At least one valid debit and one valid credit must exist
    const hasDebit = data.entries.some(e => e.debit > 0);
    const hasCredit = data.entries.some(e => e.credit > 0);
    return hasDebit && hasCredit;
  },
  {
    message: 'ჟურნალური ჩანაწერი უნდა შეიცავდეს მინიმუმ ერთ დებეტს და ერთ კრედიტს',
    path: ['entries'],
  }
);

export type JournalEntryInput = z.infer<typeof journalEntrySchema>;
