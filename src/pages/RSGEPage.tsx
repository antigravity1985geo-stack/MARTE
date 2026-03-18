import { PageTransition } from '@/components/PageTransition';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  RsgeWaybill, RsgeInvoice, FiscalShift,
  getWaybills, getWaybillGoodsList, getWaybillTypes, getWaybillUnits, getTransportTypes,
  saveWaybill, sendWaybill, closeWaybill, deleteWaybill, refuseWaybill, confirmWaybill,
  getBuyerWaybills, getInvoices, saveInvoice, deleteInvoice,
  WaybillType, WaybillUnit, TransportType, CompanyInfo,
  getCompanyInfo, checkVatPayer, getBarCodes, whatIsMyIp,
  createFiscalReceipt, voidFiscalReceipt, getFiscalShift, openFiscalShift, closeFiscalShift, getFiscalReceipts,
} from '@/lib/rsge';
import { useRsgeConfig, useRsgeAuditLogs, useRsgeFiscalShift } from '@/hooks/useRsgeConfig';
import { useTransactions } from '@/hooks/useTransactions';
import { useProducts } from '@/hooks/useProducts';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  Settings, RefreshCw, Plus, Send, X, CheckCircle, Truck,
  FileText, Building2, Loader2, Download, Shield, History,
  Clock, Receipt, ChevronRight, AlertCircle, BarChart2,
} from 'lucide-react';

