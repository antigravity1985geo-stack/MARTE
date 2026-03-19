# 📋 PRIORITIZED TASK LIST - შემდეგი 3 კვირა

## 🎯 მიზანი: Production-Ready ERP სისტემა

**სულ დავალებები:** 47
**კრიტიკული:** 23
**მაღალი პრიორიტეტი:** 16
**საშუალო პრიორიტეტი:** 8

---

## 📅 კვირა 1: Authentication & Security Foundation

### დღე 1-2: Authentication სრული რეალიზაცია

**Task 1.1: Implement SignUp Flow** ⏱️ 4h
```typescript
// Location: src/pages/Auth/SignUpPage.tsx
// დავალება:
1. შექმენი SignUpPage component
2. დააიმპლემენტირე supabase.auth.signUp()
3. დაამატე email verification flow
4. გაგზავნე welcome email
5. ავტომატური role assignment (default: 'user')

// Success criteria:
- User can register with email/password
- Verification email sent
- User redirected to verification pending page
- After verification, user can login
```

**Task 1.2: Email Verification Flow** ⏱️ 3h
```typescript
// Location: src/pages/Auth/VerifyEmailPage.tsx
// დავალება:
1. შექმენი verification landing page
2. Parse URL token
3. Verify email with Supabase
4. Redirect to login with success message

// Success criteria:
- Clicking email link verifies account
- User sees success message
- User can now login
```

**Task 1.3: Forgot Password Flow** ⏱️ 4h
```typescript
// Location: src/pages/Auth/ForgotPasswordPage.tsx
// დავალება:
1. Password reset request page
2. supabase.auth.resetPasswordForEmail()
3. Password reset confirmation page
4. Update password with new password

// Success criteria:
- User can request password reset
- Reset email sent
- User can set new password
- User can login with new password
```

**Task 1.4: Google OAuth Integration** ⏱️ 4h
```typescript
// Location: src/lib/auth.ts
// დავალება:
1. Configure Google OAuth in Supabase Dashboard
2. Add Google Sign-In button
3. Handle OAuth callback
4. Auto-create user_roles entry
5. Sync with tenant system

// Success criteria:
- "Sign in with Google" button works
- User authenticated via Google
- User roles assigned automatically
- User sees dashboard after OAuth login
```

**Task 1.5: Session Management** ⏱️ 3h
```typescript
// Location: src/hooks/useAuth.ts
// დავალება:
1. Token refresh logic
2. Handle session expiry
3. Multi-session support (optional)
4. Force logout functionality (admin)

// Success criteria:
- Sessions auto-refresh before expiry
- Expired sessions redirect to login
- User sees "Session expired" message
```

---

### დღე 3-4: Input Validation (Zod Schemas)

**Task 2.1: Product Validation Schema** ⏱️ 3h
```typescript
// Location: src/lib/validations/product.ts
// დავალება:
1. Define productSchema with Zod
2. Validate name, price, barcode, stock, category
3. Add Georgian error messages
4. Integrate with ProductForm component

// Fields to validate:
- name: required, 1-200 chars
- price: positive, max 2 decimals
- barcode: 8-13 digits, optional
- stock: non-negative integer
- categoryId: UUID format
```

**Task 2.2: Transaction Validation Schema** ⏱️ 3h
```typescript
// Location: src/lib/validations/transaction.ts
// დავალება:
- items: array, min 1 item
- payment: positive, >= total
- paymentMethod: enum (cash, card, coupon)
- discount: 0-100%
```

**Task 2.3: Accounting Validation Schema** ⏱️ 4h
```typescript
// Location: src/lib/validations/accounting.ts
// დავალება:
- Journal entry: debit = credit (always!)
- Account code: valid format (1000-9999)
- Amount: positive, max 2 decimals
- Description: required, max 500 chars
```

**Task 2.4: User Input Validation** ⏱️ 2h
```typescript
// Location: src/lib/validations/user.ts
// დავალება:
- email: RFC 5322 compliant
- phone: Georgian format (+995...)
- taxId: 11 digits
- name: 1-100 chars
```

**Task 2.5: Form Integration** ⏱️ 4h
```typescript
// Location: src/components/forms/*
// დავალება:
1. Integrate Zod with react-hook-form
2. Show validation errors in UI
3. Prevent submit if invalid
4. Add field-level validation (on blur)

// Test all forms:
- ProductForm
- TransactionForm
- JournalEntryForm
- UserForm
```

