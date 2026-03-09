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
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  getRsgeConfig, saveRsgeConfig, RsgeConfig, RsgeWaybill,
  getWaybills, getWaybillTypes, getWaybillUnits, getTransportTypes,
  saveWaybill, sendWaybill, closeWaybill, deleteWaybill,
  getCompanyInfo, checkVatPayer, getBarCodes, whatIsMyIp,
  WaybillType, WaybillUnit, TransportType, CompanyInfo, getWaybillGoodsList,
} from '@/lib/rsge';
import { useTransactions } from '@/hooks/useTransactions';
import { useProducts } from '@/hooks/useProducts';
import { Settings, RefreshCw, Plus, Send, X, CheckCircle, Truck, FileText, Building2, Loader2, Download } from 'lucide-react';

// კონფიგურაციის კომპონენტი
function RsgeSettings({ config, onSave }: { config: RsgeConfig; onSave: (c: RsgeConfig) => void }) {
  const [form, setForm] = useState(config);
  const [testing, setTesting] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);

  const testConnection = async () => {
    setTesting(true);
    try {
      saveRsgeConfig(form);
      const info = await getCompanyInfo();
      setCompanyInfo(info);
      toast.success(`კავშირი წარმატებულია! კომპანია: ${info.name}`);
    } catch (err: any) {
      toast.error(`კავშირის შეცდომა: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>სერვის მომხმარებელი (su)</Label>
          <Input value={form.su} onChange={e => setForm({ ...form, su: e.target.value })} placeholder="სერვის მომხმარებლის სახელი" />
        </div>
        <div className="space-y-2">
          <Label>სერვის პაროლი (sp)</Label>
          <Input type="password" value={form.sp} onChange={e => setForm({ ...form, sp: e.target.value })} placeholder="სერვის პაროლი" />
        </div>
        <div className="space-y-2">
          <Label>კომპანიის საიდენტიფიკაციო (TIN)</Label>
          <Input value={form.companyTin} onChange={e => setForm({ ...form, companyTin: e.target.value })} placeholder="000000000" />
        </div>
        <div className="space-y-2">
          <Label>კომპანიის სახელი</Label>
          <Input value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} placeholder="შპს სახელი" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={form.demo} onCheckedChange={v => setForm({ ...form, demo: v })} />
        <Label>სატესტო რეჟიმი (Demo)</Label>
      </div>

      {companyInfo && (
        <div className="p-3 rounded-lg bg-muted/30 space-y-1">
          <p className="text-sm font-medium"><Building2 className="inline h-4 w-4 mr-1" />{companyInfo.name}</p>
          <p className="text-xs text-muted-foreground">TIN: {companyInfo.tin} | მისამართი: {companyInfo.address}</p>
          <p className="text-xs text-muted-foreground">დირექტორი: {companyInfo.director} | დღგ: {companyInfo.isVatPayer ? 'კი' : 'არა'}</p>
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={testConnection} variant="outline" disabled={testing}>
          {testing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Settings className="h-4 w-4 mr-1" />}
          კავშირის ტესტი
        </Button>
        <Button onClick={() => { saveRsgeConfig(form); onSave(form); toast.success('კონფიგურაცია შენახულია'); }}>
          შენახვა
        </Button>
      </div>
    </div>
  );
}

// ზედნადებების ტაბი
function WaybillsTab({ config }: { config: RsgeConfig }) {
  const { products } = useProducts();
  const { addTransaction } = useTransactions();
  const [waybills, setWaybills] = useState<RsgeWaybill[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [types, setTypes] = useState<WaybillType[]>([]);
  const [units, setUnits] = useState<WaybillUnit[]>([]);
  const [transTypes, setTransTypes] = useState<TransportType[]>([]);

  const handleImportToInventory = async (w: RsgeWaybill) => {
    setImporting(w.id);
    try {
      const goodsResult = await getWaybillGoodsList(w.id);
      const goods = goodsResult?.goods || [];
      if (goods.length === 0) throw new Error('ზედნადებში საქონელი არ მოიძებნა');

      const items = goods.map((g: any) => {
        // Try to find product by barcode or name
        const product = products.find(p => p.barcode === g.barCode) ||
          products.find(p => p.name.toLowerCase() === g.name.toLowerCase());

        if (!product) throw new Error(`პროდუქტი "${g.name}" ვერ მოიძებნა საწყობში. ჯერ დაამატეთ პროდუქტი.`);

        return {
          product_id: product.id,
          name: product.name,
          price: g.price,
          quantity: g.quantity
        };
      });

      await addTransaction.mutateAsync({
        type: 'purchase', // Incoming stock is a purchase/receival
        supplier_name: w.sellerName || 'RS.GE მომწოდებელი',
        total: w.total,
        date: new Date().toISOString(),
        status: 'completed',
        items
      });

      toast.success(`ზედნადები #${w.number} წარმატებით აისახა საწყობში!`);
    } catch (err: any) {
      toast.error(`იმპორტის შეცდომა: ${err.message}`);
    } finally {
      setImporting(null);
    }
  };

  const [newWaybill, setNewWaybill] = useState({
    waybill_type: '1',
    buyer_tin: '',
    start_address: '',
    end_address: '',
    driver_tin: '',
    transport_type_id: '1',
    car_number: '',
    comment: '',
    goods_list: [] as { name: string; unitId: string; quantity: string; price: string }[],
  });

  const loadWaybills = useCallback(async () => {
    if (!config.su) return;
    setLoading(true);
    try {
      const result = await getWaybills();
      setWaybills(result?.waybills || []);
    } catch (err: any) {
      toast.error(`შეცდომა: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [config.su]);

  const loadMeta = useCallback(async () => {
    if (!config.su) return;
    try {
      const [t, u, tr] = await Promise.all([getWaybillTypes(), getWaybillUnits(), getTransportTypes()]);
      setTypes(t?.types || []);
      setUnits(u?.units || []);
      setTransTypes(tr?.types || []);
    } catch (err: any) {
      console.error('Meta load error:', err);
    }
  }, [config.su]);

  useEffect(() => { loadWaybills(); loadMeta(); }, [loadWaybills, loadMeta]);

  const handleCreate = async () => {
    try {
      const result = await saveWaybill(newWaybill);
      toast.success(`ზედნადები შეიქმნა: ${result?.waybillId}`);
      setShowCreate(false);
      loadWaybills();
    } catch (err: any) {
      toast.error(`შეცდომა: ${err.message}`);
    }
  };

  const handleSend = async (id: string) => {
    try {
      await sendWaybill(id);
      toast.success('ზედნადები გაგზავნილია');
      loadWaybills();
    } catch (err: any) {
      toast.error(`შეცდომა: ${err.message}`);
    }
  };

  const handleClose = async (id: string) => {
    try {
      await closeWaybill(id);
      toast.success('ზედნადები დახურულია');
      loadWaybills();
    } catch (err: any) {
      toast.error(`შეცდომა: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteWaybill(id);
      toast.success('ზედნადები წაიშალა');
      loadWaybills();
    } catch (err: any) {
      toast.error(`შეცდომა: ${err.message}`);
    }
  };

  const addGoodsItem = () => {
    setNewWaybill(prev => ({
      ...prev,
      goods_list: [...prev.goods_list, { name: '', unitId: '99', quantity: '1', price: '0' }],
    }));
  };

  const statusBadge = (status: number) => {
    const map: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      0: { label: 'დაუდასტურებელი', variant: 'outline' },
      1: { label: 'აქტიური', variant: 'default' },
      2: { label: 'დახურული', variant: 'secondary' },
      [-2]: { label: 'წაშლილი', variant: 'destructive' },
    };
    const s = map[status] || { label: `სტატუსი ${status}`, variant: 'outline' as const };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  if (!config.su) {
    return <p className="text-center text-muted-foreground py-8">ჯერ შეავსეთ RS.GE კონფიგურაცია "პარამეტრები" ტაბში.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">ზედნადებები</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadWaybills} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />განახლება
          </Button>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />ახალი</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle>ახალი ზედნადები</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">ტიპი</Label>
                    <Select value={newWaybill.waybill_type} onValueChange={v => setNewWaybill(p => ({ ...p, waybill_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {types.length > 0 ? types.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>) : (
                          <>
                            <SelectItem value="1">შიდა გადაზიდვა</SelectItem>
                            <SelectItem value="2">შიდა (სხვისი ტრანსპ.)</SelectItem>
                            <SelectItem value="3">საერთაშორისო</SelectItem>
                            <SelectItem value="4">ერთჯერადი</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">მყიდველის TIN</Label>
                    <Input value={newWaybill.buyer_tin} onChange={e => setNewWaybill(p => ({ ...p, buyer_tin: e.target.value }))} placeholder="000000000" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">საწყისი მისამართი</Label>
                    <Input value={newWaybill.start_address} onChange={e => setNewWaybill(p => ({ ...p, start_address: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">საბოლოო მისამართი</Label>
                    <Input value={newWaybill.end_address} onChange={e => setNewWaybill(p => ({ ...p, end_address: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">მძღოლის TIN</Label>
                    <Input value={newWaybill.driver_tin} onChange={e => setNewWaybill(p => ({ ...p, driver_tin: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">ავტომობილის ნომერი</Label>
                    <Input value={newWaybill.car_number} onChange={e => setNewWaybill(p => ({ ...p, car_number: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">კომენტარი</Label>
                  <Input value={newWaybill.comment} onChange={e => setNewWaybill(p => ({ ...p, comment: e.target.value }))} />
                </div>

                {/* საქონლის სია */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>საქონელი</Label>
                    <Button variant="outline" size="sm" onClick={addGoodsItem}><Plus className="h-3 w-3 mr-1" />დამატება</Button>
                  </div>
                  {newWaybill.goods_list.map((item, i) => (
                    <div key={i} className="grid grid-cols-5 gap-2 items-end">
                      <div>
                        <Label className="text-xs">სახელი</Label>
                        <Input value={item.name} onChange={e => {
                          const list = [...newWaybill.goods_list];
                          list[i] = { ...list[i], name: e.target.value };
                          setNewWaybill(p => ({ ...p, goods_list: list }));
                        }} />
                      </div>
                      <div>
                        <Label className="text-xs">ერთეული</Label>
                        <Select value={item.unitId} onValueChange={v => {
                          const list = [...newWaybill.goods_list];
                          list[i] = { ...list[i], unitId: v };
                          setNewWaybill(p => ({ ...p, goods_list: list }));
                        }}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {units.length > 0 ? units.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>) : (
                              <>
                                <SelectItem value="99">ცალი</SelectItem>
                                <SelectItem value="1">კგ</SelectItem>
                                <SelectItem value="2">ლიტრი</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">რაოდენობა</Label>
                        <Input type="number" value={item.quantity} onChange={e => {
                          const list = [...newWaybill.goods_list];
                          list[i] = { ...list[i], quantity: e.target.value };
                          setNewWaybill(p => ({ ...p, goods_list: list }));
                        }} />
                      </div>
                      <div>
                        <Label className="text-xs">ფასი</Label>
                        <Input type="number" value={item.price} onChange={e => {
                          const list = [...newWaybill.goods_list];
                          list[i] = { ...list[i], price: e.target.value };
                          setNewWaybill(p => ({ ...p, goods_list: list }));
                        }} />
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => {
                        setNewWaybill(p => ({ ...p, goods_list: p.goods_list.filter((_, idx) => idx !== i) }));
                      }}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button onClick={handleCreate} className="w-full">
                  <FileText className="h-4 w-4 mr-1" />შექმნა
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ნომერი</TableHead>
            <TableHead>ტიპი</TableHead>
            <TableHead>მყიდველი</TableHead>
            <TableHead>თარიღი</TableHead>
            <TableHead>ჯამი</TableHead>
            <TableHead>სტატუსი</TableHead>
            <TableHead className="text-right">მოქმედება</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {waybills.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                {loading ? 'იტვირთება...' : 'ზედნადებები არ მოიძებნა'}
              </TableCell>
            </TableRow>
          ) : (
            waybills.map(w => (
              <TableRow key={w.id || w.number}>
                <TableCell className="font-mono text-sm">{w.number}</TableCell>
                <TableCell>{w.typeName}</TableCell>
                <TableCell>
                  <div>{w.buyerName}</div>
                  <div className="text-xs text-muted-foreground">{w.buyerTin}</div>
                </TableCell>
                <TableCell className="text-sm">{w.createDate}</TableCell>
                <TableCell>{w.total?.toFixed(2)} ₾</TableCell>
                <TableCell>{statusBadge(w.status)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleImportToInventory(w)}
                      disabled={importing === w.id}
                      className="text-primary hover:text-primary hover:bg-primary/10"
                      title="საწყობში ასახვა"
                    >
                      {importing === w.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    </Button>
                    {w.status === 0 && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => handleSend(w.id)} title="გაგზავნა">
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(w.id)} title="წაშლა">
                          <X className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </>
                    )}
                    {w.status === 1 && (
                      <Button variant="ghost" size="sm" onClick={() => handleClose(w.id)} title="დახურვა">
                        <CheckCircle className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// დღგ-ს შემოწმების კომპონენტი
function VatChecker() {
  const [tin, setTin] = useState('');
  const [result, setResult] = useState<{ name: string; isVatPayer: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  const check = async () => {
    if (!tin) return;
    setLoading(true);
    try {
      const res = await checkVatPayer(tin);
      setResult(res);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="font-medium">დღგ-ს გადამხდელის შემოწმება</h3>
      <div className="flex gap-2">
        <Input value={tin} onChange={e => setTin(e.target.value)} placeholder="საიდენტიფიკაციო ნომერი" className="max-w-xs" />
        <Button onClick={check} disabled={loading} variant="outline">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'შემოწმება'}
        </Button>
      </div>
      {result && (
        <div className="p-3 rounded-lg bg-muted/30">
          <p className="font-medium">{result.name}</p>
          <Badge variant={result.isVatPayer ? 'default' : 'secondary'}>
            {result.isVatPayer ? 'დღგ-ს გადამხდელია' : 'არ არის დღგ-ს გადამხდელი'}
          </Badge>
        </div>
      )}
    </div>
  );
}

// ბარკოდის ძებნა
function BarCodeSearch() {
  const [code, setCode] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!code) return;
    setLoading(true);
    try {
      const res = await getBarCodes(code);
      setResults(res?.results || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="font-medium">ბარკოდის ძებნა (RS.GE)</h3>
      <div className="flex gap-2">
        <Input value={code} onChange={e => setCode(e.target.value)} placeholder="ბარკოდი" className="max-w-xs" />
        <Button onClick={search} disabled={loading} variant="outline">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'ძებნა'}
        </Button>
      </div>
      {results.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow><TableHead>სახელი</TableHead><TableHead>ბარკოდი</TableHead><TableHead>ერთეული</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {results.map((r, i) => (
              <TableRow key={i}><TableCell>{r.name}</TableCell><TableCell className="font-mono">{r.barCode}</TableCell><TableCell>{r.unitName}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export default function RSGEPage() {
  const [config, setConfig] = useState<RsgeConfig>(getRsgeConfig());

  return (
    <PageTransition>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">RS.GE ინტეგრაცია</h1>
          {config.demo && <Badge variant="outline" className="text-orange-500 border-orange-500">სატესტო რეჟიმი</Badge>}
        </div>

        <Tabs defaultValue="settings">
          <TabsList className="flex-wrap">
            <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-1" />პარამეტრები</TabsTrigger>
            <TabsTrigger value="waybills"><Truck className="h-4 w-4 mr-1" />ზედნადებები</TabsTrigger>
            <TabsTrigger value="tools"><FileText className="h-4 w-4 mr-1" />ხელსაწყოები</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="mt-4">
            <div className="stat-card">
              <h2 className="text-lg font-semibold mb-4">RS.GE API კონფიგურაცია</h2>
              <p className="text-sm text-muted-foreground mb-4">
                შეიყვანეთ RS.GE სერვისის კრედენციალები. სერვის მომხმარებელი და პაროლი მიიღება RS.GE პორტალიდან
                (ჩემი გვერდი → სერვისები → ვებ-სერვისი).
              </p>
              <RsgeSettings config={config} onSave={setConfig} />
            </div>
          </TabsContent>

          <TabsContent value="waybills" className="mt-4">
            <div className="stat-card">
              <WaybillsTab config={config} />
            </div>
          </TabsContent>

          <TabsContent value="tools" className="mt-4">
            <div className="space-y-4">
              <div className="stat-card"><VatChecker /></div>
              <div className="stat-card"><BarCodeSearch /></div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
}
