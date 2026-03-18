import { useState, useRef } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { useAuthStore } from '@/stores/useAuthStore';
import { FileUpload } from '@/components/ui/file-upload';
import { useProducts, type ProductInsert } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Pencil, Trash2, Loader2, AlertTriangle, Upload, FileSpreadsheet, Check, X, Tags, Download } from 'lucide-react';
import { PrintButton } from '@/components/PrintButton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BarcodeDisplay } from '@/components/BarcodeDisplay';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { SwipeToDelete } from '@/components/SwipeToDelete';
import * as XLSX from 'xlsx';
import { BarcodeLabelPrinter } from '@/components/BarcodeLabelPrinter';
import { useI18n } from '@/hooks/useI18n';

export default function ProductsPage() {
  const { categories } = useCategories();
  const { products, isLoading, addProduct, updateProduct, deleteProduct } = useProducts();
  const isMobile = useIsMobile();
  const { t } = useI18n();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const { activeTenantId } = useAuthStore();
  const [form, setForm] = useState({ name: '', barcode: '', buyPrice: '', sellPrice: '', category: '', unit: 'ცალი', minStock: '10', stock: '0', images: [] as string[] });
  const [importOpen, setImportOpen] = useState(false);
  const [importData, setImportData] = useState<{ name: string; barcode: string; buyPrice: number; sellPrice: number; unit: string; stock: number; minStock: number; category: string }[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [labelsOpen, setLabelsOpen] = useState(false);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search)
  );

  const openNew = () => {
    setEditingId(null);
    setForm({ name: '', barcode: crypto.randomUUID().slice(0, 13), buyPrice: '', sellPrice: '', category: categories[0]?.id || '', unit: 'ცალი', minStock: '10', stock: '0', images: [] });
    setDialogOpen(true);
  };

  const openEdit = (p: typeof products[0]) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      barcode: p.barcode,
      buyPrice: String(p.buy_price),
      sellPrice: String(p.sell_price),
      category: p.category_id || '',
      unit: p.unit,
      minStock: String(p.min_stock),
      stock: String(p.stock),
      images: p.images || [],
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.buyPrice || !form.sellPrice) {
      toast.error(t('fill_all_fields') || 'Fill all fields');
      return;
    }

    const data: ProductInsert = {
      name: form.name.trim(),
      barcode: form.barcode.trim(),
      buy_price: parseFloat(form.buyPrice),
      sell_price: parseFloat(form.sellPrice),
      category_id: form.category || null,
      unit: form.unit,
      min_stock: parseInt(form.minStock) || 0,
      stock: parseInt(form.stock) || 0,
      images: form.images,
      warehouse_id: null,
    };

    try {
      if (editingId) {
        await updateProduct.mutateAsync({ id: editingId, updates: data });
        toast.success(t('product_updated') || 'Product updated');
      } else {
        await addProduct.mutateAsync(data);
        toast.success(t('product_added') || 'Product added');
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProduct.mutateAsync(id);
      toast.success(t('deleted') || 'Deleted');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

        if (rows.length === 0) { toast.error(t('file_is_empty') || 'File is empty'); return; }

        const mapped = rows.map((row) => {
          // Flexible column name mapping (Georgian + English)
          const name = row['სახელი'] || row['name'] || row['პროდუქტი'] || row['product'] || '';
          const barcode = String(row['ბარკოდი'] || row['barcode'] || row['შტრიხკოდი'] || row['bar_code'] || '');
          const buyPrice = parseFloat(row['შესყიდვის ფასი'] || row['buy_price'] || row['შესყიდვა'] || row['buyPrice'] || 0);
          const sellPrice = parseFloat(row['გასაყიდი ფასი'] || row['sell_price'] || row['გასაყიდი'] || row['sellPrice'] || row['ფასი'] || row['price'] || 0);
          const unit = row['ერთეული'] || row['unit'] || 'ცალი';
          const stock = parseInt(row['რაოდენობა'] || row['stock'] || row['მარაგი'] || row['quantity'] || 0);
          const minStock = parseInt(row['მინ. მარაგი'] || row['min_stock'] || row['minStock'] || 10);
          const category = row['კატეგორია'] || row['category'] || '';
          return { name: String(name).trim(), barcode: barcode.trim(), buyPrice, sellPrice, unit: String(unit), stock, minStock, category: String(category) };
        }).filter((r) => r.name);

        if (mapped.length === 0) { toast.error(t('no_products_recognized') || 'No products recognized'); return; }

        setImportData(mapped);
        setImportOpen(true);
        toast.success(`${mapped.length} ${t('products_read') || 'products read from file'}`);
      } catch {
        toast.error(t('failed_to_read_file') || 'Failed to read file');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleImport = async () => {
    setImporting(true);
    let success = 0;
    let skipped = 0;
    for (const item of importData) {
      // Check if product with same barcode already exists
      const existing = products.find((p) => p.barcode && p.barcode === item.barcode);
      if (existing) {
        // Update stock for existing product
        try {
          await updateProduct.mutateAsync({
            id: existing.id,
            updates: { stock: existing.stock + item.stock },
          });
          skipped++;
        } catch { skipped++; }
        continue;
      }

      const catId = categories.find((c) => c.name.toLowerCase() === item.category.toLowerCase())?.id || null;
      try {
        await addProduct.mutateAsync({
          name: item.name,
          barcode: item.barcode || crypto.randomUUID().slice(0, 13),
          buy_price: item.buyPrice || 0,
          sell_price: item.sellPrice || 0,
          category_id: catId,
          unit: item.unit || 'ცალი',
          stock: item.stock || 0,
          min_stock: item.minStock || 10,
          images: [],
          warehouse_id: null,
        });
        success++;
      } catch { skipped++; }
    }
    setImporting(false);
    setImportOpen(false);
    setImportData([]);
    toast.success(`${t('import_finished') || 'Import finished:'} ${success} ${t('added') || 'added'}, ${skipped} ${t('updated_skipped') || 'updated/skipped'}`);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['სახელი', 'ბარკოდი', 'შესყიდვის ფასი', 'გასაყიდი ფასი', 'ერთეული', 'რაოდენობა', 'მინ. მარაგი', 'კატეგორია'],
      ['მაგ: კოკა-კოლა 0.5ლ', '5449000000996', '1.50', '2.50', 'ცალი', '100', '10', 'სასმელები'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'პროდუქტები');
    XLSX.writeFile(wb, 'პროდუქტების_შაბლონი.xlsx');
  };

  const exportProducts = () => {
    const data = products.map((p) => ({
      'სახელი': p.name,
      'ბარკოდი': p.barcode,
      'შესყიდვის ფასი': p.buy_price,
      'გასაყიდი ფასი': p.sell_price,
      'ერთეული': p.unit,
      'რაოდენობა': p.stock,
      'მინ. მარაგი': p.min_stock,
      'კატეგორია': categories.find((c) => c.id === p.category_id)?.name || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'პროდუქტები');
    XLSX.writeFile(wb, `პროდუქტები_${new Date().toLocaleDateString('ka-GE')}.xlsx`);
    toast.success(`${products.length} ${t('products_exported') || 'products exported'}`);
  };

  return (
    <PageTransition>
      <div className="space-y-4">
        {/* Low stock alert banner */}
        {(() => {
          const lowStock = products.filter((p) => p.stock <= p.min_stock);
          if (lowStock.length === 0) return null;
          return (
            <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{lowStock.length} {t('low_stock_products') || 'products'}</strong> {t('have_low_stock') || 'have low stock:'}{' '}
                {lowStock.slice(0, 3).map((p) => p.name).join(', ')}
                {lowStock.length > 3 && ` ${t('and_more') || 'and'} ${lowStock.length - 3}...`}
              </AlertDescription>
            </Alert>
          );
        })()}

        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold">{t('products')}</h1>
          <div className="flex gap-2 flex-wrap">
            <PrintButton title={t('products_list') || 'Products List'} />
            <Button variant="outline" onClick={exportProducts}>
              <Download className="mr-2 h-4 w-4" />{t('export') || 'Export'}
            </Button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />{t('import') || 'Import'}
            </Button>
            <Button variant="outline" onClick={() => setLabelsOpen(true)}>
              <Tags className="mr-2 h-4 w-4" />{t('labels') || 'Labels'}
            </Button>
            <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />{t('add') || 'Add'}</Button>
          </div>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('search_dots') || 'Search...'} className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Mobile: Card layout */}
            {isMobile ? (
              <div className="space-y-2">
                {filtered.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">{t('no_products_found') || 'No products found'}</p>
                ) : (
                  filtered.map((p) => (
                    <SwipeToDelete key={p.id} onDelete={() => handleDelete(p.id)}>
                      <div className="stat-card p-3" onClick={() => openEdit(p)}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{p.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {categories.find((c) => c.id === p.category_id)?.name || (t('no_category') || 'No category')}
                            </p>
                          </div>
                          <Badge variant={p.stock <= p.min_stock ? 'destructive' : 'secondary'} className="text-[10px] shrink-0">
                            {p.stock} {p.unit}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex gap-3 text-sm">
                            <span className="text-muted-foreground">{t('buy_short') || 'Buy:'} <span className="text-foreground font-medium">₾{p.buy_price.toFixed(2)}</span></span>
                            <span className="text-muted-foreground">{t('sell_short') || 'Sell:'} <span className="text-primary font-bold">₾{p.sell_price.toFixed(2)}</span></span>
                          </div>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(p); }}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                      </div>
                    </SwipeToDelete>
                  ))
                )}
              </div>
            ) : (
              /* Desktop: Table layout */
              <div id="printable-area" className="stat-card overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('name') || 'Name'}</TableHead>
                      <TableHead>{t('barcode') || 'Barcode'}</TableHead>
                      <TableHead>{t('category') || 'Category'}</TableHead>
                      <TableHead>{t('buy_price') || 'Buy price'}</TableHead>
                      <TableHead>{t('sell_price') || 'Sell price'}</TableHead>
                      <TableHead>{t('stock') || 'Stock'}</TableHead>
                      <TableHead>{t('unit') || 'Unit'}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          {t('no_products_found') || 'No products found'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell><BarcodeDisplay value={p.barcode} width={1} height={28} fontSize={10} /></TableCell>
                          <TableCell>{categories.find((c) => c.id === p.category_id)?.name || '-'}</TableCell>
                          <TableCell>₾{p.buy_price.toFixed(2)}</TableCell>
                          <TableCell>₾{p.sell_price.toFixed(2)}</TableCell>
                          <TableCell><Badge variant={p.stock <= p.min_stock ? 'destructive' : 'secondary'}>{p.stock}</Badge></TableCell>
                          <TableCell>{p.unit}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? (t('edit') || 'Edit') : (t('new_product') || 'New product')}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1"><Label>{t('name') || 'Name'}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={200} /></div>
            <div className="space-y-1">
              <Label>{t('barcode') || 'Barcode'}</Label>
              <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} maxLength={50} />
              {form.barcode && <BarcodeDisplay value={form.barcode} width={1.2} height={35} fontSize={11} />}
            </div>
            <div className="space-y-1">
              <Label>{t('category') || 'Category'}</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>{t('buy_price') || 'Buy price'}</Label><Input type="number" value={form.buyPrice} onChange={(e) => setForm({ ...form, buyPrice: e.target.value })} /></div>
              <div className="space-y-1"><Label>{t('sell_price') || 'Sell price'}</Label><Input type="number" value={form.sellPrice} onChange={(e) => setForm({ ...form, sellPrice: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>{t('unit') || 'Unit'}</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
              <div className="space-y-1"><Label>{t('quantity') || 'Quantity'}</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label>{t('min_stock') || 'Min stock'}</Label><Input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} /></div>
            
            <div className="space-y-1 mt-2">
              <Label>{t('image') || 'Image'}</Label>
              <FileUpload
                bucket="product-images"
                path={activeTenantId || 'public'}
                onUploadSuccess={(url) => setForm({ ...form, images: [url] })}
                currentImageUrl={form.images[0]}
                className="h-32"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={addProduct.isPending || updateProduct.isPending}>
              {(addProduct.isPending || updateProduct.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? (t('update') || 'Update') : (t('add') || 'Add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              {t('import_from_excel') || 'Import from Excel'} ({importData.length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                {t('download_template') || 'Download template'}
              </Button>
            </div>
            <div className="border rounded-lg overflow-auto max-h-[50vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('name') || 'Name'}</TableHead>
                    <TableHead>{t('barcode') || 'Barcode'}</TableHead>
                    <TableHead>{t('buy_price') || 'Buy price'}</TableHead>
                    <TableHead>{t('sell_price') || 'Sell price'}</TableHead>
                    <TableHead>{t('stock') || 'Stock'}</TableHead>
                    <TableHead>{t('status') || 'Status'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importData.map((item, i) => {
                    const exists = products.find((p) => p.barcode && p.barcode === item.barcode);
                    return (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="font-mono text-xs">{item.barcode || '-'}</TableCell>
                        <TableCell>₾{item.buyPrice.toFixed(2)}</TableCell>
                        <TableCell>₾{item.sellPrice.toFixed(2)}</TableCell>
                        <TableCell>{item.stock}</TableCell>
                        <TableCell>
                          {exists ? (
                            <Badge variant="secondary" className="text-xs">{t('exists_will_update') || 'Exists - will be updated'}</Badge>
                          ) : (
                            <Badge className="text-xs bg-primary/10 text-primary border-primary/20">{t('new') || 'New'}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">
              * {t('import_notice') || 'Existing barcode products will have stock updated, new products will be created'}
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setImportOpen(false); setImportData([]); }}>
              <X className="h-4 w-4 mr-1" />{t('cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleImport} disabled={importing}>
              {importing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              {importing ? (t('importing') || 'Importing...') : (t('import_n_products') || 'Import products').replace('{length}', importData.length.toString())}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BarcodeLabelPrinter open={labelsOpen} onOpenChange={setLabelsOpen} products={products} />
    </PageTransition>
  );
}