---

### დღე 5-6: Bug Fixes

**Task 3.1: Fix localStorage Overflow** ⏱️ 6h
```typescript
// Location: src/lib/db.ts (new file)
// დავალება:
1. Install Dexie.js: npm install dexie
2. Create IndexedDB schema
3. Migrate all data from localStorage to IndexedDB
4. Update all stores to use IndexedDB
5. Keep only auth tokens in localStorage

// Affected stores:
- useProductStore
- useCategoryStore
- useTransactionStore
- useAccountingStore
- etc.

// Migration script:
async function migrateFromLocalStorage() {
  const products = JSON.parse(localStorage.getItem('products') || '[]');
  await db.products.bulkAdd(products);
  localStorage.removeItem('products');
  // Repeat for all stores
}
```

**Task 3.2: Fix PDF Georgian Fonts** ⏱️ 4h
```typescript
// Location: src/lib/pdfGenerator.ts
// დავალება:
1. Download BPG Arial font (TTF format)
2. Convert to base64
3. Embed in jsPDF
4. Test all PDF exports (receipts, reports, invoices)

// Font embedding:
import { jsPDF } from 'jspdf';
import bpgArialBase64 from './fonts/bpg-arial-base64.ts';

const doc = new jsPDF();
doc.addFileToVFS('BPGArial.ttf', bpgArialBase64);
doc.addFont('BPGArial.ttf', 'BPGArial', 'normal');
doc.setFont('BPGArial');
```

**Task 3.3: Fix Excel UTF-8 Encoding** ⏱️ 2h
```typescript
// Location: src/lib/excelExport.ts
// დავალება:
1. Add UTF-8 BOM to Excel exports
2. Use correct MIME type
3. Test Georgian characters in all exports

// Fix:
import * as XLSX from 'xlsx';

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

const wbout = XLSX.write(wb, { 
  bookType: 'xlsx', 
  type: 'array',
  bookSST: false,
  cellStyles: true 
});

// Add BOM
const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), wbout], {
  type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
});
```

**Task 3.4: Fix Mobile Cart Drawer Scroll** ⏱️ 2h
```typescript
// Location: src/components/pos/CartDrawer.tsx
// დავალება:
1. Fix overflow-y behavior
2. Prevent body scroll when drawer open
3. Test on iOS Safari, Android Chrome

// Fix:
<Sheet>
  <SheetContent className="overflow-y-auto">
    <div className="flex flex-col h-full">
      <SheetHeader className="flex-none">...</SheetHeader>
      <div className="flex-1 overflow-y-auto">
        {/* Cart items */}
      </div>
      <SheetFooter className="flex-none">...</SheetFooter>
    </div>
  </SheetContent>
</Sheet>
```

**Task 3.5: Fix Date Picker Timezone** ⏱️ 3h
```typescript
// Location: src/lib/dateUtils.ts
// დავალება:
1. Store all dates in UTC
2. Display in Georgia timezone (Asia/Tbilisi)
3. Use date-fns for conversions
4. Update all date pickers

// Utility functions:
import { formatInTimeZone, toDate } from 'date-fns-tz';

export function toUTC(date: Date): Date {
  return new Date(date.toISOString());
}

export function toGeorgianTime(date: Date): string {
  return formatInTimeZone(date, 'Asia/Tbilisi', 'yyyy-MM-dd HH:mm:ss');
}
```

---

### დღე 7: Security Hardening

**Task 4.1: Rate Limiting** ⏱️ 4h
```typescript
// Location: supabase/functions/_shared/rateLimit.ts
// დავალება:
1. Implement rate limiter in Edge Functions
2. 100 requests/minute per IP
3. 5 login attempts per 15 minutes
4. 1000 API calls per hour per user

// Implementation:
import { createClient } from '@supabase/supabase-js';

const rateLimitCache = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(
  ip: string, 
  limit: number, 
  windowMs: number
): Promise<boolean> {
  const now = Date.now();
  const key = `${ip}-${Math.floor(now / windowMs)}`;
  
  const current = rateLimitCache.get(key) || { count: 0, resetAt: now + windowMs };
  
  if (current.count >= limit) {
    return false; // Rate limit exceeded
  }
  
  current.count++;
  rateLimitCache.set(key, current);
  
  return true;
}
```

