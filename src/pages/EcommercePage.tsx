import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  ShoppingBag, Globe, Link2, RefreshCw, Package, Clock,
  CheckCircle, AlertCircle, TrendingUp, ArrowUpDown, Settings,
  Bike, UtensilsCrossed, Store, ExternalLink, Wifi, WifiOff,
  Eye, Truck, XCircle, BarChart3
} from 'lucide-react';
import { toast } from 'sonner';

interface Platform {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  connected: boolean;
  apiKey?: string;
  storeId?: string;
  autoSync: boolean;
  syncInterval: number; // minutes
  lastSync?: string;
  totalOrders: number;
  todayOrders: number;
  todayRevenue: number;
}

interface EcommerceOrder {
  id: string;
  platformId: string;
  platformName: string;
  platformOrderId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  total: number;
  status: 'new' | 'accepted' | 'preparing' | 'ready' | 'picked_up' | 'delivered' | 'cancelled';
  createdAt: string;
  estimatedDelivery?: string;
  courierName?: string;
  synced: boolean;
}

interface ProductMapping {
  id: string;
  localProductName: string;
  localProductId: string;
  platformId: string;
  platformProductName: string;
  platformProductId: string;
  priceLocal: number;
  pricePlatform: number;
  inStock: boolean;
  autoSync: boolean;
}

const INITIAL_PLATFORMS: Platform[] = [
  { id: 'glovo', name: 'Glovo', icon: Bike, color: 'hsl(45, 100%, 50%)', connected: false, autoSync: true, syncInterval: 5, totalOrders: 0, todayOrders: 0, todayRevenue: 0 },
  { id: 'wolt', name: 'Wolt', icon: UtensilsCrossed, color: 'hsl(200, 100%, 45%)', connected: false, autoSync: true, syncInterval: 5, totalOrders: 0, todayOrders: 0, todayRevenue: 0 },
  { id: 'extra', name: 'Extra.ge', icon: Store, color: 'hsl(145, 70%, 40%)', connected: false, autoSync: true, syncInterval: 15, totalOrders: 0, todayOrders: 0, todayRevenue: 0 },
];

const DEMO_ORDERS: EcommerceOrder[] = [
  { id: 'EO1', platformId: 'glovo', platformName: 'Glovo', platformOrderId: 'GLV-78542', customerName: 'ანა გელაშვილი', customerPhone: '+995 555 11 22 33', customerAddress: 'ვაჟა-ფშაველას 71, ბინა 15', items: [{ name: 'მარგარიტა პიცა', quantity: 2, price: 14.5 }, { name: 'კოკა-კოლა 0.5ლ', quantity: 2, price: 2.5 }], subtotal: 34, deliveryFee: 3.99, platformFee: 5.1, total: 34, status: 'new', createdAt: '14:32', estimatedDelivery: '15:02', synced: true },
  { id: 'EO2', platformId: 'wolt', platformName: 'Wolt', platformOrderId: 'WLT-12389', customerName: 'გიორგი ხარაზი', customerPhone: '+995 555 44 55 66', customerAddress: 'აღმაშენებლის 156', items: [{ name: 'ბურგერი კომბო', quantity: 1, price: 18.9 }, { name: 'კარტოფილი ფრი', quantity: 1, price: 5.5 }], subtotal: 24.4, deliveryFee: 2.99, platformFee: 3.66, total: 24.4, status: 'preparing', createdAt: '14:15', estimatedDelivery: '14:50', courierName: 'ნიკა მ.', synced: true },
  { id: 'EO3', platformId: 'glovo', platformName: 'Glovo', platformOrderId: 'GLV-78539', customerName: 'მარიამ ჯავახი', customerPhone: '+995 555 77 88 99', customerAddress: 'რუსთაველის 24', items: [{ name: 'სუშის ნაკრები 24ც', quantity: 1, price: 42 }], subtotal: 42, deliveryFee: 3.99, platformFee: 6.3, total: 42, status: 'delivered', createdAt: '12:45', courierName: 'დავით კ.', synced: true },
  { id: 'EO4', platformId: 'extra', platformName: 'Extra.ge', platformOrderId: 'EXT-5621', customerName: 'ლევან წიქარიშვილი', customerPhone: '+995 555 00 11 22', customerAddress: 'დიდუბე, მარკეტის გვერდი', items: [{ name: 'სარეცხი ფხვნილი 3კგ', quantity: 2, price: 15 }, { name: 'თხევადი საპონი', quantity: 3, price: 4.5 }], subtotal: 43.5, deliveryFee: 5, platformFee: 4.35, total: 43.5, status: 'ready', createdAt: '13:20', synced: true },
  { id: 'EO5', platformId: 'wolt', platformName: 'Wolt', platformOrderId: 'WLT-12385', customerName: 'ნინო ბერიძე', customerPhone: '+995 555 33 44 55', customerAddress: 'ნუცუბიძის III მ/რ', items: [{ name: 'ხინკალი 10ც', quantity: 2, price: 12 }], subtotal: 24, deliveryFee: 2.99, platformFee: 3.6, total: 24, status: 'cancelled', createdAt: '11:30', synced: true },
];

