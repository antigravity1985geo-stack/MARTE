import { useState } from 'react';
import { useEcommerce, EcommerceOrder, EcommercePlatform, EcommerceProductMapping } from '@/hooks/useEcommerce';
import { useProducts } from '@/hooks/useProducts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  ShoppingBag, Globe, Link2, RefreshCw, Package, Clock,
  CheckCircle, AlertCircle, TrendingUp, ArrowUpDown, Settings,
  Bike, UtensilsCrossed, Store, ExternalLink, Wifi, WifiOff,
  Eye, Truck, XCircle, BarChart3, Plus, Trash2, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const PLATFORM_CONFIGS: Record<string, { icon: any; color: string; name: string }> = {
  glovo: { name: 'Glovo', icon: Bike, color: 'hsl(45, 100%, 50%)' },
  wolt: { name: 'Wolt', icon: UtensilsCrossed, color: 'hsl(200, 100%, 45%)' },
  extra: { name: 'Extra.ge', icon: Store, color: 'hsl(145, 70%, 40%)' },
};

export default function EcommercePage() {
  const { products } = useProducts();
  const { 
    platforms: dbPlatforms, 
    orders, 
    mappings, 
    isLoading, 
    connectPlatform: connectMut, 
    disconnectPlatform: disconnectMut, 
    updateOrderStatus: updateStatusMut,
    saveMapping: saveMappingMut,
    deleteMapping: deleteMappingMut,
    simulateSync 
  } = useEcommerce();
  
  const [connectDialog, setConnectDialog] = useState<string | null>(null);
  const [connectForm, setConnectForm] = useState({ apiKey: '', storeId: '' });
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [mappingForm, setMappingForm] = useState({ localId: '', platformSlug: 'glovo', extId: '', extName: '', extPrice: '' });

  const platforms = Object.keys(PLATFORM_CONFIGS).map(slug => {
    const dbP = dbPlatforms.find(p => p.platform_slug === slug);
    return {
      id: slug,
      ...PLATFORM_CONFIGS[slug],
      connected: !!dbP?.connected,
      autoSync: dbP?.auto_sync ?? true,
      lastSync: dbP?.last_sync ? new Date(dbP.last_sync).toLocaleTimeString('ka-GE') : 'არასდროს',
      dbId: dbP?.id
    };
  });

  const handleConnect = async (platformSlug: string) => {
    if (!connectForm.apiKey) { toast.error('API Key აუცილებელია'); return; }
    try {
      await connectMut.mutateAsync({ 
        platform_slug: platformSlug, 
        name: PLATFORM_CONFIGS[platformSlug].name,
        api_key: connectForm.apiKey, 
        store_id: connectForm.storeId, 
        connected: true 
      });
      setConnectForm({ apiKey: '', storeId: '' });
      setConnectDialog(null);
      toast.success('პლატფორმა დაუკავშირდა');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDisconnect = async (dbId: string) => {
    try {
      await disconnectMut.mutateAsync(dbId);
      toast.success('პლატფორმა გათიშულია');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSync = async (platformSlug: string) => {
    try {
      await simulateSync.mutateAsync(platformSlug);
    } catch (err: any) { toast.error(err.message); }
  };

  const syncAll = async () => {
    platforms.filter(p => p.connected).forEach(p => handleSync(p.id));
  };

  const handleUpdateStatus = async (orderId: string, status: EcommerceOrder['status']) => {
    try {
      await updateStatusMut.mutateAsync({ id: orderId, status });
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSaveMapping = async () => {
    if (!mappingForm.localId || !mappingForm.extId) return;
    try {
      await saveMappingMut.mutateAsync({
        local_product_id: mappingForm.localId,
        platform_slug: mappingForm.platformSlug,
        platform_product_id: mappingForm.extId,
        platform_product_name: mappingForm.extName,
        price_platform: parseFloat(mappingForm.extPrice) || 0
      });
      toast.success('მეპინგი შენახულია');
      setMappingForm({ localId: '', platformSlug: 'glovo', extId: '', extName: '', extPrice: '' });
    } catch (err: any) { toast.error(err.message); }
  };

  const statusBadge = (status: EcommerceOrder['status']) => {
    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      new: { label: '🆕 ახალი', variant: 'default' },
      accepted: { label: '✅ მიღებული', variant: 'secondary' },
      preparing: { label: '👨‍🍳 მზადდება', variant: 'outline' },
      ready: { label: '📦 მზადაა', variant: 'secondary' },
      picked_up: { label: '🚴 აიღეს', variant: 'outline' },
      delivered: { label: '✅ მიწოდებულია', variant: 'default' },
      cancelled: { label: '❌ გაუქმებული', variant: 'destructive' },
    };
    const s = map[status] || map.new;
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const filteredOrders = orders.filter(o => {
    if (orderFilter !== 'all' && o.platform_slug !== orderFilter) return false;
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    return true;
  });

  const connectedCount = platforms.filter(p => p.connected).length;
  const totalTodayRevenue = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0);
  const newOrdersCount = orders.filter(o => o.status === 'new').length;

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">E-Commerce ინტეგრაცია</h1>
          <p className="text-muted-foreground">Glovo, Wolt, Extra.ge — შეკვეთების სინქრონიზაცია და მართვა</p>
        </div>
        <Button variant="outline" onClick={syncAll}><RefreshCw className="h-4 w-4 mr-1" />ყველას განახლება</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Link2 className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{connectedCount}/3</p><p className="text-xs text-muted-foreground">დაკავშირებული</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><ShoppingBag className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{orders.length}</p><p className="text-xs text-muted-foreground">სულ შეკვეთა</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{totalTodayRevenue.toFixed(0)} ₾</p><p className="text-xs text-muted-foreground">დღეს შემოსავალი</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10"><AlertCircle className="h-5 w-5 text-destructive" /></div>
          <div><p className="text-2xl font-bold">{newOrdersCount}</p><p className="text-xs text-muted-foreground">ახალი შეკვეთა</p></div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="platforms">
        <TabsList>
          <TabsTrigger value="platforms"><Globe className="h-4 w-4 mr-1" />პლატფორმები</TabsTrigger>
          <TabsTrigger value="orders"><ShoppingBag className="h-4 w-4 mr-1" />შეკვეთები{newOrdersCount > 0 && <Badge variant="destructive" className="ml-1 text-[10px] px-1">{newOrdersCount}</Badge>}</TabsTrigger>
          <TabsTrigger value="products"><Package className="h-4 w-4 mr-1" />პროდუქტების მეპინგი</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 mr-1" />ანალიტიკა</TabsTrigger>
        </TabsList>

        <TabsContent value="platforms" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            {platforms.map(platform => {
              const Icon = platform.icon;
              return (
                <Card key={platform.id} className={platform.connected ? 'border-primary/30' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: `${platform.color}20` }}>
                          <Icon className="h-5 w-5" style={{ color: platform.color }} />
                        </div>
                        <CardTitle className="text-lg">{platform.name}</CardTitle>
                      </div>
                      {platform.connected ? <Badge variant="default" className="gap-1"><Wifi className="h-3 w-3" />ონლაინ</Badge> : <Badge variant="outline" className="gap-1"><WifiOff className="h-3 w-3" />გათიშული</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {platform.connected ? (
                      <>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-2 rounded-lg bg-muted/50">
                            <p className="text-lg font-bold">{orders.filter(o => o.platform_slug === platform.id).length}</p>
                            <p className="text-[10px] text-muted-foreground">სულ</p>
                          </div>
                          <div className="p-2 rounded-lg bg-muted/50">
                            <p className="text-lg font-bold">{orders.filter(o => o.platform_slug === platform.id && o.status === 'new').length}</p>
                            <p className="text-[10px] text-muted-foreground">ახალი</p>
                          </div>
                          <div className="p-2 rounded-lg bg-muted/50">
                            <p className="text-lg font-bold">{orders.filter(o => o.platform_slug === platform.id && o.status === 'delivered').reduce((s, o) => s + o.total, 0).toFixed(0)}₾</p>
                            <p className="text-[10px] text-muted-foreground">ჯამი</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">ავტო-სინქრონიზაცია</span>
                          <Switch checked={platform.autoSync} onCheckedChange={() => {}} />
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />ბოლო სინქრონიზაცია: {platform.lastSync}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => handleSync(platform.id)}><RefreshCw className="h-3 w-3 mr-1" />სინქრო</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDisconnect(platform.dbId!)}>გათიშვა</Button>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">დააკავშირეთ {platform.name} თქვენს მაღაზიასთან შეკვეთების ავტომატური მისაღებად.</p>
                        <Dialog open={connectDialog === platform.id} onOpenChange={open => { setConnectDialog(open ? platform.id : null); setConnectForm({ apiKey: '', storeId: '' }); }}>
                          <DialogTrigger asChild><Button className="w-full"><Link2 className="h-4 w-4 mr-1" />დაკავშირება</Button></DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>{platform.name}-ს დაკავშირება</DialogTitle></DialogHeader>
                            <div className="space-y-3">
                              <div><Label>API Key</Label><Input type="password" value={connectForm.apiKey} onChange={e => setConnectForm(p => ({ ...p, apiKey: e.target.value }))} placeholder={`${platform.name} API Key`} /></div>
                              <div><Label>მაღაზიის ID (არასავალდებულო)</Label><Input value={connectForm.storeId} onChange={e => setConnectForm(p => ({ ...p, storeId: e.target.value }))} placeholder="Store ID" /></div>
                              <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                                <p className="font-medium mb-1">როგორ მივიღოთ API Key?</p>
                                <p>შედით {platform.name}-ის პარტნიორის პანელში → Settings → API → Generate Key</p>
                              </div>
                              <Button className="w-full" onClick={() => handleConnect(platform.id)}>დაკავშირება</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Select value={orderFilter} onValueChange={setOrderFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="პლატფორმა" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ყველა პლატფორმა</SelectItem>
                <SelectItem value="glovo">Glovo</SelectItem>
                <SelectItem value="wolt">Wolt</SelectItem>
                <SelectItem value="extra">Extra.ge</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="სტატუსი" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ყველა სტატუსი</SelectItem>
                <SelectItem value="new">ახალი</SelectItem>
                <SelectItem value="accepted">მიღებული</SelectItem>
                <SelectItem value="preparing">მზადდება</SelectItem>
                <SelectItem value="ready">მზადაა</SelectItem>
                <SelectItem value="delivered">მიწოდებულია</SelectItem>
                <SelectItem value="cancelled">გაუქმებული</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {filteredOrders.map(order => (
              <Card key={order.id} className={order.status === 'new' ? 'border-destructive/40 shadow-sm' : ''}>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">{PLATFORM_CONFIGS[order.platform_slug].name}</Badge>
                        <span className="font-mono text-xs text-muted-foreground">{order.platform_order_id}</span>
                        {statusBadge(order.status)}
                        <span className="text-xs text-muted-foreground"><Clock className="h-3 w-3 inline mr-0.5" />{new Date(order.created_at).toLocaleTimeString('ka-GE')}</span>
                      </div>
                      <p className="font-medium">{order.customer_name} · <span className="text-sm text-muted-foreground">{order.customer_phone}</span></p>
                      <p className="text-sm text-muted-foreground">{order.customer_address}</p>
                      <div className="text-sm">{order.items.map((i: any) => `${i.name} ×${i.quantity}`).join(', ')}</div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>ჯამი: <strong className="text-foreground">{order.total.toFixed(2)} ₾</strong></span>
                        <span>მიწოდება: {order.delivery_fee?.toFixed(2) || '0.00'} ₾</span>
                        <span>საკომისიო: {order.platform_fee?.toFixed(2) || '0.00'} ₾</span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {order.status === 'new' && (
                        <>
                          <Button size="sm" onClick={() => handleUpdateStatus(order.id, 'accepted')}><CheckCircle className="h-3 w-3 mr-1" />მიღება</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus(order.id, 'cancelled')}><XCircle className="h-3 w-3" /></Button>
                        </>
                      )}
                      {order.status === 'accepted' && <Button size="sm" onClick={() => handleUpdateStatus(order.id, 'preparing')}>მომზადება</Button>}
                      {order.status === 'preparing' && <Button size="sm" onClick={() => handleUpdateStatus(order.id, 'ready')}>მზადაა</Button>}
                      {order.status === 'ready' && <Button size="sm" onClick={() => handleUpdateStatus(order.id, 'picked_up')}>აიღეს</Button>}
                      {order.status === 'picked_up' && <Button size="sm" onClick={() => handleUpdateStatus(order.id, 'delivered')}>მიწოდებულია</Button>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredOrders.length === 0 && <p className="text-center text-muted-foreground py-8">შეკვეთები არ მოიძებნა</p>}
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">პროდუქტების მეპინგი</CardTitle>
                <p className="text-sm text-muted-foreground">დააკავშირეთ ლოკალური პროდუქტები პლატფორმის პროდუქტებთან</p>
              </div>
              <Dialog>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />ახალი მეპინგი</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>პროდუქტის დაკავშირება</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                       <Label>ლოკალური პროდუქტი</Label>
                       <Select value={mappingForm.localId} onValueChange={v => setMappingForm({...mappingForm, localId: v})}>
                         <SelectTrigger><SelectValue placeholder="აირჩიეთ" /></SelectTrigger>
                         <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                       </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <Label>პლატფორმა</Label>
                         <Select value={mappingForm.platformSlug} onValueChange={v => setMappingForm({...mappingForm, platformSlug: v})}>
                           <SelectTrigger><SelectValue placeholder="აირჩიეთ" /></SelectTrigger>
                           <SelectContent>
                             <SelectItem value="glovo">Glovo</SelectItem>
                             <SelectItem value="wolt">Wolt</SelectItem>
                             <SelectItem value="extra">Extra.ge</SelectItem>
                           </SelectContent>
                         </Select>
                      </div>
                      <div className="space-y-2"><Label>პლატფორმის ფასი</Label><Input type="number" value={mappingForm.extPrice} onChange={e => setMappingForm({...mappingForm, extPrice: e.target.value})} /></div>
                    </div>
                    <div className="space-y-2"><Label>გარე სახელი (External Name)</Label><Input value={mappingForm.extName} onChange={e => setMappingForm({...mappingForm, extName: e.target.value})} /></div>
                    <div className="space-y-2"><Label>გარე ID (External ID / SKU)</Label><Input value={mappingForm.extId} onChange={e => setMappingForm({...mappingForm, extId: e.target.value})} /></div>
                  </div>
                  <DialogFooter><Button className="w-full" onClick={handleSaveMapping}>შენახვა</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ლოკალური პროდუქტი</TableHead>
                    <TableHead>პლატფორმა</TableHead>
                    <TableHead>პლატფორმის პროდუქტი</TableHead>
                    <TableHead className="text-right">ლოკალური ფასი</TableHead>
                    <TableHead className="text-right">პლატფ. ფასი</TableHead>
                    <TableHead className="text-center">მოქმედება</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map(m => {
                    const localP = products.find(p => p.id === m.local_product_id);
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{localP?.name || 'Unknown'}</TableCell>
                        <TableCell><Badge variant="outline">{PLATFORM_CONFIGS[m.platform_slug]?.name}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{m.platform_product_name}</TableCell>
                        <TableCell className="text-right">{localP?.sell_price?.toFixed(2) || '0.00'} ₾</TableCell>
                        <TableCell className="text-right font-medium">{m.price_platform.toFixed(2)} ₾</TableCell>
                        <TableCell className="text-center">
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteMappingMut.mutate(m.id)}><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            {platforms.filter(p => p.connected).map(platform => {
              const Icon = platform.icon;
              const platformOrders = orders.filter(o => o.platform_slug === platform.id);
              const delivered = platformOrders.filter(o => o.status === 'delivered').length;
              const cancelled = platformOrders.filter(o => o.status === 'cancelled').length;
              const revenue = platformOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0);
              const fees = platformOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.platform_fee || 0, 0);
              return (
                <Card key={platform.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base"><Icon className="h-4 w-4" />{platform.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">სულ შეკვეთა</span><span className="font-medium">{platformOrders.length}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">მიწოდებული</span><span className="font-medium text-primary">{delivered}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">გაუქმებული</span><span className="font-medium text-destructive">{cancelled}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">შემოსავალი</span><span className="font-bold">{revenue.toFixed(2)} ₾</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">საკომისიო</span><span className="font-medium text-destructive">-{fees.toFixed(2)} ₾</span></div>
                      <div className="flex justify-between border-t pt-2"><span className="text-muted-foreground">წმინდა შემოსავალი</span><span className="font-bold text-primary">{(revenue - fees).toFixed(2)} ₾</span></div>
                    </div>
                    {platformOrders.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">მიწოდების წარმატება</p>
                        <Progress value={platformOrders.length > 0 ? (delivered / platformOrders.length) * 100 : 0} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">{platformOrders.length > 0 ? Math.round((delivered / platformOrders.length) * 100) : 0}%</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {platforms.filter(p => p.connected).length === 0 && <p className="text-muted-foreground col-span-3 text-center py-8">ჯერ არცერთი პლატფორმა არ არის დაკავშირებული</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}