**Task 4.2: CSRF Protection** ⏱️ 2h
```typescript
// Location: src/lib/security.ts
// დავალება:
1. Validate origin headers in Edge Functions
2. Use SameSite cookies (Supabase does this by default)
3. Add CSRF token for state-changing operations

// Supabase Auth already has PKCE flow (secure)
// Additional check in Edge Functions:
const origin = request.headers.get('origin');
const allowedOrigins = [
  'https://yourdomain.com',
  'http://localhost:5173', // dev
];

if (!allowedOrigins.includes(origin)) {
  return new Response('Forbidden', { status: 403 });
}
```

**Task 4.3: XSS Prevention** ⏱️ 3h
```typescript
// Location: src/lib/security.ts
// დავალება:
1. Install DOMPurify: npm install dompurify
2. Sanitize all user inputs
3. Add Content Security Policy headers

// Sanitization:
import DOMPurify from 'dompurify';

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p'],
    ALLOWED_ATTR: ['href'],
  });
}

// CSP headers (in Edge Functions):
response.headers.set(
  'Content-Security-Policy',
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
);
```

**Task 4.4: Audit Logging Enhancement** ⏱️ 3h
```typescript
// Location: src/lib/auditLogger.ts
// დავალება:
1. Log all admin actions
2. Log financial transactions
3. Log role changes
4. 1-year retention

// Database table (already exists):
// activity_logs table

async function logAction(action: string, details: any) {
  await supabase.from('activity_logs').insert({
    user_id: user.id,
    action: action,
    details: JSON.stringify(details),
    ip_address: request.headers.get('x-forwarded-for'),
    user_agent: request.headers.get('user-agent'),
    created_at: new Date().toISOString(),
  });
}

// Usage:
await logAction('ROLE_CHANGE', {
  target_user: targetUserId,
  old_role: 'user',
  new_role: 'admin',
});
```

---

## 📅 კვირა 2: Admin UI & Monitoring

### დღე 8-10: Admin Role Management UI

**Task 5.1: User List Page** ⏱️ 4h
```typescript
// Location: src/pages/Admin/UserManagementPage.tsx
// დავალება:
1. Fetch all users from auth.users
2. Join with user_roles
3. Display in table (name, email, roles, created_at)
4. Search & filter functionality
5. Pagination (50 users per page)

// Query:
const { data: users } = await supabase
  .from('user_roles')
  .select(`
    *,
    user:auth.users(id, email, created_at)
  `);
```

**Task 5.2: Role Assignment Dialog** ⏱️ 4h
```typescript
// Location: src/components/admin/RoleAssignmentDialog.tsx
// დავალება:
1. Select user from list
2. Multi-select roles (checkboxes)
3. Save changes
4. Show confirmation toast

// Roles available:
- admin
- manager  
- cashier
- warehouse

// Save function:
async function assignRoles(userId: string, roles: string[]) {
  // Delete existing roles
  await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId);
  
  // Insert new roles
  const entries = roles.map(role => ({
    user_id: userId,
    role: role,
  }));
  
  await supabase.from('user_roles').insert(entries);
  
  // Log action
  await logAction('ROLE_CHANGE', { userId, roles });
}
```

**Task 5.3: Role Permissions Matrix** ⏱️ 3h
```typescript
// Location: src/pages/Admin/RolePermissionsPage.tsx
// დავალება:
1. Display role → permission mapping
2. Visual grid (read-only)
3. Show which role can access which pages

// Example matrix:
const permissions = {
  admin: ['*'], // all permissions
  manager: ['dashboard', 'reports', 'products', 'sales', 'accounting'],
  cashier: ['pos', 'sales'],
  warehouse: ['warehouse', 'receiving', 'inventory'],
};
```

**Task 5.4: Audit Log Viewer** ⏱️ 4h
```typescript
// Location: src/pages/Admin/AuditLogPage.tsx
// დავალება:
1. Display activity_logs table
2. Filter by: user, action, date range
3. Pagination
4. Export to Excel

// Important actions to track:
- ROLE_CHANGE
- USER_DELETE
- JOURNAL_ENTRY_CREATE
- JOURNAL_ENTRY_DELETE
- PRICE_CHANGE
- STOCK_ADJUSTMENT
```

**Task 5.5: Bulk Role Operations** ⏱️ 3h
```typescript
// Location: src/components/admin/BulkRoleActions.tsx
// დავალება:
1. Select multiple users (checkboxes)
2. Assign role to all selected
3. Remove role from all selected
4. Confirmation dialog

// Use case:
// "Assign 'cashier' role to 10 new employees at once"
```

