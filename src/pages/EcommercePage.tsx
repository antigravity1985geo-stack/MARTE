import { useState } from 'react';
import { useEcommerce, EcommerceOrder } from '@/hooks/useEcommerce';
import { useProducts } from '@/hooks/useProducts';
import { useI18n } from '@/hooks/useI18n';
import { getTranslatedField } from '@/lib/i18n/content';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { ReceiptPopup } from '@/components/ReceiptPopup';
import { 
  Globe, 
  Package, 
  ShoppingCart, 
  ArrowUpRight, 
  RefreshCw, 
  Plus, 
  Trash2, 
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  BarChart3,
  Printer,
  Eye,
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';

export default function EcommercePage() {
  const { t, lang } = useI18n();
  const { 
    platforms, 
    orders, 
    mappings, 
    connectPlatform, 
    disconnectPlatform, 
    updateOrderStatus,
    saveMapping,
    deleteMapping,
    simulateSync,
    isLoading 
  } = useEcommerce();

  const { products } = useProducts();
  const [activeTab, setActiveTab] = useState('platforms');
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [isMappingOpen, setIsMappingOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<EcommerceOrder | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const [newPlatform, setNewPlatform] = useState({
    name: '',
    platform_slug: 'glovo',
    api_key: '',
    store_id: ''
  });

  const [newMapping, setNewMapping] = useState({
    local_product_id: '',
    platform_slug: 'glovo',
    platform_product_id: '',
    platform_product_name: '',
    price_platform: 0
  });

  const handleConnect = async () => {
    try {
      await connectPlatform.mutateAsync({
        ...newPlatform,
        connected: true,
        auto_sync: true,
        sync_interval: 30
      });
      setIsConnectOpen(false);
      toast.success(t('platform_connected') || 'პლატფორმა დაუკავშირდა');
    } catch (error) {
      toast.error(t('connection_failed') || 'დაკავშირება ვერ მოხერხდა');
    }
  };

  const handleSaveMapping = async () => {
    try {
      const product = products.find(p => p.id === newMapping.local_product_id);
      await saveMapping.mutateAsync({
        local_product_id: newMapping.local_product_id,
        platform_slug: newMapping.platform_slug,
        platform_product_id: newMapping.platform_product_id,
        platform_product_name: newMapping.platform_product_name || (product ? getTranslatedField(product, 'name', lang) : ''),
        price_platform: newMapping.price_platform,
        auto_sync: true
      });
      setIsMappingOpen(false);
      toast.success(t('mapping_saved') || 'მეპინგი შენახულია');
      setNewMapping({
        local_product_id: '',
        platform_slug: 'glovo',
        platform_product_id: '',
        platform_product_name: '',
        price_platform: 0
      });
    } catch (error) {
      toast.error(t('save_failed') || 'შენახვა ვერ მოხერხდა');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new': return <Badge className="bg-blue-500">{t('order_new') || 'ახალი'}</Badge>;
      case 'accepted': return <Badge className="bg-indigo-500">{t('order_accepted') || 'მიღებული'}</Badge>;
      case 'preparing': return <Badge className="bg-amber-500">{t('order_preparing') || 'მზადდება'}</Badge>;
      case 'ready': return <Badge className="bg-green-500">{t('order_ready') || 'მზადაა'}</Badge>;
      case 'delivered': return <Badge className="bg-gray-500">{t('order_delivered') || 'მიწოდებული'}</Badge>;
      case 'cancelled': return <Badge variant="destructive">{t('order_cancelled') || 'გაუქმებული'}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('ecommerce') || 'E-Commerce'}</h1>
          <p className="text-muted-foreground">{t('ecommerce_desc') || 'მართეთ ონლაინ შეკვეთები და პლატფორმები'}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => simulateSync.mutate('glovo')} disabled={simulateSync.isPending}>
            <RefreshCw className={`mr-2 h-4 w-4 ${simulateSync.isPending ? 'animate-spin' : ''}`} />
            {t('sync_now') || 'სინქრონიზაცია'}
          </Button>
          <Dialog open={isConnectOpen} onOpenChange={setIsConnectOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t('connect_platform') || 'პლატფორმის დამატება'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('connect_new_platform') || 'ახალი პლატფორმის დაკავშირება'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>{t('platform') || 'პლატფორმა'}</Label>
                  <Select 
                    value={newPlatform.platform_slug} 
                    onValueChange={(v) => setNewPlatform({...newPlatform, platform_slug: v, name: v.charAt(0).toUpperCase() + v.slice(1)})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="glovo">Glovo</SelectItem>
                      <SelectItem value="wolt">Wolt</SelectItem>
                      <SelectItem value="extra">Extra.ge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('api_key') || 'API გასაღები'}</Label>
                  <Input 
                    type="password" 
                    value={newPlatform.api_key} 
                    onChange={(e) => setNewPlatform({...newPlatform, api_key: e.target.value})}
                    placeholder="Enter your API key" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('store_id') || 'მაღაზიის ID'}</Label>
                  <Input 
                    value={newPlatform.store_id} 
                    onChange={(e) => setNewPlatform({...newPlatform, store_id: e.target.value})}
                    placeholder="Enter your Store ID" 
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsConnectOpen(false)}>{t('cancel')}</Button>
                <Button onClick={handleConnect} disabled={connectPlatform.isPending}>
                  {connectPlatform.isPending ? t('connecting') : t('connect')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="platforms">
            <Globe className="mr-2 h-4 w-4" />
            {t('platforms') || 'პლატფორმები'}
          </TabsTrigger>
          <TabsTrigger value="orders">
            <ShoppingCart className="mr-2 h-4 w-4" />
            {t('orders_tab') || 'შეკვეთები'}
          </TabsTrigger>
          <TabsTrigger value="products">
            <Package className="mr-2 h-4 w-4" />
            {t('mappings') || 'პროდუქტები'}
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="mr-2 h-4 w-4" />
            {t('analytics') || 'ანალიტიკა'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="platforms" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {platforms.map((platform) => (
              <Card key={platform.id} className="relative overflow-hidden group border-primary/20 bg-gradient-to-br from-card to-primary/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Globe className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold">{platform.name}</CardTitle>
                      <CardDescription>{platform.platform_slug}.com</CardDescription>
                    </div>
                  </div>
                  <Badge variant={platform.connected ? "default" : "secondary"}>
                    {platform.connected ? t('online') : t('offline')}
                  </Badge>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('last_sync')}:</span>
                      <span className="font-medium">
                        {platform.last_sync ? new Date(platform.last_sync).toLocaleString() : t('never')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center space-x-2">
                        <Label htmlFor={`sync-${platform.id}`}>{t('auto_sync')}</Label>
                        <Switch id={`sync-${platform.id}`} checked={platform.auto_sync} />
                      </div>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => disconnectPlatform.mutate(platform.id)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('disconnect')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {platforms.length === 0 && (
              <Card className="col-span-full py-12 flex flex-col items-center justify-center border-dashed">
                <Globe className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                <h3 className="text-xl font-semibold mb-2">{t('no_platforms_connected') || 'პლატფორმები არ არის დაკავშირებული'}</h3>
                <p className="text-muted-foreground mb-4">{t('no_platforms_desc') || 'დაუკავშირეთ Glovo, Wolt ან Extra.ge შეკვეთების მისაღებად'}</p>
                <Button variant="outline" onClick={() => setIsConnectOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('connect_platform')}
                </Button>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('ecommerce_orders') || 'E-Commerce შეკვეთები'}</CardTitle>
                  <CardDescription>{t('recent_orders') || 'ბოლო შეკვეთები ყველა პლატფორმიდან'}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    {t('export') || 'ექსპორტი'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('order_id')}</TableHead>
                    <TableHead>{t('platform')}</TableHead>
                    <TableHead>{t('customer')}</TableHead>
                    <TableHead>{t('items')}</TableHead>
                    <TableHead>{t('total')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{t('date')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedOrder(order)}>
                      <TableCell className="font-medium">{order.platform_order_id}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {order.platform_slug}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{order.customer_name}</span>
                          <span className="text-xs text-muted-foreground">{order.customer_phone}</span>
                        </div>
                      </TableCell>
                      <TableCell>{order.items?.length || 0} {t('items_count')}</TableCell>
                      <TableCell>₾{Number(order.total).toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-xs">
                        {new Date(order.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                         <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(order)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Select 
                              value={order.status} 
                              onValueChange={(status) => updateOrderStatus.mutate({ id: order.id, status: status as any })}
                            >
                              <SelectTrigger className="w-[120px] h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="new">New</SelectItem>
                                <SelectItem value="accepted">Accept</SelectItem>
                                <SelectItem value="preparing">Prepare</SelectItem>
                                <SelectItem value="ready">Ready</SelectItem>
                                <SelectItem value="delivered">Deliver</SelectItem>
                                <SelectItem value="cancelled">Cancel</SelectItem>
                              </SelectContent>
                            </Select>
                         </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {orders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        {t('no_orders_found') || 'შეკვეთები ვერ მოიძებნა'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">{t('product_mappings') || 'პროდუქტების მეპინგი'}</h2>
            <Dialog open={isMappingOpen} onOpenChange={setIsMappingOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('add_mapping') || 'მეპინგის დამატება'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('map_product') || 'პროდუქტის დაკავშირება'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>{t('local_product') || 'ადგილობრივი პროდუქტი'}</Label>
                    <Select value={newMapping.local_product_id} onValueChange={(v) => setNewMapping({...newMapping, local_product_id: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('select_product')} />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {getTranslatedField(p, 'name', lang)} (₾{p.sell_price})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('platform') || 'პლატფორმა'}</Label>
                    <Select value={newMapping.platform_slug} onValueChange={(v) => setNewMapping({...newMapping, platform_slug: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="glovo">Glovo</SelectItem>
                        <SelectItem value="wolt">Wolt</SelectItem>
                        <SelectItem value="extra">Extra.ge</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('platform_product_id') || 'ID პლატფორმაზე'}</Label>
                      <Input 
                        value={newMapping.platform_product_id} 
                        onChange={(e) => setNewMapping({...newMapping, platform_product_id: e.target.value})}
                        placeholder="e.g. GLO-123" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('platform_price') || 'ფასი პლატფორმაზე'}</Label>
                      <Input 
                        type="number" 
                        value={newMapping.price_platform} 
                        onChange={(e) => setNewMapping({...newMapping, price_platform: parseFloat(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('platform_product_name') || 'სახელი პლატფორმაზე'}</Label>
                    <Input 
                      value={newMapping.platform_product_name} 
                      onChange={(e) => setNewMapping({...newMapping, platform_product_name: e.target.value})}
                      placeholder="Optional" 
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsMappingOpen(false)}>{t('cancel')}</Button>
                  <Button onClick={handleSaveMapping}>{t('save')}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('local_product')}</TableHead>
                    <TableHead>{t('platform')}</TableHead>
                    <TableHead>{t('platform_product_name')}</TableHead>
                    <TableHead>{t('platform_product_id')}</TableHead>
                    <TableHead>{t('local_price')}</TableHead>
                    <TableHead>{t('platform_price')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map((mapping) => {
                    const product = products.find(p => p.id === mapping.local_product_id);
                    return (
                      <TableRow key={mapping.id}>
                        <TableCell className="font-medium">
                          {product ? getTranslatedField(product, 'name', lang) : 'Unknown'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{mapping.platform_slug}</Badge>
                        </TableCell>
                        <TableCell>{mapping.platform_product_name}</TableCell>
                        <TableCell className="text-xs font-mono">{mapping.platform_product_id}</TableCell>
                        <TableCell>₾{product?.sell_price || 0}</TableCell>
                        <TableCell className="font-bold">₾{mapping.price_platform}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMapping.mutate(mapping.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {mappings.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        {t('no_mappings_found') || 'მეპინგები ვერ მოიძებნა'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('total_ecommerce_revenue') || 'ჯამური შემოსავალი'}</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₾{orders.reduce((acc, o) => acc + Number(o.total), 0).toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">+12% {t('from_last_month')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('total_ecommerce_orders') || 'ჯამური შეკვეთები'}</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{orders.length}</div>
                <p className="text-xs text-muted-foreground">+5% {t('from_last_month')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('avg_order_value') || 'საშუალო ჩეკი'}</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₾{(orders.length ? (orders.reduce((acc, o) => acc + Number(o.total), 0) / orders.length) : 0).toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">+2% {t('from_last_month')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('commission_paid') || 'გადახდილი საკომისიო'}</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₾{orders.reduce((acc, o) => acc + Number(o.platform_fee || 0), 0).toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">~15% {t('of_revenue')}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>{t('revenue_by_platform') || 'შემოსავალი პლატფორმების მიხედვით'}</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center">
                 <div className="w-full space-y-4">
                    {platforms.map(p => {
                      const platformOrders = orders.filter(o => o.platform_slug === p.platform_slug);
                      const platformRevenue = platformOrders.reduce((acc, o) => acc + Number(o.total), 0);
                      const totalRevenue = orders.reduce((acc, o) => acc + Number(o.total), 0) || 1;
                      const percentage = (platformRevenue / totalRevenue) * 100;
                      
                      return (
                        <div key={p.id} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium capitalize">{p.platform_slug}</span>
                            <span>₾{platformRevenue.toFixed(2)} ({percentage.toFixed(1)}%)</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                 </div>
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>{t('order_status_distribution') || 'სტატუსების განაწილება'}</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px] flex flex-col justify-center gap-4">
                 {['new', 'accepted', 'preparing', 'ready', 'delivered', 'cancelled'].map(status => {
                   const count = orders.filter(o => o.status === status).length;
                   const percentage = orders.length ? (count / orders.length) * 100 : 0;
                   if (count === 0) return null;
                   return (
                     <div key={status} className="flex items-center gap-2">
                       <div className="flex-1">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="capitalize">{status}</span>
                            <span>{count}</span>
                          </div>
                          <Progress value={percentage} className="h-1.5" />
                       </div>
                     </div>
                   );
                 })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-8">
              <span>{t('order_details') || 'შეკვეთის დეტალები'} - {selectedOrder?.platform_order_id}</span>
              {selectedOrder && getStatusBadge(selectedOrder.status)}
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="grid md:grid-cols-2 gap-6 py-4">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">{t('customer_info') || 'კლიენტის ინფორმაცია'}</h4>
                  <p className="font-bold">{selectedOrder.customer_name}</p>
                  <p className="text-sm">{selectedOrder.customer_phone}</p>
                  <p className="text-sm text-muted-foreground mt-1">{selectedOrder.customer_address}</p>
                </div>
                
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">{t('order_items') || 'პროდუქტები'}</h4>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{item.quantity}x {item.name}</span>
                        <span className="font-medium">₾{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4 bg-muted/50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">{t('payment_summary') || 'გადახდის რეზიუმე'}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>{t('subtotal') || 'ჯამი'}</span>
                    <span>₾{Number(selectedOrder.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('delivery_fee') || 'მიწოდების საფასური'}</span>
                    <span>₾{Number(selectedOrder.delivery_fee || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-destructive">
                    <span>{t('platform_fee') || 'საკომისიო'}</span>
                    <span>-₾{Number(selectedOrder.platform_fee || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
                    <span>{t('net_to_store') || 'წმინდა შემოსავალი'}</span>
                    <span className="text-primary">₾{(Number(selectedOrder.subtotal) - Number(selectedOrder.platform_fee || 0)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-muted-foreground text-xs pt-1">
                    <span>{t('customer_paid') || 'კლიენტმა გადაიხადა'}</span>
                    <span>₾{Number(selectedOrder.total).toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="pt-6 space-y-2">
                  <Button className="w-full" variant="outline" onClick={() => setShowReceipt(true)}>
                    <Printer className="mr-2 h-4 w-4" />
                    {t('print_receipt') || 'ქვითრის ბეჭდვა'}
                  </Button>
                  {selectedOrder.status === 'new' && (
                    <Button className="w-full" onClick={() => updateOrderStatus.mutate({ id: selectedOrder.id, status: 'accepted' })}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {t('accept_order') || 'შეკვეთის მიღება'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ReceiptPopup 
        open={showReceipt} 
        onClose={() => setShowReceipt(false)}
        items={selectedOrder?.items?.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })) || []}
        total={Number(selectedOrder?.subtotal || 0)}
        paymentMethod="ecommerce"
        invoiceNumber={selectedOrder?.platform_order_id}
        clientName={selectedOrder?.customer_name}
      />
    </div>
  );
}