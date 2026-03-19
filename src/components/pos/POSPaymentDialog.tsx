import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, SmartphoneNfc, QrCode, Truck, Check, ChevronsUpDown } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Switch } from '@/components/ui/switch';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface Client {
  id: string;
  name: string;
  tin?: string;
}

interface POSPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  finalTotal: number;
  paymentMethod: 'cash' | 'card' | 'combined' | 'bog_qr' | 'tbc_pay' | 'keepz' | 'bnpl';
  onPaymentMethodChange: (method: 'cash' | 'card' | 'combined' | 'bog_qr' | 'tbc_pay' | 'keepz' | 'bnpl') => void;
  cashAmount: string;
  onCashAmountChange: (val: string) => void;
  cardAmount: string;
  onCardAmountChange: (val: string) => void;
  couponCode: string;
  onCouponCodeChange: (val: string) => void;
  couponDiscount: number;
  onCouponValidate: () => void;
  selectedClient: string;
  onSelectedClientChange: (val: string) => void;
  clients: Client[];
  onPayment: () => void;
  isPending: boolean;
  change: number;
  loyaltyDiscount?: number;
  pointsToEarn?: number;
  selectedClientData?: any;
  createWaybill: boolean;
  onCreateWaybillChange: (val: boolean) => void;
  tipAmount?: string;
  onTipAmountChange?: (val: string) => void;
}