---

### დღე 11-12: Error Monitoring (Sentry)

**Task 6.1: Sentry Setup** ⏱️ 2h
```bash
# Install Sentry
npm install @sentry/react @sentry/tracing

# Create account at sentry.io
# Get DSN (Data Source Name)
```

**Task 6.2: Sentry Configuration** ⏱️ 2h
```typescript
// Location: src/main.tsx
import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [new BrowserTracing()],
  tracesSampleRate: 1.0, // 100% of transactions
  environment: import.meta.env.MODE, // 'development' or 'production'
  beforeSend(event, hint) {
    // Don't send errors in development
    if (import.meta.env.MODE === 'development') {
      return null;
    }
    return event;
  },
});
```

**Task 6.3: Error Boundaries** ⏱️ 4h
```typescript
// Location: src/components/ErrorBoundary.tsx
import { ErrorBoundary as SentryErrorBoundary } from '@sentry/react';

function FallbackComponent({ error, resetError }: any) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1>რაღაც არასწორად მოხდა</h1>
      <p>{error.message}</p>
      <button onClick={resetError}>სცადე თავიდან</button>
    </div>
  );
}

// Wrap App:
<SentryErrorBoundary fallback={FallbackComponent}>
  <App />
</SentryErrorBoundary>
```

**Task 6.4: Performance Monitoring** ⏱️ 3h
```typescript
// Location: src/lib/monitoring.ts
import * as Sentry from "@sentry/react";

// Track slow queries
export function trackQuery(name: string, duration: number) {
  if (duration > 1000) { // > 1 second
    Sentry.captureMessage(`Slow query: ${name} took ${duration}ms`, 'warning');
  }
}

// Track large renders
export function trackRender(component: string, duration: number) {
  if (duration > 500) { // > 500ms
    Sentry.captureMessage(`Slow render: ${component} took ${duration}ms`, 'warning');
  }
}

// Usage in components:
const start = Date.now();
// ... expensive operation ...
trackQuery('products.getAll', Date.now() - start);
```

**Task 6.5: Custom Alerts** ⏱️ 2h
```typescript
// Location: Sentry Dashboard
// დავალება:
1. Set up email alerts for critical errors
2. Set up Slack/Telegram notifications
3. Define alert thresholds:
   - > 10 errors in 1 hour → alert
   - > 50 errors in 1 day → critical alert
   - Error rate > 1% → alert
```

---

### დღე 13-14: Database Backup & Testing

**Task 7.1: Supabase Backup Configuration** ⏱️ 2h
```typescript
// Location: Supabase Dashboard
// დავალება:
1. Enable Point-in-Time Recovery (Pro plan)
2. Set retention: 7 days
3. Configure daily backups
4. Test restore procedure

// Verify backups:
- Daily automated backups at 2 AM UTC
- 7-day retention
- Can restore to any point in last 7 days
```

**Task 7.2: Custom Backup Script** ⏱️ 4h
```typescript
// Location: supabase/functions/backup-critical-data/index.ts
// დავალება:
1. Export critical tables to JSON
2. Upload to S3/R2
3. Schedule: every 6 hours

// Critical tables:
- products
- transactions
- journal_entries
- user_roles

// Backup function:
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export async function backupCriticalData() {
  const supabase = createClient(...);
  const s3 = new S3Client({...});
  
  const tables = ['products', 'transactions', 'journal_entries'];
  
  for (const table of tables) {
    const { data } = await supabase.from(table).select('*');
    
    const backup = {
      table: table,
      timestamp: new Date().toISOString(),
      data: data,
    };
    
    await s3.send(new PutObjectCommand({
      Bucket: 'erp-backups',
      Key: `${table}/${new Date().toISOString()}.json`,
      Body: JSON.stringify(backup),
    }));
  }
}
```

**Task 7.3: Restore Testing** ⏱️ 3h
```typescript
// Location: documentation/disaster-recovery.md
// დავალება:
1. Document restore procedure
2. Test restore from backup
3. Verify data integrity
4. Define RTO (Recovery Time Objective): 1 hour
5. Define RPO (Recovery Point Objective): 6 hours

// Monthly restore drill:
// - Restore to staging environment
// - Verify all data
// - Test application functionality
```

