import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { usePricingStore, TIER_LABELS, type PriceTier } from '@/stores/usePricingStore';
import { useProducts } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PricingPage() {
  const { priceRules, coupons, loyaltyMembers, addPriceRule, deletePriceRule, addCoupon, deleteCoupon } = usePricingStore();
  const { products } = useProducts();
  const [ruleDialog, setRuleDialog] = useState(false);
  const [couponDialog, setCouponDialog] = useState(false);
  const [ruleForm, setRuleForm] = useState({ productId: '', tier: 'retail' as PriceTier, price: '', minQuantity: '1' });
  const [couponForm, setCouponForm] = useState({ code: '', discountType: 'percent' as 'percent' | 'fixed', discountValue: '', minPurchase: '0', expiresAt: '', usageLimit: '100' });

  const handleAddRule = () => {
    const product = products.find((p) => p.id === ruleForm.productId);
    if (!product) { toast.error('აირჩიეთ პროდუქტი'); return; }
    addPriceRule({
      productId: ruleForm.productId,
      productName: product.name,
      tier: ruleForm.tier,
      price: parseFloat(ruleForm.price) || 0,
      minQuantity: parseInt(ruleForm.minQuantity) || 1,
    });
    setRuleDialog(false);
    setRuleForm({ productId: '', tier: 'retail', price: '', minQuantity: '1' });
    toast.success('ფასის წესი დაემატა');
  };

  const handleAddCoupon = () => {
    if (!couponForm.code) { toast.error('შეიყვანეთ კოდი'); return; }
    addCoupon({
      code: couponForm.code,
      discountType: couponForm.discountType,
      discountValue: parseFloat(couponForm.discountValue) || 0,
      minPurchase: parseFloat(couponForm.minPurchase) || 0,
      expiresAt: couponForm.expiresAt,
      usageLimit: parseInt(couponForm.usageLimit) || 100,
      isActive: true,
    });
    setCouponDialog(false);
    setCouponForm({ code: '', discountType: 'percent', discountValue: '', minPurchase: '0', expiresAt: '', usageLimit: '100' });
    toast.success('კუპონი დაემატა');
  };

  return (
    <PageTransition>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">ფასები & ლოიალობა</h1>
        <Tabs defaultValue="rules">
          <TabsList>
            <TabsTrigger value="rules">ფასის წესები</TabsTrigger>
            <TabsTrigger value="loyalty">ლოიალობა</TabsTrigger>
            <TabsTrigger value="coupons">კუპონები</TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="space-y-4 mt-4">
            <Button onClick={() => setRuleDialog(true)}><Plus className="mr-2 h-4 w-4" />ახალი წესი</Button>
            <div className="stat-card">
              <Table>
                <TableHeader><TableRow><TableHead>პროდუქტი</TableHead><TableHead>ტიერი</TableHead><TableHead>ფასი</TableHead><TableHead>მინ. რაოდ.</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {priceRules.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">წესები არ არის</TableCell></TableRow>
                  ) : priceRules.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.productName}</TableCell>
                      <TableCell><Badge variant="secondary">{TIER_LABELS[r.tier]}</Badge></TableCell>
                      <TableCell>₾{r.price.toFixed(2)}</TableCell>
                      <TableCell>{r.minQuantity}</TableCell>
                      <TableCell><Button variant="ghost" className="text-destructive h-8 w-8 p-0" onClick={() => deletePriceRule(r.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="loyalty" className="mt-4">
            <div className="stat-card">
              <div className="grid grid-cols-3 gap-4 mb-6">
                {(Object.entries(TIER_LABELS) as [PriceTier, string][]).map(([key, label]) => (
                  <div key={key} className="p-4 rounded-lg bg-muted/30 text-center">
                    <p className="font-semibold">{label}</p>
                    <p className="text-xs text-muted-foreground mt-1">100 ქულა = ₾1</p>
                  </div>
                ))}
              </div>
              {loyaltyMembers.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-4">წევრები არ არის</p>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>კლიენტი</TableHead><TableHead>ტიერი</TableHead><TableHead>ქულები</TableHead><TableHead>ჯამი ხარჯი</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {loyaltyMembers.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.clientName}</TableCell>
                        <TableCell><Badge variant="secondary">{TIER_LABELS[m.tier]}</Badge></TableCell>
                        <TableCell>{m.points}</TableCell>
                        <TableCell>₾{m.totalSpent.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          <TabsContent value="coupons" className="space-y-4 mt-4">
            <Button onClick={() => setCouponDialog(true)}><Plus className="mr-2 h-4 w-4" />ახალი კუპონი</Button>
            <div className="stat-card">
              <Table>
                <TableHeader><TableRow><TableHead>კოდი</TableHead><TableHead>ტიპი</TableHead><TableHead>მნიშვნელობა</TableHead><TableHead>მინ. შენაძენი</TableHead><TableHead>ვადა</TableHead><TableHead>გამოყენება</TableHead><TableHead>აქტიური</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {coupons.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">კუპონები არ არის</TableCell></TableRow>
                  ) : coupons.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono font-bold">{c.code}</TableCell>
                      <TableCell>{c.discountType === 'percent' ? 'პროცენტული' : 'ფიქსირებული'}</TableCell>
                      <TableCell>{c.discountType === 'percent' ? `${c.discountValue}%` : `₾${c.discountValue}`}</TableCell>
                      <TableCell>₾{c.minPurchase}</TableCell>
                      <TableCell className="text-xs">{c.expiresAt}</TableCell>
                      <TableCell>{c.usedCount}/{c.usageLimit}</TableCell>
                      <TableCell><Badge variant={c.isActive ? 'default' : 'secondary'}>{c.isActive ? 'კი' : 'არა'}</Badge></TableCell>
                      <TableCell><Button variant="ghost" className="text-destructive h-8 w-8 p-0" onClick={() => deleteCoupon(c.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={ruleDialog} onOpenChange={setRuleDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>ახალი ფასის წესი</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>პროდუქტი</Label>
              <Select value={ruleForm.productId} onValueChange={(v) => setRuleForm({ ...ruleForm, productId: v })}>
                <SelectTrigger><SelectValue placeholder="აირჩიეთ პროდუქტი" /></SelectTrigger>
                <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>ტიერი</Label>
              <Select value={ruleForm.tier} onValueChange={(v) => setRuleForm({ ...ruleForm, tier: v as PriceTier })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.entries(TIER_LABELS) as [PriceTier, string][]).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>ფასი</Label><Input type="number" value={ruleForm.price} onChange={(e) => setRuleForm({ ...ruleForm, price: e.target.value })} /></div>
              <div className="space-y-1"><Label>მინ. რაოდენობა</Label><Input type="number" value={ruleForm.minQuantity} onChange={(e) => setRuleForm({ ...ruleForm, minQuantity: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleAddRule} variant="default" size="default">დამატება</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={couponDialog} onOpenChange={setCouponDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>ახალი კუპონი</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1"><Label>კოდი</Label><Input value={couponForm.code} onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>ტიპი</Label><Select value={couponForm.discountType} onValueChange={(v: any) => setCouponForm({ ...couponForm, discountType: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percent">პროცენტული</SelectItem><SelectItem value="fixed">ფიქსირებული</SelectItem></SelectContent></Select></div>
              <div className="space-y-1"><Label>მნიშვნელობა</Label><Input type="number" value={couponForm.discountValue} onChange={(e) => setCouponForm({ ...couponForm, discountValue: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label>მინ. შენაძენი</Label><Input type="number" value={couponForm.minPurchase} onChange={(e) => setCouponForm({ ...couponForm, minPurchase: e.target.value })} /></div>
              <div className="space-y-1"><Label>ვადა</Label><Input type="date" value={couponForm.expiresAt} onChange={(e) => setCouponForm({ ...couponForm, expiresAt: e.target.value })} /></div>
              <div className="space-y-1"><Label>ლიმიტი</Label><Input type="number" value={couponForm.usageLimit} onChange={(e) => setCouponForm({ ...couponForm, usageLimit: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleAddCoupon} variant="default" size="default">დამატება</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
