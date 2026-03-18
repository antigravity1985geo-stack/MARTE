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
  Plus, Heart, Award, Tag, History, Phone, Mail, Calendar,
  BarChart3, Target, Zap, ChevronRight, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useClients } from '@/hooks/useClients';
import { useI18n } from '@/hooks/useI18n';

interface LoyaltyTier {
  name_ka: string;
  name_en: string;
  key: string;
  minPoints: number;
  discountPercent: number;
  pointsMultiplier: number;
  color: string;
  icon: React.ElementType;
  perks_ka: string[];
  perks_en: string[];
}

const LOYALTY_TIERS: LoyaltyTier[] = [
  { name_ka: 'ბრინჯაო', name_en: 'Bronze', key: 'bronze', minPoints: 0, discountPercent: 2, pointsMultiplier: 1, color: 'hsl(30, 60%, 50%)', icon: Star, perks_ka: ['2% ფასდაკლება', '1x ქულები'], perks_en: ['2% Discount', '1x Points'] },
  { name_ka: 'ვერცხლი', name_en: 'Silver', key: 'silver', minPoints: 2000, discountPercent: 5, pointsMultiplier: 1.5, color: 'hsl(0, 0%, 65%)', icon: Star, perks_ka: ['5% ფასდაკლება', '1.5x ქულები', 'დაბადების დღის ბონუსი'], perks_en: ['5% Discount', '1.5x Points', 'Birthday Bonus'] },
  { name_ka: 'ოქრო', name_en: 'Gold', key: 'gold', minPoints: 10000, discountPercent: 10, pointsMultiplier: 2, color: 'hsl(45, 100%, 50%)', icon: Crown, perks_ka: ['10% ფასდაკლება', '2x ქულები', 'უფასო მიწოდება'], perks_en: ['10% Discount', '2x Points', 'Free Delivery'] },
  { name_ka: 'პლატინა', name_en: 'Platinum', key: 'platinum', minPoints: 25000, discountPercent: 15, pointsMultiplier: 3, color: 'hsl(220, 20%, 60%)', icon: Award, perks_ka: ['15% ფასდაკლება', '3x ქულები', 'VIP მომსახურება'], perks_en: ['15% Discount', '3x Points', 'VIP Service'] },
];