**Task 7.4: Accounting Tests** ⏱️ 6h
```typescript
// Location: src/__tests__/accounting.test.ts
// დავალება:
1. Test debit = credit validation
2. Test trial balance calculation
3. Test P&L calculation
4. Test VAT calculation

import { describe, it, expect } from 'vitest';
import { calculateTrialBalance } from '../lib/accounting';

describe('Accounting Calculations', () => {
  it('should balance debits and credits', () => {
    const entries = [
      { debit: 1000, credit: 0 },
      { debit: 0, credit: 1000 },
    ];
    
    const result = calculateTrialBalance(entries);
    expect(result.totalDebits).toBe(result.totalCredits);
  });
  
  it('should calculate VAT correctly', () => {
    const amount = 100;
    const vat = calculateVAT(amount, 0.18);
    expect(vat).toBe(18);
  });
});
```

**Task 7.5: POS Flow Tests** ⏱️ 6h
```typescript
// Location: src/__tests__/pos.test.tsx
// დავალება:
1. Test add to cart
2. Test apply discount
3. Test payment processing
4. Test stock update
5. Test receipt generation

import { render, screen, fireEvent } from '@testing-library/react';
import { POSPage } from '../pages/POSPage';

describe('POS Flow', () => {
  it('should add product to cart', () => {
    render(<POSPage />);
    const productCard = screen.getByText('Coca Cola');
    fireEvent.click(productCard);
    
    expect(screen.getByText('1 x Coca Cola')).toBeInTheDocument();
  });
  
  it('should apply discount', () => {
    render(<POSPage />);
    // ... test discount logic
  });
});
```

**Task 7.6: Integration Tests** ⏱️ 4h
```typescript
// Location: src/__tests__/integration.test.ts
// დავალება:
1. Test database transactions
2. Test real-time sync
3. Test RS.GE integration (mock)

describe('Database Integration', () => {
  it('should insert and retrieve product', async () => {
    const product = {
      name: 'Test Product',
      price: 10.99,
      stock: 100,
    };
    
    const { data } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single();
    
    expect(data.name).toBe('Test Product');
  });
});
```

---

## 📅 კვირა 3: Finalization & Documentation

### დღე 15-17: Final QA & Performance

**Task 8.1: Performance Audit** ⏱️ 4h
```typescript
// Location: Performance testing
// დავალება:
1. Run Lighthouse audit (all pages)
2. Target scores:
   - Performance: > 90
   - Accessibility: > 95
   - Best Practices: > 90
   - SEO: > 80

// Fix common issues:
- Add lazy loading for images
- Code splitting for pages
- Optimize bundle size
- Add caching headers
```

**Task 8.2: Load Testing** ⏱️ 3h
```typescript
// Location: tests/load/
// Tool: k6 (https://k6.io)

// Install: brew install k6

// Test script:
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up
    { duration: '5m', target: 50 }, // Stay at 50 users
    { duration: '2m', target: 100 }, // Spike to 100
    { duration: '5m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests < 500ms
  },
};

export default function () {
  const res = http.get('https://yourdomain.com/api/products');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
```

**Task 8.3: Mobile Testing** ⏱️ 4h
```typescript
// Location: Manual testing
// დავალება:
1. Test on iOS Safari (iPhone)
2. Test on Android Chrome (Samsung)
3. Test PWA installation
4. Test offline mode
5. Test responsive breakpoints

// Critical flows to test:
- Login/logout
- POS transaction
- Add product
- View reports
- Print receipt
```

**Task 8.4: Cross-browser Testing** ⏱️ 2h
```typescript
// Location: Manual testing
// Browsers:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

// Test critical features in each browser
```

**Task 8.5: Security Scan** ⏱️ 2h
```bash
# Run OWASP ZAP scan
docker run -v $(pwd):/zap/wrk/:rw \
  -t owasp/zap2docker-stable zap-baseline.py \
  -t https://yourdomain.com -r report.html

# Review findings
# Fix any HIGH or MEDIUM severity issues
```

---

### დღე 18-20: Documentation

**Task 9.1: User Manual (Georgian)** ⏱️ 8h
```markdown
# Location: docs/user-manual-ge.md
# დავალება:
1. შესავალი (რა არის ERP, როგორ დავიწყოთ)
2. POS სისტემის გამოყენება
3. პროდუქტების მართვა
4. ბუღალტერია
5. ანგარიშგება
6. შეკითხვები (FAQ)

# სტრუქტურა:
## თავი 1: შესავალი
- რა არის საწყობი ERP
- ვისთვის არის განკუთვნილი
- ძირითადი ფუნქციები

## თავი 2: დაწყება
- რეგისტრაცია
- პირველი შესვლა
- ინტერფეისის მიმოხილვა

## თავი 3: POS სისტემა
- როგორ დავამატოთ პროდუქტი კალათაში
- როგორ გავაფორმოთ გაყიდვა
- როგორ დავბეჭდოთ ქვითარი
- კლავიატურის მალსახმობები

## ... და ა.შ.
```

