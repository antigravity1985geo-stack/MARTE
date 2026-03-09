import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Monitor, Package, Warehouse, Factory, Users, Truck, Receipt,
  Calculator, BadgePercent, FileText, BarChart3, UserCog, Clock,
  ListOrdered, Printer, Shield, Activity, HardDriveDownload,
  BookOpen, Search, Rocket, Keyboard, HelpCircle, Star, Layers,
  ShoppingBag, Bike, Heart, Bell, Download, Globe, Building2,
  Building, Wallet, RotateCcw, ArrowDownLeft, Landmark, MapPin,
  TrendingUp, Zap, CheckCircle, ChevronRight, LayoutDashboard
} from 'lucide-react';

const moduleCategories = [
  {
    category: '🏠 მთავარი & AI',
    color: 'from-primary/20 to-primary/5',
    modules: [
      {
        title: 'დეშბორდი & BI', icon: LayoutDashboard, path: '/app',
        desc: 'რეალტაიმ KPI ვიჯეტები და AI ანალიტიკა.',
        features: ['გაყიდვების AI პროგნოზი', '7-დღიანი ტრენდი', 'პიკური საათების BI', 'CRM მეტრიკები', 'მარაგის ავტომატური სტატუსი'],
      },
      {
        title: 'POS სისტემა 2.0', icon: Monitor, path: '/app/pos',
        desc: 'ულტრა-სწრაფი გაყიდვების წერტილი ოფლაინ რეჟიმით.',
        features: ['კალათის ინტელექტუალური მართვა', 'ბარკოდის სკანირება', 'კომბინირებული გადახდები', 'ავტომატური RS.GE ზედნადებები', 'ოფლაინ მოქმედება'],
      },
    ],
  },
  {
    category: '🛒 გაყიდვები & პროდუქტები',
    color: 'from-blue-500/20 to-blue-500/5',
    modules: [
      {
        title: 'პროდუქტები', icon: Package, path: '/app/products',
        desc: 'პროდუქტების სრული მართვა ბარკოდებით და მარაგის კონტროლით.',
        features: ['CRUD ოპერაციები', 'ბარკოდის გენერაცია და ბეჭდვა', 'კატეგორიზაცია', 'მინიმალური მარაგის ალერტი', 'საყიდელი და საცალო ფასი', 'ერთეულის მართვა (კგ, ლ, ცალი)', 'ექსპორტი Excel/PDF'],
      },
      {
        title: 'კატეგორიები', icon: Layers, path: '/app/categories',
        desc: 'პროდუქტების კატეგორიებისა და ქვეკატეგორიების იერარქიული მართვა.',
        features: ['მრავალდონიანი კატეგორიები', 'ფერის მინიჭება', 'პროდუქტების რაოდენობა კატეგორიაში'],
      },
      {
        title: 'გაყიდვები', icon: TrendingUp, path: '/app/sales',
        desc: 'გაყიდვების ისტორია, ფილტრაცია და ანალიტიკა.',
        features: ['თარიღის ფილტრი', 'გადახდის მეთოდით ფილტრი', 'ტრანზაქციის დეტალები', 'ექსპორტი Excel/PDF'],
      },
      {
        title: 'ფასები & ლოიალობა', icon: BadgePercent, path: '/app/pricing',
        desc: 'ფასების ტიერები, ფასდაკლებების წესები და კუპონების სისტემა.',
        features: ['საბითუმო/საცალო ფასები', 'ფასდაკლების წესები', 'კუპონის კოდები', 'ვალიდობის ვადა'],
      },
    ],
  },
  {
    category: '📦 ოპერაციები & ლოჯისტიკა',
    color: 'from-amber-500/20 to-amber-500/5',
    modules: [
      {
        title: 'მიღება', icon: Download, path: '/app/receiving',
        desc: 'საქონლის მიღება მომწოდებლებისგან მარაგის ავტომატური განახლებით.',
        features: ['მიღების აქტი', 'მომწოდებლის არჩევა', 'რაოდენობის შემოწმება', 'ავტომატური მარაგის განახლება'],
      },
      {
        title: 'შეკვეთები', icon: ShoppingBag, path: '/app/orders',
        desc: 'შესყიდვების შეკვეთები ავტო-შეკვეთის ფუნქციით.',
        features: ['ხელით და ავტომატური შეკვეთა', 'მინ. მარაგის წესები', 'სტატუსის თვალყურის დევნება', 'შეკვეთის ისტორია'],
      },
      {
        title: 'საწყობები', icon: Warehouse, path: '/app/warehouse-management',
        desc: 'მრავალი საწყობის მართვა, ჩამოწერა და ტრანსფერი.',
        features: ['მრავალი საწყობი', 'საწყობთაშორისი გადაცემა', 'ჩამოწერა', 'საწყობის ინვენტარიზაცია'],
      },
      {
        title: 'წარმოება', icon: Factory, path: '/app/production',
        desc: 'ინგრედიენტები, რეცეპტები და წარმოების ორდერები.',
        features: ['ინგრედიენტების მართვა', 'რეცეპტის შექმნა', 'წარმოების ორდერი', 'თვითღირებულების ავტომატური გამოთვლა'],
      },
      {
        title: 'მარაგის მეთოდები', icon: Layers, path: '/app/inventory-methods',
        desc: 'FIFO, LIFO და საშუალო შეწონილი ღირებულების მეთოდები.',
        features: ['FIFO — პირველი შესული, პირველი გასული', 'LIFO — ბოლო შესული, პირველი გასული', 'საშუალო შეწონილი ღირებულება', 'ბეჩების მართვა', 'ღირებულების ავტომატური გამოთვლა'],
      },
      {
        title: 'დაბრუნებები', icon: RotateCcw, path: '/app/returns',
        desc: 'მომწოდებლისთვის და მყიდველისგან დაბრუნების მართვა.',
        features: ['მომწოდებელზე დაბრუნება', 'მყიდველისგან დაბრუნება', 'მარაგის ავტომატური კორექტირება', 'დაბრუნების მიზეზის აღრიცხვა'],
      },
      {
        title: 'ინვოისები', icon: FileText, path: '/app/invoices',
        desc: 'ინვოისების გენერაცია, ბეჭდვა და ისტორია.',
        features: ['ავტომატური ინვოისი', 'PDF გენერაცია', 'ბეჭდვა', 'კლიენტის მიბმა'],
      },
      {
        title: 'დისტრიბუცია', icon: Truck, path: '/app/distribution',
        desc: 'მარშრუტების დაგეგმვა, მძღოლების მართვა და მიწოდების თრეკინგი.',
        features: ['მარშრუტის შექმნა და დაწყება', 'მძღოლების მართვა', 'გაჩერებების სტატუსი (მიწოდებულია/ვერ)', 'ლაივ თრეკინგი', 'საბითუმო შეკვეთები', 'მარშრუტის პროგრესი'],
      },
    ],
  },
  {
    category: '👥 კონტაქტები & CRM',
    color: 'from-pink-500/20 to-pink-500/5',
    modules: [
      {
        title: 'კლიენტები', icon: Users, path: '/app/clients',
        desc: 'კლიენტთა ბაზის მართვა კონტაქტებით და ისტორიით.',
        features: ['კონტაქტების CRUD', 'შეძენის ისტორია', 'ბალანსის თვალყურის დევნება'],
      },
      {
        title: 'CRM & ლოიალობა', icon: Heart, path: '/app/crm',
        desc: 'კლიენტების სეგმენტაცია, ლოიალობის პროგრამა და აქციები.',
        features: ['სეგმენტაცია (VIP, რეგულარული, ახალი, რისკის ზონა, დაკარგული)', '4-დონიანი ლოიალობა (ბრინჯაო → პლატინა)', 'ქულების დაგროვება და გამოყენება', 'ლოიალობის რეიტინგი', 'აქციები პრომო კოდებით', 'სეგმენტების ანალიტიკა', 'შეძენის ისტორია'],
      },
      {
        title: 'მომწოდებლები', icon: Truck, path: '/app/suppliers',
        desc: 'მომწოდებლების მართვა და შესყიდვების ისტორია.',
        features: ['კონტაქტების მართვა', 'შესყიდვების ისტორია', 'ბალანსი და ვალი'],
      },
    ],
  },
  {
    category: '💰 ფინანსები',
    color: 'from-green-500/20 to-green-500/5',
    modules: [
      {
        title: 'ხარჯები', icon: Receipt, path: '/app/expenses',
        desc: 'ხარჯების კატეგორიზაცია და აღრიცხვა.',
        features: ['ხარჯის ტიპები', 'თარიღის ფილტრი', 'კატეგორიების სტატისტიკა'],
      },
      {
        title: 'ანგარიშსწორება', icon: Receipt, path: '/app/supplier-settlements',
        desc: 'მომწოდებლებთან ანგარიშსწორების მართვა.',
        features: ['გადახდების აღრიცხვა', 'ბალანსის თვალყურის დევნება', 'ისტორია'],
      },
      {
        title: 'ბუღალტერია', icon: Calculator, path: '/app/accounting',
        desc: 'სრული ორმაგი ჩაწერის ბუღალტერია BASS სტანდარტით.',
        features: ['ანგარიშთა გეგმა', 'ჟურნალის ჩანაწერები (დებეტი/კრედიტი)', 'საცდელი ბალანსი', 'მოგება-ზარალის ანგარიშგება', 'ბალანსის უწყისი'],
      },
      {
        title: 'ფინანსური ანგარიშგება', icon: ArrowDownLeft, path: '/app/cash-flow',
        desc: 'ფულადი ნაკადები, ბალანსი და ფინანსური მაჩვენებლები.',
        features: ['ბალანსის უწყისი (A=L+E)', 'ფულადი ნაკადების ანგარიში', 'ფინანსური კოეფიციენტები', 'პერიოდის შედარება'],
      },
      {
        title: 'საბანკო ინტეგრაცია', icon: Landmark, path: '/app/bank-integration',
        desc: 'საბანკო ამონაწერის იმპორტი და ავტო-შედარება.',
        features: ['CSV იმპორტი', 'Clipboard paste', 'ავტომატური შედარება ბუღალტრულ ჩანაწერებთან', 'ხელით მეპინგი', 'დემო მონაცემები'],
      },
      {
        title: 'ხელფასები & HR', icon: Wallet, path: '/app/salary',
        desc: 'თანამშრომლების ხელფასების, გადასახადების და შვებულებების მართვა.',
        features: ['საბაზისო ხელფასი და ბონუსი', 'საშემოსავლო გადასახადი 20%', 'საპენსიო ფონდი 2%', 'შვებულების დღეები', 'ხელფასის ისტორია'],
      },
      {
        title: 'ძირითადი საშუალებები', icon: Building, path: '/app/fixed-assets',
        desc: 'აქტივების აღრიცხვა და ცვეთის ავტომატური გამოთვლა.',
        features: ['აქტივის რეგისტრაცია', 'წრფივი ცვეთა', 'კლებადი ნაშთის მეთოდი', 'ამორტიზაციის გრაფიკი', 'ნარჩენი ღირებულება'],
      },
      {
        title: 'ვალუტა & კურსები', icon: Globe, path: '/app/currency',
        desc: 'ეროვნული ბანკის კურსის ავტომატური იმპორტი.',
        features: ['NBG API ინტეგრაცია', 'USD, EUR, GBP, TRY კურსები', 'კონვერტორი', 'კურსის ისტორია'],
      },
    ],
  },
  {
    category: '🏢 ადმინისტრირება',
    color: 'from-purple-500/20 to-purple-500/5',
    modules: [
      {
        title: 'RS.GE სინქრონიზაცია', icon: FileText, path: '/app/rsge',
        desc: 'სრული ავტომატიზაცია ფისკალური დოკუმენტებისთვის.',
        features: ['ავტომატური ზედნადებები', 'ანგარიშ-ფაქტურების იმპორტი', 'საწყობში ავტომატური ასახვა'],
      },
      {
        title: 'ფისკალური', icon: BarChart3, path: '/app/fiscal-report',
        desc: 'ფისკალური ანგარიშგება და რეპორტები.',
        features: ['დღიური ანგარიში', 'თვიური რეპორტი', 'ფისკალური სტატისტიკა'],
      },
      {
        title: 'თანამშრომლები', icon: UserCog, path: '/app/employees',
        desc: 'თანამშრომლების მართვა PIN კოდებით და როლებით.',
        features: ['PIN კოდი', 'როლის მინიჭება (ადმინი, მოლარე, საწყობის მენეჯერი)', 'აქტივაცია/დეაქტივაცია'],
      },
      {
        title: 'დასწრება', icon: Clock, path: '/app/attendance',
        desc: 'თანამშრომლების მოსვლა/წასვლის აღრიცხვა.',
        features: ['მოსვლა/წასვლის რეგისტრაცია', 'შესვენების აღრიცხვა', 'დაგვიანების ავტომატური გამოთვლა', 'ზეგანაკვეთური', 'კვირეული მიმოხილვა', 'თანამშრომლის სტატისტიკა'],
      },
      {
        title: 'მოლარეების სტატისტიკა', icon: BarChart3, path: '/app/cashier-stats',
        desc: 'მოლარეების პროდუქტიულობის ანალიზი.',
        features: ['გაყიდვების რაოდენობა', 'შემოსავალი მოლარეების მიხედვით'],
      },
      {
        title: 'ცვლის ისტორია', icon: Clock, path: '/app/shift-history',
        desc: 'ცვლების სრული ისტორია.',
        features: ['გახსნა/დახურვის დრო', 'საწყისი/საბოლოო თანხა', 'სხვაობა'],
      },
      {
        title: 'ფილიალები', icon: Building2, path: '/app/branches',
        desc: 'მულტი-ლოკაციის მართვა და ტრანსფერი.',
        features: ['ფილიალის დამატება', 'ფილიალებს შორის ტრანსფერი', 'ფილიალის სტატისტიკა'],
      },
      {
        title: 'რიგები', icon: ListOrdered, path: '/app/queue',
        desc: 'რიგების მართვის სისტემა.',
        features: ['რიგის ნომერი', 'სტატუსის მართვა', 'შეტყობინება'],
      },
      {
        title: 'ქვითარი', icon: Printer, path: '/app/receipt-settings',
        desc: 'ქვითრის ფორმატის კონფიგურაცია.',
        features: ['კომპანიის ინფორმაცია', 'ლოგო', 'ქვითრის ფორმატი'],
      },
      {
        title: 'ადმინის პანელი', icon: Shield, path: '/app/admin-panel',
        desc: 'მომხმარებლების და როლების მართვა.',
        features: ['მომხმარებლების სია', 'როლის მინიჭება/წაშლა', 'მოწვევის გაგზავნა'],
      },
      {
        title: 'აქტივობის ლოგი', icon: Activity, path: '/app/activity-log',
        desc: 'სისტემის ყველა მოქმედების აუდიტი.',
        features: ['მომხმარებლის მოქმედებები', 'თარიღის ფილტრი', 'მოქმედების ტიპი'],
      },
      {
        title: 'ბექაფი / ექსპორტი', icon: HardDriveDownload, path: '/app/data-export',
        desc: 'მონაცემების ექსპორტი სარეზერვო ასლისთვის.',
        features: ['Excel ექსპორტი', 'PDF ექსპორტი', 'მონაცემების არჩევა'],
      },
    ],
  },
  {
    category: '🌐 ინტეგრაციები',
    color: 'from-cyan-500/20 to-cyan-500/5',
    modules: [
      {
        title: 'E-Commerce', icon: ShoppingBag, path: '/app/ecommerce',
        desc: 'Glovo, Wolt, Extra.ge პლატფორმების ინტეგრაცია.',
        features: ['პლატფორმის დაკავშირება API Key-ით', 'შეკვეთების რეალტაიმ მიღება', 'სტატუსის მართვა (ახალი → მიწოდებული)', 'პროდუქტების მეპინგი', 'ფასების სინქრონიზაცია', 'საკომისიოების აღრიცხვა', 'პლატფორმის ანალიტიკა'],
      },
      {
        title: 'შეტყობინებები', icon: Bell, path: '/app/notifications',
        desc: 'SMS & Email ავტომატური შეტყობინებების სისტემა.',
        features: ['ავტომატიზაციის წესები (შეკვეთა, გადახდა, მარაგი)', 'შაბლონები ცვლადებით', 'SMS & Email არხები', 'ტესტ გაგზავნა', 'გაგზავნის ისტორია', 'SMS/Email პროვაიდერის კონფიგურაცია', 'გაგზავნის ლიმიტები'],
      },
      {
        title: 'აპის ინსტალაცია (PWA)', icon: Download, path: '/app/install',
        desc: 'აპლიკაციის დაინსტალირება მობილურზე ან დესკტოპზე.',
        features: ['ოფლაინ რეჟიმი', 'სწრაფი გაშვება Home Screen-დან', 'ავტო-განახლება', 'iOS/Android/Desktop ინსტრუქციები'],
      },
    ],
  },
];