const DEMO_MAPPINGS: ProductMapping[] = [
  { id: 'M1', localProductName: 'მარგარიტა პიცა', localProductId: 'P001', platformId: 'glovo', platformProductName: 'Pizza Margherita', platformProductId: 'GLV-P-101', priceLocal: 12, pricePlatform: 14.5, inStock: true, autoSync: true },
  { id: 'M2', localProductName: 'ბურგერი კომბო', localProductId: 'P002', platformId: 'wolt', platformProductName: 'Burger Combo', platformProductId: 'WLT-P-205', priceLocal: 15, pricePlatform: 18.9, inStock: true, autoSync: true },
  { id: 'M3', localProductName: 'სუშის ნაკრები 24ც', localProductId: 'P003', platformId: 'glovo', platformProductName: 'Sushi Set 24pcs', platformProductId: 'GLV-P-310', priceLocal: 35, pricePlatform: 42, inStock: true, autoSync: false },
  { id: 'M4', localProductName: 'სარეცხი ფხვნილი 3კგ', localProductId: 'P004', platformId: 'extra', platformProductName: 'სარეცხი ფხვნილი 3კგ', platformProductId: 'EXT-P-890', priceLocal: 13, pricePlatform: 15, inStock: true, autoSync: true },
];

export default function EcommercePage() {
  const [platforms, setPlatforms] = useState<Platform[]>(INITIAL_PLATFORMS);
  const [orders, setOrders] = useState<EcommerceOrder[]>(DEMO_ORDERS);
  const [mappings, setMappings] = useState<ProductMapping[]>(DEMO_MAPPINGS);
  const [connectDialog, setConnectDialog] = useState<string | null>(null);
  const [connectForm, setConnectForm] = useState({ apiKey: '', storeId: '' });
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const connectPlatform = (platformId: string) => {
    if (!connectForm.apiKey) { toast.error('API Key აუცილებელია'); return; }
    setPlatforms(prev => prev.map(p => p.id === platformId ? {
      ...p, connected: true, apiKey: connectForm.apiKey, storeId: connectForm.storeId,
      lastSync: new Date().toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' }),
      totalOrders: platformId === 'glovo' ? 1247 : platformId === 'wolt' ? 892 : 456,
      todayOrders: platformId === 'glovo' ? 23 : platformId === 'wolt' ? 18 : 7,
      todayRevenue: platformId === 'glovo' ? 1845.5 : platformId === 'wolt' ? 1120.3 : 520.8,
    } : p));
    setConnectForm({ apiKey: '', storeId: '' });
    setConnectDialog(null);
    toast.success(`${platforms.find(p => p.id === platformId)?.name} წარმატებით დაუკავშირდა`);
  };

  const disconnectPlatform = (platformId: string) => {
    setPlatforms(prev => prev.map(p => p.id === platformId ? { ...p, connected: false, apiKey: undefined, storeId: undefined, totalOrders: 0, todayOrders: 0, todayRevenue: 0 } : p));
    toast.success('პლატფორმა გათიშულია');
  };

  const syncPlatform = (platformId: string) => {
    setPlatforms(prev => prev.map(p => p.id === platformId ? { ...p, lastSync: new Date().toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' }) } : p));
    toast.success('სინქრონიზაცია დასრულდა');
  };

  const updateOrderStatus = (orderId: string, newStatus: EcommerceOrder['status']) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    const statusLabels: Record<string, string> = { accepted: 'მიღებულია', preparing: 'მზადდება', ready: 'მზადაა', picked_up: 'აიღეს', delivered: 'მიწოდებულია', cancelled: 'გაუქმდა' };
    toast.success(`შეკვეთის სტატუსი: ${statusLabels[newStatus]}`);
  };

  const loadDemoConnection = () => {
    setPlatforms(prev => prev.map(p => ({
      ...p, connected: true, apiKey: 'demo-key', storeId: 'demo-store',
      lastSync: new Date().toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' }),
      totalOrders: p.id === 'glovo' ? 1247 : p.id === 'wolt' ? 892 : 456,
      todayOrders: p.id === 'glovo' ? 23 : p.id === 'wolt' ? 18 : 7,
      todayRevenue: p.id === 'glovo' ? 1845.5 : p.id === 'wolt' ? 1120.3 : 520.8,
    })));
    toast.success('დემო რეჟიმი ჩაირთო — ყველა პლატფორმა დაკავშირებულია');
  };

  const filteredOrders = orders.filter(o => {
    if (orderFilter !== 'all' && o.platformId !== orderFilter) return false;
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    return true;
  });

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
    const s = map[status];
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const connectedCount = platforms.filter(p => p.connected).length;
  const totalTodayOrders = platforms.reduce((s, p) => s + p.todayOrders, 0);
  const totalTodayRevenue = platforms.reduce((s, p) => s + p.todayRevenue, 0);
  const newOrders = orders.filter(o => o.status === 'new').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">E-Commerce ინტეგრაცია</h1>
          <p className="text-muted-foreground">Glovo, Wolt, Extra.ge — შეკვეთების სინქრონიზაცია და მართვა</p>
        </div>
        <Button variant="outline" onClick={loadDemoConnection}><RefreshCw className="h-4 w-4 mr-1" />დემო რეჟიმი</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Link2 className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{connectedCount}/3</p><p className="text-xs text-muted-foreground">დაკავშირებული</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><ShoppingBag className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{totalTodayOrders}</p><p className="text-xs text-muted-foreground">დღეს შეკვეთა</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{totalTodayRevenue.toFixed(0)} ₾</p><p className="text-xs text-muted-foreground">დღეს შემოსავალი</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10"><AlertCircle className="h-5 w-5 text-destructive" /></div>
          <div><p className="text-2xl font-bold">{newOrders}</p><p className="text-xs text-muted-foreground">ახალი შეკვეთა</p></div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="platforms">
        <TabsList>
          <TabsTrigger value="platforms"><Globe className="h-4 w-4 mr-1" />პლატფორმები</TabsTrigger>
          <TabsTrigger value="orders"><ShoppingBag className="h-4 w-4 mr-1" />შეკვეთები{newOrders > 0 && <Badge variant="destructive" className="ml-1 text-[10px] px-1">{newOrders}</Badge>}</TabsTrigger>
          <TabsTrigger value="products"><Package className="h-4 w-4 mr-1" />პროდუქტების მეპინგი</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 mr-1" />ანალიტიკა</TabsTrigger>
        </TabsList>

        {/* PLATFORMS TAB */}
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
                            <p className="text-lg font-bold">{platform.todayOrders}</p>
                            <p className="text-[10px] text-muted-foreground">დღეს</p>
                          </div>
                          <div className="p-2 rounded-lg bg-muted/50">
                            <p className="text-lg font-bold">{platform.totalOrders}</p>
                            <p className="text-[10px] text-muted-foreground">სულ</p>
                          </div>
                          <div className="p-2 rounded-lg bg-muted/50">
                            <p className="text-lg font-bold">{platform.todayRevenue.toFixed(0)}₾</p>
                            <p className="text-[10px] text-muted-foreground">შემოსავალი</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">ავტო-სინქრონიზაცია</span>
                          <Switch checked={platform.autoSync} onCheckedChange={v => setPlatforms(prev => prev.map(p => p.id === platform.id ? { ...p, autoSync: v } : p))} />
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />ბოლო სინქრონიზაცია: {platform.lastSync}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => syncPlatform(platform.id)}><RefreshCw className="h-3 w-3 mr-1" />სინქრო</Button>
                          <Button size="sm" variant="destructive" onClick={() => disconnectPlatform(platform.id)}>გათიშვა</Button>
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
                              <Button className="w-full" onClick={() => connectPlatform(platform.id)}>დაკავშირება</Button>
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

        {/* ORDERS TAB */}
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
                        <Badge variant="outline" className="text-xs">{order.platformName}</Badge>
                        <span className="font-mono text-xs text-muted-foreground">{order.platformOrderId}</span>
                        {statusBadge(order.status)}
                        <span className="text-xs text-muted-foreground"><Clock className="h-3 w-3 inline mr-0.5" />{order.createdAt}</span>
                      </div>
                      <p className="font-medium">{order.customerName} · <span className="text-sm text-muted-foreground">{order.customerPhone}</span></p>
                      <p className="text-sm text-muted-foreground">{order.customerAddress}</p>
                      <div className="text-sm">{order.items.map(i => `${i.name} ×${i.quantity}`).join(', ')}</div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>ჯამი: <strong className="text-foreground">{order.total.toFixed(2)} ₾</strong></span>
                        <span>მიწოდება: {order.deliveryFee.toFixed(2)} ₾</span>
                        <span>საკომისიო: {order.platformFee.toFixed(2)} ₾</span>
                        {order.courierName && <span><Bike className="h-3 w-3 inline mr-0.5" />{order.courierName}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {order.status === 'new' && (
                        <>
                          <Button size="sm" onClick={() => updateOrderStatus(order.id, 'accepted')}><CheckCircle className="h-3 w-3 mr-1" />მიღება</Button>
                          <Button size="sm" variant="destructive" onClick={() => updateOrderStatus(order.id, 'cancelled')}><XCircle className="h-3 w-3" /></Button>
                        </>
                      )}
                      {order.status === 'accepted' && <Button size="sm" onClick={() => updateOrderStatus(order.id, 'preparing')}>მომზადება</Button>}
                      {order.status === 'preparing' && <Button size="sm" onClick={() => updateOrderStatus(order.id, 'ready')}>მზადაა</Button>}
                      {order.status === 'ready' && <Button size="sm" onClick={() => updateOrderStatus(order.id, 'picked_up')}>აიღეს</Button>}
                      {order.status === 'picked_up' && <Button size="sm" onClick={() => updateOrderStatus(order.id, 'delivered')}>მიწოდებულია</Button>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredOrders.length === 0 && <p className="text-center text-muted-foreground py-8">შეკვეთები არ მოიძებნა</p>}
          </div>
        </TabsContent>

        {/* PRODUCT MAPPING TAB */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">პროდუქტების მეპინგი</CardTitle>
              <p className="text-sm text-muted-foreground">დააკავშირეთ ლოკალური პროდუქტები პლატფორმის პროდუქტებთან ფასებისა და მარაგის სინქრონიზაციისთვის</p>
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
                    <TableHead>მარაგი</TableHead>
                    <TableHead>ავტო-სინქრო</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.localProductName}</TableCell>
                      <TableCell><Badge variant="outline">{platforms.find(p => p.id === m.platformId)?.name}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{m.platformProductName}</TableCell>
                      <TableCell className="text-right">{m.priceLocal.toFixed(2)} ₾</TableCell>
                      <TableCell className="text-right font-medium">{m.pricePlatform.toFixed(2)} ₾</TableCell>
                      <TableCell>{m.inStock ? <Badge variant="default">მარაგშია</Badge> : <Badge variant="destructive">ამოიწურა</Badge>}</TableCell>
                      <TableCell><Switch checked={m.autoSync} onCheckedChange={v => setMappings(prev => prev.map(p => p.id === m.id ? { ...p, autoSync: v } : p))} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            {platforms.filter(p => p.connected).map(platform => {
              const Icon = platform.icon;
              const platformOrders = orders.filter(o => o.platformId === platform.id);
              const delivered = platformOrders.filter(o => o.status === 'delivered').length;
              const cancelled = platformOrders.filter(o => o.status === 'cancelled').length;
              const revenue = platformOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0);
              const fees = platformOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.platformFee, 0);
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