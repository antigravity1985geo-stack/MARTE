import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Users, Crown, Star, Gift, Percent, TrendingUp, Search,
  Plus, ShoppingBag, Heart, Award, Tag, History, UserPlus,
  Phone, Mail, Calendar, BarChart3, Target, Zap, ChevronRight,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useClients } from '@/hooks/useClients';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  segment: 'vip' | 'regular' | 'new' | 'at_risk' | 'lost';
  totalPurchases: number;
  totalSpent: number;
  avgOrderValue: number;
  lastPurchase: string;
  firstPurchase: string;
  loyaltyPoints: number;
  loyaltyTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  notes?: string;
}

interface PurchaseHistory {
  id: string;
  customerId: string;
  date: string;
  items: string[];
  total: number;
  pointsEarned: number;
  discountApplied?: number;
}

interface LoyaltyTier {
  name: string;
  key: string;
  minPoints: number;
  discountPercent: number;
  pointsMultiplier: number;
  color: string;
  icon: React.ElementType;
  perks: string[];
}

interface Promotion {
  id: string;
  name: string;
  type: 'percentage' | 'fixed' | 'bogo' | 'points_multiplier';
  value: number;
  targetSegment: string;
  startDate: string;
  endDate: string;
  active: boolean;
  usageCount: number;
  code?: string;
}

const LOYALTY_TIERS: LoyaltyTier[] = [
  { name: 'ბრინჯაო', key: 'bronze', minPoints: 0, discountPercent: 2, pointsMultiplier: 1, color: 'hsl(30, 60%, 50%)', icon: Star, perks: ['2% ფასდაკლება', '1x ქულები'] },
  { name: 'ვერცხლი', key: 'silver', minPoints: 2000, discountPercent: 5, pointsMultiplier: 1.5, color: 'hsl(0, 0%, 65%)', icon: Star, perks: ['5% ფასდაკლება', '1.5x ქულები', 'დაბადების დღის ბონუსი'] },
  { name: 'ოქრო', key: 'gold', minPoints: 10000, discountPercent: 10, pointsMultiplier: 2, color: 'hsl(45, 100%, 50%)', icon: Crown, perks: ['10% ფასდაკლება', '2x ქულები', 'უფასო მიწოდება'] },
  { name: 'პლატინა', key: 'platinum', minPoints: 25000, discountPercent: 15, pointsMultiplier: 3, color: 'hsl(220, 20%, 60%)', icon: Award, perks: ['15% ფასდაკლება', '3x ქულები', 'VIP მომსახურება'] },
];

const DEMO_CUSTOMERS: Customer[] = [
  { id: 'C1', name: 'ანა გელაშვილი', phone: '+995 555 11 22 33', email: 'ana@mail.ge', segment: 'vip', totalPurchases: 156, totalSpent: 12450, avgOrderValue: 79.8, lastPurchase: '2026-03-07', firstPurchase: '2024-06-15', loyaltyPoints: 6200, loyaltyTier: 'platinum' },
  { id: 'C2', name: 'გიორგი ხარაზი', phone: '+995 555 44 55 66', email: 'giorgi@mail.ge', segment: 'regular', totalPurchases: 45, totalSpent: 3200, avgOrderValue: 71.1, lastPurchase: '2026-03-05', firstPurchase: '2025-02-10', loyaltyPoints: 2100, loyaltyTier: 'gold' },
  { id: 'C3', name: 'მარიამ ჯავახი', phone: '+995 555 77 88 99', email: 'mariam@mail.ge', segment: 'regular', totalPurchases: 28, totalSpent: 1850, avgOrderValue: 66.1, lastPurchase: '2026-03-01', firstPurchase: '2025-06-20', loyaltyPoints: 980, loyaltyTier: 'silver' },
  { id: 'C4', name: 'ლევან წიქარიშვილი', phone: '+995 555 00 11 22', email: 'levan@mail.ge', segment: 'new', totalPurchases: 3, totalSpent: 245, avgOrderValue: 81.7, lastPurchase: '2026-03-06', firstPurchase: '2026-02-28', loyaltyPoints: 120, loyaltyTier: 'bronze' },
  { id: 'C5', name: 'ნინო ბერიძე', phone: '+995 555 33 44 55', email: 'nino@mail.ge', segment: 'at_risk', totalPurchases: 22, totalSpent: 1600, avgOrderValue: 72.7, lastPurchase: '2025-12-15', firstPurchase: '2025-03-10', loyaltyPoints: 750, loyaltyTier: 'silver', notes: '3 თვეა არ ყიდულობს' },
  { id: 'C6', name: 'დავით მამულაშვილი', phone: '+995 555 66 77 88', email: 'davit@mail.ge', segment: 'vip', totalPurchases: 89, totalSpent: 8900, avgOrderValue: 100, lastPurchase: '2026-03-08', firstPurchase: '2024-11-01', loyaltyPoints: 4500, loyaltyTier: 'gold' },
  { id: 'C7', name: 'თამარ ნოზაძე', phone: '+995 555 99 00 11', email: 'tamar@mail.ge', segment: 'lost', totalPurchases: 5, totalSpent: 380, avgOrderValue: 76, lastPurchase: '2025-08-20', firstPurchase: '2025-06-01', loyaltyPoints: 190, loyaltyTier: 'bronze', notes: '6 თვეზე მეტია არ ყიდულობს' },
  { id: 'C8', name: 'ნიკა თავაძე', phone: '+995 555 22 33 44', email: 'nika@mail.ge', segment: 'regular', totalPurchases: 34, totalSpent: 2100, avgOrderValue: 61.8, lastPurchase: '2026-02-28', firstPurchase: '2025-05-15', loyaltyPoints: 1050, loyaltyTier: 'silver' },
];

