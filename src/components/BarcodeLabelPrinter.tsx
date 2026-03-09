import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tags, Printer, Search } from 'lucide-react';
import { type SupabaseProduct } from '@/hooks/useProducts';

interface BarcodeLabelPrinterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: SupabaseProduct[];
}

type LabelSize = '38x25' | '58x30' | '58x40';

const LABEL_SIZES: Record<LabelSize, { w: number; h: number; label: string }> = {
  '38x25': { w: 38, h: 25, label: '38×25 მმ (მცირე)' },
  '58x30': { w: 58, h: 30, label: '58×30 მმ (საშუალო)' },
  '58x40': { w: 58, h: 40, label: '58×40 მმ (დიდი)' },
};

export function BarcodeLabelPrinter({ open, onOpenChange, products }: BarcodeLabelPrinterProps) {
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [labelSize, setLabelSize] = useState<LabelSize>('58x30');
  const [showPrice, setShowPrice] = useState(true);
  const [columns, setColumns] = useState(3);
  const [search, setSearch] = useState('');

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search)
  );

  const toggleProduct = (id: string) => {
    setSelected((prev) => {
      const copy = { ...prev };
      if (copy[id]) { delete copy[id]; } else { copy[id] = 1; }
      return copy;
    });
  };

  const setQty = (id: string, qty: number) => {
    if (qty <= 0) {
      setSelected((prev) => { const copy = { ...prev }; delete copy[id]; return copy; });
    } else {
      setSelected((prev) => ({ ...prev, [id]: qty }));
    }
  };

  const selectAll = () => {
    const all: Record<string, number> = {};
    filtered.forEach((p) => { all[p.id] = selected[p.id] || 1; });
    setSelected(all);
  };

  const clearAll = () => setSelected({});

  const selectedProducts = products.filter((p) => selected[p.id]);
  const totalLabels = Object.values(selected).reduce((s, n) => s + n, 0);

  const handlePrint = () => {
    const size = LABEL_SIZES[labelSize];
    const labels: string[] = [];

    selectedProducts.forEach((p) => {
      const qty = selected[p.id] || 1;
      for (let i = 0; i < qty; i++) {
        labels.push(`
          <div class="label" style="width:${size.w}mm;height:${size.h}mm;">
            <div class="label-name">${p.name}</div>
            <svg class="barcode" id="bc-${p.id}-${i}"></svg>
            ${showPrice ? `<div class="label-price">₾${p.sell_price.toFixed(2)}</div>` : ''}
          </div>
        `);
      }
    });

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <html><head><title>ბარკოდის ეტიკეტები</title>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; }
        .labels-grid {
          display: flex; flex-wrap: wrap; gap: 2mm; padding: 3mm;
        }
        .label {
          border: 0.3mm dashed #ccc;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 1.5mm; overflow: hidden; page-break-inside: avoid;
        }
        .label-name {
          font-size: ${size.w < 50 ? '7' : '8'}pt;
          font-weight: 600; text-align: center;
          max-height: ${size.h < 30 ? '3' : '4'}mm;
          overflow: hidden; line-height: 1.1;
          width: 100%; white-space: nowrap; text-overflow: ellipsis;
        }
        .barcode { max-width: 100%; }
        .label-price {
          font-size: ${size.w < 50 ? '8' : '10'}pt;
          font-weight: 700; margin-top: 0.5mm;
        }
        @media print {
          @page { margin: 3mm; }
          .label { border: none; }
        }
      </style></head>
      <body>
        <div class="labels-grid">${labels.join('')}</div>
        <script>
          document.querySelectorAll('.barcode').forEach(function(el) {
            var id = el.id;
            var productId = id.split('-')[1];
            var barcodes = ${JSON.stringify(
              selectedProducts.reduce((acc, p) => ({ ...acc, [p.id]: p.barcode }), {} as Record<string, string>)
            )};
            try {
              JsBarcode(el, barcodes[productId] || '', {
                width: ${size.w < 50 ? 1 : 1.3},
                height: ${size.h < 35 ? 20 : 28},
                fontSize: ${size.w < 50 ? 8 : 10},
                margin: 0,
                displayValue: true
              });
            } catch(e) {
              el.style.display = 'none';
            }
          });
          setTimeout(function() { window.print(); window.close(); }, 500);
        <\/script>
      </body></html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5 text-primary" />
            ბარკოდის ეტიკეტების ბეჭდვა
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
          {/* Settings */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">ეტიკეტის ზომა</Label>
              <Select value={labelSize} onValueChange={(v) => setLabelSize(v as LabelSize)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LABEL_SIZES).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ფასის ჩვენება</Label>
              <div className="flex items-center gap-2 h-8">
                <Checkbox checked={showPrice} onCheckedChange={(c) => setShowPrice(!!c)} id="show-price" />
                <label htmlFor="show-price" className="text-xs cursor-pointer">ფასი ეტიკეტზე</label>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">არჩეული</Label>
              <p className="text-sm font-semibold h-8 flex items-center">{selectedProducts.length} პროდუქტი ({totalLabels} ეტიკეტი)</p>
            </div>
          </div>

          {/* Product search & selection */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="ძიება..." className="pl-8 h-8 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={selectAll}>ყველას არჩევა</Button>
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={clearAll}>გასუფთავება</Button>
          </div>

          <ScrollArea className="flex-1 border rounded-md">
            <div className="divide-y">
              {filtered.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-muted/50 transition ${selected[p.id] ? 'bg-primary/5' : ''}`}
                  onClick={() => toggleProduct(p.id)}
                >
                  <Checkbox checked={!!selected[p.id]} className="pointer-events-none" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{p.barcode}</p>
                  </div>
                  <p className="text-xs font-semibold shrink-0">₾{p.sell_price.toFixed(2)}</p>
                  {selected[p.id] && (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Input
                        type="number"
                        min={1}
                        value={selected[p.id]}
                        onChange={(e) => setQty(p.id, parseInt(e.target.value) || 1)}
                        className="w-14 h-7 text-xs text-center"
                      />
                      <span className="text-[10px] text-muted-foreground">ცალი</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>დახურვა</Button>
          <Button onClick={handlePrint} disabled={totalLabels === 0}>
            <Printer className="h-4 w-4 mr-1" />
            {totalLabels} ეტიკეტის ბეჭდვა
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
