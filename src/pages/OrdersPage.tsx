import { useState, useMemo } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { useOrders, type PurchaseOrder } from '@/hooks/useOrders';
import { useAutoOrderRules, useAutoOrderGlobal } from '@/hooks/useAutoOrderRules';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useProducts } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, ArrowRight, Settings, Zap, Trash2, History, TrendingUp, Package, DollarSign, BarChart3, FileDown, BrainCircuit, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSmartProcurement } from '@/hooks/useSmartProcurement';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import * as XLSX from 'xlsx';

const statusMap = { pending: 'მოლოდინში', approved: 'დამტკიცებული', shipped: 'გაგზავნილი', received: 'მიღებული' };
const statusVariant = { pending: 'secondary' as const, approved: 'default' as const, shipped: 'outline' as const, received: 'default' as const };
const nextStatus: Record<string, PurchaseOrder['status']> = { pending: 'approved', approved: 'shipped', shipped: 'received' };

export default function OrdersPage() {
  const { purchaseOrders, addOrder, updateOrderStatus } = useOrders();
  const { suppliers } = useSuppliers();
  const { products } = useProducts();
  const { rules, history, addRule: addRuleMutation, deleteRule: deleteRuleMutation, updateRule: updateRuleMutation } = useAutoOrderRules();
  const { globalEnabled, setGlobalEnabled } = useAutoOrderGlobal();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [ruleProductId, setRuleProductId] = useState('');
  const [ruleSupplierId, setRuleSupplierId] = useState('');
  const [ruleQuantity, setRuleQuantity] = useState('');
  const { suggestions } = useSmartProcurement();
  const isMobile = useIsMobile();

  // Stats
  const totalAutoOrders = history.length;
  const totalAutoAmount = history.reduce((sum, h) => sum + h.totalAmount, 0);
  const totalAutoItems = history.reduce((sum, h) => sum + h.quantity, 0);
  const uniqueProducts = new Set(history.map((h) => h.productId)).size;

  // Top products by auto-order count
  const productOrderCounts = history.reduce<Record<string, { name: string; count: number; total: number }>>((acc, h) => {
    if (!acc[h.productId]) acc[h.productId] = { name: h.productName, count: 0, total: 0 };
    acc[h.productId].count++;
    acc[h.productId].total += h.totalAmount;
    return acc;
  }, {});
  const topProducts = Object.values(productOrderCounts).sort((a, b) => b.count - a.count).slice(0, 5);

  const handleAdd = () => {
    if (!supplierId || !productId || !quantity || !price) { toast.error('შეავსეთ ყველა ველი'); return; }
    const supplier = suppliers.find((s) => s.id === supplierId);
    const product = products.find((p) => p.id === productId);
    if (!supplier || !product) return;
    addOrder.mutate({
      order_number: '',
      supplier_id: supplierId, supplier_name: supplier.name,
      items: [{ product_id: productId, product_name: product.name, quantity: parseInt(quantity), price: parseFloat(price), total: parseInt(quantity) * parseFloat(price) }],
      status: 'pending', total_amount: parseInt(quantity) * parseFloat(price), order_date: new Date().toISOString().split('T')[0], expected_date: new Date().toISOString().split('T')[0],
    });
    toast.success('შეკვეთა შეიქმნა');
    setDialogOpen(false);
    setSupplierId(''); setProductId(''); setQuantity(''); setPrice('');
  };

  const handleAddRule = async () => {
    if (!ruleProductId || !ruleSupplierId || !ruleQuantity) { toast.error('შეავსეთ ყველა ველი'); return; }
    try {
      await addRuleMutation.mutateAsync({
        product_id: ruleProductId,
        supplier_id: ruleSupplierId,
        order_quantity: parseInt(ruleQuantity),
        enabled: true,
      });
      toast.success('ავტო-შეკვეთის წესი დამატებულია');
      setRuleDialogOpen(false);
      setRuleProductId(''); setRuleSupplierId(''); setRuleQuantity('');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleStatusChange = (order: PurchaseOrder) => {
    const next = nextStatus[order.status];
    if (!next) return;
    updateOrderStatus.mutate({ id: order.id, status: next });
    if (next === 'received') {
      // Stock update handled via DB
      toast.success('შეკვეთა მიღებულია');
    } else {
      toast.success(`სტატუსი: ${statusMap[next]}`);
    }
  };

  const renderOrders = () => (
    <>
      {isMobile ? (
        <div className="space-y-2">
          {purchaseOrders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">შეკვეთები არ არის</p>
          ) : (
            purchaseOrders.map((o) => (
              <div key={o.id} className="stat-card p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{o.supplier_name}</p>
                    <p className="text-xs text-muted-foreground">{o.order_date ? new Date(o.order_date).toLocaleDateString('ka-GE') : ''}</p>
                  </div>
                  <p className="text-lg font-bold text-primary">₾{(o.total_amount || 0).toFixed(2)}</p>
                </div>
                <p className="text-xs text-muted-foreground">{o.items?.map((i) => `${i.product_name} x${i.quantity}`).join(', ')}</p>
                <div className="flex items-center justify-between">
                  <Badge variant={statusVariant[o.status]}>{statusMap[o.status]}</Badge>
                  {nextStatus[o.status] && (
                    <Button size="sm" variant="outline" onClick={() => handleStatusChange(o)}>
                      <ArrowRight className="mr-1 h-3 w-3" />{statusMap[nextStatus[o.status]]}
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="stat-card overflow-auto">
          <Table>
            <TableHeader><TableRow><TableHead>თარიღი</TableHead><TableHead>მომწოდებელი</TableHead><TableHead>პროდუქტები</TableHead><TableHead>ჯამი</TableHead><TableHead>სტატუსი</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {purchaseOrders.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">შეკვეთები არ არის</TableCell></TableRow> :
                purchaseOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="text-xs">{o.order_date ? new Date(o.order_date).toLocaleDateString('ka-GE') : ''}</TableCell>
                    <TableCell>{o.supplier_name}</TableCell>
                    <TableCell>{o.items?.map((i) => `${i.product_name} x${i.quantity}`).join(', ')}</TableCell>
                    <TableCell className="font-semibold">₾{(o.total_amount || 0).toFixed(2)}</TableCell>
                    <TableCell><Badge variant={statusVariant[o.status]}>{statusMap[o.status]}</Badge></TableCell>
                    <TableCell>{nextStatus[o.status] && <Button size="sm" variant="outline" onClick={() => handleStatusChange(o)}>→ {statusMap[nextStatus[o.status]]}</Button>}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );

  return (
    <PageTransition>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">შეკვეთები</h1>
          <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />ახალი</Button>
        </div>

        <Tabs defaultValue="orders">
          <TabsList>
            <TabsTrigger value="orders">შეკვეთები</TabsTrigger>
            <TabsTrigger value="auto" className="gap-1.5">
              <Zap className="h-3.5 w-3.5" />ავტო-შეკვეთები
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />AI პროგნოზი
              {suggestions.length > 0 && (
                <Badge className="ml-1 h-4 min-w-4 px-1 flex items-center justify-center bg-primary text-[10px]">
                  {suggestions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />სტატისტიკა
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-4">
            {renderOrders()}
          </TabsContent>

          <TabsContent value="auto" className="mt-4 space-y-4">
            <Card>
              <CardContent className="flex items-center justify-between pt-6">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    ავტომატური შეკვეთების სისტემა
                  </h3>
                  <p className="text-sm text-muted-foreground">მარაგის მინიმუმზე ჩამოცილებისას ავტომატურად იქმნება შეკვეთა</p>
                </div>
                <Switch checked={globalEnabled} onCheckedChange={setGlobalEnabled} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings className="h-4 w-4 text-primary" />
                  შეკვეთის წესები
                </CardTitle>
                <Button size="sm" onClick={() => setRuleDialogOpen(true)}>
                  <Plus className="mr-1 h-3.5 w-3.5" />წესის დამატება
                </Button>
              </CardHeader>
              <CardContent>
                {rules.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">
                    წესები არ არის. დაამატეთ წესი, რომ მარაგის ამოწურვისას ავტომატურად შეიქმნას შეკვეთა.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {rules.map((rule) => {
                      const product = products.find((p) => p.id === rule.productId);
                      const supplier = suppliers.find((s) => s.id === rule.supplierId);
                      return (
                        <div key={rule.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{product?.name || 'უცნობი პროდუქტი'}</p>
                            <p className="text-xs text-muted-foreground">
                              მომწოდებელი: {supplier?.name || 'უცნობი'} • რაოდენობა: {rule.orderQuantity} {product?.unit || ''}
                            </p>
                            {product && (
                              <p className="text-xs text-muted-foreground">
                                მიმდინარე მარაგი: {product.stock} / მინ: {product.min_stock}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={rule.enabled}
                              onCheckedChange={(v) => updateRuleMutation.mutateAsync({ id: rule.id, updates: { enabled: v } })}
                            />
                            <Button size="icon" variant="ghost" onClick={() => deleteRuleMutation.mutateAsync(rule.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="mt-4 space-y-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <BrainCircuit className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold">Proactive AI Procurement</h3>
                    <p className="text-sm text-muted-foreground">
                      AI აანალიზებს ბოლო 30 დღის გაყიდვების დინამიკას და გთავაზობთ მარაგების ოპტიმალურ შევსებას.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {suggestions.length === 0 ? (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  შესყიდვის რეკომენდაციები ჯერჯერობით არ არის. AI აგროვებს მონაცემებს...
                </div>
              ) : (
                suggestions.map((s) => (
                  <Card key={s.productId} className={`border-l-4 ${s.priority === 'high' ? 'border-l-destructive' :
                      s.priority === 'medium' ? 'border-l-orange-500' : 'border-l-primary'
                    }`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-sm font-bold truncate pr-2">
                          {s.productName}
                        </CardTitle>
                        {s.priority === 'high' && (
                          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-muted p-2 rounded">
                          <p className="text-muted-foreground">მარაგი</p>
                          <p className="font-bold">{s.currentStock}</p>
                        </div>
                        <div className="bg-muted p-2 rounded">
                          <p className="text-muted-foreground">გეყოფათ</p>
                          <p className="font-bold">{s.daysRemaining === 999 ? '∞' : `${Math.round(s.daysRemaining)} დღე`}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        დღიური გაყიდვა: {s.dailyVelocity.toFixed(2)}
                      </div>

                      <div className="p-2 rounded bg-primary/5 border border-primary/10">
                        <p className="text-[10px] uppercase text-primary font-bold mb-1">AI რეკომენდაცია</p>
                        <p className="text-xs font-medium">შეუკვეთეთ {s.suggestedQuantity} ერთეული</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{s.reason}</p>
                      </div>

                      <Button
                        size="sm"
                        className="w-full h-8"
                        onClick={() => {
                          setProductId(s.productId);
                          setQuantity(s.suggestedQuantity.toString());
                          const product = products.find(p => p.id === s.productId);
                          if (product) setPrice(product.buy_price.toString());
                          setSupplierId(product?.warehouse_id || ''); // Assuming warehouse_id or similar
                          setDialogOpen(true);
                        }}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> შეკვეთა
                      </Button>
                    </CardContent>
                  </Card>
                )
                ))}
            </div>
          </TabsContent>

          <TabsContent value="stats" className="mt-4 space-y-4">
            {/* Summary Cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2.5">
                      <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{totalAutoOrders}</p>
                      <p className="text-xs text-muted-foreground">ავტო-შეკვეთა</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2.5">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">₾{totalAutoAmount.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">ჯამური ღირებულება</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2.5">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{totalAutoItems}</p>
                      <p className="text-xs text-muted-foreground">შეკვეთილი ერთეული</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2.5">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{uniqueProducts}</p>
                      <p className="text-xs text-muted-foreground">უნიკალური პროდუქტი</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  თვეების მიხედვით ავტო-შეკვეთების ტრენდი
                </CardTitle>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">მონაცემები არ არის</p>
                ) : (
                  <MonthlyChart history={history} />
                )}
              </CardContent>
            </Card>

            {/* Top Products */}
            {topProducts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    ყველაზე ხშირად შეკვეთილი პროდუქტები
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topProducts.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="text-sm font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.count} შეკვეთა</p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold">₾{item.total.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* History Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-4 w-4 text-primary" />
                  ავტო-შეკვეთების ისტორია
                </CardTitle>
                {history.length > 0 && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportHistoryToExcel(history)}>
                    <FileDown className="h-3.5 w-3.5" />Excel
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">
                    ავტო-შეკვეთების ისტორია ცარიელია
                  </p>
                ) : isMobile ? (
                  <div className="space-y-2">
                    {history.map((h) => (
                      <div key={h.id} className="rounded-lg border p-3 space-y-1">
                        <div className="flex items-start justify-between">
                          <p className="font-medium text-sm">{h.productName}</p>
                          <p className="font-semibold text-primary">₾{h.totalAmount.toFixed(2)}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {h.supplierName} • {h.quantity} ერთ.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(h.date).toLocaleString('ka-GE')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>თარიღი</TableHead>
                        <TableHead>პროდუქტი</TableHead>
                        <TableHead>მომწოდებელი</TableHead>
                        <TableHead>რაოდენობა</TableHead>
                        <TableHead>ღირებულება</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((h) => (
                        <TableRow key={h.id}>
                          <TableCell className="text-xs">{new Date(h.date).toLocaleString('ka-GE')}</TableCell>
                          <TableCell>{h.productName}</TableCell>
                          <TableCell>{h.supplierName}</TableCell>
                          <TableCell>{h.quantity}</TableCell>
                          <TableCell className="font-semibold">₾{h.totalAmount.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* New Order Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>ახალი შეკვეთა</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1"><Label>მომწოდებელი</Label><Select value={supplierId} onValueChange={setSupplierId}><SelectTrigger><SelectValue placeholder="აირჩიეთ" /></SelectTrigger><SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>პროდუქტი</Label><Select value={productId} onValueChange={setProductId}><SelectTrigger><SelectValue placeholder="აირჩიეთ" /></SelectTrigger><SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>რაოდენობა</Label><Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
              <div className="space-y-1"><Label>ფასი</Label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleAdd}>შეკვეთის შექმნა</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Rule Dialog */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>ავტო-შეკვეთის წესი</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>პროდუქტი</Label>
              <Select value={ruleProductId} onValueChange={setRuleProductId}>
                <SelectTrigger><SelectValue placeholder="აირჩიეთ პროდუქტი" /></SelectTrigger>
                <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} (მარაგი: {p.stock})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>მომწოდებელი</Label>
              <Select value={ruleSupplierId} onValueChange={setRuleSupplierId}>
                <SelectTrigger><SelectValue placeholder="აირჩიეთ მომწოდებელი" /></SelectTrigger>
                <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>შეკვეთის რაოდენობა</Label>
              <Input type="number" min="1" value={ruleQuantity} onChange={(e) => setRuleQuantity(e.target.value)} placeholder="მაგ: 50" />
              <p className="text-xs text-muted-foreground">რამდენი უნდა შეიკვეთოს მარაგის ამოწურვისას</p>
            </div>
          </div>
          <DialogFooter><Button onClick={handleAddRule}>წესის დამატება</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}

const MONTH_NAMES = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];

function MonthlyChart({ history }: { history: { date: string; totalAmount: number; quantity: number }[] }) {
  const chartData = useMemo(() => {
    const monthMap: Record<string, { orders: number; amount: number; items: number }> = {};

    // Generate last 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap[key] = { orders: 0, amount: 0, items: 0 };
    }

    history.forEach((h) => {
      const d = new Date(h.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthMap[key]) {
        monthMap[key].orders++;
        monthMap[key].amount += h.totalAmount;
        monthMap[key].items += h.quantity;
      }
    });

    return Object.entries(monthMap).map(([key, val]) => {
      const [, m] = key.split('-');
      return { month: MONTH_NAMES[parseInt(m) - 1], ...val };
    });
  }, [history]);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            color: 'hsl(var(--foreground))',
          }}
          formatter={(value: number, name: string) => {
            const labels: Record<string, string> = { orders: 'შეკვეთები', amount: 'ღირებულება (₾)', items: 'ერთეულები' };
            return [name === 'amount' ? `₾${value.toFixed(2)}` : value, labels[name] || name];
          }}
        />
        <Legend
          formatter={(value: string) => {
            const labels: Record<string, string> = { orders: 'შეკვეთები', amount: 'ღირებულება (₾)', items: 'ერთეულები' };
            return labels[value] || value;
          }}
        />
        <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        <Bar dataKey="amount" fill="hsl(var(--primary) / 0.5)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="items" fill="hsl(var(--primary) / 0.25)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function exportHistoryToExcel(history: { date: string; productName: string; supplierName: string; quantity: number; totalAmount: number }[]) {
  const data = history.map((h) => ({
    'თარიღი': new Date(h.date).toLocaleString('ka-GE'),
    'პროდუქტი': h.productName,
    'მომწოდებელი': h.supplierName,
    'რაოდენობა': h.quantity,
    'ღირებულება (₾)': h.totalAmount.toFixed(2),
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ავტო-შეკვეთები');
  XLSX.writeFile(wb, `ავტო-შეკვეთები_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