const shortcuts = [
  { key: 'F1', action: 'გადახდის ფანჯრის გახსნა', context: 'POS' },
  { key: 'F2', action: 'ბარკოდის სკანერის გახსნა', context: 'POS' },
  { key: 'F3', action: 'გაყიდვების ისტორიის ნახვა', context: 'POS' },
  { key: 'F4', action: 'ცვლის გახსნა/დახურვა', context: 'POS' },
  { key: 'Esc', action: 'კალათის გასუფთავება / ფანჯრის დახურვა', context: 'POS' },
  { key: 'Enter', action: 'სწრაფი დამატება (ძიების შედეგიდან)', context: 'POS' },
  { key: 'Ctrl+P', action: 'ბეჭდვა', context: 'ზოგადი' },
  { key: 'Ctrl+E', action: 'ექსპორტი', context: 'ზოგადი' },
];

const quickStart = [
  { step: '1', title: 'პერსონალის მართვა', desc: 'დაამატეთ თანამშრომლები PIN კოდებით და მიანიჭეთ შესაბამისი როლები.', icon: UserCog },
  { step: '2', title: 'კატეგორიების სტრუქტურა', desc: 'შექმენით პროდუქტების იერარქია საუკეთესო ორგანიზებისთვის.', icon: Layers },
  { step: '3', title: 'მარაგების იმპორტი', desc: 'დაამატეთ პროდუქტები. გამოიყენეთ RS.GE იმპორტი პროცესის დასაჩქარებლად.', icon: Package },
  { step: '4', title: 'ჭკვიანი შესყიდვები', desc: 'ჩართეთ AI პროგნოზირება მარაგების ავტომატური მართვისთვის.', icon: Zap },
  { step: '5', title: 'POS გაყიდვები', desc: 'გახსენით ცვლა და დაიწყეთ მომსახურება. სისტემა მუშაობს ინტერნეტის გარეშეც.', icon: Monitor },
  { step: '6', title: 'BI ანალიტიკა', desc: 'ადევნეთ თვალი ბიზნესის ზრდას რეალტაიმ დეშბორდით.', icon: BarChart3 },
];