export function POSPaymentDialog({
  open, onOpenChange, finalTotal,
  paymentMethod, onPaymentMethodChange,
  cashAmount, onCashAmountChange,
  cardAmount, onCardAmountChange,
  couponCode, onCouponCodeChange, couponDiscount, onCouponValidate,
  selectedClient, onSelectedClientChange, clients,
  onPayment, isPending, change,
  loyaltyDiscount = 0, pointsToEarn = 0,
  selectedClientData,
  createWaybill, onCreateWaybillChange,
  tipAmount = '', onTipAmountChange
}: POSPaymentDialogProps) {
  const [openClientPopover, setOpenClientPopover] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>გადახდა — ₾{finalTotal.toFixed(2)}</DialogTitle></DialogHeader>

        {selectedClientData && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-between mb-2">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">ლოიალობა: {selectedClientData.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${selectedClientData.loyalty_tier === 'platinum' ? 'bg-purple-500 text-white' :
                  selectedClientData.loyalty_tier === 'gold' ? 'bg-yellow-500 text-black' :
                    selectedClientData.loyalty_tier === 'silver' ? 'bg-slate-300 text-black' :
                      'bg-orange-700 text-white'
                  }`}>
                  {selectedClientData.loyalty_tier || 'bronze'}
                </span>
                <span className="text-xs font-semibold">{selectedClientData.loyalty_points || 0} ქულა</span>
              </div>
            </div>
            {pointsToEarn > 0 && (
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">დაირიცხება</p>
                <p className="text-sm font-bold text-primary">+{pointsToEarn} ქულა</p>
              </div>
            )}
          </div>
        )}
        <Tabs value={paymentMethod} onValueChange={(v) => onPaymentMethodChange(v as any)}>
          <TabsList className="grid grid-cols-4 w-full h-auto flex-wrap mb-4">
            <TabsTrigger value="cash">ნაღდი</TabsTrigger>
            <TabsTrigger value="card">ბარათი</TabsTrigger>
            <TabsTrigger value="combined">შერეული</TabsTrigger>
            <TabsTrigger value="bog_qr" className="bg-[#FF6A00]/10 text-[#FF6A00] data-[state=active]:bg-[#FF6A00] data-[state=active]:text-white">BOG QR</TabsTrigger>
            <TabsTrigger value="tbc_pay" className="bg-[#00A3E0]/10 text-[#00A3E0] data-[state=active]:bg-[#00A3E0] data-[state=active]:text-white">TBC Pay</TabsTrigger>
            <TabsTrigger value="keepz" className="col-span-1">Keepz</TabsTrigger>
            <TabsTrigger value="bnpl" className="col-span-2">განვადება (BNPL)</TabsTrigger>
          </TabsList>

          <TabsContent value="cash" className="space-y-3 mt-3">
            <div className="space-y-2">
              <Label>მიღებული თანხა</Label>
              <Input type="number" value={cashAmount} onChange={(e) => onCashAmountChange(e.target.value)} placeholder="0.00" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => onCashAmountChange(finalTotal.toFixed(2))}>ზუსტი ₾{finalTotal.toFixed(2)}</Button>
              {[5, 10, 20, 50, 100, 200].filter(d => d >= finalTotal).map(d => (
                <Button key={d} size="sm" variant="outline" onClick={() => onCashAmountChange(String(d))}>₾{d}</Button>
              ))}
            </div>
            {parseFloat(cashAmount) > 0 && (
              <div className="flex justify-between p-3 rounded-lg bg-success/10">
                <span>ხურდა:</span>
                <span className="font-bold text-success">₾{change.toFixed(2)}</span>
              </div>
            )}
          </TabsContent>

          <TabsContent value="card" className="mt-3">
            <p className="text-sm text-muted-foreground text-center py-4">ბარათით გადახდა — ₾{finalTotal.toFixed(2)}</p>
          </TabsContent>

          <TabsContent value="combined" className="space-y-3 mt-3">
            <div className="space-y-2"><Label>ნაღდი</Label><Input type="number" value={cashAmount} onChange={(e) => onCashAmountChange(e.target.value)} placeholder="0.00" /></div>
            <div className="space-y-2"><Label>ბარათი</Label><Input type="number" value={cardAmount} onChange={(e) => onCardAmountChange(e.target.value)} placeholder="0.00" /></div>
          </TabsContent>

          <TabsContent value="bog_qr" className="mt-3 text-center py-6 animate-in fade-in">
            <div className="mx-auto bg-white p-3 rounded-xl border-2 border-[#FF6A00]/20 inline-block mb-4 shadow-sm">
              <QRCodeSVG
                value={`bog-qr://payment?amount=${finalTotal}&merchant=MARTE`}
                size={140}
                fgColor="#FF6A00"
              />
            </div>
            <p className="text-sm font-bold text-gray-800 flex items-center justify-center gap-2">
              <QrCode className="w-4 h-4 text-[#FF6A00]" />
              საქართველოს ბანკი
            </p>
            <p className="text-xs text-muted-foreground mt-1">დაასკანერეთ მობილბანკით გადასახდელად</p>
          </TabsContent>

          <TabsContent value="tbc_pay" className="mt-3 text-center py-6 animate-in fade-in">
            <div className="mx-auto bg-white p-3 rounded-xl border-2 border-[#00A3E0]/20 inline-block mb-4 shadow-sm">
              <QRCodeSVG
                value={`tbc-pay://payment?amount=${finalTotal}&merchant=MARTE`}
                size={140}
                fgColor="#00A3E0"
              />
            </div>
            <p className="text-sm font-bold text-gray-800 flex items-center justify-center gap-2">
              <SmartphoneNfc className="w-4 h-4 text-[#00A3E0]" />
              TBC Digital
            </p>
            <p className="text-xs text-muted-foreground mt-1">შეეხეთ ან დაასკანერეთ TBC Pay-ით</p>
          </TabsContent>

          <TabsContent value="keepz" className="mt-3 text-center py-6">
            <div className="mx-auto p-4 bg-purple-50 rounded-xl border border-purple-100 mb-4 inline-block">
              <span className="text-purple-600 font-bold text-lg">Keepz / ტიპი</span>
            </div>
            <p className="text-sm font-medium text-muted-foreground">ციფრული tip-ის და ანგარიშსწორების სისტემა</p>
          </TabsContent>

          <TabsContent value="bnpl" className="mt-3 text-center py-6">
            <div className="mx-auto flex gap-4 justify-center mb-4">
              <div className="p-4 bg-green-50 text-green-700 rounded-lg border border-green-200">Space Buy Now</div>
              <div className="p-4 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">Credo განვადება</div>
            </div>
            <p className="text-sm font-medium text-muted-foreground">ნაწილ-ნაწილ გადახდის მეთოდი</p>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">კუპონი</Label>
            <div className="flex gap-2">
              <Input placeholder="კოდი" value={couponCode} onChange={(e) => onCouponCodeChange(e.target.value)} className="h-9" />
              <Button variant="outline" className="h-9 px-3" onClick={onCouponValidate}>ოკ</Button>
            </div>
          </div>
          {onTipAmountChange && (
            <div className="w-[100px] space-y-1">
              <Label className="text-xs">Tip / чай (₾)</Label>
              <Input type="number" placeholder="0.00" value={tipAmount} onChange={(e) => onTipAmountChange(e.target.value)} className="h-9" />
            </div>
          )}
        </div>

        <div className="space-y-1">
          {couponDiscount > 0 && <p className="text-sm text-success flex justify-between"><span>კუპონის ფასდაკლება:</span> <span>-₾{couponDiscount.toFixed(2)}</span></p>}
          {loyaltyDiscount > 0 && <p className="text-sm text-primary flex justify-between font-medium"><span>ლოიალობის ფასდაკლება ({selectedClientData?.loyalty_tier}):</span> <span>-₾{loyaltyDiscount.toFixed(2)}</span></p>}
        </div>

        <div className="space-y-1 mt-2">
          <Label className="text-xs">კლიენტის ძიება</Label>
          <Popover open={openClientPopover} onOpenChange={setOpenClientPopover}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openClientPopover}
                className="w-full justify-between h-10 font-normal"
              >
                {selectedClient
                  ? clients.find((c) => c.id === selectedClient)?.name
                  : "აირჩიეთ კლიენტი (არასავალდებულო)"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command>
                <CommandInput placeholder="ძიება სახელით ან ნომრით..." className="h-9" />
                <CommandEmpty>კლიენტი ვერ მოიძებნა.</CommandEmpty>
                <CommandGroup className="max-h-[200px] overflow-y-auto">
                  <CommandItem
                    value="none"
                    onSelect={() => {
                      onSelectedClientChange('');
                      setOpenClientPopover(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", selectedClient === '' ? "opacity-100" : "opacity-0")} />
                    -- კლიენტის გარეშე --
                  </CommandItem>
                  {clients.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={`${c.name} ${c.tin || ''}`}
                      onSelect={() => {
                        onSelectedClientChange(c.id);
                        setOpenClientPopover(false);
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", selectedClient === c.id ? "opacity-100" : "opacity-0")} />
                      {c.name} {c.tin && <span className="text-muted-foreground ml-1 text-xs">({c.tin})</span>}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {selectedClientData?.tin && (
          <div className="flex items-center justify-between p-3 rounded-lg border border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Truck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold">RS.GE ზედნადების შექმნა</p>
                <p className="text-[10px] text-muted-foreground">TIN: {selectedClientData.tin}</p>
              </div>
            </div>
            <Switch checked={createWaybill} onCheckedChange={onCreateWaybillChange} />
          </div>
        )}

        <DialogFooter>
          <Button className="w-full" onClick={onPayment} disabled={isPending}>
            <DollarSign className="mr-2 h-4 w-4" /> გადახდა ₾{finalTotal.toFixed(2)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
