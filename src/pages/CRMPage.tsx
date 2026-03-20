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
  BarChart3, Target, Zap, ChevronRight, Loader2, Send
} from 'lucide-react';
import { toast } from 'sonner';
import { useClients } from '@/hooks/useClients';
import { useI18n } from '@/hooks/useI18n';
import { AutomatedCampaignsTab } from '@/components/crm/AutomatedCampaignsTab';

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

const TIER_VISUALS: Record<string, { icon: React.ElementType; color: string }> = {
  bronze: { icon: Star, color: 'hsl(30, 60%, 50%)' },
  silver: { icon: Star, color: 'hsl(0, 0%, 65%)' },
  gold: { icon: Crown, color: 'hsl(45, 100%, 50%)' },
  platinum: { icon: Award, color: 'hsl(220, 20%, 60%)' },
};

export default function CRMPage() {
  const { clients, promotions, campaigns, loyaltyTiers, automatedRules, isLoading, addPromotion: addPromoMutation, runSegmentationUpdate, sendCampaign, updateAutomatedRule, triggerAutomatedCampaigns, pointsHistory } = useClients();
  const { t, lang } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [promoDialog, setPromoDialog] = useState(false);
  const [campaignDialog, setCampaignDialog] = useState(false);
  const [selectedSegForCampaign, setSelectedSegForCampaign] = useState('all');
  const [campaignType, setCampaignType] = useState('sms');
  const [campaignContent, setCampaignContent] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [newPromo, setNewPromo] = useState({ name: '', type: 'percentage' as any, value: '', target_segment: 'all', start_date: '', end_date: '', promo_code: '' });

  // Helper: tier visuals and names
  const getTierVisual = (tierKey: string) => TIER_VISUALS[tierKey.toLowerCase()] || { icon: Star, color: 'hsl(var(--muted-foreground))' };
  const getTierName = (tier: any) => {
    if (!tier) return '-';
    // If it's a string (tier key from client), find info in loyaltyTiers
    const info = typeof tier === 'string' ? loyaltyTiers.find(t => t.id === tier || t.name.toLowerCase() === tier.toLowerCase()) : tier;
    return info?.name || tier;
  };

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

  const handleSendCampaign = () => {
    if (!campaignName || !campaignContent) {
      toast.error('გთხოვთ შეავსოთ კამპანიის სახელი და ტექსტი');
      return;
    }
    toast.promise(sendCampaign.mutateAsync({ 
      name: campaignName, 
      target: selectedSegForCampaign,
      type: campaignType,
      content: campaignContent
    }), {
      loading: 'კამპანია იგზავნება...',
      success: () => {
        setCampaignDialog(false);
        setCampaignName('');
        setCampaignContent('');
        return t('success');
      },
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

  const tierBadge = (tier: string) => {
    const visual = getTierVisual(tier);
    return <Badge variant="outline" style={{ borderColor: visual.color, color: visual.color }}>{getTierName(tier)}</Badge>;
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
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader><DialogTitle>{t('crm_campaign_title')}</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>{t('crm_campaign_name')}</Label>
                  <Input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="მაგ: საგაზაფხულო ფასდაკლება" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('crm_campaign_target')}</Label>
                    <Select value={selectedSegForCampaign} onValueChange={setSelectedSegForCampaign}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('crm_campaign_all')}</SelectItem>
                        <SelectItem value="vip">{t('crm_campaign_vip')}</SelectItem>
                        <SelectItem value="at_risk">{t('crm_campaign_at_risk')}</SelectItem>
                        <SelectItem value="new">ახალი კლიენტები</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('crm_channel')}</Label>
                    <Select value={campaignType} onValueChange={setCampaignType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="portal">Portal Notification</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('crm_campaign_message')}</Label>
                  <Textarea rows={4} value={campaignContent} onChange={e => setCampaignContent(e.target.value)} placeholder="შეიყვანეთ შეტყობინების ტექსტი..." />
                </div>
                <Button className="w-full" onClick={handleSendCampaign} disabled={sendCampaign.isPending}>
                  {sendCampaign.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
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
          <TabsTrigger value="automations" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Zap className="h-4 w-4 mr-1" />ავტომატიზაცია</TabsTrigger>
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
                {loyaltyTiers.map(tr => <SelectItem key={tr.id} value={tr.name.toLowerCase()}>{tr.name}</SelectItem>)}
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
                  <Badge variant="outline"><TrendingUp className="h-3 w-3 mr-1" />{selectedCustomer.lifetime_points} Total</Badge>
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
                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-4 flex items-center gap-2"><History className="h-5 w-5 text-primary" />{t('crm_points_history')}</h4>
                  <PointsHistoryTable clientId={selectedCustomer.id} />
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
                      const tier = loyaltyTiers.find(tr => tr.name.toLowerCase() === c.loyalty_tier?.toLowerCase());
                      const tierIndex = tier ? loyaltyTiers.indexOf(tier) : -1;
                      const nextTier = tierIndex !== -1 ? loyaltyTiers[tierIndex + 1] : loyaltyTiers[0];
                      const progress = nextTier ? Math.min(100, (c.lifetime_points / nextTier.threshold) * 100) : 100;
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
            {loyaltyTiers.map(tier => {
              const visual = getTierVisual(tier.name);
              const Icon = visual.icon;
              const count = clients.filter(c => c.loyalty_tier?.toLowerCase() === tier.name.toLowerCase()).length;
              return (
                <Card key={tier.id} className="relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: visual.color }} />
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5" style={{ color: visual.color }} />
                        <h3 className="font-bold">{tier.name}</h3>
                      </div>
                      <Badge variant="outline">{count} {t('crm_tab_clients')}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{tier.threshold}+ {t('crm_points')}</p>
                    <div className="space-y-1">
                      <p className="text-sm flex items-center gap-1"><Zap className="h-3 w-3 text-primary" />{tier.multiplier}x {t('crm_points')}</p>
                      <p className="text-sm flex items-center gap-1"><Percent className="h-3 w-3 text-primary" />{Math.round((tier.multiplier - 1) * 100)}% {t('pos_discount')}</p>
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
                const tier = loyaltyTiers.find(tr => tr.name.toLowerCase() === c.loyalty_tier?.toLowerCase());
                const tierIndex = tier ? loyaltyTiers.indexOf(tier) : -1;
                const nextTier = tierIndex !== -1 ? loyaltyTiers[tierIndex + 1] : loyaltyTiers[0];
                const visual = getTierVisual(c.loyalty_tier || '');
                const progress = nextTier ? Math.min(100, (c.lifetime_points / nextTier.threshold) * 100) : 100;
                return (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="text-lg font-bold w-6 text-muted-foreground">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{c.name}</span>
                          {tierBadge(c.loyalty_tier || '')}
                        </div>
                        <span className="font-bold" style={{ color: visual.color }}>{c.loyalty_points} {t('crm_points')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={progress} className="h-1.5 flex-1" />
                        {nextTier && <span className="text-[10px] text-muted-foreground">{nextTier.threshold - c.lifetime_points} → {getTierName(nextTier)}</span>}
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
                    <span>{t('crm_used')}: {promo.usage_count} {t('crm_times')}</span>
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
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          <Card>
            <CardHeader><CardTitle className="text-base">{t('crm_campaign_history')}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('crm_campaign_name')}</TableHead>
                    <TableHead>{t('type')}</TableHead>
                    <TableHead>{t('crm_segment')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{t('date')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((camp: any) => (
                    <TableRow key={camp.id}>
                      <TableCell className="font-medium">{camp.name}</TableCell>
                      <TableCell><Badge variant="outline">{camp.type.toUpperCase()}</Badge></TableCell>
                      <TableCell>{camp.target_segment}</TableCell>
                      <TableCell><Badge className="bg-green-500 text-white">{camp.status}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(camp.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {campaigns.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">ისტორია ცარიელია</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AUTOMATIONS TAB */}
        <TabsContent value="automations" className="space-y-4">
          <AutomatedCampaignsTab 
            rules={automatedRules} 
            updateRule={updateAutomatedRule} 
            triggerCampaigns={triggerAutomatedCampaigns}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PointsHistoryTable({ clientId }: { clientId: string }) {
  const { pointsHistory } = useClients();
  const { data: history = [], isLoading } = pointsHistory(clientId);
  const { t } = useI18n();

  if (isLoading) return <div className="h-20 w-full animate-pulse bg-muted rounded-lg" />;

  return (
    <Table>
      <TableHeader><TableRow>
        <TableHead>{t('date')}</TableHead>
        <TableHead>{t('description')}</TableHead>
        <TableHead>{t('type')}</TableHead>
        <TableHead className="text-right">{t('crm_points')}</TableHead>
      </TableRow></TableHeader>
      <TableBody>
        {history.map((h: any) => (
          <TableRow key={h.id}>
            <TableCell className="text-xs">{new Date(h.created_at).toLocaleString()}</TableCell>
            <TableCell className="text-sm font-medium">{h.description}</TableCell>
            <TableCell>
              <Badge variant={h.type === 'earn' ? 'default' : 'destructive'} className="text-[10px]">
                {h.type === 'earn' ? t('crm_earn') : t('crm_spend')}
              </Badge>
            </TableCell>
            <TableCell className={`text-right font-black ${h.type === 'earn' ? 'text-green-500' : 'text-destructive'}`}>
              {h.type === 'earn' ? '+' : '-'}{h.points}
            </TableCell>
          </TableRow>
        ))}
        {history.length === 0 && (
          <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">{t('crm_history_empty')}</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  );
}