**Task 9.2: Admin Guide** ⏱️ 6h
```markdown
# Location: docs/admin-guide.md
# დავალება:
1. System setup
2. User management
3. Role assignment
4. Database backups
5. Troubleshooting

# კრიტიკული თემები:
- როლების მართვა
- backup/restore
- performance monitoring
- security best practices
```

**Task 9.3: API Documentation** ⏱️ 4h
```typescript
// Location: docs/api-reference.md
// დავალება:
1. Document all Edge Functions
2. Request/response examples
3. Authentication
4. Rate limits

// Example:

### POST /functions/v1/rs-ge-send-document

**Authentication:** Required (Bearer token)

**Rate Limit:** 100 requests/hour

**Request Body:**
```json
{
  "document_type": "invoice",
  "items": [
    {
      "name": "Product 1",
      "quantity": 2,
      "price": 10.50
    }
  ],
  "buyer_tin": "12345678901"
}
```

**Response:**
```json
{
  "success": true,
  "fiscal_code": "ABC123XYZ",
  "document_id": "uuid-here"
}
```
```

**Task 9.4: Video Tutorials** ⏱️ 12h
```markdown
# Location: YouTube channel
# დავალება:
1. როგორ დავარეგისტრიროთ (5 წთ)
2. POS-ის გამოყენება (10 წთ)
3. პროდუქტების დამატება (8 წთ)
4. ბუღალტერია (15 წთ)
5. ანგარიშგებები (10 წთ)

# Recording tips:
- Use Georgian language
- Clear screen resolution (1920x1080)
- Show mouse clicks
- Add subtitles
```

**Task 9.5: Inline Help & Tooltips** ⏱️ 6h
```typescript
// Location: All pages
// დავალება:
1. Add info icons (ⓘ) next to complex features
2. Show tooltips on hover
3. Add contextual help sidebar

// Example:
<Tooltip content="დღგ გამოითვლება ავტომატურად, 18% განაკვეთით">
  <InfoIcon className="w-4 h-4" />
</Tooltip>

// Help sidebar:
<Sheet>
  <SheetTrigger>
    <HelpCircle className="w-6 h-6" />
  </SheetTrigger>
  <SheetContent>
    <h3>როგორ გამოვიყენოთ POS</h3>
    <ol>
      <li>აირჩიეთ პროდუქტი</li>
      <li>დააჭირეთ "დამატება"</li>
      <li>გადახდა</li>
    </ol>
  </SheetContent>
</Sheet>
```

---

### დღე 21: Launch Preparation

**Task 10.1: Production Deployment** ⏱️ 4h
```bash
# Location: CI/CD pipeline
# დავალება:
1. Configure production environment
2. Set environment variables
3. Deploy to Vercel/Netlify
4. Configure custom domain
5. Enable SSL certificate

# Vercel deployment:
vercel --prod

# Environment variables:
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SENTRY_DSN=your-sentry-dsn
```

**Task 10.2: Monitoring Setup** ⏱️ 2h
```typescript
// Location: Monitoring dashboards
// დავალება:
1. Sentry error tracking
2. Vercel analytics
3. Supabase dashboard
4. Uptime monitoring (UptimeRobot)

// Create alerts:
- Downtime > 5 minutes → email
- Error rate > 1% → Slack notification
- API latency > 1s → warning
```

**Task 10.3: Final Checklist** ⏱️ 2h
```markdown
# Production Launch Checklist

## Technical
- [x] All critical bugs fixed
- [x] Security audit passed
- [x] Performance optimized (Lighthouse > 90)
- [x] Load tested (100 concurrent users)
- [x] Error monitoring active (Sentry)
- [x] Database backups automated
- [x] SSL certificate installed
- [x] CDN configured
- [x] Custom domain configured

## Business
- [ ] Terms of Service published
- [ ] Privacy Policy published
- [ ] Pricing page live
- [ ] Payment gateway tested (Stripe/PayPal)
- [ ] Support email setup (support@yourdomain.com)
- [ ] Support knowledge base published

## Marketing
- [ ] Marketing website live
- [ ] Social media accounts created
- [ ] Launch announcement prepared
- [ ] Press release ready
- [ ] Beta customer list ready (10 customers)

## Team
- [ ] On-call schedule defined
- [ ] Incident response plan documented
- [ ] Support team trained
- [ ] Sales team trained
```