export default function CRMPage() {
  const { clients, promotions, isLoading, addPromotion: addPromoMutation, runSegmentationUpdate, sendCampaign } = useClients();
  const { t, lang } = useI18n();
  const [history] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [promoDialog, setPromoDialog] = useState(false);
  const [campaignDialog, setCampaignDialog] = useState(false);
  const [selectedSegForCampaign, setSelectedSegForCampaign] = useState('all');
  const [newPromo, setNewPromo] = useState({ name: '', type: 'percentage' as any, value: '', target_segment: 'all', start_date: '', end_date: '', promo_code: '' });

  // Helper: tier name for current language
  const tierName = (tier: LoyaltyTier) => lang === 'en' ? tier.name_en : tier.name_ka;
  const tierPerks = (tier: LoyaltyTier) => lang === 'en' ? tier.perks_en : tier.perks_ka;

  const filtered = clients.filter(c => {
    if (searchTerm && !c.name.toLowerCase().includes(searchTerm.toLowerCase()) && !c.phone.includes(searchTerm) && !c.email.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (segmentFilter !== 'all' && c.segment !== segmentFilter) return false;
    if (tierFilter !== 'all' && c.loyalty_tier !== tierFilter) return false;
    return true;
  });

  const handleRunSegmentation = () => {
    toast.promise(runSegmentationUpdate.mutateAsync(), {
      loading: t('crm_segmentation_running'),
      success: t('crm_segmentation_done'),
      error: t('error'),
    });
  };

  const handleSendCampaign = (campaign: any) => {
    toast.promise(sendCampaign.mutateAsync(campaign), {
      loading: '...',
      success: t('success'),
      error: t('error'),
    });
  };

  const handleAddPromotion = () => {
    if (!newPromo.name || !newPromo.value) return;
    addPromoMutation.mutate({
      name: newPromo.name, type: newPromo.type, value: Number(newPromo.value),
      target_segment: newPromo.target_segment, start_date: newPromo.start_date || null,
      end_date: newPromo.end_date || null, promo_code: newPromo.promo_code || null,
    }, {
      onSuccess: () => {
        setPromoDialog(false);
        setNewPromo({ name: '', type: 'percentage', value: '', target_segment: 'all', start_date: '', end_date: '', promo_code: '' });
        toast.success(t('crm_promo_created'));
      },
    });
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const segmentBadge = (segment: string) => {
    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      vip: { label: '👑 VIP', variant: 'default' },
      regular: { label: t('crm_segment_regular'), variant: 'secondary' },
      new: { label: `🆕 ${t('crm_segment_new')}`, variant: 'outline' },
      at_risk: { label: t('crm_segment_at_risk'), variant: 'destructive' },
      lost: { label: t('crm_segment_lost'), variant: 'destructive' },
    };
    const s = map[segment] || { label: segment, variant: 'outline' as const };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const tierBadge = (tier: any) => {
    const tObj = LOYALTY_TIERS.find(lt => lt.key === tier);
    return <Badge variant="outline" style={{ borderColor: tObj?.color, color: tObj?.color }}>{tObj ? tierName(tObj) : tier}</Badge>;
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('crm_title')}</h1>
          <p className="text-muted-foreground">{t('crm_subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRunSegmentation} disabled={runSegmentationUpdate.isPending}>
            <Zap className={`h-4 w-4 mr-1 ${runSegmentationUpdate.isPending ? 'animate-pulse text-yellow-500' : ''}`} />
            {t('crm_run_segmentation')}
          </Button>
          <Dialog open={campaignDialog} onOpenChange={setCampaignDialog}>
            <DialogTrigger asChild><Button onClick={() => setCampaignDialog(true)}><Mail className="h-4 w-4 mr-1" />{t('crm_run_campaign')}</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t('crm_campaign_title')}</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>{t('crm_campaign_target')}</Label>
                  <Select value={selectedSegForCampaign} onValueChange={setSelectedSegForCampaign}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('crm_campaign_all')}</SelectItem>
                      <SelectItem value="vip">{t('crm_campaign_vip')}</SelectItem>
                      <SelectItem value="at_risk">{t('crm_campaign_at_risk')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('crm_campaign_message')}</Label>
                  <Textarea rows={4} />
                </div>
                <Button className="w-full" onClick={() => { handleSendCampaign({ name: 'CRM Promo', target: selectedSegForCampaign }); setCampaignDialog(false); }}>
                  {t('crm_campaign_send')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{clients.length}</p><p className="text-xs text-muted-foreground">{t('crm_total_clients')}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Crown className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{segmentCounts.vip}</p><p className="text-xs text-muted-foreground">VIP</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10"><Target className="h-5 w-5 text-destructive" /></div>
          <div><p className="text-2xl font-bold">{segmentCounts.at_risk}</p><p className="text-xs text-muted-foreground">{t('crm_risk_zone')}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{totalRevenueVal.toLocaleString()} ₾</p><p className="text-xs text-muted-foreground">{t('crm_total_revenue')}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted"><Heart className="h-5 w-5 text-muted-foreground" /></div>
          <div><p className="text-2xl font-bold">{avgLifetimeValue} ₾</p><p className="text-xs text-muted-foreground">{t('crm_avg_ltv')}</p></div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="customers">
        <TabsList>
          <TabsTrigger value="customers"><Users className="h-4 w-4 mr-1" />{t('crm_tab_clients')}</TabsTrigger>
          <TabsTrigger value="loyalty"><Star className="h-4 w-4 mr-1" />{t('crm_tab_loyalty')}</TabsTrigger>
          <TabsTrigger value="promotions"><Gift className="h-4 w-4 mr-1" />{t('crm_tab_promotions')}</TabsTrigger>
          <TabsTrigger value="segments"><BarChart3 className="h-4 w-4 mr-1" />{t('crm_tab_segments')}</TabsTrigger>
        </TabsList>

        {/* CUSTOMERS TAB */}
        <TabsContent value="customers" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder={t('crm_search')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Select value={segmentFilter} onValueChange={setSegmentFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder={t('crm_segment')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('crm_segment_all')}</SelectItem>
                <SelectItem value="vip">{t('crm_segment_vip')}</SelectItem>
                <SelectItem value="regular">{t('crm_segment_regular')}</SelectItem>
                <SelectItem value="new">{t('crm_segment_new')}</SelectItem>
                <SelectItem value="at_risk">{t('crm_segment_at_risk')}</SelectItem>
                <SelectItem value="lost">{t('crm_segment_lost')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder={t('crm_tier')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('crm_segment_all')} {t('crm_tier')}</SelectItem>
                {LOYALTY_TIERS.map(tr => <SelectItem key={tr.key} value={tr.key}>{tierName(tr)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {selectedCustomer ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">{selectedCustomer.name}</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setSelectedCustomer(null)}>{t('close')}</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {segmentBadge(selectedCustomer.segment)}
                  {tierBadge(selectedCustomer.loyalty_tier)}
                  <Badge variant="outline"><Star className="h-3 w-3 mr-1" />{selectedCustomer.loyalty_points} {t('crm_points')}</Badge>
                </div>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div className="space-y-1">
                    <p><Phone className="h-3 w-3 inline mr-1" />{selectedCustomer.phone}</p>
                    <p><Mail className="h-3 w-3 inline mr-1" />{selectedCustomer.email}</p>
                    <p><Calendar className="h-3 w-3 inline mr-1" />{t('clients_since')} {selectedCustomer.first_purchase?.split('T')[0]}</p>
                  </div>
                  <div className="space-y-1">
                    <p>{t('clients_total_orders')} <strong>{selectedCustomer.total_purchases}</strong></p>
                    <p>{t('clients_total_spent')} <strong>{(selectedCustomer.total_spent || 0).toLocaleString()} ₾</strong></p>
                    <p>{t('clients_avg_check')} <strong>{selectedCustomer.total_purchases > 0 ? (selectedCustomer.total_spent / selectedCustomer.total_purchases).toFixed(1) : 0} ₾</strong></p>
                  </div>
                  <div className="space-y-1">
                    <p>{t('clients_last_purchase')} <strong>{selectedCustomer.last_purchase?.split('T')[0] || '-'}</strong></p>
                    <p>{t('clients_loyalty_points')} <strong>{selectedCustomer.loyalty_points}</strong></p>
                    {selectedCustomer.notes && <p className="text-muted-foreground italic">{selectedCustomer.notes}</p>}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-1"><History className="h-4 w-4" />{t('crm_purchase_history')}</h4>
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>{t('date')}</TableHead>
                      <TableHead>{t('products_title')}</TableHead>
                      <TableHead className="text-right">{t('total')}</TableHead>
                      <TableHead>{t('crm_earned_points')}</TableHead>
                      <TableHead>{t('crm_discount_applied')}</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {history.filter((h: any) => h.customerId === selectedCustomer.id).map((h: any) => (
                        <TableRow key={h.id}>
                          <TableCell>{h.date}</TableCell>
                          <TableCell className="text-sm">{Array.isArray(h.items) ? h.items.join(', ') : h.items}</TableCell>
                          <TableCell className="text-right font-medium">{h.total?.toFixed(2)} ₾</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">+{h.pointsEarned}</Badge></TableCell>
                          <TableCell>{h.discountApplied ? <span className="text-primary">-{h.discountApplied}%</span> : '—'}</TableCell>
                        </TableRow>
                      ))}
                      {history.filter((h: any) => h.customerId === selectedCustomer.id).length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">{t('crm_history_empty')}</TableCell></TableRow>
                      )}
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
                      <TableHead>{t('crm_client_col')}</TableHead>
                      <TableHead>{t('crm_segment')}</TableHead>
                      <TableHead>{t('crm_tier')}</TableHead>
                      <TableHead className="text-right">{t('crm_total_spent')}</TableHead>
                      <TableHead>{t('crm_orders_count')}</TableHead>
                      <TableHead>{t('crm_points')}</TableHead>
                      <TableHead>{t('crm_last_purchase')}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(c => {
                      const tier = LOYALTY_TIERS.find(tr => tr.key === c.loyalty_tier)!;
                      const nextTier = tier ? LOYALTY_TIERS[LOYALTY_TIERS.indexOf(tier) + 1] : undefined;
                      const progress = nextTier && tier ? ((c.total_spent - (tier.minPoints || 0)) / (nextTier.minPoints - (tier.minPoints || 0))) * 100 : 100;
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
                        <h3 className="font-bold">{tierName(tier)}</h3>
                      </div>
                      <Badge variant="outline">{count} {t('crm_tab_clients')}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{tier.minPoints}+ {t('crm_points')}</p>
                    <div className="space-y-1">
                      {tierPerks(tier).map((perk, i) => (
                        <p key={i} className="text-sm flex items-center gap-1"><Zap className="h-3 w-3 text-primary" />{perk}</p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">{t('crm_loyalty_rating')}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[...clients].sort((a, b) => b.loyalty_points - a.loyalty_points).map((c, i) => {
                const tier = LOYALTY_TIERS.find(tr => tr.key === c.loyalty_tier)!;
                const nextTier = tier ? LOYALTY_TIERS[LOYALTY_TIERS.indexOf(tier) + 1] : undefined;
                const progress = nextTier && tier ? ((c.loyalty_points - tier.minPoints) / (nextTier.minPoints - tier.minPoints)) * 100 : 100;
                return (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="text-lg font-bold w-6 text-muted-foreground">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{c.name}</span>
                          {tierBadge(c.loyalty_tier)}
                        </div>
                        <span className="font-bold" style={{ color: tier?.color }}>{c.loyalty_points} {t('crm_points')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={progress} className="h-1.5 flex-1" />
                        {nextTier && <span className="text-[10px] text-muted-foreground">{nextTier.minPoints - c.loyalty_points} → {tierName(nextTier)}</span>}
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
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />{t('crm_add_promotion')}</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t('crm_add_promotion')}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>{t('crm_promo_name')}</Label><Input value={newPromo.name} onChange={e => setNewPromo(p => ({ ...p, name: e.target.value }))} /></div>
                  <div><Label>{t('crm_promo_type')}</Label>
                    <Select value={newPromo.type} onValueChange={v => setNewPromo(p => ({ ...p, type: v as any }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">{t('crm_promo_type_pct')}</SelectItem>
                        <SelectItem value="fixed">{t('crm_promo_type_fixed')}</SelectItem>
                        <SelectItem value="bogo">{t('crm_promo_type_bogo')}</SelectItem>
                        <SelectItem value="points_multiplier">{t('crm_promo_type_multiplier')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>{t('crm_promo_value')}</Label><Input type="number" value={newPromo.value} onChange={e => setNewPromo(p => ({ ...p, value: e.target.value }))} /></div>
                  <div><Label>{t('crm_promo_target')}</Label>
                    <Select value={newPromo.target_segment} onValueChange={v => setNewPromo(p => ({ ...p, target_segment: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('crm_segment_all')}</SelectItem>
                        <SelectItem value="vip">{t('crm_segment_vip')}</SelectItem>
                        <SelectItem value="regular">{t('crm_segment_regular')}</SelectItem>
                        <SelectItem value="new">{t('crm_segment_new')}</SelectItem>
                        <SelectItem value="at_risk">{t('crm_segment_at_risk')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>{t('crm_promo_start')}</Label><Input type="date" value={newPromo.start_date} onChange={e => setNewPromo(p => ({ ...p, start_date: e.target.value }))} /></div>
                    <div><Label>{t('crm_promo_end')}</Label><Input type="date" value={newPromo.end_date} onChange={e => setNewPromo(p => ({ ...p, end_date: e.target.value }))} /></div>
                  </div>
                  <div><Label>{t('crm_promo_code')}</Label><Input value={newPromo.promo_code} onChange={e => setNewPromo(p => ({ ...p, promo_code: e.target.value }))} /></div>
                  <Button className="w-full" onClick={handleAddPromotion}>{t('crm_promo_create')}</Button>
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
                    <Badge variant="outline"><Percent className="h-3 w-3 mr-0.5" />{promo.type === 'percentage' ? `${promo.value}%` : promo.type === 'fixed' ? `${promo.value}₾` : promo.type === 'points_multiplier' ? `x${promo.value} ${t('crm_points')}` : '1+1'}</Badge>
                    <Badge variant="secondary"><Target className="h-3 w-3 mr-0.5" />{promo.target_segment === 'all' ? t('crm_segment_all') : promo.target_segment}</Badge>
                    {promo.promo_code && <Badge variant="outline"><Tag className="h-3 w-3 mr-0.5" />{promo.promo_code}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground flex justify-between">
                    <span>{promo.start_date?.split('T')[0] || '-'} → {promo.end_date?.split('T')[0] || '-'}</span>
                    <span>{t('crm_used')}: {promo.usage_count}{t('crm_times')}</span>
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
              { key: 'vip', label: '👑 VIP', desc_ka: 'მაღალი LTV, ხშირი შეკვეთები', desc_en: 'High LTV, frequent orders', color: 'hsl(45, 100%, 50%)' },
              { key: 'regular', label: t('crm_segment_regular'), desc_ka: 'სტაბილური მყიდველები', desc_en: 'Stable buyers', color: 'hsl(200, 70%, 50%)' },
              { key: 'new', label: `🆕 ${t('crm_segment_new')}`, desc_ka: 'ბოლო 30 დღეში', desc_en: 'Joined in last 30 days', color: 'hsl(145, 70%, 45%)' },
              { key: 'at_risk', label: t('crm_segment_at_risk'), desc_ka: '60+ დღე არ ყიდულობს', desc_en: '60+ days inactive', color: 'hsl(30, 100%, 50%)' },
              { key: 'lost', label: t('crm_segment_lost'), desc_ka: '180+ დღე არ ყიდულობს', desc_en: '180+ days inactive', color: 'hsl(0, 70%, 50%)' },
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
                    <p className="text-xs text-muted-foreground">{lang === 'en' ? seg.desc_en : seg.desc_ka}</p>
                    <Progress value={pct} className="h-2" />
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">{t('crm_share')}</span><p className="font-medium">{pct}%</p></div>
                      <div><span className="text-muted-foreground">{t('crm_total_revenue')}</span><p className="font-medium">{segRevenue.toLocaleString()} ₾</p></div>
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