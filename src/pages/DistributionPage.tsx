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
import { Textarea } from '@/components/ui/textarea';
import {
  Truck, MapPin, User, Package, Plus, Phone, Clock,
  CheckCircle, AlertCircle, Navigation, Route, ShoppingCart,
  Calendar, Eye, Play, Square, RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';

interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  plateNumber: string;
  status: 'available' | 'on_route' | 'off_duty';
  currentRoute?: string;
}

interface DeliveryStop {
  id: string;
  clientName: string;
  address: string;
  orderIds: string[];
  status: 'pending' | 'in_transit' | 'delivered' | 'failed';
  deliveredAt?: string;
  notes?: string;
}

interface DeliveryRoute {
  id: string;
  name: string;
  driverId: string;
  driverName: string;
  date: string;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  stops: DeliveryStop[];
  totalDistance?: number;
}

interface WholesaleOrder {
  id: string;
  clientName: string;
  date: string;
  items: { productName: string; quantity: number; price: number }[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  deliveryAddress: string;
  routeId?: string;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
}

const DEMO_DRIVERS: Driver[] = [
  { id: '1', name: 'გიორგი მამულაშვილი', phone: '+995 555 12 34 56', vehicle: 'Mercedes Sprinter', plateNumber: 'AA-123-BB', status: 'available' },
  { id: '2', name: 'დავით ჩხეიძე', phone: '+995 555 78 90 12', vehicle: 'Ford Transit', plateNumber: 'CC-456-DD', status: 'on_route', currentRoute: 'თბილისი-რუსთავი' },
  { id: '3', name: 'ნიკა გელაშვილი', phone: '+995 555 34 56 78', vehicle: 'Iveco Daily', plateNumber: 'EE-789-FF', status: 'off_duty' },
];

const DEMO_ROUTES: DeliveryRoute[] = [
  {
    id: 'R1', name: 'თბილისი ცენტრი', driverId: '1', driverName: 'გიორგი მამულაშვილი',
    date: new Date().toISOString().split('T')[0], status: 'planned', totalDistance: 45,
    stops: [
      { id: 'S1', clientName: 'შპს სუპერმარკეტი', address: 'რუსთაველის 12', orderIds: ['WO1'], status: 'pending' },
      { id: 'S2', clientName: 'შპს ფუდ კორნერი', address: 'აღმაშენებლის 45', orderIds: ['WO2'], status: 'pending' },
      { id: 'S3', clientName: 'შპს ბაზარი', address: 'წერეთლის 78', orderIds: ['WO3'], status: 'pending' },
    ],
  },
  {
    id: 'R2', name: 'რუსთავის მარშრუტი', driverId: '2', driverName: 'დავით ჩხეიძე',
    date: new Date().toISOString().split('T')[0], status: 'active', totalDistance: 60,
    stops: [
      { id: 'S4', clientName: 'შპს მეგა სტორ', address: 'რუსთავი, მშვიდობის 5', orderIds: ['WO4'], status: 'delivered', deliveredAt: '10:30' },
      { id: 'S5', clientName: 'შპს ფრეშ მარკეტი', address: 'რუსთავი, კოსტავას 22', orderIds: ['WO5'], status: 'in_transit' },
    ],
  },
];

const DEMO_ORDERS: WholesaleOrder[] = [
  { id: 'WO1', clientName: 'შპს სუპერმარკეტი', date: new Date().toISOString().split('T')[0], items: [{ productName: 'პური', quantity: 100, price: 1.5 }, { productName: 'რძე 1ლ', quantity: 50, price: 3.2 }], total: 310, status: 'confirmed', deliveryAddress: 'რუსთაველის 12', routeId: 'R1', paymentStatus: 'unpaid' },
  { id: 'WO2', clientName: 'შპს ფუდ კორნერი', date: new Date().toISOString().split('T')[0], items: [{ productName: 'ყველი', quantity: 30, price: 8.5 }, { productName: 'კარაქი', quantity: 20, price: 6.0 }], total: 375, status: 'confirmed', deliveryAddress: 'აღმაშენებლის 45', routeId: 'R1', paymentStatus: 'partial' },
  { id: 'WO3', clientName: 'შპს ბაზარი', date: new Date().toISOString().split('T')[0], items: [{ productName: 'წყალი 1.5ლ', quantity: 200, price: 0.8 }], total: 160, status: 'pending', deliveryAddress: 'წერეთლის 78', paymentStatus: 'unpaid' },
  { id: 'WO4', clientName: 'შპს მეგა სტორ', date: '2025-03-07', items: [{ productName: 'წვენი 1ლ', quantity: 80, price: 2.5 }], total: 200, status: 'delivered', deliveryAddress: 'რუსთავი, მშვიდობის 5', routeId: 'R2', paymentStatus: 'paid' },
];

export default function DistributionPage() {
  const [drivers, setDrivers] = useState<Driver[]>(DEMO_DRIVERS);
  const [routes, setRoutes] = useState<DeliveryRoute[]>(DEMO_ROUTES);
  const [orders, setOrders] = useState<WholesaleOrder[]>(DEMO_ORDERS);
  const [driverDialog, setDriverDialog] = useState(false);
  const [routeDialog, setRouteDialog] = useState(false);
  const [orderDialog, setOrderDialog] = useState(false);
  const [trackingRoute, setTrackingRoute] = useState<DeliveryRoute | null>(null);

  // New driver form
  const [newDriver, setNewDriver] = useState({ name: '', phone: '', vehicle: '', plateNumber: '' });
  // New route form
  const [newRoute, setNewRoute] = useState({ name: '', driverId: '', date: new Date().toISOString().split('T')[0] });
  // New order form
  const [newOrder, setNewOrder] = useState({ clientName: '', deliveryAddress: '', items: '' });

  const addDriver = () => {
    if (!newDriver.name || !newDriver.phone) return;
    setDrivers(prev => [...prev, { id: `D${Date.now()}`, ...newDriver, status: 'available' }]);
    setNewDriver({ name: '', phone: '', vehicle: '', plateNumber: '' });
    setDriverDialog(false);
    toast.success('მძღოლი დაემატა');
  };

  const addRoute = () => {
    if (!newRoute.name || !newRoute.driverId) return;
    const driver = drivers.find(d => d.id === newRoute.driverId);
    setRoutes(prev => [...prev, {
      id: `R${Date.now()}`, name: newRoute.name, driverId: newRoute.driverId,
      driverName: driver?.name || '', date: newRoute.date, status: 'planned', stops: [],
    }]);
    setNewRoute({ name: '', driverId: '', date: new Date().toISOString().split('T')[0] });
    setRouteDialog(false);
    toast.success('მარშრუტი შეიქმნა');
  };

  const addOrder = () => {
    if (!newOrder.clientName || !newOrder.deliveryAddress) return;
    const parsedItems = newOrder.items.split('\n').filter(Boolean).map(line => {
      const [productName = '', qtyStr = '1', priceStr = '0'] = line.split(',').map(s => s.trim());
      return { productName, quantity: Number(qtyStr) || 1, price: Number(priceStr) || 0 };
    });
    const total = parsedItems.reduce((s, i) => s + i.quantity * i.price, 0);
    setOrders(prev => [...prev, {
      id: `WO${Date.now()}`, clientName: newOrder.clientName, date: new Date().toISOString().split('T')[0],
      items: parsedItems, total, status: 'pending', deliveryAddress: newOrder.deliveryAddress, paymentStatus: 'unpaid',
    }]);
    setNewOrder({ clientName: '', deliveryAddress: '', items: '' });
    setOrderDialog(false);
    toast.success('საბითუმო შეკვეთა დაემატა');
  };

  const startRoute = (routeId: string) => {
    setRoutes(prev => prev.map(r => r.id === routeId ? { ...r, status: 'active' } : r));
    const route = routes.find(r => r.id === routeId);
    if (route) {
      setDrivers(prev => prev.map(d => d.id === route.driverId ? { ...d, status: 'on_route', currentRoute: route.name } : d));
    }
    toast.success('მარშრუტი დაიწყო');
  };

  const markDelivered = (routeId: string, stopId: string) => {
    setRoutes(prev => prev.map(r => {
      if (r.id !== routeId) return r;
      const stops = r.stops.map(s => s.id === stopId ? { ...s, status: 'delivered' as const, deliveredAt: new Date().toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' }) } : s);
      const allDone = stops.every(s => s.status === 'delivered' || s.status === 'failed');
      return { ...r, stops, status: allDone ? 'completed' : r.status };
    }));
    toast.success('მიწოდება დადასტურდა');
  };

  const markFailed = (routeId: string, stopId: string) => {
    setRoutes(prev => prev.map(r => {
      if (r.id !== routeId) return r;
      const stops = r.stops.map(s => s.id === stopId ? { ...s, status: 'failed' as const } : s);
      return { ...r, stops };
    }));
    toast.error('მიწოდება ვერ განხორციელდა');
  };

  const driverStatusBadge = (status: Driver['status']) => {
    const map = { available: { label: 'თავისუფალი', variant: 'default' as const }, on_route: { label: 'მარშრუტზე', variant: 'secondary' as const }, off_duty: { label: 'არასამუშაო', variant: 'outline' as const } };
    const s = map[status];
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const routeStatusBadge = (status: DeliveryRoute['status']) => {
    const map = { planned: { label: 'დაგეგმილი', variant: 'outline' as const }, active: { label: 'აქტიური', variant: 'default' as const }, completed: { label: 'დასრულებული', variant: 'secondary' as const }, cancelled: { label: 'გაუქმებული', variant: 'destructive' as const } };
    const s = map[status];
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const orderStatusBadge = (status: WholesaleOrder['status']) => {
    const map = { pending: 'მოლოდინში', confirmed: 'დადასტურებული', shipped: 'გაგზავნილი', delivered: 'მიწოდებული', cancelled: 'გაუქმებული' };
    const variant = status === 'delivered' ? 'default' : status === 'cancelled' ? 'destructive' : 'outline';
    return <Badge variant={variant as any}>{map[status]}</Badge>;
  };

  const activeRoutes = routes.filter(r => r.status === 'active');
  const completedToday = routes.filter(r => r.status === 'completed' && r.date === new Date().toISOString().split('T')[0]);
  const availableDrivers = drivers.filter(d => d.status === 'available');
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'confirmed');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">დისტრიბუცია</h1>
          <p className="text-muted-foreground">მარშრუტები, მძღოლები, მიწოდების თრეკინგი და საბითუმო შეკვეთები</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Route className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{activeRoutes.length}</p><p className="text-xs text-muted-foreground">აქტიური მარშრუტი</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Truck className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{availableDrivers.length}</p><p className="text-xs text-muted-foreground">თავისუფალი მძღოლი</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><CheckCircle className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{completedToday.length}</p><p className="text-xs text-muted-foreground">დასრულებული დღეს</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><ShoppingCart className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{pendingOrders.length}</p><p className="text-xs text-muted-foreground">მოლოდინში შეკვეთა</p></div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="routes">
        <TabsList>
          <TabsTrigger value="routes"><Route className="h-4 w-4 mr-1" />მარშრუტები</TabsTrigger>
          <TabsTrigger value="drivers"><User className="h-4 w-4 mr-1" />მძღოლები</TabsTrigger>
          <TabsTrigger value="tracking"><Navigation className="h-4 w-4 mr-1" />თრეკინგი</TabsTrigger>
          <TabsTrigger value="wholesale"><ShoppingCart className="h-4 w-4 mr-1" />საბითუმო</TabsTrigger>
        </TabsList>

        {/* ROUTES TAB */}
        <TabsContent value="routes" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={routeDialog} onOpenChange={setRouteDialog}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />ახალი მარშრუტი</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>ახალი მარშრუტი</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>სახელი</Label><Input value={newRoute.name} onChange={e => setNewRoute(p => ({ ...p, name: e.target.value }))} placeholder="მაგ: თბილისი ცენტრი" /></div>
                  <div><Label>მძღოლი</Label>
                    <Select value={newRoute.driverId} onValueChange={v => setNewRoute(p => ({ ...p, driverId: v }))}>
                      <SelectTrigger><SelectValue placeholder="აირჩიეთ მძღოლი" /></SelectTrigger>
                      <SelectContent>{drivers.filter(d => d.status === 'available').map(d => <SelectItem key={d.id} value={d.id}>{d.name} — {d.vehicle}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>თარიღი</Label><Input type="date" value={newRoute.date} onChange={e => setNewRoute(p => ({ ...p, date: e.target.value }))} /></div>
                  <Button onClick={addRoute} className="w-full">შექმნა</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-3">
            {routes.map(route => (
              <Card key={route.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Route className="h-5 w-5 text-primary" />
                      <div>
                        <h3 className="font-semibold">{route.name}</h3>
                        <p className="text-xs text-muted-foreground"><User className="h-3 w-3 inline mr-1" />{route.driverName} · <Calendar className="h-3 w-3 inline mr-1" />{route.date} {route.totalDistance && `· ${route.totalDistance} კმ`}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {routeStatusBadge(route.status)}
                      {route.status === 'planned' && <Button size="sm" variant="outline" onClick={() => startRoute(route.id)}><Play className="h-3 w-3 mr-1" />დაწყება</Button>}
                      {route.status === 'active' && <Button size="sm" variant="outline" onClick={() => setTrackingRoute(route)}><Eye className="h-3 w-3 mr-1" />თრეკინგი</Button>}
                    </div>
                  </div>
                  {route.stops.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>{route.stops.filter(s => s.status === 'delivered').length}/{route.stops.length} მიწოდებული</span>
                        <span>{Math.round((route.stops.filter(s => s.status === 'delivered').length / route.stops.length) * 100)}%</span>
                      </div>
                      <Progress value={(route.stops.filter(s => s.status === 'delivered').length / route.stops.length) * 100} className="h-2" />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* DRIVERS TAB */}
        <TabsContent value="drivers" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={driverDialog} onOpenChange={setDriverDialog}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />ახალი მძღოლი</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>ახალი მძღოლი</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>სახელი</Label><Input value={newDriver.name} onChange={e => setNewDriver(p => ({ ...p, name: e.target.value }))} /></div>
                  <div><Label>ტელეფონი</Label><Input value={newDriver.phone} onChange={e => setNewDriver(p => ({ ...p, phone: e.target.value }))} /></div>
                  <div><Label>ავტომობილი</Label><Input value={newDriver.vehicle} onChange={e => setNewDriver(p => ({ ...p, vehicle: e.target.value }))} /></div>
                  <div><Label>ნომერი</Label><Input value={newDriver.plateNumber} onChange={e => setNewDriver(p => ({ ...p, plateNumber: e.target.value }))} /></div>
                  <Button onClick={addDriver} className="w-full">დამატება</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drivers.map(driver => (
              <Card key={driver.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-full bg-muted"><User className="h-4 w-4" /></div>
                      <h3 className="font-semibold">{driver.name}</h3>
                    </div>
                    {driverStatusBadge(driver.status)}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p><Phone className="h-3 w-3 inline mr-1" />{driver.phone}</p>
                    <p><Truck className="h-3 w-3 inline mr-1" />{driver.vehicle} · {driver.plateNumber}</p>
                    {driver.currentRoute && <p><Route className="h-3 w-3 inline mr-1" />{driver.currentRoute}</p>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TRACKING TAB */}
        <TabsContent value="tracking" className="space-y-4">
          {trackingRoute ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><Navigation className="h-5 w-5 text-primary" />{trackingRoute.name} — ლაივ თრეკინგი</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setTrackingRoute(null)}>დახურვა</Button>
                </div>
                <p className="text-sm text-muted-foreground">მძღოლი: {trackingRoute.driverName} · {trackingRoute.date}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {trackingRoute.stops.map((stop, idx) => (
                    <div key={stop.id} className={`flex items-start gap-3 p-3 rounded-lg border ${stop.status === 'delivered' ? 'bg-primary/5 border-primary/20' : stop.status === 'failed' ? 'bg-destructive/5 border-destructive/20' : 'bg-muted/30'}`}>
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${stop.status === 'delivered' ? 'bg-primary text-primary-foreground' : stop.status === 'failed' ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground'}`}>{idx + 1}</div>
                        {idx < trackingRoute.stops.length - 1 && <div className="w-0.5 h-6 bg-border mt-1" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{stop.clientName}</h4>
                          <div className="flex gap-1">
                            {stop.status === 'pending' || stop.status === 'in_transit' ? (
                              <>
                                <Button size="sm" variant="default" onClick={() => { markDelivered(trackingRoute.id, stop.id); setTrackingRoute(prev => prev ? { ...prev, stops: prev.stops.map(s => s.id === stop.id ? { ...s, status: 'delivered', deliveredAt: new Date().toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' }) } : s) } : null); }}>
                                  <CheckCircle className="h-3 w-3 mr-1" />მიწოდებულია
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => { markFailed(trackingRoute.id, stop.id); setTrackingRoute(prev => prev ? { ...prev, stops: prev.stops.map(s => s.id === stop.id ? { ...s, status: 'failed' } : s) } : null); }}>
                                  <AlertCircle className="h-3 w-3" />
                                </Button>
                              </>
                            ) : stop.status === 'delivered' ? (
                              <span className="text-xs text-primary flex items-center gap-1"><CheckCircle className="h-3 w-3" />{stop.deliveredAt}</span>
                            ) : (
                              <span className="text-xs text-destructive">ვერ მიწოდებულია</span>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground"><MapPin className="h-3 w-3 inline mr-1" />{stop.address}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">აირჩიეთ აქტიური მარშრუტი თრეკინგისთვის:</p>
              {routes.filter(r => r.status === 'active').length === 0 && <p className="text-muted-foreground text-center py-8">ამჟამად აქტიური მარშრუტი არ არის</p>}
              {routes.filter(r => r.status === 'active').map(route => (
                <Card key={route.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setTrackingRoute(route)}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{route.name}</h3>
                      <p className="text-sm text-muted-foreground">{route.driverName} · {route.stops.filter(s => s.status === 'delivered').length}/{route.stops.length} მიწოდებული</p>
                    </div>
                    <Button variant="outline" size="sm"><Eye className="h-4 w-4 mr-1" />ნახვა</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* WHOLESALE TAB */}
        <TabsContent value="wholesale" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={orderDialog} onOpenChange={setOrderDialog}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />ახალი შეკვეთა</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>საბითუმო შეკვეთა</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>კლიენტი</Label><Input value={newOrder.clientName} onChange={e => setNewOrder(p => ({ ...p, clientName: e.target.value }))} /></div>
                  <div><Label>მისამართი</Label><Input value={newOrder.deliveryAddress} onChange={e => setNewOrder(p => ({ ...p, deliveryAddress: e.target.value }))} /></div>
                  <div>
                    <Label>პროდუქტები (სახელი, რაოდენობა, ფასი — თითო ხაზზე)</Label>
                    <Textarea value={newOrder.items} onChange={e => setNewOrder(p => ({ ...p, items: e.target.value }))} placeholder="პური, 100, 1.5&#10;რძე 1ლ, 50, 3.2" rows={4} />
                  </div>
                  <Button onClick={addOrder} className="w-full">დამატება</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>კლიენტი</TableHead>
                    <TableHead>თარიღი</TableHead>
                    <TableHead>პროდუქტები</TableHead>
                    <TableHead className="text-right">ჯამი</TableHead>
                    <TableHead>სტატუსი</TableHead>
                    <TableHead>გადახდა</TableHead>
                    <TableHead>მარშრუტი</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">{order.id}</TableCell>
                      <TableCell className="font-medium">{order.clientName}</TableCell>
                      <TableCell>{order.date}</TableCell>
                      <TableCell className="text-xs">{order.items.map(i => `${i.productName} ×${i.quantity}`).join(', ')}</TableCell>
                      <TableCell className="text-right font-semibold">{order.total.toFixed(2)} ₾</TableCell>
                      <TableCell>{orderStatusBadge(order.status)}</TableCell>
                      <TableCell>
                        <Badge variant={order.paymentStatus === 'paid' ? 'default' : order.paymentStatus === 'partial' ? 'secondary' : 'outline'}>
                          {order.paymentStatus === 'paid' ? 'გადახდილი' : order.paymentStatus === 'partial' ? 'ნაწილობრივ' : 'გადაუხდელი'}
                        </Badge>
                      </TableCell>
                      <TableCell>{order.routeId ? routes.find(r => r.id === order.routeId)?.name || '—' : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
