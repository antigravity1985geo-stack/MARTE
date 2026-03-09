import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Calculator, Building, TrendingDown, Package } from 'lucide-react';
import { toast } from 'sonner';

interface FixedAsset {
  id: string;
  name: string;
  category: string;
  purchaseDate: string;
  purchasePrice: number;
  usefulLife: number; // months
  depreciationMethod: 'straight_line' | 'declining_balance';
  residualValue: number;
  accumulatedDepreciation: number;
  currentValue: number;
  status: 'active' | 'disposed' | 'fully_depreciated';
}

const categoryLabels: Record<string, string> = {
  building: 'შენობა-ნაგებობა',
  vehicle: 'სატრანსპორტო',
  equipment: 'აღჭურვილობა',
  furniture: 'ავეჯი',
  computer: 'კომპიუტერული ტექნიკა',
  other: 'სხვა',
};

export default function FixedAssetsPage() {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<{ name: string; category: string; purchaseDate: string; purchasePrice: string; usefulLife: string; depreciationMethod: 'straight_line' | 'declining_balance'; residualValue: string }>({
    name: '', category: 'equipment', purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: '', usefulLife: '60', depreciationMethod: 'straight_line', residualValue: '0',
  });

  const handleAdd = () => {
    if (!form.name || !form.purchasePrice) { toast.error('შეავსეთ ყველა ველი'); return; }
    const price = parseFloat(form.purchasePrice);
    const residual = parseFloat(form.residualValue) || 0;
    setAssets(prev => [...prev, {
      id: crypto.randomUUID(),
      name: form.name,
      category: form.category,
      purchaseDate: form.purchaseDate,
      purchasePrice: price,
      usefulLife: parseInt(form.usefulLife),
      depreciationMethod: form.depreciationMethod,
      residualValue: residual,
      accumulatedDepreciation: 0,
      currentValue: price,
      status: 'active',
    }]);
    setDialogOpen(false);
    setForm({ name: '', category: 'equipment', purchaseDate: new Date().toISOString().split('T')[0], purchasePrice: '', usefulLife: '60', depreciationMethod: 'straight_line', residualValue: '0' });
    toast.success('ძირითადი საშუალება დაემატა');
  };

  const handleDepreciation = () => {
    let count = 0;
    setAssets(prev => prev.map(asset => {
      if (asset.status !== 'active') return asset;
      const depreciableAmount = asset.purchasePrice - asset.residualValue;
      let monthlyDep: number;

      if (asset.depreciationMethod === 'straight_line') {
        monthlyDep = depreciableAmount / asset.usefulLife;
      } else {
        const rate = 2 / asset.usefulLife;
        monthlyDep = asset.currentValue * rate;
      }

      const newAccumulated = Math.min(asset.accumulatedDepreciation + monthlyDep, depreciableAmount);
      const newValue = asset.purchasePrice - newAccumulated;
      const isFullyDepreciated = newAccumulated >= depreciableAmount;
      count++;

      return {
        ...asset,
        accumulatedDepreciation: newAccumulated,
        currentValue: Math.max(newValue, asset.residualValue),
        status: isFullyDepreciated ? 'fully_depreciated' as const : 'active' as const,
      };
    }));
    toast.success(`${count} აქტივზე ცვეთა დაერიცხა`);
  };

  const handleDispose = (id: string) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, status: 'disposed' as const } : a));
    toast.success('აქტივი ჩამოიწერა');
  };

  const totalPurchase = assets.reduce((s, a) => s + a.purchasePrice, 0);
  const totalCurrent = assets.reduce((s, a) => s + a.currentValue, 0);
  const totalDepreciation = assets.reduce((s, a) => s + a.accumulatedDepreciation, 0);

  return (
    <PageTransition>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold">ძირითადი საშუალებები</h1>
          <div className="flex gap-2">
            <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />ახალი აქტივი</Button>
            <Button variant="outline" onClick={handleDepreciation} disabled={assets.filter(a => a.status === 'active').length === 0}>
              <TrendingDown className="mr-2 h-4 w-4" />ცვეთის დარიცხვა
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Package className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">სულ აქტივები</p><p className="text-xl font-bold">{assets.length}</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Building className="h-5 w-5 text-success" /><div><p className="text-xs text-muted-foreground">საწყისი ღირებულება</p><p className="text-xl font-bold">₾{totalPurchase.toFixed(0)}</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2"><TrendingDown className="h-5 w-5 text-warning" /><div><p className="text-xs text-muted-foreground">დაგროვილი ცვეთა</p><p className="text-xl font-bold">₾{totalDepreciation.toFixed(0)}</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Calculator className="h-5 w-5 text-info" /><div><p className="text-xs text-muted-foreground">მიმდინარე ღირებ.</p><p className="text-xl font-bold">₾{totalCurrent.toFixed(0)}</p></div></div></CardContent></Card>
        </div>

        <div className="stat-card overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>დასახელება</TableHead>
                <TableHead>კატეგორია</TableHead>
                <TableHead>შეძენის თარიღი</TableHead>
                <TableHead className="text-right">საწყისი ღირ.</TableHead>
                <TableHead className="text-right">ცვეთა</TableHead>
                <TableHead className="text-right">მიმდინარე</TableHead>
                <TableHead>მეთოდი</TableHead>
                <TableHead>სტატუსი</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">ძირითადი საშუალებები არ არის</TableCell></TableRow>
              ) : assets.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell>{categoryLabels[a.category]}</TableCell>
                  <TableCell className="text-sm">{a.purchaseDate}</TableCell>
                  <TableCell className="text-right">₾{a.purchasePrice.toFixed(0)}</TableCell>
                  <TableCell className="text-right text-destructive">₾{a.accumulatedDepreciation.toFixed(0)}</TableCell>
                  <TableCell className="text-right font-semibold">₾{a.currentValue.toFixed(0)}</TableCell>
                  <TableCell className="text-xs">{a.depreciationMethod === 'straight_line' ? 'წრფივი' : 'კლებადი'}</TableCell>
                  <TableCell>
                    <Badge variant={a.status === 'active' ? 'default' : a.status === 'fully_depreciated' ? 'secondary' : 'destructive'}>
                      {a.status === 'active' ? 'აქტიური' : a.status === 'fully_depreciated' ? 'სრულად ცვეთილი' : 'ჩამოწერილი'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {a.status === 'active' && (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDispose(a.id)}>ჩამოწერა</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>ახალი ძირითადი საშუალება</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1"><Label>დასახელება</Label><Input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>კატეგორია</Label>
                <Select value={form.category} onValueChange={v => setForm(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>შეძენის თარიღი</Label><Input type="date" value={form.purchaseDate} onChange={e => setForm(prev => ({ ...prev, purchaseDate: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>შეძენის ფასი (₾)</Label><Input type="number" value={form.purchasePrice} onChange={e => setForm(prev => ({ ...prev, purchasePrice: e.target.value }))} /></div>
              <div className="space-y-1"><Label>ნარჩენი ღირებულება (₾)</Label><Input type="number" value={form.residualValue} onChange={e => setForm(prev => ({ ...prev, residualValue: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>სასარგებლო ვადა (თვე)</Label><Input type="number" value={form.usefulLife} onChange={e => setForm(prev => ({ ...prev, usefulLife: e.target.value }))} /></div>
              <div className="space-y-1">
                <Label>ცვეთის მეთოდი</Label>
                <Select value={form.depreciationMethod} onValueChange={v => setForm(prev => ({ ...prev, depreciationMethod: v as 'straight_line' | 'declining_balance' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="straight_line">წრფივი</SelectItem>
                    <SelectItem value="declining_balance">კლებადი ნაშთი</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleAdd}>დამატება</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
