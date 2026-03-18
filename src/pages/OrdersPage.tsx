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
import { useI18n } from '@/hooks/useI18n';

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
  const { t, lang } = useI18n();

  const statusMap = {
    pending: t('status_pending') || 'Pending',
    approved: t('status_approved') || 'Approved',
    shipped: t('status_shipped') || 'Shipped',
    received: t('status_received') || 'Received'
  };

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
    if (!supplierId || !productId || !quantity || !price) { toast.error(t('fill_all_fields') || 'Fill all fields'); return; }
    const supplier = suppliers.find((s) => s.id === supplierId);
    const product = products.find((p) => p.id === productId);
    if (!supplier || !product) return;
    addOrder.mutate({
      order_number: '',
      supplier_id: supplierId, supplier_name: supplier.name,
      items: [{ product_id: productId, product_name: product.name, quantity: parseInt(quantity), price: parseFloat(price), total: parseInt(quantity) * parseFloat(price) }],
      status: 'pending', total_amount: parseInt(quantity) * parseFloat(price), order_date: new Date().toISOString().split('T')[0], expected_date: new Date().toISOString().split('T')[0],
    });
    toast.success(t('order_created') || 'Order created');
    setDialogOpen(false);
    setSupplierId(''); setProductId(''); setQuantity(''); setPrice('');
  };

  const handleAddRule = async () => {
    if (!ruleProductId || !ruleSupplierId || !ruleQuantity) { toast.error(t('fill_all_fields') || 'Fill all fields'); return; }
    try {
      await addRuleMutation.mutateAsync({
        product_id: ruleProductId,
        supplier_id: ruleSupplierId,
        order_quantity: parseInt(ruleQuantity),
        enabled: true,
      });
      toast.success(t('auto_order_rule_added') || 'Auto-order rule added');
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
      toast.success(t('order_received') || 'Order received');
    } else {
      toast.success(`${t('status') || 'Status'}: ${statusMap[next]}`);
    }
  };

  const renderOrders = () => (
    <>
      {isMobile ? (
        <div className="space-y-2">
          {purchaseOrders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t('no_orders') || 'No orders'}</p>
          ) : (
            purchaseOrders.map((o) => (
              <div key={o.id} className="stat-card p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{o.supplier_name}</p>
                    <p className="text-xs text-muted-foreground">{o.order_date ? new Date(o.order_date).toLocaleDateString(lang === 'ka' ? 'ka-GE' : 'en-US') : ''}</p>
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
            <TableHeader><TableRow><TableHead>{t('date') || 'Date'}</TableHead><TableHead>{t('supplier') || 'Supplier'}</TableHead><TableHead>{t('products') || 'Products'}</TableHead><TableHead>{t('total') || 'Total'}</TableHead><TableHead>{t('status') || 'Status'}</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {purchaseOrders.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">{t('no_orders') || 'No orders'}</TableCell></TableRow> :
                purchaseOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="text-xs">{o.order_date ? new Date(o.order_date).toLocaleDateString(lang === 'ka' ? 'ka-GE' : 'en-US') : ''}</TableCell>
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
          <h1 className="text-2xl font-bold">{t('orders') || 'Orders'}</h1>
          <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />{t('new') || 'New'}</Button>
        </div>

        <Tabs defaultValue="orders">
          <TabsList>
            <TabsTrigger value="orders">{t('orders') || 'Orders'}</TabsTrigger>
            <TabsTrigger value="auto" className="gap-1.5">
              <Zap className="h-3.5 w-3.5" />{t('auto_orders') || 'Auto-orders'}
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />{t('ai_forecast') || 'AI Forecast'}
              {suggestions.length > 0 && (
                <Badge className="ml-1 h-4 min-w-4 px-1 flex items-center justify-center bg-primary text-[10px]">
                  {suggestions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />{t('statistics') || 'Statistics'}
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
                    {t('auto_order_system') || 'Auto-order system'}
                  </h3>
                  <p className="text-sm text-muted-foreground">{t('auto_order_description') || 'Orders are automatically created when stock drops below minimum'}</p>
                </div>
                <Switch checked={globalEnabled} onCheckedChange={setGlobalEnabled} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings className="h-4 w-4 text-primary" />
                  {t('order_rules') || 'Order Rules'}
                </CardTitle>
                <Button size="sm" onClick={() => setRuleDialogOpen(true)}>
                  <Plus className="mr-1 h-3.5 w-3.5" />{t('add_rule') || 'Add Rule'}
                </Button>
              </CardHeader>
              <CardContent>
                {rules.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">
                    {t('no_rules_add_one') || 'No rules. Add a rule to automatically create orders when stock runs out.'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {rules.map((rule) => {
                      const product = products.find((p) => p.id === rule.productId);
                      const supplier = suppliers.find((s) => s.id === rule.supplierId);
                      return (
                        <div key={rule.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{product?.name || (t('unknown_product') || 'Unknown product')}</p>
                            <p className="text-xs text-muted-foreground">
                              {t('supplier') || 'Supplier'}: {supplier?.name || (t('unknown') || 'Unknown')} • {t('quantity') || 'Quantity'}: {rule.orderQuantity} {product?.unit || ''}
                            </p>
                            {product && (
                              <p className="text-xs text-muted-foreground">
                                {t('current_stock') || 'Current stock'}: {product.stock} / {t('min_stock_short') || 'min'}: {product.min_stock}
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
                      {t('ai_procurement_desc') || 'AI analyzes the last 30 days of sales dynamics and suggests optimal stock replenishment.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {suggestions.length === 0 ? (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  {t('no_ai_recommendations') || 'No purchase recommendations yet. AI is gathering data...'}
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
                          <p className="text-muted-foreground">{t('stock') || 'Stock'}</p>
                          <p className="font-bold">{s.currentStock}</p>
                        </div>
                        <div className="bg-muted p-2 rounded">
                          <p className="text-muted-foreground">{t('will_last') || 'Will last'}</p>
                          <p className="font-bold">{s.daysRemaining === 999 ? '∞' : `${Math.round(s.daysRemaining)} ${t('days') || 'days'}`}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        {t('daily_sales') || 'Daily sales:'} {s.dailyVelocity.toFixed(2)}
                      </div>

                      <div className="p-2 rounded bg-primary/5 border border-primary/10">
                        <p className="text-[10px] uppercase text-primary font-bold mb-1">{t('ai_recommendation') || 'AI Recommendation'}</p>
                        <p className="text-xs font-medium">{(t('order_quantity_msg') || 'Order {quantity} units').replace('{quantity}', s.suggestedQuantity.toString())}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{lang === 'en' && s.reason === 'მარაგი ამოიწურება 10 დღეში (მაღალი რისკი)' ? 'Stock will run out in 10 days (high risk)' : s.reason}</p>
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
                        <Plus className="h-3.5 w-3.5 mr-1" /> {t('order') || 'Order'}
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
                      <p className="text-xs text-muted-foreground">{t('auto_order') || 'Auto-order'}</p>
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
                      <p className="text-xs text-muted-foreground">{t('total_value') || 'Total value'}</p>
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
                      <p className="text-xs text-muted-foreground">{t('ordered_units') || 'Ordered units'}</p>
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
                      <p className="text-xs text-muted-foreground">{t('unique_product') || 'Unique product'}</p>
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
                  {t('auto_orders_monthly_trend') || 'Auto-orders monthly trend'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">{t('no_data') || 'No data'}</p>
                ) : (
                  <MonthlyChart history={history} lang={lang} t={t} />
                )}
              </CardContent>
            </Card>

            {/* Top Products */}
            {topProducts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    {t('most_frequently_ordered_products') || 'Most frequently ordered products'}
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
                            <p className="text-xs text-muted-foreground">{item.count} {t('order') || 'order'}</p>
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
                  {t('auto_orders_history') || 'Auto-orders history'}
                </CardTitle>
                {history.length > 0 && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportHistoryToExcel(history, lang)}>
                    <FileDown className="h-3.5 w-3.5" />Excel
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">
                    {t('auto_orders_history_empty') || 'Auto-orders history is empty'}
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
                          {h.supplierName} • {h.quantity} {t('unit_short') || 'unit'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(h.date).toLocaleString(lang === 'ka' ? 'ka-GE' : 'en-US')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('date') || 'Date'}</TableHead>
                        <TableHead>{t('product') || 'Product'}</TableHead>
                        <TableHead>{t('supplier') || 'Supplier'}</TableHead>
                        <TableHead>{t('quantity') || 'Quantity'}</TableHead>
                        <TableHead>{t('value') || 'Value'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((h) => (
                        <TableRow key={h.id}>
                          <TableCell className="text-xs">{new Date(h.date).toLocaleString(lang === 'ka' ? 'ka-GE' : 'en-US')}</TableCell>
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
          <DialogHeader><DialogTitle>{t('new_order') || 'New Order'}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1"><Label>{t('supplier') || 'Supplier'}</Label><Select value={supplierId} onValueChange={setSupplierId}><SelectTrigger><SelectValue placeholder={t('select') || 'Select'} /></SelectTrigger><SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>{t('product') || 'Product'}</Label><Select value={productId} onValueChange={setProductId}><SelectTrigger><SelectValue placeholder={t('select') || 'Select'} /></SelectTrigger><SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>{t('quantity') || 'Quantity'}</Label><Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
              <div className="space-y-1"><Label>{t('price') || 'Price'}</Label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleAdd}>{t('create_order') || 'Create order'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Rule Dialog */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('auto_order_rule') || 'Auto-order rule'}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>{t('product') || 'Product'}</Label>
              <Select value={ruleProductId} onValueChange={setRuleProductId}>
                <SelectTrigger><SelectValue placeholder={t('select_product') || 'Select product'} /></SelectTrigger>
                <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({t('stock') || 'Stock'}: {p.stock})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t('supplier') || 'Supplier'}</Label>
              <Select value={ruleSupplierId} onValueChange={setRuleSupplierId}>
                <SelectTrigger><SelectValue placeholder={t('select_supplier') || 'Select supplier'} /></SelectTrigger>
                <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t('order_quantity_label') || 'Order quantity'}</Label>
              <Input type="number" min="1" value={ruleQuantity} onChange={(e) => setRuleQuantity(e.target.value)} placeholder={t('eg_50') || 'e.g. 50'} />
              <p className="text-xs text-muted-foreground">{t('how_much_to_order_when_out_of_stock') || 'How many to order when stock runs out'}</p>
            </div>
          </div>
          <DialogFooter><Button onClick={handleAddRule}>{t('add_rule') || 'Add Rule'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}

function MonthlyChart({ history, lang, t }: { history: { date: string; totalAmount: number; quantity: number }[], lang: string, t: any }) {
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
      const date = new Date(parseInt(key.split('-')[0]), parseInt(m) - 1, 1);
      const monthStr = date.toLocaleString(lang === 'ka' ? 'ka-GE' : 'en-US', { month: 'short' });
      return { month: monthStr, ...val };
    });
  }, [history, lang]);

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
            const labels: Record<string, string> = { orders: t('orders') || 'Orders', amount: `${t('value') || 'Value'} (₾)`, items: t('ordered_units') || 'Units' };
            return [name === 'amount' ? `₾${value.toFixed(2)}` : value, labels[name] || name];
          }}
        />
        <Legend
          formatter={(value: string) => {
            const labels: Record<string, string> = { orders: t('orders') || 'Orders', amount: `${t('value') || 'Value'} (₾)`, items: t('ordered_units') || 'Units' };
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

function exportHistoryToExcel(history: { date: string; productName: string; supplierName: string; quantity: number; totalAmount: number }[], lang: string) {
  const data = history.map((h) => ({
    [lang === 'ka' ? 'თარიღი' : 'Date']: new Date(h.date).toLocaleString(lang === 'ka' ? 'ka-GE' : 'en-US'),
    [lang === 'ka' ? 'პროდუქტი' : 'Product']: h.productName,
    [lang === 'ka' ? 'მომწოდებელი' : 'Supplier']: h.supplierName,
    [lang === 'ka' ? 'რაოდენობა' : 'Quantity']: h.quantity,
    [lang === 'ka' ? 'ღირებულება (₾)' : 'Value (₾)']: h.totalAmount.toFixed(2),
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, lang === 'ka' ? 'ავტო-შეკვეთები' : 'Auto-orders');
  XLSX.writeFile(wb, `${lang === 'ka' ? 'ავტო-შეკვეთები' : 'Auto-orders'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