// ---- Status badge helper ----
function waybillStatusBadge(status: number) {
  const map: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    0: { label: 'დაუდასტურებელი', variant: 'outline' },
    1: { label: 'აქტიური', variant: 'default' },
    2: { label: 'დახურული', variant: 'secondary' },
  };
  const s = map[status] ?? { label: `სტ.${status}`, variant: 'outline' as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

// ============================================================
// Tab 1: Settings
// ============================================================
function SettingsTab() {
  const { config, isLoading, isSaving, saveConfigAsync } = useRsgeConfig();
  const [form, setForm] = useState({ su: '', sp: '', demo: true, company_tin: '', company_name: '' });
  const [testing, setTesting] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);

  // Sync form when config loads
  useEffect(() => {
    if (config) setForm({ su: config.su || '', sp: '', demo: config.demo ?? true, company_tin: config.company_tin || '', company_name: config.company_name || '' });
  }, [config]);

  const testConnection = async () => {
    setTesting(true);
    try {
      // First save so edge function reads fresh creds
      await saveConfigAsync(form);
      const info = await whatIsMyIp();
      toast.success(`კავშირი წარმატებულია! IP: ${info.ip}`);
    } catch (err: any) {
      toast.error(`კავშირის შეცდომა: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <Shield className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          RS.GE credentials ინახება სერვერზე, დაშიფრულად. ბრაუზერში კრედენციალები <strong>არ</strong> ინახება.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>სერვის მომხმარებელი (su)</Label>
          <Input value={form.su} onChange={e => setForm({ ...form, su: e.target.value })} placeholder="სერვის მომხმარებლის სახელი" />
        </div>
        <div className="space-y-2">
          <Label>სერვის პაროლი (sp) <span className="text-xs text-muted-foreground">— ცარიელი = არ შეიცვლება</span></Label>
          <Input type="password" value={form.sp} onChange={e => setForm({ ...form, sp: e.target.value })} placeholder="••••••••" />
        </div>
        <div className="space-y-2">
          <Label>კომპანიის საიდენტიფიკაციო (TIN)</Label>
          <Input value={form.company_tin} onChange={e => setForm({ ...form, company_tin: e.target.value })} placeholder="000000000" />
        </div>
        <div className="space-y-2">
          <Label>კომპანიის სახელი</Label>
          <Input value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} placeholder="შპს სახელი" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={form.demo} onCheckedChange={v => setForm({ ...form, demo: v })} />
        <Label>სატესტო რეჟიმი (Demo) — <span className="text-muted-foreground text-xs">ჩართეთ ტესტირებისთვის, გამორთეთ production-ისთვის</span></Label>
      </div>

      {companyInfo && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-4 space-y-1">
            <p className="font-medium flex items-center gap-2"><Building2 className="h-4 w-4 text-green-500" />{companyInfo.name}</p>
            <p className="text-xs text-muted-foreground">TIN: {companyInfo.tin} | {companyInfo.address}</p>
            <p className="text-xs text-muted-foreground">დირექტორი: {companyInfo.director}</p>
            <Badge variant={companyInfo.isVatPayer ? 'default' : 'secondary'}>
              {companyInfo.isVatPayer ? 'დღგ-ს გადამხდელი' : 'არ არის დღგ-ს გადამხდელი'}
            </Badge>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button onClick={testConnection} variant="outline" disabled={testing || isSaving}>
          {testing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Settings className="h-4 w-4 mr-1" />}
          კავშირის ტესტი
        </Button>
        <Button onClick={() => saveConfigAsync(form)} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
          შენახვა
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Tab 2: Seller Waybills (გამყიდველის ზედნადებები)
// ============================================================
function WaybillsTab({ isBuyer = false }: { isBuyer?: boolean }) {
  const { products } = useProducts();
  const { addTransaction } = useTransactions();
  const [waybills, setWaybills] = useState<RsgeWaybill[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [types, setTypes] = useState<WaybillType[]>([]);
  const [units, setUnits] = useState<WaybillUnit[]>([]);
  const [transTypes, setTransTypes] = useState<TransportType[]>([]);
  const [buyerTinFilter, setBuyerTinFilter] = useState('');

  const [newWaybill, setNewWaybill] = useState({
    waybill_type: '1', buyer_tin: '', start_address: '', end_address: '',
    driver_tin: '', transport_type_id: '1', car_number: '', comment: '',
    goods_list: [] as { name: string; unitId: string; quantity: string; price: string }[],
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = isBuyer
        ? await getBuyerWaybills(buyerTinFilter ? { buyer_tin: buyerTinFilter } : {})
        : await getWaybills();
      setWaybills(result?.waybills || []);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }, [isBuyer, buyerTinFilter]);

  const loadMeta = useCallback(async () => {
    try {
      const [t, u, tr] = await Promise.all([getWaybillTypes(), getWaybillUnits(), getTransportTypes()]);
      setTypes(t?.types || []); setUnits(u?.units || []); setTransTypes(tr?.types || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { load(); loadMeta(); }, [load, loadMeta]);

  const handleImport = async (w: RsgeWaybill) => {
    setImporting(w.id);
    try {
      const goodsResult = await getWaybillGoodsList(w.id);
      const goods = goodsResult?.goods || [];
      if (!goods.length) throw new Error('ზედნადებში საქონელი ვერ მოიძებნა');
      const items = goods.map((g: any) => {
        const product = products.find(p => p.barcode === g.barCode) || products.find(p => p.name.toLowerCase() === g.name.toLowerCase());
        if (!product) throw new Error(`პროდუქტი "${g.name}" ვერ მოიძებნა. ჯერ დაამატეთ.`);
        return { product_id: product.id, name: product.name, price: g.price, quantity: g.quantity };
      });
      await addTransaction.mutateAsync({ type: 'purchase', supplier_name: w.sellerName || 'RS.GE', total: w.total, date: new Date().toISOString(), status: 'completed', items });
      toast.success(`ზედნადები #${w.number} საწყობში აისახა`);
    } catch (err: any) { toast.error(err.message); }
    finally { setImporting(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">{isBuyer ? 'მყიდველის ზედნადებები' : 'გამყიდველის ზედნადებები'}</h3>
        <div className="flex gap-2">
          {isBuyer && (
            <Input value={buyerTinFilter} onChange={e => setBuyerTinFilter(e.target.value)} placeholder="TIN ფილტრი" className="w-36 h-8 text-sm" />
          )}
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />განახლება
          </Button>
          {!isBuyer && (
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />ახალი</Button></DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader><DialogTitle>ახალი ზედნადები</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">ტიპი</Label>
                      <Select value={newWaybill.waybill_type} onValueChange={v => setNewWaybill(p => ({ ...p, waybill_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {types.length > 0 ? types.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>) : (
                            <><SelectItem value="1">შიდა გადაზიდვა</SelectItem><SelectItem value="3">საერთაშორისო</SelectItem><SelectItem value="4">ერთჯერადი</SelectItem></>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">მყიდველის TIN</Label><Input value={newWaybill.buyer_tin} onChange={e => setNewWaybill(p => ({ ...p, buyer_tin: e.target.value }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">საწყისი მისამართი</Label><Input value={newWaybill.start_address} onChange={e => setNewWaybill(p => ({ ...p, start_address: e.target.value }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">საბოლოო მისამართი</Label><Input value={newWaybill.end_address} onChange={e => setNewWaybill(p => ({ ...p, end_address: e.target.value }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">მძღოლის TIN</Label><Input value={newWaybill.driver_tin} onChange={e => setNewWaybill(p => ({ ...p, driver_tin: e.target.value }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">ავტო ნომერი</Label><Input value={newWaybill.car_number} onChange={e => setNewWaybill(p => ({ ...p, car_number: e.target.value }))} /></div>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">კომენტარი</Label><Input value={newWaybill.comment} onChange={e => setNewWaybill(p => ({ ...p, comment: e.target.value }))} /></div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>საქონელი</Label>
                      <Button variant="outline" size="sm" onClick={() => setNewWaybill(p => ({ ...p, goods_list: [...p.goods_list, { name: '', unitId: '99', quantity: '1', price: '0' }] }))}>
                        <Plus className="h-3 w-3 mr-1" />დამატება
                      </Button>
                    </div>
                    {newWaybill.goods_list.map((item, i) => (
                      <div key={i} className="grid grid-cols-5 gap-2 items-end">
                        <div><Label className="text-xs">სახელი</Label><Input value={item.name} onChange={e => { const l = [...newWaybill.goods_list]; l[i] = { ...l[i], name: e.target.value }; setNewWaybill(p => ({ ...p, goods_list: l })); }} /></div>
                        <div>
                          <Label className="text-xs">ერთეული</Label>
                          <Select value={item.unitId} onValueChange={v => { const l = [...newWaybill.goods_list]; l[i] = { ...l[i], unitId: v }; setNewWaybill(p => ({ ...p, goods_list: l })); }}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{units.length > 0 ? units.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>) : <><SelectItem value="99">ცალი</SelectItem><SelectItem value="1">კგ</SelectItem></>}</SelectContent>
                          </Select>
                        </div>
                        <div><Label className="text-xs">რაოდ.</Label><Input type="number" value={item.quantity} onChange={e => { const l = [...newWaybill.goods_list]; l[i] = { ...l[i], quantity: e.target.value }; setNewWaybill(p => ({ ...p, goods_list: l })); }} /></div>
                        <div><Label className="text-xs">ფასი</Label><Input type="number" value={item.price} onChange={e => { const l = [...newWaybill.goods_list]; l[i] = { ...l[i], price: e.target.value }; setNewWaybill(p => ({ ...p, goods_list: l })); }} /></div>
                        <Button variant="ghost" size="sm" onClick={() => setNewWaybill(p => ({ ...p, goods_list: p.goods_list.filter((_, idx) => idx !== i) }))}><X className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full" onClick={async () => {
                    try { const r = await saveWaybill(newWaybill); toast.success(`ზედნადები შეიქმნა: ${r?.waybillId}`); setShowCreate(false); load(); }
                    catch (err: any) { toast.error(err.message); }
                  }}><FileText className="h-4 w-4 mr-1" />შექმნა</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ნომერი</TableHead><TableHead>ტიპი</TableHead>
            <TableHead>{isBuyer ? 'გამყიდველი' : 'მყიდველი'}</TableHead>
            <TableHead>თარიღი</TableHead><TableHead>ჯამი</TableHead><TableHead>სტატუსი</TableHead>
            <TableHead className="text-right">მოქმ.</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {waybills.length === 0 ? (
            <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">{loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'ზედნადებები არ მოიძებნა'}</TableCell></TableRow>
          ) : waybills.map(w => (
            <TableRow key={w.id || w.number}>
              <TableCell className="font-mono text-sm">{w.number}</TableCell>
              <TableCell>{w.typeName}</TableCell>
              <TableCell>
                <div className="font-medium text-sm">{isBuyer ? w.sellerName : w.buyerName}</div>
                <div className="text-xs text-muted-foreground">{isBuyer ? w.sellerTin : w.buyerTin}</div>
              </TableCell>
              <TableCell className="text-sm">{w.createDate}</TableCell>
              <TableCell className="font-medium">{w.total?.toFixed(2)} ₾</TableCell>
              <TableCell>{waybillStatusBadge(w.status)}</TableCell>
              <TableCell className="text-right">
                <div className="flex gap-1 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => handleImport(w)} disabled={importing === w.id} title="საწყობში ასახვა">
                    {importing === w.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  </Button>
                  {isBuyer && w.status === 1 && (
                    <>
                      <Button variant="ghost" size="sm" onClick={async () => { try { await confirmWaybill(w.id); toast.success('დადასტურებულია'); load(); } catch (e: any) { toast.error(e.message); } }} title="დადასტურება"><CheckCircle className="h-3.5 w-3.5 text-green-600" /></Button>
                      <Button variant="ghost" size="sm" onClick={async () => { try { await refuseWaybill(w.id); toast.success('უარყოფილია'); load(); } catch (e: any) { toast.error(e.message); } }} title="უარყოფა"><X className="h-3.5 w-3.5 text-destructive" /></Button>
                    </>
                  )}
                  {!isBuyer && w.status === 0 && (
                    <>
                      <Button variant="ghost" size="sm" onClick={async () => { try { await sendWaybill(w.id); toast.success('გაგზავნილია'); load(); } catch (e: any) { toast.error(e.message); } }} title="გაგზავნა"><Send className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" onClick={async () => { try { await deleteWaybill(w.id); toast.success('წაიშალა'); load(); } catch (e: any) { toast.error(e.message); } }} title="წაშლა"><X className="h-3.5 w-3.5 text-destructive" /></Button>
                    </>
                  )}
                  {!isBuyer && w.status === 1 && (
                    <Button variant="ghost" size="sm" onClick={async () => { try { await closeWaybill(w.id); toast.success('დახურულია'); load(); } catch (e: any) { toast.error(e.message); } }} title="დახურვა"><CheckCircle className="h-3.5 w-3.5" /></Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ============================================================
// Tab 4: Invoices
// ============================================================
function InvoicesTab() {
  const [invoices, setInvoices] = useState<RsgeInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newInvoice, setNewInvoice] = useState({ buyer_tin: '', comment: '', goods_list: [] as { name: string; quantity: string; price: string }[] });

  const load = useCallback(async () => {
    setLoading(true);
    try { setInvoices((await getInvoices())?.invoices || []); }
    catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">RS.GE ინვოისები</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />განახლება</Button>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />ახალი ინვოისი</Button></DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader><DialogTitle>ახალი RS.GE ინვოისი</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1"><Label className="text-xs">მყიდველის TIN</Label><Input value={newInvoice.buyer_tin} onChange={e => setNewInvoice(p => ({ ...p, buyer_tin: e.target.value }))} placeholder="000000000" /></div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>საქონელი</Label>
                    <Button variant="outline" size="sm" onClick={() => setNewInvoice(p => ({ ...p, goods_list: [...p.goods_list, { name: '', quantity: '1', price: '0' }] }))}><Plus className="h-3 w-3 mr-1" />დამატება</Button>
                  </div>
                  {newInvoice.goods_list.map((item, i) => (
                    <div key={i} className="grid grid-cols-4 gap-2 items-end">
                      <div className="col-span-2"><Label className="text-xs">სახელი</Label><Input value={item.name} onChange={e => { const l = [...newInvoice.goods_list]; l[i] = { ...l[i], name: e.target.value }; setNewInvoice(p => ({ ...p, goods_list: l })); }} /></div>
                      <div><Label className="text-xs">რაოდ.</Label><Input type="number" value={item.quantity} onChange={e => { const l = [...newInvoice.goods_list]; l[i] = { ...l[i], quantity: e.target.value }; setNewInvoice(p => ({ ...p, goods_list: l })); }} /></div>
                      <div><Label className="text-xs">ფასი</Label><Input type="number" value={item.price} onChange={e => { const l = [...newInvoice.goods_list]; l[i] = { ...l[i], price: e.target.value }; setNewInvoice(p => ({ ...p, goods_list: l })); }} /></div>
                    </div>
                  ))}
                </div>
                <Button className="w-full" onClick={async () => {
                  try { const r = await saveInvoice(newInvoice); toast.success(`ინვოისი შეიქმნა: ${r?.invoiceId}`); setShowCreate(false); load(); }
                  catch (err: any) { toast.error(err.message); }
                }}>შექმნა</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Table>
        <TableHeader><TableRow><TableHead>ნომერი</TableHead><TableHead>მყიდველი</TableHead><TableHead>თარიღი</TableHead><TableHead>ჯამი</TableHead><TableHead>სტატუსი</TableHead><TableHead className="text-right">მოქმ.</TableHead></TableRow></TableHeader>
        <TableBody>
          {invoices.length === 0
            ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'ინვოისები არ მოიძებნა'}</TableCell></TableRow>
            : invoices.map(inv => (
              <TableRow key={inv.id}>
                <TableCell className="font-mono text-sm">{inv.number}</TableCell>
                <TableCell><div>{inv.buyerName}</div><div className="text-xs text-muted-foreground">{inv.buyerTin}</div></TableCell>
                <TableCell className="text-sm">{inv.date}</TableCell>
                <TableCell className="font-medium">{inv.total?.toFixed(2)} ₾</TableCell>
                <TableCell><Badge variant="outline">{inv.statusTxt || inv.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={async () => { try { await deleteInvoice(inv.id); toast.success('წაიშალა'); load(); } catch (e: any) { toast.error(e.message); } }}><X className="h-3.5 w-3.5 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ============================================================
// Tab 5: Fiscal Shift & Receipts
// ============================================================
function FiscalTab() {
  const { shift, isLoading, openShift, closeShift } = useRsgeFiscalShift();
  const { config } = useRsgeConfig();
  const [cashierName, setCashierName] = useState('');
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);

  const loadReceipts = useCallback(async () => {
    setLoadingReceipts(true);
    try { setReceipts((await getFiscalReceipts())?.receipts || []); }
    catch { /* silent */ }
    finally { setLoadingReceipts(false); }
  }, []);

  useEffect(() => { loadReceipts(); }, [loadReceipts]);

  return (
    <div className="space-y-6">
      {config && !config.demo && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <AlertCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
          <p className="text-sm text-orange-700 dark:text-orange-300">
            <strong>Production რეჟიმი.</strong> ფისკალური ოპერაციები RS.GE-ზე გაიგზავნება რეალურად.
          </p>
        </div>
      )}

      {/* Shift status */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Clock className="h-5 w-5" />ფისკალური ცვლა</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : shift ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="font-medium text-green-600">ცვლა ღია</span>
                <span className="text-sm text-muted-foreground">— {shift.cashier_name}</span>
              </div>
              <p className="text-xs text-muted-foreground">გახსნილია: {new Date(shift.opened_at).toLocaleString('ka-GE')}</p>
              <p className="text-sm">გაყიდვები: <strong>{shift.total_sales}</strong> | ჯამი: <strong>{shift.total_amount?.toFixed(2)} ₾</strong></p>
              <Button variant="destructive" onClick={() => closeShift.mutate()} disabled={closeShift.isPending} size="sm">
                {closeShift.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}ცვლის დახურვა
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">ცვლა დახურულია. გახსნა მოლარის სახელით:</p>
              <div className="flex gap-2">
                <Input value={cashierName} onChange={e => setCashierName(e.target.value)} placeholder="მოლარის სახელი" className="max-w-xs" />
                <Button onClick={() => openShift.mutate(cashierName)} disabled={openShift.isPending || !cashierName}>
                  {openShift.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}ცვლის გახსნა
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Receipts list */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base flex items-center gap-2"><Receipt className="h-5 w-5" />ფისკალური ჩეკები</CardTitle>
            <Button variant="outline" size="sm" onClick={loadReceipts} disabled={loadingReceipts}><RefreshCw className={`h-4 w-4 mr-1 ${loadingReceipts ? 'animate-spin' : ''}`} />განახლება</Button>
          </div>
        </CardHeader>
        <CardContent>
          {receipts.length === 0
            ? <p className="text-center text-muted-foreground text-sm py-4">{loadingReceipts ? <Loader2 className="animate-spin h-4 w-4 mx-auto" /> : 'ჩეკები არ მოიძებნა'}</p>
            : <Table>
              <TableHeader><TableRow><TableHead>ნომერი</TableHead><TableHead>თარიღი</TableHead><TableHead>ჯამი</TableHead><TableHead>სტატუსი</TableHead></TableRow></TableHeader>
              <TableBody>{receipts.map((r, i) => (
                <TableRow key={r.id || i}>
                  <TableCell className="font-mono text-sm">{r.number}</TableCell>
                  <TableCell className="text-sm">{r.date ? new Date(r.date).toLocaleString('ka-GE') : '-'}</TableCell>
                  <TableCell>{r.total?.toFixed(2)} ₾</TableCell>
                  <TableCell><Badge variant={r.status === 'voided' ? 'destructive' : 'default'}>{r.status === 'voided' ? 'გაუქმებული' : 'დასრულებული'}</Badge></TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          }
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Tab 6: Tools
// ============================================================
function ToolsTab() {
  const [vatTin, setVatTin] = useState('');
  const [vatResult, setVatResult] = useState<{ name: string; isVatPayer: boolean } | null>(null);
  const [vatLoading, setVatLoading] = useState(false);
  const [bcCode, setBcCode] = useState('');
  const [bcResults, setBcResults] = useState<any[]>([]);
  const [bcLoading, setBcLoading] = useState(false);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4 space-y-3">
          <h3 className="font-medium">დღგ-ს გადამხდელის შემოწმება</h3>
          <div className="flex gap-2">
            <Input value={vatTin} onChange={e => setVatTin(e.target.value)} placeholder="საიდენტიფიკაციო" className="max-w-xs" />
            <Button variant="outline" disabled={vatLoading} onClick={async () => { setVatLoading(true); try { setVatResult(await checkVatPayer(vatTin)); } catch (e: any) { toast.error(e.message); } finally { setVatLoading(false); } }}>
              {vatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'შემოწმება'}
            </Button>
          </div>
          {vatResult && <div className="p-3 rounded-lg bg-muted/30"><p className="font-medium">{vatResult.name}</p><Badge variant={vatResult.isVatPayer ? 'default' : 'secondary'}>{vatResult.isVatPayer ? 'დღგ-ს გადამხდელია' : 'არ არის'}</Badge></div>}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 space-y-3">
          <h3 className="font-medium">ბარკოდის ძებნა RS.GE-ზე</h3>
          <div className="flex gap-2">
            <Input value={bcCode} onChange={e => setBcCode(e.target.value)} placeholder="ბარკოდი" className="max-w-xs" />
            <Button variant="outline" disabled={bcLoading} onClick={async () => { setBcLoading(true); try { setBcResults((await getBarCodes(bcCode))?.results || []); } catch (e: any) { toast.error(e.message); } finally { setBcLoading(false); } }}>
              {bcLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'ძებნა'}
            </Button>
          </div>
          {bcResults.length > 0 && <Table><TableHeader><TableRow><TableHead>სახელი</TableHead><TableHead>ბარკოდი</TableHead><TableHead>ერთეული</TableHead></TableRow></TableHeader><TableBody>{bcResults.map((r, i) => <TableRow key={i}><TableCell>{r.name}</TableCell><TableCell className="font-mono">{r.barCode}</TableCell><TableCell>{r.unitName}</TableCell></TableRow>)}</TableBody></Table>}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Tab 7: Audit Log
// ============================================================
function AuditTab() {
  const { data: logs = [], isLoading, refetch } = useRsgeAuditLogs(100);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">გაგზავნილი დოკუმენტების ლოგი</h3>
        <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-1" />განახლება</Button>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>მოქმ.</TableHead><TableHead>ტიპი</TableHead><TableHead>ID</TableHead><TableHead>სტატუსი</TableHead><TableHead>Demo</TableHead><TableHead>თარიღი</TableHead></TableRow></TableHeader>
        <TableBody>
          {isLoading
            ? <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
            : logs.length === 0
              ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">ლოგი ცარიელია</TableCell></TableRow>
              : logs.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs">{log.action}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{log.document_type}</Badge></TableCell>
                  <TableCell className="text-xs font-mono">{log.document_id || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                      {log.status === 'success' ? 'OK' : 'შეცდომა'}
                    </Badge>
                    {log.error_message && <p className="text-xs text-destructive mt-1 max-w-xs truncate">{log.error_message}</p>}
                  </TableCell>
                  <TableCell>{log.demo_mode ? <Badge variant="outline" className="text-orange-500 border-orange-500 text-xs">Demo</Badge> : <Badge variant="secondary" className="text-xs">Real</Badge>}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString('ka-GE')}</TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ============================================================
// Main Page
// ============================================================
export default function RSGEPage() {
  const { config, isLoading } = useRsgeConfig();

  return (
    <PageTransition>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">RS.GE ინტეგრაცია</h1>
            <p className="text-sm text-muted-foreground">ზედნადებები, ინვოისები, ფისკალიზაცია</p>
          </div>
          <div className="flex items-center gap-2">
            {config && (
              <Badge variant={config.demo ? 'outline' : 'default'} className={config.demo ? 'text-orange-500 border-orange-500' : 'bg-green-600'}>
                {config.demo ? 'Demo Mode' : 'Production'}
              </Badge>
            )}
            {config?.company_name && <Badge variant="secondary"><Building2 className="h-3 w-3 mr-1" />{config.company_name}</Badge>}
          </div>
        </div>

        <Tabs defaultValue="settings">
          <TabsList className="flex-wrap gap-1 h-auto">
            <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-1" />პარამეტრები</TabsTrigger>
            <TabsTrigger value="waybills"><Truck className="h-4 w-4 mr-1" />ზედნადებები</TabsTrigger>
            <TabsTrigger value="buyer-waybills"><Download className="h-4 w-4 mr-1" />შემომავალი</TabsTrigger>
            <TabsTrigger value="invoices"><FileText className="h-4 w-4 mr-1" />ინვოისები</TabsTrigger>
            <TabsTrigger value="fiscal"><Receipt className="h-4 w-4 mr-1" />ფისკალური</TabsTrigger>
            <TabsTrigger value="tools"><BarChart2 className="h-4 w-4 mr-1" />ხელსაწყოები</TabsTrigger>
            <TabsTrigger value="audit"><History className="h-4 w-4 mr-1" />ლოგი</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="mt-4"><div className="stat-card"><SettingsTab /></div></TabsContent>
          <TabsContent value="waybills" className="mt-4"><div className="stat-card"><WaybillsTab /></div></TabsContent>
          <TabsContent value="buyer-waybills" className="mt-4"><div className="stat-card"><WaybillsTab isBuyer /></div></TabsContent>
          <TabsContent value="invoices" className="mt-4"><div className="stat-card"><InvoicesTab /></div></TabsContent>
          <TabsContent value="fiscal" className="mt-4"><FiscalTab /></TabsContent>
          <TabsContent value="tools" className="mt-4"><ToolsTab /></TabsContent>
          <TabsContent value="audit" className="mt-4"><div className="stat-card"><AuditTab /></div></TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
}
