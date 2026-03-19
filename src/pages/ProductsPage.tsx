import { useState, useRef } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { useAuthStore } from '@/stores/useAuthStore';
import { FileUpload } from '@/components/ui/file-upload';
import { useProducts, type ProductInsert, type SupabaseProduct } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Pencil, Trash2, Loader2, AlertTriangle, Upload, FileSpreadsheet, Check, X, Tags, Download, Scissors } from 'lucide-react';
import { PrintButton } from '@/components/PrintButton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BarcodeDisplay } from '@/components/BarcodeDisplay';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { SwipeToDelete } from '@/components/SwipeToDelete';
import * as XLSX from 'xlsx';
import { BarcodeLabelPrinter } from '@/components/BarcodeLabelPrinter';
import { useI18n } from '@/hooks/useI18n';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTranslatedField } from '@/lib/i18n/content';
import { Textarea } from '@/components/ui/textarea';
import { useServiceManagement } from '@/hooks/useServiceManagement';

export default function ProductsPage() {
  const { categories } = useCategories();
  const { products, isLoading, addProduct, updateProduct, deleteProduct } = useProducts();
  const isMobile = useIsMobile();
  const { t } = useI18n();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const { activeTenantId } = useAuthStore();
  const { lang } = useI18n();
  const [form, setForm] = useState({
    name: '',
    description: '',
    name_en: '',
    description_en: '',
    name_ru: '',
    description_ru: '',
    name_az: '',
    description_az: '',
    barcode: '',
    buyPrice: '',
    sellPrice: '',
    category: '',
    unit: 'ცალი',
    minStock: '10',
    stock: '0',
    images: [] as string[],
    type: 'product' as 'product' | 'service'
  });
  const [importOpen, setImportOpen] = useState(false);
  const [importData, setImportData] = useState<{ name: string; barcode: string; buyPrice: number; sellPrice: number; unit: string; stock: number; minStock: number; category: string; type: string }[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [labelsOpen, setLabelsOpen] = useState(false);

  const { materials, saveMaterial, deleteMaterial } = useServiceManagement();
  const [newMaterial, setNewMaterial] = useState({ product_id: '', quantity: '1' });

  const filtered = products.filter((p) => {
    const displayName = getTranslatedField(p, 'name', lang);
    return displayName.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search);
  });

  const openNew = () => {
    setEditingId(null);
    setForm({
      name: '', description: '',
      name_en: '', description_en: '',
      name_ru: '', description_ru: '',
      name_az: '', description_az: '',
      barcode: crypto.randomUUID().slice(0, 13),
      buyPrice: '', sellPrice: '',
      category: categories[0]?.id || '',
      unit: 'ცალი', minStock: '10', stock: '0', images: [],
      type: 'product'
    });
    setDialogOpen(true);
  };

  const openEdit = (p: SupabaseProduct) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description || '',
      name_en: p.name_en || '',
      description_en: p.description_en || '',
      name_ru: p.name_ru || '',
      description_ru: p.description_ru || '',
      name_az: p.name_az || '',
      description_az: p.description_az || '',
      barcode: p.barcode || '',
      buyPrice: String(p.buy_price),
      sellPrice: String(p.sell_price),
      category: p.category_id || '',
      unit: p.unit || 'ცალი',
      minStock: String(p.min_stock),
      stock: String(p.stock),
      images: p.images || [],
      type: (p.type as any) || 'product'
    });
    setDialogOpen(true);
  };

  const currentMaterials = editingId ? (materials(editingId).data || []) : [];

  const handleAddMaterial = async () => {
    if (!editingId || !newMaterial.product_id) return;
    try {
      await saveMaterial.mutateAsync({
        service_id: editingId,
        product_id: newMaterial.product_id,
        quantity: parseFloat(newMaterial.quantity)
      });
      setNewMaterial({ product_id: '', quantity: '1' });
    } catch (err: any) {
      toast.error(err.message);
    }
  };


  const handleSave = async () => {
    if (!form.name || !form.buyPrice || !form.sellPrice) {
      toast.error(t('fill_all_fields') || 'Fill all fields');
      return;
    }

    const data: any = {
      name: form.name.trim(),
      description: form.description.trim(),
      name_en: form.name_en.trim(),
      description_en: form.description_en.trim(),
      name_ru: form.name_ru.trim(),
      description_ru: form.description_ru.trim(),
      name_az: form.name_az.trim(),
      description_az: form.description_az.trim(),
      barcode: form.barcode.trim(),
      buy_price: parseFloat(form.buyPrice),
      sell_price: parseFloat(form.sellPrice),
      category_id: form.category || null,
      unit: form.unit,
      min_stock: parseInt(form.minStock) || 0,
      stock: parseInt(form.stock) || 0,
      images: form.images,
      warehouse_id: null,
      type: form.type
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
          const name = row['სახელი'] || row['name'] || row['პროდუქტი'] || row['product'] || '';
          const barcode = String(row['ბარკოდი'] || row['barcode'] || row['შტრიხკოდი'] || row['bar_code'] || '');
          const buyPrice = parseFloat(row['შესყიდვის ფასი'] || row['buy_price'] || row['შესყიდვა'] || row['buyPrice'] || 0);
          const sellPrice = parseFloat(row['გასაყიდი ფასი'] || row['sell_price'] || row['გასაყიდი'] || row['sellPrice'] || row['ფასი'] || row['price'] || 0);
          const unit = row['ერთეული'] || row['unit'] || 'ცალი';
          const stock = parseInt(row['რაოდენობა'] || row['stock'] || row['მარაგი'] || row['quantity'] || 0);
          const minStock = parseInt(row['მინ. მარაგი'] || row['min_stock'] || row['minStock'] || 10);
          const category = row['კატეგორია'] || row['category'] || '';
          const type = row['ტიპი'] || row['type'] || 'product';
          return { name: String(name).trim(), barcode: barcode.trim(), buyPrice, sellPrice, unit: String(unit), stock, minStock, category: String(category), type };
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
      const existing = products.find((p) => p.barcode && p.barcode === item.barcode);
      if (existing) {
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
          type: item.type as any || 'product'
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
      ['სახელი', 'ბარკოდი', 'შესყიდვის ფასი', 'გასაყიდი ფასი', 'ერთეული', 'რაოდენობა', 'მინ. მარაგი', 'კატეგორია', 'ტიპი (product/service)'],
      ['მაგ: კოკა-კოლა 0.5ლ', '5449000000996', '1.50', '2.50', 'ცალი', '100', '10', 'სასმელები', 'product'],
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
      'ტიპი': p.type || 'product'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'პროდუქტები');
    XLSX.writeFile(wb, `პროდუქტები_${new Date().toLocaleDateString('ka-GE')}.xlsx`);
    toast.success(`${products.length} ${t('products_exported') || 'products exported'}`);
  };

  const handleDeleteMaterial = async (materialId: string) => {
    try {
      await deleteMaterial.mutateAsync(materialId);
      toast.success(t('deleted') || 'Deleted');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <PageTransition>
      <div className="space-y-4">
        {(() => {
          const lowStock = products.filter((p) => p.stock <= p.min_stock && p.type !== 'service');
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
                            <div className="flex items-center gap-1.5">
                              {p.type === 'service' ? <Scissors className="h-3 w-3 text-primary" /> : null}
                              <p className="font-medium truncate">{getTranslatedField(p, 'name', lang)}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {categories.find((c) => c.id === p.category_id)?.name || (t('no_category') || 'No category')}
                            </p>
                          </div>
                          {p.type !== 'service' && (
                            <Badge variant={p.stock <= p.min_stock ? 'destructive' : 'secondary'} className="text-[10px] shrink-0">
                              {p.stock} {p.unit}
                            </Badge>
                          )}
                          {p.type === 'service' && <Badge variant="outline" className="text-[10px] shrink-0 uppercase tracking-tighter">სერვისი</Badge>}
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
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {p.type === 'service' ? <Scissors className="h-4 w-4 text-primary" /> : null}
                              <div>{getTranslatedField(p, 'name', lang)}</div>
                            </div>
                            {p.description && <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">{getTranslatedField(p, 'description', lang)}</div>}
                          </TableCell>
                          <TableCell><BarcodeDisplay value={p.barcode} width={1} height={28} fontSize={10} /></TableCell>
                          <TableCell>{categories.find((c) => c.id === p.category_id)?.name || '-'}</TableCell>
                          <TableCell>₾{p.buy_price.toFixed(2)}</TableCell>
                          <TableCell>₾{p.sell_price.toFixed(2)}</TableCell>
                          <TableCell>
                            {p.type === 'service' ? (
                              <Badge variant="outline" className="text-[10px] uppercase tracking-tighter">სერვისი</Badge>
                            ) : (
                              <Badge variant={p.stock <= p.min_stock ? 'destructive' : 'secondary'}>{p.stock}</Badge>
                            )}
                          </TableCell>
                          <TableCell>{p.unit}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" onClick={() => openEdit(p)} title="რედაქტირება"><Pencil className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(p.id)} title="წაშლა"><Trash2 className="h-4 w-4" /></Button>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center pr-6">
              <span>{editingId ? (t('edit') || 'Edit') : (t('new_product') || 'New product')}</span>
              {form.type === 'service' && editingId && (
                <Badge variant="outline" className="ml-2 animate-pulse bg-primary/5 text-primary border-primary/20">
                  <Scissors className="h-3 w-3 mr-1" /> {t('service_item')}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">{t('info')}</TabsTrigger>
              <TabsTrigger value="materials" disabled={form.type !== 'service' || !editingId}>
                {t('materials')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4 pt-4">
              <div className="grid gap-3">
                <div className="space-y-1.5">
                  <Label>{t('type')}</Label>
                  <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="product">{t('product_item')}</SelectItem>
                      <SelectItem value="service">{t('service_item')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Tabs defaultValue="ka" className="w-full">
                  <TabsList className="grid w-full grid-cols-4 h-9">
                    <TabsTrigger value="ka" className="text-xs">KA</TabsTrigger>
                    <TabsTrigger value="en" className="text-xs">EN</TabsTrigger>
                    <TabsTrigger value="ru" className="text-xs">RU</TabsTrigger>
                    <TabsTrigger value="az" className="text-xs">AZ</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="ka" className="space-y-3 pt-3">
                    <div className="space-y-1"><Label>{t('name')}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                    <div className="space-y-1"><Label>{t('description')}</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                  </TabsContent>
                  
                  <TabsContent value="en" className="space-y-3 pt-3">
                    <div className="space-y-1"><Label>Name (EN)</Label><Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Description (EN)</Label><Textarea value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} /></div>
                  </TabsContent>
                  <TabsContent value="ru" className="space-y-3 pt-3">
                    <div className="space-y-1"><Label>Название (RU)</Label><Input value={form.name_ru} onChange={(e) => setForm({ ...form, name_ru: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Описание (RU)</Label><Textarea value={form.description_ru} onChange={(e) => setForm({ ...form, description_ru: e.target.value })} /></div>
                  </TabsContent>
                  <TabsContent value="az" className="space-y-3 pt-3">
                    <div className="space-y-1"><Label>Ad (AZ)</Label><Input value={form.name_az} onChange={(e) => setForm({ ...form, name_az: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Təsvir (AZ)</Label><Textarea value={form.description_az} onChange={(e) => setForm({ ...form, description_az: e.target.value })} /></div>
                  </TabsContent>
                </Tabs>

                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="space-y-1">
                    <Label>{t('barcode') || 'Barcode'}</Label>
                    <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} maxLength={50} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('category') || 'Category'}</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>{t('buy_price') || 'Buy price'}</Label><Input type="number" value={form.buyPrice} onChange={(e) => setForm({ ...form, buyPrice: e.target.value })} /></div>
                  <div className="space-y-1"><Label>{t('sell_price') || 'Sell price'}</Label><Input type="number" value={form.sellPrice} onChange={(e) => setForm({ ...form, sellPrice: e.target.value })} /></div>
                </div>
                {form.type !== 'service' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label>{t('unit') || 'Unit'}</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
                    <div className="space-y-1"><Label>{t('quantity') || 'Quantity'}</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
                  </div>
                )}
                <div className="space-y-1"><Label>{t('min_stock') || 'Min stock'}</Label><Input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} /></div>
              </div>
            </TabsContent>

            <TabsContent value="materials" className="space-y-4 pt-4">
              <div className="bg-muted/30 p-4 rounded-lg border space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Plus className="h-4 w-4" /> {t('add_material')}
                </h4>
                <div className="grid grid-cols-5 gap-2">
                  <div className="col-span-3">
                    <Select value={newMaterial.product_id} onValueChange={(v) => setNewMaterial({ ...newMaterial, product_id: v })}>
                      <SelectTrigger><SelectValue placeholder={t('select_material')} /></SelectTrigger>
                      <SelectContent>
                        {products.filter(p => p.type !== 'service').map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name} ({p.unit})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input 
                    type="number" 
                    placeholder="რაოდ." 
                    value={newMaterial.quantity} 
                    onChange={(e) => setNewMaterial({ ...newMaterial, quantity: e.target.value })} 
                  />
                  <Button onClick={handleAddMaterial} size="icon" className="shrink-0"><Plus className="h-4 w-4" /></Button>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="py-2">{t('material')}</TableHead>
                      <TableHead className="py-2">{t('quantity')}</TableHead>
                      <TableHead className="py-2 text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentMaterials.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground italic">
                          {t('no_materials_defined')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentMaterials.map((m: any) => {
                        const product = products.find(p => p.id === m.product_id);
                        return (
                          <TableRow key={m.id}>
                            <TableCell>{product?.name || t('unknown_material')}</TableCell>
                            <TableCell>{m.quantity} {product?.unit}</TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-destructive transition-colors"
                                onClick={() => handleDeleteMaterial(m.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="text-[10px] text-muted-foreground bg-primary/5 p-2 rounded border border-primary/20">
                {t('material_deduction_note')}
              </p>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button onClick={handleSave} disabled={addProduct.isPending || updateProduct.isPending}>
              {(addProduct.isPending || updateProduct.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? (t('update') || 'Update') : (t('add') || 'Add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