**Task 10.4: Beta Testing** ⏱️ 40h (1 კვირა)
```markdown
# Beta Testing Program
# დავალება:
1. Recruit 10 beta customers
2. Provide 1 month free trial
3. Weekly feedback sessions
4. Bug tracking and fixes
5. Collect testimonials

# Beta customers:
- 3 small retail stores
- 3 medium supermarkets
- 2 real estate agencies
- 2 construction companies

# Feedback form:
- რა მოგწონთ?
- რა არ მოგწონთ?
- რა ფუნქციას დაამატებდით?
- რამდენად ადვილია გამოყენება? (1-10)
- შეიძენდით production-ში? (კი/არა)
```

**Task 10.5: Launch! 🚀** ⏱️ 1 დღე
```markdown
# Launch Day Checklist
# თარიღი: კვირა 3-ის ბოლოს

## Morning (9 AM):
- [ ] Final production deploy
- [ ] Verify all services running
- [ ] Send launch email to beta customers
- [ ] Post on social media
- [ ] Send press release

## Afternoon (2 PM):
- [ ] Monitor error rates
- [ ] Monitor user signups
- [ ] Respond to support tickets
- [ ] Track analytics

## Evening (6 PM):
- [ ] Daily report (signups, errors, feedback)
- [ ] Plan tomorrow's priorities
- [ ] Celebrate! 🎉

## 24/7 Monitoring:
- On-call rotation
- Incident response ready
- Support email monitored
```

---

## 📊 Task Summary

### კვირა 1: Critical Foundation
- ✅ 15 tasks
- ⏱️ 58 საათი
- 🎯 Authentication, Validation, Bugs, Security

### კვირა 2: Admin & Monitoring  
- ✅ 17 tasks
- ⏱️ 56 საათი
- 🎯 Admin UI, Error Monitoring, Backups, Testing

### კვირა 3: Launch
- ✅ 15 tasks
- ⏱️ 94 საათი (includes 40h beta testing)
- 🎯 QA, Documentation, Deployment, Launch

---

## 🎯 SUCCESS METRICS

### After Week 1:
- ✅ 100% authentication coverage
- ✅ 0 critical bugs
- ✅ All inputs validated
- ✅ Security hardened

### After Week 2:
- ✅ Admin can manage roles
- ✅ Error monitoring active
- ✅ Backups automated
- ✅ 80%+ test coverage

### After Week 3:
- ✅ Production deployed
- ✅ 10 beta customers onboarded
- ✅ Documentation complete
- ✅ Ready for public launch

---

## 👥 Resource Allocation

**If working alone:**
- 8 hours/day × 21 days = 168 hours
- This plan: ~208 hours
- Need: 1.2× time (some tasks can be simplified/skipped)

**If team of 2:**
- Developer 1: Authentication, Security, Testing
- Developer 2: Admin UI, Monitoring, Documentation
- Parallel work: 3 weeks → 2 weeks

**If team of 3:**
- Developer 1: Backend (Auth, Security, APIs)
- Developer 2: Frontend (Admin UI, Validation)
- Developer 3: QA, Testing, Documentation
- Parallel work: 3 weeks → 1.5 weeks

---

## 🚨 BLOCKER PRIORITIES

**If time is limited, focus on:**

### MUST HAVE (P0):
1. Authentication (signUp, password reset)
2. Input Validation (Zod)
3. localStorage → IndexedDB migration
4. Rate limiting
5. Error monitoring (Sentry)

### SHOULD HAVE (P1):
6. Admin Role Management UI
7. PDF/Excel fixes
8. Testing (accounting calculations)
9. Database backups
10. Security audit

### NICE TO HAVE (P2):
11. Comprehensive documentation
12. Video tutorials
13. Beta testing program
14. Load testing
15. Performance optimization

---

**რეკომენდაცია:** დაიწყეთ კვირა 1-ის დავალებებით და არ გადადოთ არცერთი P0 task. ეს არის თქვენი წარმატების საფუძველი! 🎯

**წარმატებები!** 🚀