const DEMO_HISTORY: PurchaseHistory[] = [
  { id: 'PH1', customerId: 'C1', date: '2026-03-07', items: ['სუშის ნაკრები', 'წვენი 1ლ'], total: 52, pointsEarned: 156, discountApplied: 15 },
  { id: 'PH2', customerId: 'C1', date: '2026-03-03', items: ['პიცა მარგარიტა x2', 'კოკა-კოლა'], total: 34, pointsEarned: 102 },
  { id: 'PH3', customerId: 'C2', date: '2026-03-05', items: ['ბურგერი კომბო', 'კარტოფილი ფრი'], total: 24.4, pointsEarned: 49 },
  { id: 'PH4', customerId: 'C6', date: '2026-03-08', items: ['სტეიკი', 'ღვინო', 'დესერტი'], total: 125, pointsEarned: 250, discountApplied: 10 },
  { id: 'PH5', customerId: 'C4', date: '2026-03-06', items: ['სალათი', 'წყალი'], total: 18, pointsEarned: 18 },
];

const DEMO_PROMOTIONS: Promotion[] = [
  { id: 'PR1', name: 'VIP 20% ფასდაკლება', type: 'percentage', value: 20, targetSegment: 'vip', startDate: '2026-03-01', endDate: '2026-03-31', active: true, usageCount: 34, code: 'VIP20' },
  { id: 'PR2', name: 'ახალი კლიენტის ბონუსი', type: 'fixed', value: 10, targetSegment: 'new', startDate: '2026-01-01', endDate: '2026-12-31', active: true, usageCount: 89, code: 'WELCOME10' },
  { id: 'PR3', name: 'ორშაბათის x3 ქულები', type: 'points_multiplier', value: 3, targetSegment: 'all', startDate: '2026-03-01', endDate: '2026-03-31', active: true, usageCount: 120 },
  { id: 'PR4', name: 'დაბრუნების შეთავაზება', type: 'percentage', value: 15, targetSegment: 'at_risk', startDate: '2026-03-01', endDate: '2026-04-30', active: true, usageCount: 5, code: 'COMEBACK15' },
];

