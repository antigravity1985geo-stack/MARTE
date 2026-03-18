import { useState, useCallback } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { useProducts } from '@/hooks/useProducts';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useAccounting } from '@/hooks/useAccounting';
import { useHardwareScanner } from '@/hooks/useHardwareScanner';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ScanLine, Search, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { BarcodeDisplay } from '@/components/BarcodeDisplay';
import { useAuthStore } from '@/stores/useAuthStore';

export default function ReceivingPage() {
  const { products, isLoading: productsLoading } = useProducts();
  const { suppliers, isLoading: suppliersLoading } = useSuppliers();
  const { addEntry } = useAccounting();
  const queryClient = useQueryClient();
  const { activeTenantId } = useAuthStore();
  
  const [supplierId, setSupplierId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: receivings = [], isLoading: historyLoading } = useQuery({
    queryKey: ['product_receivings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_receivings')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!activeTenantId,
  });

  const handleBarcodeFound = useCallback((code: string) => {
    const product = products.find((p) => p.barcode === code);
    if (product) {
      setProductId(product.id);
      setPrice(String(product.buy_price));
      setBarcodeInput(code);
      toast.success(`პროდუქტი ამოიცნო: ${product.name}`, {
        description: `ფასი: ₾${product.buy_price.toFixed(2)} | მარაგი: ${product.stock} ${product.unit}`,
      });
    } else {
      setBarcodeInput(code);
      toast.error(`პროდუქტი ვერ მოიძებნა ბარკოდით: ${code}`, {
        description: 'ჯერ დაამატეთ პროდუქტი პროდუქტების გვერდზე',
      });
    }
  }, [products]);

  // Hardware barcode scanner (Datalogic, etc.)
  useHardwareScanner(handleBarcodeFound, !scannerOpen);

  // Manual barcode search
  const handleBarcodeSearch = () => {
    if (barcodeInput.trim()) {
      handleBarcodeFound(barcodeInput.trim());
    }
  };

  // When product is selected from dropdown, auto-fill price
  const handleProductChange = (id: string) => {
    setProductId(id);
    const product = products.find((p) => p.id === id);
    if (product) {
      setPrice(String(product.buy_price));
      setBarcodeInput(product.barcode || '');
    }
  };

  const handleReceive = async () => {
    if (!supplierId || !productId || !quantity || !price) { toast.error('შეავსეთ ყველა ველი'); return; }
    const product = products.find((p) => p.id === productId);
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (!product || !supplier) return;
    const qty = parseInt(quantity);
    const prc = parseFloat(price);

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('არ ხართ ავტორიზებული');

      const { data: rpcData, error: rpcError } = await supabase.rpc('process_receiving', {
        p_product_id: productId,
        p_product_name: product.name,
        p_quantity: qty,
        p_price: prc,
        p_supplier_id: supplierId,
        p_supplier_name: supplier.name,
        p_user_id: user.id,
        p_tenant_id: activeTenantId
      });

      if (rpcError) throw rpcError;
      if (!rpcData || !rpcData.success) {
        throw new Error(rpcData?.error || 'მიღება ვერ დასრულდა');
      }

      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['journal_entries'] });
      queryClient.invalidateQueries({ queryKey: ['product_receivings'] });
      toast.success(`${product.name} - ${qty} ${product.unit} მიღებულია`);
      setProductId(''); setQuantity(''); setPrice(''); setBarcodeInput('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (productsLoading || suppliersLoading || historyLoading) {
    return <PageTransition><div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></PageTransition>;
  }

  return (
    <PageTransition>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">მიღება</h1>
          <Button variant="outline" size="sm" onClick={() => setScannerOpen(true)}>
            <ScanLine className="h-4 w-4 mr-1" />
            კამერით სკანირება
          </Button>
        </div>

        {/* Barcode input field */}
        <div className="stat-card">
          <Label className="text-sm font-medium">ბარკოდით ძებნა (ან დაასკანერეთ Datalogic-ით)</Label>
          <div className="flex gap-2 mt-1">
            <Input
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="შეიყვანეთ ან დაასკანერეთ ბარკოდი..."
              onKeyDown={(e) => { if (e.key === 'Enter') handleBarcodeSearch(); }}
              className="font-mono"
            />
            <Button variant="outline" onClick={handleBarcodeSearch}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
          {barcodeInput && productId && (
            <div className="mt-2 p-2 bg-muted rounded-md flex items-center gap-3">
              <div className="h-10 w-10 rounded-md overflow-hidden bg-white/50 border flex items-center justify-center shrink-0">
                {products.find(p => p.id === productId)?.images?.[0] ? (
                  <img src={products.find(p => p.id === productId)?.images[0]} alt="პროდუქტი" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
                )}
              </div>
              <BarcodeDisplay value={barcodeInput} width={1} height={28} fontSize={10} />
              <span className="text-sm font-medium">{products.find(p => p.id === productId)?.name}</span>
            </div>
          )}
        </div>

        <div className="stat-card grid gap-3 md:grid-cols-5">
          <div className="space-y-1">
            <Label>მომწოდებელი</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger><SelectValue placeholder="აირჩიეთ" /></SelectTrigger>
              <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>პროდუქტი</Label>
            <Select value={productId} onValueChange={handleProductChange}>
              <SelectTrigger><SelectValue placeholder="აირჩიეთ ან დაასკანერეთ" /></SelectTrigger>
              <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} {p.barcode ? `(${p.barcode})` : ''}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>რაოდენობა</Label><Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
          <div className="space-y-1"><Label>ფასი (ერთეულის)</Label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
          <div className="flex items-end"><Button onClick={handleReceive} className="w-full" disabled={saving}>მიღება</Button></div>
        </div>
        <div className="stat-card">
          <Table>
            <TableHeader><TableRow><TableHead>თარიღი</TableHead><TableHead className="w-12">ფოტო</TableHead><TableHead>მომწოდებელი</TableHead><TableHead>პროდუქტი</TableHead><TableHead>ბარკოდი</TableHead><TableHead>რაოდენობა</TableHead><TableHead>ფასი</TableHead><TableHead>ჯამი</TableHead></TableRow></TableHeader>
            <TableBody>
              {receivings.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{new Date(r.created_at).toLocaleString('ka-GE')}</TableCell>
                  <TableCell>
                    <div className="h-8 w-8 rounded overflow-hidden bg-muted flex items-center justify-center border">
                      {r.image_url ? (
                        <img src={r.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="h-3 w-3 text-muted-foreground/20" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{(r as any).supplier_name || r.supplier}</TableCell>
                  <TableCell>{(r as any).product_name || r.product}</TableCell>
                  <TableCell className="font-mono text-xs">{r.barcode || '-'}</TableCell>
                  <TableCell>{r.quantity}</TableCell>
                  <TableCell>₾{r.price.toFixed(2)}</TableCell>
                  <TableCell className="font-semibold">₾{(r.price * r.quantity).toFixed(2)}</TableCell>
                </TableRow>
              ))}
              {receivings.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">ჩანაწერები არ არის</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </div>

      <BarcodeScanner open={scannerOpen} onOpenChange={setScannerOpen} onScan={handleBarcodeFound} />
    </PageTransition>
  );
}
