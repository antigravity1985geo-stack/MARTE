import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, UserCheck, Settings2, PauseCircle, SplitSquareVertical } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CartDiscountLine } from './POSDiscountIntegration';
import { DiscountResult } from '@/types/discount';


export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  originalPrice: number;
  quantity: number;
  image?: string;
  employeeId?: string;
  categoryId?: string;
  discount?: number;
  discountType?: 'percent' | 'fixed';
  note?: string;
}

interface POSCartProps {
  cart: CartItem[];
  employees: { id: string, full_name: string }[];
  finalTotal: number;
  cartItemCount: number;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onUpdateEmployee: (cartItemId: string, employeeId: string) => void;
  onUpdateItemDetails: (cartItemId: string, updates: Partial<CartItem>) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
  onHoldOrder?: () => void;
  onPayment: () => void;
  onShiftToggle: () => void;
  currentShift: boolean;
  activeDiscount?: DiscountResult | null;
}

export function POSCart({
  cart, employees, finalTotal, cartItemCount,
  onUpdateQuantity, onUpdateEmployee, onUpdateItemDetails, onRemove, onClear, onHoldOrder,
  onPayment, onShiftToggle, currentShift, activeDiscount,
}: POSCartProps) {
  return (
    <div className="w-[450px] flex flex-col border rounded-xl bg-card p-4 shadow-sm">
      <h3 className="font-semibold mb-4 flex items-center gap-2 text-lg">
        <ShoppingCart className="h-5 w-5 text-primary" /> კალათა
      </h3>
      <ScrollArea className="flex-1 -mx-2 px-2">
        {cart.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">კალათა ცარიელია</p>
        ) : (
          <div className="space-y-3">
            {cart.map((item) => {
              const itemTotal = item.price * item.quantity;
              
              return (
              <div key={item.id} className={`flex flex-col gap-2 p-3 rounded-2xl bg-white/5 border transition-all animate-slide-up group mb-2 ${item.note ? 'border-primary/30 bg-primary/10 shadow-sm' : 'border-white/5 hover:border-primary/20 hover:bg-white/10'}`}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0 border relative">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-[10px] text-muted-foreground opacity-30">IMG</div>
                    )}
                    {item.discount && item.discount > 0 && (
                      <div className="absolute top-0 right-0 bg-destructive text-white text-[8px] font-bold px-1 rounded-bl">
                        -{item.discountType === 'percent' ? `${item.discount}%` : `₾${item.discount}`}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-bold text-foreground leading-tight line-clamp-1 pr-1">{item.name}</p>
                      
                      {/* Item Settings Popover */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0 text-muted-foreground hover:text-primary">
                            <Settings2 className="h-3.5 w-3.5" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3" align="end">
                          <h4 className="font-semibold text-sm mb-3 text-primary border-b pb-2">პროდუქტის პარამეტრები</h4>
                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs">ახალი ფასი (₾)</Label>
                              <Input 
                                type="number" 
                                className="h-7 text-xs" 
                                value={item.price} 
                                onChange={(e) => onUpdateItemDetails(item.id, { price: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1.5">
                                <Label className="text-xs">ფასდაკლება</Label>
                                <Input 
                                  type="number" 
                                  className="h-7 text-xs" 
                                  value={item.discount || ''} 
                                  onChange={(e) => onUpdateItemDetails(item.id, { discount: parseFloat(e.target.value) || 0 })}
                                  placeholder="0"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">ტიპი</Label>
                                <Select 
                                  value={item.discountType || 'percent'} 
                                  onValueChange={(val: 'percent' | 'fixed') => onUpdateItemDetails(item.id, { discountType: val })}
                                >
                                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="percent">პროცენტი (%)</SelectItem>
                                    <SelectItem value="fixed">თანხა (₾)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">კომენტარი / შენიშვნა</Label>
                              <Input 
                                className="h-7 text-xs" 
                                value={item.note || ''} 
                                onChange={(e) => onUpdateItemDetails(item.id, { note: e.target.value })}
                                placeholder="მაგ: უშაქროდ, თბილი..."
                              />
                            </div>
                            {item.price !== item.originalPrice && (
                              <Button variant="ghost" size="sm" className="w-full h-7 text-xs text-muted-foreground mt-2" onClick={() => onUpdateItemDetails(item.id, { price: item.originalPrice })}>
                                საწყისი ფასის დაბრუნება (₾{item.originalPrice})
                              </Button>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">
                        <span className={item.price !== item.originalPrice ? 'line-through opacity-50 text-[10px] mr-1' : 'hidden'}>
                          ₾{item.originalPrice.toFixed(2)}
                        </span>
                        ₾{item.price.toFixed(2)}
                      </p>
                      <Select 
                        value={item.employeeId || ""} 
                        onValueChange={(val) => onUpdateEmployee(item.id, val)}
                      >
                        <SelectTrigger className="h-6 w-28 text-[10px] py-0 px-2 bg-muted/50 border-none">
                          <UserCheck className="h-3 w-3 mr-1 opacity-50" />
                          <SelectValue placeholder="პერსონალი" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map(emp => (
                            <SelectItem key={emp.id} value={emp.id} className="text-xs">{emp.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end justify-between h-full gap-2">
                    <p className="text-sm font-semibold text-right">₾{itemTotal.toFixed(2)}</p>
                    <div className="flex items-center gap-1 bg-background rounded-md border p-0.5">
                      <Button size="icon" variant="ghost" className="h-6 w-6 rounded-sm" onClick={() => onUpdateQuantity(item.productId, -1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-5 text-center text-xs font-mono">{item.quantity}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6 rounded-sm" onClick={() => onUpdateQuantity(item.productId, 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive opacity-50 hover:opacity-100 hover:bg-destructive/10 shrink-0" onClick={() => onRemove(item.productId)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {item.note && (
                  <p className="text-[10px] text-primary/80 bg-primary/10 px-2 flex items-center h-5 rounded-sm line-clamp-1 italic">
                    📝 {item.note}
                  </p>
                )}
              </div>
            )})}
          </div>
        )}
      </ScrollArea>
      <div className="border-t pt-3 mt-3 space-y-3">
        {activeDiscount?.approved && (
          <CartDiscountLine discount={activeDiscount} />
        )}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">ჯამი ({cartItemCount} ერთ.)</span>
          <span className="text-xl font-bold text-primary">₾{finalTotal.toFixed(2)}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="flex-1 min-w-[120px] text-destructive hover:text-destructive hover:bg-destructive/10" onClick={onClear} disabled={cart.length === 0}>
            <Trash2 className="mr-2 h-4 w-4" /> წაშლა
          </Button>
          <Button 
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 shadow-lg"
            onClick={onPayment}
            disabled={cart.length === 0}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            გადახდა {cartItemCount > 0 ? `${cartItemCount} პოზიცია ₾${finalTotal.toFixed(2)}` : ''}
          </Button>
        </div>
        <Button variant="outline" className="w-full" onClick={onShiftToggle}>
          {currentShift ? 'ცვლის მართვა F4' : 'ცვლის გახსნა F4'}
        </Button>
      </div>
    </div>
  );
}
