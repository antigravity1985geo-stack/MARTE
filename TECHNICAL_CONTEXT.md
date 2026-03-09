# MARTE ERP - Technical Handover & System Context

ეს დოკუმენტი შექმნილია იმისათვის, რომ მომავალმა დეველოპერმა ან AI ასისტენტმა სწრაფად გააანალიზოს პროექტის არსებული მდგომარეობა და გააგრძელოს მუშაობა შეფერხების გარეშე.

## 🏗 პროექტის არქიტექტურა
- **Frontend**: React + Vite + TypeScript.
- **State Management**: 
  - **Zustand**: ავტორიზაცია (`AuthStore`), შეტყობინებები (`NotificationStore`), კალათა და POS სესიები.
  - **TanStack Query (React Query)**: მონაცემების ფეჩინგი და ქეშირება.
- **Database**: Supabase (PostgreSQL).
- **Styling**: Tailwind CSS + Shadcn UI (Cyber-Elegant Theme).
- **Offline PWA**: IndexedDB (`offlineQueue.ts`) პროდუქტების და POS ტრანზაქციების ქეშირებისთვის.

## 🔑 ძირითადი მოდულები

### 1. POS (Point of Sale) - `POSPage.tsx`
- **Offline 2.0**: ინტერნეტის გათიშვისას ტრანზაქციები გროვდება ლოკალურად და სინქრონიზდება `process_sale` RPC-ით.
- **Shift Management**: ცვლების გახსნა/დახურვა, X-Report/Z-Report.
- **Scan Logic**: მხარდაჭერილია როგორც კამერით, ისე აპარატურით (Hardware) სკანირება (`useHardwareScanner.ts`).

### 2. საწყობი და ლოგისტიკა - `WarehouseManagementPage.tsx`
- **Multi-Branch**: მხარდაჭერილია რამდენიმე საწყობი.
- **Atomic Transfers**: საწყობებს შორის გადაცემა ხდება `process_transfer` RPC-ით, რომელიც ავტომატურად აბალანსებს ნაშთებს.
- **Internal Waybill**: გენერირდება პროფესიონალური PDF ზედნადებები (`waybillGenerator.ts`).

### 3. ფინანსები და ბუღალტერია - `AccountingPage.tsx`
- **Double-Entry**: ყველა გაყიდვა თუ მიღება აგენერირებს Journal Entries-ს შესაბამის ანგარიშებზე (2310 - სალარო, 4100 - შემოსავალი და ა.შ.).
- **Chart of Accounts**: სრული საბუღალტრო გეგმა.

### 4. AI & ანალიტიკა
- **Insight AI**: ანომალიების აღმოჩენა და ექსეკუტივ ნარატივი.
- **Smart Procurement**: `useSmartProcurement.ts` - აანალიზებს გაყიდვების დინამიკას (Velocity) და იძლევა შესყიდვის რეკომენდაციებს.

### 5. RS.GE ინტეგრაცია
- **RS.GE Bridge**: ზედნადებების გაგზავნა/მიღება და მათი ავტომატური "გადაქცევა" მიღების ტრანზაქციებად.

## 🗄 Database RPCs (კრიტიკული ფუნქციები)
- `process_sale`: გაყიდვა, საწყობის კლება, ბუღალტერია (ატომური).
- `process_receiving`: საქონლის მიღება, თვითღირებულების დათვლა, ნაშთის ზრდა.
- `process_transfer`: შიდა გადაადგილების ლოგიკა.

## 🚀- **Phase 6: Autonomous Intelligence & Scaling** (100% COMPLETE 🏆)
  - AI Procurement: `useSmartProcurement` + OrdersPage integration.
  - Multi-Branch Logistics: `process_transfer` RPC + PDF Waybills.
  - CRM 2.0: `update_customer_segments` RPC + Gamified UI.
  - System Monitor: `useSystemMonitor` + Monitoring Hub (BI).

---

*Handover Note: The system is now a high-performance, AI-assisted ERP ready for scale.*

**კონტექსტი AI-სთვის**: ყველა SQL სკრიპტი მდებარეობს `/sql` დირექტორიაში. Hook-ები მაქსიმალურად განცალკევებულია UI-სგან.