const faq = [
  { q: 'როგორ გავხსნა ცვლა?', a: 'POS გვერდზე დააჭირეთ "ცვლის გახსნა F4" ღილაკს. შეიყვანეთ მოლარის PIN კოდი და საწყისი თანხა სალაროში.' },
  { q: 'როგორ გავაკეთო რეფანდი?', a: 'POS გვერდზე გახსენით გაყიდვების ისტორია (F3), იპოვეთ ტრანზაქცია და დააჭირეთ "რეფანდი" ღილაკს.' },
  { q: 'როგორ გამოვიყენო კუპონი?', a: 'გადახდის ფანჯარაში (F1) შეიყვანეთ კუპონის კოდი სპეციალურ ველში და დააჭირეთ "ვალიდაცია".' },
  { q: 'სად ვნახო ფინანსური ანგარიში?', a: 'გადადით "ბუღალტერია" გვერდზე საცდელი ბალანსისთვის, ან "ფინანსური ანგარიშგება" გვერდზე ბალანსის უწყისისთვის.' },
  { q: 'როგორ დავამატო ავტო-შეკვეთის წესი?', a: '"შეკვეთები" გვერდზე გადადით "ავტო-შეკვეთის წესები" ტაბზე, დააყენეთ მინიმალური მარაგი და შეკვეთის რაოდენობა.' },
  { q: 'როგორ დავუკავშირო Glovo/Wolt?', a: '"E-Commerce" გვერდზე დააჭირეთ "დაკავშირება", შეიყვანეთ API Key პარტნიორის პანელიდან.' },
  { q: 'როგორ ვმართო მრავალი საწყობი?', a: '"საწყობები" გვერდზე დაამატეთ საწყობები, შემდეგ გამოიყენეთ ტრანსფერი საწყობებს შორის გადასატანად.' },
  { q: 'როგორ გამოვთვალო ხელფასი?', a: '"ხელფასები & HR" გვერდზე შეიყვანეთ საბაზისო ხელფასი — საშემოსავლო (20%) და საპენსიო (2%) ავტომატურად გამოითვლება.' },
  { q: 'როგორ ვუთვალთვალო დასწრებას?', a: '"დასწრება" გვერდზე მოსვლა/წასვლის ტაბში დააჭირეთ "მოსვლა" — დაგვიანება ავტომატურად გამოითვლება განრიგის მიხედვით.' },
  { q: 'როგორ დავაინსტალირო აპლიკაცია?', a: 'გადადით "აპის ინსტალაცია" გვერდზე — iPhone-ზე Share → Add to Home Screen, Android-ზე მენიუ → Install app.' },
  { q: 'რა როლები არსებობს?', a: 'ადმინი (სრული წვდომა), უფროსი მოლარე (გაყიდვები + HR), საწყობის მენეჯერი (მარაგი + ლოჯისტიკა), მოლარე (მხოლოდ POS).' },
];