export default function CRMPage() {
  const { clients, promotions, isLoading, addPromotion: addPromoMutation, runSegmentationUpdate, sendCampaign } = useClients();
  const [history] = useState<any[]>([]); // TODO: Implement real purchase history
  const [searchTerm, setSearchTerm] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [promoDialog, setPromoDialog] = useState(false);
  const [newPromo, setNewPromo] = useState({ name: '', type: 'percentage' as any, value: '', target_segment: 'all', start_date: '', end_date: '', promo_code: '' });

  const filtered = clients.filter(c => {
    if (searchTerm && !c.name.toLowerCase().includes(searchTerm.toLowerCase()) && !c.phone.includes(searchTerm) && !c.email.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (segmentFilter !== 'all' && c.segment !== segmentFilter) return false;
    if (tierFilter !== 'all' && c.loyalty_tier !== tierFilter) return false;
    return true;
  });

  const handleRunSegmentation = () => {
    toast.promise(runSegmentationUpdate.mutateAsync(), {
      loading: 'სეგმენტაცია მიმდინარეობს...',
      success: 'სეგმენტები განახლდა წარმატებით!',
      error: 'შეცდომა განახლებისას'
    });
  };

  const handleSendCampaign = (campaign: any) => {
    toast.promise(sendCampaign.mutateAsync(campaign), {
      loading: 'კამპანია იგზავნება...',
      success: 'კამპანია გაიგზავნა!',
      error: 'შეცდომა გაგზავნისას'
    });
  };

  const handleAddPromotion = () => {
    if (!newPromo.name || !newPromo.value) return;
    addPromoMutation.mutate({
      name: newPromo.name,
      type: newPromo.type,
      value: Number(newPromo.value),
      target_segment: newPromo.target_segment,
      start_date: newPromo.start_date || null,
      end_date: newPromo.end_date || null,
      promo_code: newPromo.promo_code || null,
    }, {
      onSuccess: () => {
        setPromoDialog(false);
        setNewPromo({ name: '', type: 'percentage', value: '', target_segment: 'all', start_date: '', end_date: '', promo_code: '' });
        toast.success('აქცია შეიქმნა');
      }
    });
  };

  const [campaignDialog, setCampaignDialog] = useState(false);
  const [selectedSegForCampaign, setSelectedSegForCampaign] = useState('all');

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const segmentBadge = (segment: Customer['segment']) => {
    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      vip: { label: '👑 VIP', variant: 'default' },
      regular: { label: 'რეგულარული', variant: 'secondary' },
      new: { label: '🆕 ახალი', variant: 'outline' },
      at_risk: { label: '⚠️ რისკის ზონა', variant: 'destructive' },
      lost: { label: '❌ დაკარგული', variant: 'destructive' },
    };
    const s = map[segment];
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const tierBadge = (tier: any) => {
    const t = LOYALTY_TIERS.find(lt => lt.key === tier)!;
    return <Badge variant="outline" style={{ borderColor: t?.color, color: t?.color }}>{t?.name || tier}</Badge>;
  };

  const segmentCounts = {
    vip: clients.filter(c => c.segment === 'vip').length,
    regular: clients.filter(c => c.segment === 'regular').length,
    new: clients.filter(c => c.segment === 'new').length,
    at_risk: clients.filter(c => c.segment === 'at_risk').length,
    lost: clients.filter(c => c.segment === 'lost').length,
  };
  const totalRevenueVal = clients.reduce((s, c) => s + (c.total_spent || 0), 0);
  const avgLifetimeValue = clients.length > 0 ? Math.round(totalRevenueVal / clients.length) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CRM & ლოიალობა</h1>
          <p className="text-muted-foreground">კლიენტების სეგმენტაცია, ისტორია, ლოიალობის პროგრამა და აქციები</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRunSegmentation} disabled={runSegmentationUpdate.isPending}>
            <Zap className={`h-4 w-4 mr-1 ${runSegmentationUpdate.isPending ? 'animate-pulse text-yellow-500' : ''}`} />
            სეგმენტაციის განახლება
          </Button>
          <Dialog open={campaignDialog} onOpenChange={setCampaignDialog}>
            <DialogTrigger asChild><Button onClick={() => setCampaignDialog(true)}><Mail className="h-4 w-4 mr-1" />კამპანიის გაშვება</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>მარკეტინგული კამპანია</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>სამიზნე აუდიტორია</Label>
                  <Select value={selectedSegForCampaign} onValueChange={setSelectedSegForCampaign}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ყველა კლიენტი</SelectItem>
                      <SelectItem value="vip">მხოლოდ VIP</SelectItem>
                      <SelectItem value="at_risk">რისკის ქვეშ მყოფები</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>შეტყობინების ტექსტი</Label>
                  <Textarea placeholder="მაგ: სპეციალური 20% ფასდაკლება მხოლოდ თქვენთვის..." rows={4} />
                </div>
                <Button className="w-full" onClick={() => { handleSendCampaign({ name: 'CRM Promo', target: selectedSegForCampaign }); setCampaignDialog(false); }}>
                  გაგზავნა (SMS/Email)
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{clients.length}</p><p className="text-xs text-muted-foreground">სულ კლიენტი</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Crown className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{segmentCounts.vip}</p><p className="text-xs text-muted-foreground">VIP</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10"><Target className="h-5 w-5 text-destructive" /></div>
          <div><p className="text-2xl font-bold">{segmentCounts.at_risk}</p><p className="text-xs text-muted-foreground">რისკის ზონა</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{totalRevenueVal.toLocaleString()} ₾</p><p className="text-xs text-muted-foreground">სულ შემოსავალი</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted"><Heart className="h-5 w-5 text-muted-foreground" /></div>
          <div><p className="text-2xl font-bold">{avgLifetimeValue} ₾</p><p className="text-xs text-muted-foreground">საშ. LTV</p></div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="customers">
        <TabsList>
          <TabsTrigger value="customers"><Users className="h-4 w-4 mr-1" />კლიენტები</TabsTrigger>
          <TabsTrigger value="loyalty"><Star className="h-4 w-4 mr-1" />ლოიალობა</TabsTrigger>
          <TabsTrigger value="promotions"><Gift className="h-4 w-4 mr-1" />აქციები</TabsTrigger>
          <TabsTrigger value="segments"><BarChart3 className="h-4 w-4 mr-1" />სეგმენტები</TabsTrigger>
        </TabsList>

        {/* CUSTOMERS TAB */}
        <TabsContent value="customers" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="სახელი, ტელეფონი, ელ.ფოსტა..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Select value={segmentFilter} onValueChange={setSegmentFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="სეგმენტი" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ყველა</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
                <SelectItem value="regular">რეგულარული</SelectItem>
                <SelectItem value="new">ახალი</SelectItem>
                <SelectItem value="at_risk">რისკის ზონა</SelectItem>
                <SelectItem value="lost">დაკარგული</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="დონე" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ყველა დონე</SelectItem>
                {LOYALTY_TIERS.map(t => <SelectItem key={t.key} value={t.key}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {selectedCustomer ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">{selectedCustomer.name}</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setSelectedCustomer(null)}>დახურვა</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {segmentBadge(selectedCustomer.segment)}
                  {tierBadge(selectedCustomer.loyalty_tier)}
                  <Badge variant="outline"><Star className="h-3 w-3 mr-1" />{selectedCustomer.loyalty_points} ქულა</Badge>
                </div>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div className="space-y-1">
                    <p><Phone className="h-3 w-3 inline mr-1" />{selectedCustomer.phone}</p>
                    <p><Mail className="h-3 w-3 inline mr-1" />{selectedCustomer.email}</p>
                    <p><Calendar className="h-3 w-3 inline mr-1" />კლიენტი: {selectedCustomer.first_purchase?.split('T')[0]}-დან</p>
                  </div>
                  <div className="space-y-1">
                    <p>სულ შეკვეთა: <strong>{selectedCustomer.total_purchases}</strong></p>
                    <p>სულ დახარჯული: <strong>{(selectedCustomer.total_spent || 0).toLocaleString()} ₾</strong></p>
                    <p>საშუალო ჩეკი: <strong>{selectedCustomer.total_purchases > 0 ? (selectedCustomer.total_spent / selectedCustomer.total_purchases).toFixed(1) : 0} ₾</strong></p>
                  </div>
                  <div className="space-y-1">
                    <p>ბოლო შეძენა: <strong>{selectedCustomer.last_purchase?.split('T')[0] || '-'}</strong></p>
                    <p>ლოიალობის ქულები: <strong>{selectedCustomer.loyalty_points}</strong></p>
                    {selectedCustomer.notes && <p className="text-muted-foreground italic">{selectedCustomer.notes}</p>}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-1"><History className="h-4 w-4" />შეძენის ისტორია</h4>
                  <Table>
                    <TableHeader><TableRow><TableHead>თარიღი</TableHead><TableHead>პროდუქტები</TableHead><TableHead className="text-right">ჯამი</TableHead><TableHead>ქულები</TableHead><TableHead>ფასდაკლება</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {history.filter(h => h.customerId === selectedCustomer.id).map(h => (
                        <TableRow key={h.id}>
                          <TableCell>{h.date}</TableCell>
                          <TableCell className="text-sm">{h.items.join(', ')}</TableCell>
                          <TableCell className="text-right font-medium">{h.total.toFixed(2)} ₾</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">+{h.pointsEarned}</Badge></TableCell>
                          <TableCell>{h.discountApplied ? <span className="text-primary">-{h.discountApplied}%</span> : '—'}</TableCell>
                        </TableRow>
                      ))}
                      {history.filter(h => h.customerId === selectedCustomer.id).length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">ისტორია არ მოიძებნა</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>კლიენტი</TableHead>
                      <TableHead>სეგმენტი</TableHead>
                      <TableHead>დონე</TableHead>
                      <TableHead className="text-right">სულ დახარჯული</TableHead>
                      <TableHead>შეკვეთები</TableHead>
                      <TableHead>ქულები</TableHead>
                      <TableHead>ბოლო შეძენა</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(c => {
                      const tier = LOYALTY_TIERS.find(t => t.key === c.loyalty_tier)!;
                      const nextTier = LOYALTY_TIERS[LOYALTY_TIERS.indexOf(tier) + 1];
                      const progress = nextTier ? ((c.total_spent - (LOYALTY_TIERS[LOYALTY_TIERS.indexOf(tier)].minPoints || 0)) / (nextTier.minPoints - (LOYALTY_TIERS[LOYALTY_TIERS.indexOf(tier)].minPoints || 0))) * 100 : 100;

                      return (
                        <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedCustomer(c)}>
                          <TableCell><div><p className="font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{c.phone}</p></div></TableCell>
                          <TableCell>{segmentBadge(c.segment)}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {tierBadge(c.loyalty_tier)}
                              {nextTier && <Progress value={progress} className="h-1 w-16" />}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">{(c.total_spent || 0).toLocaleString()} ₾</TableCell>
                          <TableCell>{c.total_purchases}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs"><Star className="h-3 w-3 mr-0.5" />{c.loyalty_points}</Badge></TableCell>
                          <TableCell className="text-sm">{c.last_purchase?.split('T')[0] || '-'}</TableCell>
                          <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* LOYALTY TAB */}
        <TabsContent value="loyalty" className="space-y-4">
          <div className="grid md:grid-cols-4 gap-4">
            {LOYALTY_TIERS.map(tier => {
              const Icon = tier.icon;
              const count = clients.filter(c => c.loyalty_tier === tier.key).length;
              return (
                <Card key={tier.key} className="relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: tier.color }} />
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5" style={{ color: tier.color }} />
                        <h3 className="font-bold">{tier.name}</h3>
                      </div>
                      <Badge variant="outline">{count} კლიენტი</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{tier.minPoints}+ ქულა</p>
                    <div className="space-y-1">
                      {tier.perks.map((perk, i) => (
                        <p key={i} className="text-sm flex items-center gap-1"><Zap className="h-3 w-3 text-primary" />{perk}</p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">ლოიალობის რეიტინგი</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[...clients].sort((a, b) => b.loyalty_points - a.loyalty_points).map((c, i) => {
                const tier = LOYALTY_TIERS.find(t => t.key === c.loyalty_tier)!;
                const nextTier = LOYALTY_TIERS[LOYALTY_TIERS.indexOf(tier) + 1];
                const progress = nextTier ? ((c.loyalty_points - tier.minPoints) / (nextTier.minPoints - tier.minPoints)) * 100 : 100;
                return (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="text-lg font-bold w-6 text-muted-foreground">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{c.name}</span>
                          {tierBadge(c.loyalty_tier)}
                        </div>
                        <span className="font-bold" style={{ color: tier.color }}>{c.loyalty_points} ქულა</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={progress} className="h-1.5 flex-1" />
                        {nextTier && <span className="text-[10px] text-muted-foreground">{nextTier.minPoints - c.loyalty_points} → {nextTier.name}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROMOTIONS TAB */}
        <TabsContent value="promotions" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={promoDialog} onOpenChange={setPromoDialog}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />ახალი აქცია</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>ახალი აქცია</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>სახელი</Label><Input value={newPromo.name} onChange={e => setNewPromo(p => ({ ...p, name: e.target.value }))} /></div>
                  <div><Label>ტიპი</Label>
                    <Select value={newPromo.type} onValueChange={v => setNewPromo(p => ({ ...p, type: v as any }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">% ფასდაკლება</SelectItem>
                        <SelectItem value="fixed">ფიქსირებული ფასდაკლება</SelectItem>
                        <SelectItem value="bogo">1+1</SelectItem>
                        <SelectItem value="points_multiplier">ქულების მულტიპლიკატორი</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>მნიშვნელობა</Label><Input type="number" value={newPromo.value} onChange={e => setNewPromo(p => ({ ...p, value: e.target.value }))} /></div>
                  <div><Label>სამიზნე სეგმენტი</Label>
                    <Select value={newPromo.target_segment} onValueChange={v => setNewPromo(p => ({ ...p, target_segment: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">ყველა</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                        <SelectItem value="regular">რეგულარული</SelectItem>
                        <SelectItem value="new">ახალი</SelectItem>
                        <SelectItem value="at_risk">რისკის ზონა</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>დაწყება</Label><Input type="date" value={newPromo.start_date} onChange={e => setNewPromo(p => ({ ...p, start_date: e.target.value }))} /></div>
                    <div><Label>დასრულება</Label><Input type="date" value={newPromo.end_date} onChange={e => setNewPromo(p => ({ ...p, end_date: e.target.value }))} /></div>
                  </div>
                  <div><Label>პრომო კოდი (არასავალდებულო)</Label><Input value={newPromo.promo_code} onChange={e => setNewPromo(p => ({ ...p, promo_code: e.target.value }))} /></div>
                  <Button className="w-full" onClick={handleAddPromotion}>შექმნა</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {promotions.map(promo => (
              <Card key={promo.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{promo.name}</h3>
                    <Switch checked={promo.is_active} disabled />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline"><Percent className="h-3 w-3 mr-0.5" />{promo.type === 'percentage' ? `${promo.value}%` : promo.type === 'fixed' ? `${promo.value}₾` : promo.type === 'points_multiplier' ? `x${promo.value} ქულა` : '1+1'}</Badge>
                    <Badge variant="secondary"><Target className="h-3 w-3 mr-0.5" />{promo.target_segment === 'all' ? 'ყველა' : promo.target_segment}</Badge>
                    {promo.promo_code && <Badge variant="outline"><Tag className="h-3 w-3 mr-0.5" />{promo.promo_code}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground flex justify-between">
                    <span>{promo.start_date?.split('T')[0] || '-'} → {promo.end_date?.split('T')[0] || '-'}</span>
                    <span>გამოყენებული: {promo.usage_count}-ჯერ</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* SEGMENTS TAB */}
        <TabsContent value="segments" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: 'vip', label: '👑 VIP კლიენტები', desc: 'მაღალი LTV, ხშირი შეკვეთები', color: 'hsl(45, 100%, 50%)' },
              { key: 'regular', label: 'რეგულარული', desc: 'სტაბილური მყიდველები', color: 'hsl(200, 70%, 50%)' },
              { key: 'new', label: '🆕 ახალი კლიენტები', desc: 'ბოლო 30 დღეში დარეგისტრირებული', color: 'hsl(145, 70%, 45%)' },
              { key: 'at_risk', label: '⚠️ რისკის ზონა', desc: '60+ დღე არ ყიდულობს', color: 'hsl(30, 100%, 50%)' },
              { key: 'lost', label: '❌ დაკარგული', desc: '180+ დღე არ ყიდულობს', color: 'hsl(0, 70%, 50%)' },
            ].map(seg => {
              const segCustomers = clients.filter(c => c.segment === seg.key);
              const segRevenue = segCustomers.reduce((s, c) => s + (c.total_spent || 0), 0);
              const pct = clients.length > 0 ? Math.round((segCustomers.length / clients.length) * 100) : 0;
              return (
                <Card key={seg.key}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{seg.label}</h3>
                      <span className="text-2xl font-bold">{segCustomers.length}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{seg.desc}</p>
                    <Progress value={pct} className="h-2" />
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">წილი</span><p className="font-medium">{pct}%</p></div>
                      <div><span className="text-muted-foreground">შემოსავალი</span><p className="font-medium">{segRevenue.toLocaleString()} ₾</p></div>
                    </div>
                    <div className="text-xs space-y-0.5">
                      {segCustomers.slice(0, 3).map(c => <p key={c.id} className="text-muted-foreground">{c.name} — {(c.total_spent || 0).toLocaleString()} ₾</p>)}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}