const roles = [
  { role: 'ადმინი', access: 'ყველა მოდული და პარამეტრი', color: 'bg-primary' },
  { role: 'უფროსი მოლარე', access: 'POS, გაყიდვები, ინვოისები, ხარჯები, HR, ქვითარი, დაბრუნებები, დასწრება', color: 'bg-blue-500' },
  { role: 'საწყობის მენეჯერი', access: 'მიღება, საწყობები, შეკვეთები, მომწოდებლები, წარმოება, დისტრიბუცია, ფილიალები', color: 'bg-amber-500' },
  { role: 'მოლარე', access: 'POS, პროდუქტები, კატეგორიები, გაყიდვები, რიგები', color: 'bg-muted-foreground' },
];

export default function GuidePage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCategories = moduleCategories.map(cat => ({
    ...cat,
    modules: cat.modules.filter(m =>
      !searchTerm ||
      m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.features.some(f => f.toLowerCase().includes(searchTerm.toLowerCase()))
    ),
  })).filter(cat => cat.modules.length > 0);

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-background to-background border border-white/10 p-10">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-[100px]" />
          <div className="relative z-10">
            <div className="flex items-center gap-5 mb-6">
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 shadow-2xl">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tighter text-white">სახელმძღვანელო</h1>
                <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs mt-1">Next-Gen Business OS — Documentation</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline" className="gap-2 px-4 py-1.5 rounded-full border-white/10 bg-white/5 text-white font-bold"><Package className="h-4 w-4 text-primary" />{moduleCategories.reduce((s, c) => s + c.modules.length, 0)} მოდული</Badge>
              <Badge variant="outline" className="gap-2 px-4 py-1.5 rounded-full border-white/10 bg-white/5 text-white font-bold"><Zap className="h-4 w-4 text-primary" />{moduleCategories.reduce((s, c) => s + c.modules.reduce((fs, m) => fs + m.features.length, 0), 0)}+ ფუნქცია</Badge>
              <Badge variant="outline" className="gap-2 px-4 py-1.5 rounded-full border-white/10 bg-white/5 text-white font-bold"><Shield className="h-4 w-4 text-primary" />4 როლი</Badge>
            </div>
          </div>
        </div>

        <Tabs defaultValue="start" className="space-y-6">
          <TabsList className="flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="start" className="gap-1"><Rocket className="h-3.5 w-3.5" />დაწყება</TabsTrigger>
            <TabsTrigger value="modules" className="gap-1"><Package className="h-3.5 w-3.5" />მოდულები</TabsTrigger>
            <TabsTrigger value="roles" className="gap-1"><Shield className="h-3.5 w-3.5" />როლები</TabsTrigger>
            <TabsTrigger value="shortcuts" className="gap-1"><Keyboard className="h-3.5 w-3.5" />მალსახმობები</TabsTrigger>
            <TabsTrigger value="faq" className="gap-1"><HelpCircle className="h-3.5 w-3.5" />FAQ</TabsTrigger>
          </TabsList>

          {/* QUICK START */}
          <TabsContent value="start" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickStart.map(s => (
                <Card key={s.step} className="group relative overflow-hidden border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-500 rounded-2xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardContent className="p-6 relative z-10">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xl border border-primary/20 group-hover:scale-110 transition-transform">
                        {s.step}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-lg transition-colors">{s.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* MODULES */}
          <TabsContent value="modules" className="space-y-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-10" placeholder="მოძებნე მოდული ან ფუნქცია..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>

            {filteredCategories.map(cat => (
              <div key={cat.category} className="space-y-3">
                <h2 className="text-lg font-bold flex items-center gap-2">{cat.category}</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {cat.modules.map(mod => {
                    const Icon = mod.icon;
                    return (
                      <Card key={mod.path} className={`group overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br ${cat.color}`}>
                        <CardContent className="p-5">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="p-2.5 rounded-xl bg-background/80 shadow-sm group-hover:shadow-md transition-shadow">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-foreground">{mod.title}</h3>
                              <p className="text-sm text-muted-foreground mt-0.5">{mod.desc}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {mod.features.map((f, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] bg-background/60 backdrop-blur-sm border-border/50">
                                <CheckCircle className="h-2.5 w-2.5 mr-0.5 text-primary" />{f}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </TabsContent>

          {/* ROLES */}
          <TabsContent value="roles" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roles.map(r => (
                <Card key={r.role} className="overflow-hidden hover:shadow-lg transition-all duration-300">
                  <div className={`h-1.5 ${r.color}`} />
                  <CardContent className="p-5">
                    <h3 className="font-bold text-lg mb-2">{r.role}</h3>
                    <p className="text-sm text-muted-foreground">{r.access}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* SHORTCUTS */}
          <TabsContent value="shortcuts">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="font-bold">კლავიში</TableHead>
                      <TableHead className="font-bold">მოქმედება</TableHead>
                      <TableHead className="font-bold">კონტექსტი</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shortcuts.map(s => (
                      <TableRow key={s.key} className="hover:bg-muted/20">
                        <TableCell>
                          <kbd className="px-2.5 py-1 rounded-lg bg-muted border border-border font-mono text-sm font-bold shadow-sm">{s.key}</kbd>
                        </TableCell>
                        <TableCell className="font-medium">{s.action}</TableCell>
                        <TableCell><Badge variant="outline">{s.context}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FAQ */}
          <TabsContent value="faq">
            <Card className="overflow-hidden">
              <CardContent className="p-4">
                <Accordion type="multiple" className="space-y-2">
                  {faq.map((f, i) => (
                    <AccordionItem key={i} value={`faq-${i}`} className="border rounded-xl px-4 bg-muted/10 hover:bg-muted/20 transition-colors data-[state=open]:bg-primary/5 data-[state=open]:border-primary/20">
                      <AccordionTrigger className="text-left font-semibold hover:no-underline py-4">
                        <div className="flex items-center gap-2">
                          <HelpCircle className="h-4 w-4 text-primary flex-shrink-0" />
                          {f.q}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground pb-4 pl-6">{f.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
}