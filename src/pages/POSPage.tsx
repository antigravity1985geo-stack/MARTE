import { useState, useEffect, useCallback } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useClients } from '@/hooks/useClients';
import { useTransactions } from '@/hooks/useTransactions';
import { useInvoices } from '@/hooks/useInvoices';
import { useBundles } from '@/hooks/useBundles';
import { usePriceRules } from '@/hooks/usePriceRules';
import { calculateDynamicDiscount } from '@/lib/pricingEngine';
import { offlineQueue } from '@/lib/offlineQueue';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { NetworkStatus } from '@/components/pos/NetworkStatus';
import { useReceiptConfig } from '@/hooks/useReceiptConfig';
import { generateInvoice } from '@/lib/generateInvoice';
import { useShifts, useActiveCashier } from '@/hooks/useShifts';
import { useEmployees } from '@/hooks/useEmployees';
import { usePricing } from '@/hooks/usePricing';
import { useAccounting } from '@/hooks/useAccounting';
import { ReceiptPopup } from '@/components/ReceiptPopup';
import { createFiscalReceipt, saveWaybill } from '@/lib/rsge';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { POSProductGrid, POSCart, POSPaymentDialog, POSShiftDialog, POSMobileCart, POSSalesHistory } from '@/components/pos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { CreditCard, Search, History, ScanLine, Keyboard, DollarSign, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useHardwareScanner } from '@/hooks/useHardwareScanner';
import { useI18n } from '@/hooks/useI18n';
import { getTranslatedField } from '@/lib/i18n/content';

interface CartItem { id: string; productId: string; name: string; price: number; quantity: number; categoryId?: string; image?: string; }

export default function POSPage() {
  useRealtimeSync(['products', 'transactions', 'shift_sales', 'queue_tickets']);

  const { products } = useProducts();
  const { categories } = useCategories();
  const { bundles } = useBundles();
  const { rules } = usePriceRules();
  const { clients } = useClients();
  const { transactions, addTransaction } = useTransactions();
  const queryClient = useQueryClient();
  const { addInvoice, getNextInvoiceNumber } = useInvoices();
  const { receiptConfig } = useReceiptConfig();
  const { currentShift, openShift, closeShift, addSaleToShift } = useShifts();
  const { employees, authenticateByPin } = useEmployees();
  const { setActiveCashier } = useActiveCashier();
  const { useCoupon } = usePricing();
  const { addEntry } = useAccounting();
  const { t, lang } = useI18n();
  const isMobile = useIsMobile();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [startingCash, setStartingCash] = useState('');
  const [offlineSales, setOfflineSales] = useState<any[]>([]);

  const syncOfflineQueue = async () => {
    if (!navigator.onLine) return;
    try {
      const items = await offlineQueue.getQueuedSales();
      let syncedCount = 0;
      for (const item of items) {
        if (item.status === 'failed' || item.status === 'pending') {
          const { error: rpcError } = await supabase.rpc('process_sale', item.payload);
          if (!rpcError) {
            await offlineQueue.removeFromQueue(item.id);
            syncedCount++;
          } else {
            await offlineQueue.markAsFailed(item.id, rpcError.message);
          }
        }
      }
      if (syncedCount > 0) {
        toast.success(`${syncedCount} ${t('offline_synced') || 'ოკ'}`);
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['products'] });
      }
    } catch (err) {
      console.error('Offline Sync Error:', err);
    }
  };

  useEffect(() => {
    window.addEventListener('online', syncOfflineQueue);
    return () => window.removeEventListener('online', syncOfflineQueue);
  }, []);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'combined' | 'bog_qr' | 'tbc_pay' | 'keepz' | 'bnpl'>('cash');
  const [cashAmount, setCashAmount] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [selectedClient, setSelectedClient] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [createWaybill, setCreateWaybill] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    items: { name: string; quantity: number; price: number }[];
    total: number;
    cashAmount?: number;
    change?: number;
    paymentMethod: string;
    cashierName?: string;
    invoiceNumber?: string;
    clientName?: string;
    couponDiscount?: number;
    loyaltyDiscount?: number;
    pointsEarned?: number;
  } | null>(null);

  const { recordPurchase } = useClients();
  const cartTotal = cart.reduce((s, item) => s + item.price * item.quantity, 0);
  const selectedClientData = clients.find(c => c.id === selectedClient);
  const loyaltyDiscountPct = selectedClientData?.loyalty_tier === 'platinum' ? 0.1 :
    selectedClientData?.loyalty_tier === 'gold' ? 0.05 :
      selectedClientData?.loyalty_tier === 'silver' ? 0.03 : 0;

  const loyaltyDiscount = cartTotal * loyaltyDiscountPct;

  // Calculate Auto Bundle Discount
  let bundleDiscount = 0;
  if (bundles && bundles.length > 0 && cart.length > 0) {
    const remainingCart = cart.reduce((acc, item) => {
      acc[item.productId] = item.quantity;
      return acc;
    }, {} as Record<string, number>);

    for (const bundle of bundles) {
      if (!bundle.active || bundle.discount_value <= 0) continue;
      let canApply = true;
      while (canApply) {
        for (const item of bundle.items) {
          if ((remainingCart[item.product_id] || 0) < item.quantity) {
            canApply = false;
            break;
          }
        }
        if (canApply) {
          for (const item of bundle.items) {
            remainingCart[item.product_id] -= item.quantity;
          }
          if (bundle.discount_type === 'percentage') {
            let bundleValuePrice = 0;
            for (const item of bundle.items) {
              const p = products.find(prod => prod.id === item.product_id);
              if (p) bundleValuePrice += p.sell_price * item.quantity;
            }
            bundleDiscount += bundleValuePrice * (bundle.discount_value / 100);
          } else {
            bundleDiscount += bundle.discount_value;
          }
        }
      }
    }
  }

  const priceRulesDiscount = calculateDynamicDiscount({
    cart: cart.map(i => ({ productId: i.productId, price: i.price, quantity: i.quantity, categoryId: i.categoryId })),
    rules,
    clientId: selectedClientData?.id,
    clientLoyaltyTier: selectedClientData?.loyalty_tier
  });

  const finalTotal = Math.max(0, cartTotal - couponDiscount - loyaltyDiscount - bundleDiscount - priceRulesDiscount);
  const cartItemCount = cart.reduce((s, i) => s + i.quantity, 0);
  const pointsToEarn = Math.floor(finalTotal * 0.1);

  // Hardware barcode scanner support
  useHardwareScanner(
    useCallback((code: string) => {
      const product = products.find((p) => p.barcode === code);
      if (product) {
        addToCart(product);
        toast.success(`${product.name} ${t('added_to_cart_scanner') || 'ოკ'}`);
      } else {
        toast.error(`${t('product_not_found_barcode') || 'ოკ'}: ${code}`);
      }
    }, [products, t]),
    !paymentOpen && !pinOpen && !shiftOpen
  );

  const filteredProducts = products.filter((p) => {
    const displayName = getTranslatedField(p, 'name', lang);
    const matchesSearch = displayName.toLowerCase().includes(searchQuery.toLowerCase()) || (p.barcode || '').includes(searchQuery);
    const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: typeof products[0]) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { 
        id: crypto.randomUUID(), 
        productId: product.id, 
        name: getTranslatedField(product, 'name', lang), 
        price: product.sell_price, 
        quantity: 1, 
        categoryId: product.category_id, 
        image: product.images?.[0] 
      }];
    });
  };

  const addBundleToCart = (bundle: typeof bundles[0]) => {
    bundle.items.forEach(item => {
      const product = products.find(p => p.id === item.product_id);
      if (product) {
        for (let i = 0; i < item.quantity; i++) addToCart(product);
      }
    });
    toast.success(`${t('bundle') || 'ოკ'} "${bundle.name}" ${t('added_to_cart') || 'ოკ'}`);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => prev.map((i) => {
      if (i.productId === productId) {
        const newQty = Math.max(0, i.quantity + delta);
        return newQty === 0 ? null! : { ...i, quantity: newQty };
      }
      return i;
    }).filter(Boolean));
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCouponCode('');
    setCouponDiscount(0);
    setSelectedClient('');
  };

  const handleCouponValidate = () => {
    const result = useCoupon(couponCode, cartTotal);
    if (result.valid) {
      setCouponDiscount(result.discount);
      toast.success(`${t('coupon_applied') || 'ოკ'}: ₾${result.discount.toFixed(2)}`);
    } else {
      toast.error(t('invalid_coupon') || 'ოკ');
      setCouponDiscount(0);
    }
  };

  const handlePayment = async () => {
    if (!currentShift) { toast.error(t('open_shift_first') || 'ოკ'); return; }
    if (cart.length === 0) return;

    const now = new Date();
    const paymentType = paymentMethod === 'combined' ? 'mixed' : paymentMethod;
    const cashPaid = paymentMethod === 'cash' ? finalTotal : paymentMethod === 'combined' ? parseFloat(cashAmount) || 0 : 0;
    const cardPaid = paymentMethod === 'card' ? finalTotal : paymentMethod === 'combined' ? parseFloat(cardAmount) || 0 : 0;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error(t('auth_error') || 'ოკ'); return; }

      // Payload preparation
      const payload = {
        p_cart: cart.map(({ productId, name, price, quantity }) => ({ product_id: productId, name, price, qty: quantity })),
        p_payment: paymentType,
        p_total: finalTotal,
        p_cashier_id: currentShift.cashierId,
        p_client_id: selectedClient || null,
        p_coupon_discount: couponDiscount > 0 ? couponDiscount : 0,
        p_loyalty_discount: loyaltyDiscount > 0 ? loyaltyDiscount : 0,
        p_points_earned: pointsToEarn,
        p_user_id: user.id
      };

      let txId: string;

      if (!navigator.onLine) {
        txId = await offlineQueue.enqueueSale(payload);
        toast.success(t('sale_queued_offline') || 'ოკ');
      } else {
        // 1. Call atomic DB function for Sale
        const { data: rpcData, error: rpcError } = await supabase.rpc('process_sale', payload);

        if (rpcError) throw rpcError;
        if (!rpcData || !rpcData.success) {
          throw new Error(rpcData?.error || (t('sale_failed') || 'ოკ'));
        }
        txId = rpcData.transaction_id;
      }

      // 2. Refetch queries
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['journal_entries'] });

      const client = selectedClient ? clients.find((c) => c.id === selectedClient) : undefined;
      const invoiceNumber = getNextInvoiceNumber();

      // 3. Optional: Invoices & Receipts
      try {
        await addInvoice.mutateAsync({
          invoice_number: invoiceNumber, transaction_id: txId,
          client_id: client?.id, client_name: client?.name || '',
          total: finalTotal, status: 'paid', payment_method: paymentMethod,
          issued_date: now.toISOString(),
        });
        const txForPdf = {
          id: txId, total: finalTotal, payment_method: paymentMethod, date: now.toISOString(),
          items: cart.map(({ productId, name, price, quantity }) => ({
            id: '', transaction_id: txId, product_id: productId, name, price, quantity,
          })),
        };
        // @ts-ignore
        const doc = await generateInvoice({ transaction: txForPdf, client: client || null, config: receiptConfig, invoiceNumber });
        doc.save(`${invoiceNumber}.pdf`);
      } catch { /* Invoice creation failed but sale succeeded */ }

      // 4. Update Shift State
      addSaleToShift.mutate({ transactionId: txId, items: cart.map((item) => ({ productName: item.name, quantity: item.quantity, price: item.price, total: item.price * item.quantity })), total: finalTotal, paymentType, cashAmount: cashPaid, cardAmount: cardPaid, clientName: client?.name, cashierName: currentShift.cashierName });

      // 5. RS.Ge Integration 
      try {
        await createFiscalReceipt({ items: cart.map((item) => ({ name: item.name, qty: item.quantity, price: item.price, total: item.price * item.quantity })), total: finalTotal, paymentType: paymentMethod, cashierName: currentShift.cashierName });

        // Automated Waybill draft if requested
        if (createWaybill && client?.tin) {
          await saveWaybill({
            waybill_type: '1', // Default to internal/regular delivery
            buyer_tin: client.tin,
            start_address: 'საწყობი', // Default or config based
            end_address: client.address || '',
            comment: `ავტომატური ზედნადები POS-დან (#${invoiceNumber})`,
            goods_list: cart.map(item => ({
              name: item.name,
              unitId: '99', // Default to 'piece'
              quantity: String(item.quantity),
              price: String(item.price)
            }))
          });
          toast.success(t('rsge_waybill_created') || 'ოკ');
        }
      } catch (e: any) {
        console.error('RS.GE Error:', e);
        /* rs.ge not configured or failed but sale is done */
      }

      setReceiptData({
        items: cart.map((item) => ({ name: item.name, quantity: item.quantity, price: item.price })),
        total: finalTotal, cashAmount: cashPaid,
        change: paymentMethod === 'cash' ? Math.max(0, cashPaid - finalTotal) : undefined,
        paymentMethod, cashierName: currentShift.cashierName, invoiceNumber,
        clientName: client?.name,
        couponDiscount: couponDiscount > 0 ? couponDiscount : undefined,
        loyaltyDiscount: loyaltyDiscount > 0 ? loyaltyDiscount : undefined,
        pointsEarned: pointsToEarn > 0 ? pointsToEarn : undefined,
      });

      toast.success(`${t('pos_sale_complete')} ₾${finalTotal.toFixed(2)}`);
      clearCart();
      setPaymentOpen(false);
      setCreateWaybill(false);
    } catch (err: any) {
      toast.error(err.message || (t('sale_error') || 'ოკ'));
    }
  };

  const handlePinSubmit = async () => {
    const employee = await authenticateByPin(pin);
    if (employee) {
      setActiveCashier({ id: employee.id, full_name: employee.full_name });
      setPinOpen(false);
      setShiftOpen(true);
      setPin('');
    } else {
      toast.error(t('invalid_pin') || 'ოკ');
      setPin('');
    }
  };

  const handleOpenShift = async () => {
    const cashier = useActiveCashier.getState().activeCashier;
    if (!cashier) { toast.error(t('enter_pin_first') || 'ოკ'); return; }
    try {
      await openShift.mutateAsync({ cashierId: cashier.id, cashierName: cashier.full_name, openingCash: parseFloat(startingCash) || 0 });
      setShiftOpen(false);
      setStartingCash('');
      toast.success(`${t('shift_opened_cashier') || 'ოკ'} ${cashier.full_name}`);
    } catch (err: any) { toast.error(err.message || t('error')); }
  };

  const handleCloseShift = async () => {
    try {
      await closeShift.mutateAsync(0);
      setShiftOpen(false);
      toast.success(t('shift_closed') || 'ოკ');
    } catch (err: any) { toast.error(err.message || t('error')); }
  };

  const handleBarcodeScan = useCallback((code: string) => {
    const product = products.find((p) => p.barcode === code);
    if (product) { addToCart(product); toast.success(`${product.name} ${t('added_to_cart_scanner') || 'ოკ'}`); }
    else { toast.error(`${t('product_not_found_barcode') || 'ოკ'}: ${code}`); }
  }, [products, t]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'F1') { e.preventDefault(); if (cart.length > 0) setPaymentOpen(true); }
    if (e.key === 'F2') { e.preventDefault(); setScannerOpen(true); }
    if (e.key === 'F3') { e.preventDefault(); setHistoryOpen(true); }
    if (e.key === 'F4') { e.preventDefault(); currentShift ? setShiftOpen(true) : setPinOpen(true); }
    if (e.key === 'Escape') { clearCart(); }
  }, [cart, currentShift]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Sync to Customer Display
  useEffect(() => {
    try {
      const channel = new BroadcastChannel('pos-display');
      channel.postMessage({
        cart: cart.map(c => ({ ...c, price: c.price })),
        total: finalTotal,
      });
      return () => channel.close();
    } catch (err) {
      console.warn('BroadcastChannel not supported or failed', err);
    }
  }, [cart, finalTotal]);

  const change = paymentMethod === 'cash' ? Math.max(0, (parseFloat(cashAmount) || 0) - finalTotal) : 0;

  return (
    <PageTransition>
      <div className={isMobile ? "flex flex-col h-[calc(100vh-7rem)]" : "flex gap-4 h-[calc(100vh-7rem)]"}>
        {/* Left: Products */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            {currentShift && (
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-medium text-primary">{t('sales_cashier')}: {currentShift.cashierName}</span>
              </div>
            )}
            <NetworkStatus onSync={syncOfflineQueue} />
          </div>

          {/* Categories & Navigation */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('all')}
                className="rounded-full whitespace-nowrap whitespace-nowrap text-sm h-8 px-4"
              >
                {t('all')}
              </Button>
              <Button
                variant={selectedCategory === 'bundles' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('bundles')}
                className="rounded-full whitespace-nowrap whitespace-nowrap text-sm h-8 px-4 font-bold text-primary border-primary/20"
              >
                🎉 {t('pos_bundles') || 'ოკ'}
              </Button>
              {categories.map((c) => (
                <Button
                  key={c.id}
                  variant={selectedCategory === c.id ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(c.id)}
                  className="rounded-full whitespace-nowrap text-sm h-8 px-4"
                >
                  {c.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Search + actions */}
          <div className="flex items-center gap-2 mb-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t('pos_search_products')} className={`pl-9 ${isMobile ? 'h-9 text-sm' : ''}`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && filteredProducts.length === 1) { addToCart(filteredProducts[0]); setSearchQuery(''); } }} />
            </div>
            {!isMobile && (
              <>
                <Button size="sm" onClick={() => cart.length > 0 && setPaymentOpen(true)}>{t('pos_checkout_f1') || 'ოკ'}</Button>
                <Button size="sm" variant="outline" onClick={() => setScannerOpen(true)}><ScanLine className="mr-1 h-4 w-4" />{t('pos_scanner_f2') || 'ოკ'}</Button>
                <Button size="sm" variant="outline" onClick={() => setHistoryOpen(true)}>{t('pos_history_f3') || 'ოკ'}</Button>
                <Popover>
                  <PopoverTrigger asChild><Button size="sm" variant="ghost"><Keyboard className="h-4 w-4" /></Button></PopoverTrigger>
                  <PopoverContent className="w-64 text-sm">
                    <p className="font-semibold mb-2">{t('pos_shortcuts') || 'ოკ'}</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span>F1</span><span>{t('pos_checkout')}</span></div>
                      <div className="flex justify-between"><span>F2</span><span>{t('pos_scanner') || 'ოკ'}</span></div>
                      <div className="flex justify-between"><span>F3</span><span>{t('pos_history') || 'ოკ'}</span></div>
                      <div className="flex justify-between"><span>F4</span><span>{t('pos_shift') || 'ოკ'}</span></div>
                      <div className="flex justify-between"><span>Esc</span><span>{t('pos_clear') || 'ოკ'}</span></div>
                      <div className="flex justify-between"><span>Enter</span><span>{t('pos_quick_add') || 'ოკ'}</span></div>
                    </div>
                  </PopoverContent>
                </Popover>
              </>
            )}
            {isMobile && (
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => setScannerOpen(true)}><ScanLine className="h-4 w-4" /></Button>
                <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => setHistoryOpen(true)}><History className="h-4 w-4" /></Button>
                <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => currentShift ? setShiftOpen(true) : setPinOpen(true)}><DollarSign className="h-4 w-4" /></Button>
              </div>
            )}
          </div>

          {/* Product grid / Bundles grid */}
          {selectedCategory === 'bundles' ? (
            <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 flex-1 overflow-y-auto content-start py-1 pb-4">
              {bundles.filter(b => b.active).map(bundle => (
                <button
                  key={bundle.id}
                  onClick={() => addBundleToCart(bundle)}
                  className="stat-card card-hover text-left cursor-pointer relative transition-all active:scale-[0.97] p-3 border-primary/30 min-h-[100px] flex flex-col"
                >
                  <p className="font-bold text-sm text-primary line-clamp-2 leading-tight">{bundle.name}</p>
                  <p className="text-[10px] text-gray-500 mt-2 line-clamp-3 leading-tight flex-1">
                    {bundle.items.map(i => products.find(p => p.id === i.product_id)?.name).join(' + ')}
                  </p>
                  <div className="mt-2 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded inline-block">
                    {bundle.discount_type === 'percentage' ? `-${bundle.discount_value}% ${t('pos_discount_suffix') || 'ოკ'}` : `-₾${bundle.discount_value}`}
                  </div>
                </button>
              ))}
              {bundles.filter(b => b.active).length === 0 && (
                <div className="col-span-full text-center text-gray-400 py-10">
                  <p>{t('pos_no_bundles') || 'ოკ'}</p>
                </div>
              )}
            </div>
          ) : (
            <POSProductGrid products={filteredProducts} cart={cart} isMobile={isMobile} onAddToCart={addToCart} />
          )}

          {/* Mobile bottom bar */}
          {isMobile && (
            <div className="border-t bg-card pt-2 mt-1 safe-area-bottom">
              {cartItemCount > 0 ? (
                <div className="flex items-center gap-2">
                  <Button className="flex-1 h-12 text-base relative" onClick={() => setCartOpen(true)}>
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    <span className="mr-1">{t('pos_cart')}</span>
                    <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground text-xs mr-2">{cartItemCount}</Badge>
                    <span className="ml-auto font-bold text-base">₾{finalTotal.toFixed(2)}</span>
                  </Button>
                  <Button size="icon" variant="default" className="h-12 w-12 shrink-0" onClick={() => setPaymentOpen(true)}>
                    <CreditCard className="h-5 w-5" />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" className="w-full h-10 text-muted-foreground" onClick={() => setCartOpen(true)}>
                  <ShoppingCart className="mr-2 h-4 w-4" /> {t('pos_cart_empty')}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Right: Cart (desktop) */}
        {!isMobile && (
          <POSCart
            cart={cart} finalTotal={finalTotal} cartItemCount={cartItemCount}
            onUpdateQuantity={updateQuantity} onRemove={removeFromCart} onClear={clearCart}
            onPayment={() => cart.length > 0 && setPaymentOpen(true)}
            onShiftToggle={() => currentShift ? setShiftOpen(true) : setPinOpen(true)}
            currentShift={!!currentShift}
          />
        )
        }
      </div >

      {/* Mobile Cart Drawer */}
      {
        isMobile && (
          <POSMobileCart
            open={cartOpen} onOpenChange={setCartOpen}
            cart={cart} finalTotal={finalTotal} cartItemCount={cartItemCount} couponDiscount={couponDiscount}
            onUpdateQuantity={updateQuantity} onRemove={removeFromCart} onClear={clearCart}
            onPayment={() => setPaymentOpen(true)}
          />
        )
      }

      {/* Payment Dialog */}
      <POSPaymentDialog
        open={paymentOpen} onOpenChange={setPaymentOpen} finalTotal={finalTotal}
        paymentMethod={paymentMethod} onPaymentMethodChange={setPaymentMethod}
        cashAmount={cashAmount} onCashAmountChange={setCashAmount}
        cardAmount={cardAmount} onCardAmountChange={setCardAmount}
        couponCode={couponCode} onCouponCodeChange={setCouponCode}
        couponDiscount={couponDiscount} onCouponValidate={handleCouponValidate}
        selectedClient={selectedClient} onSelectedClientChange={setSelectedClient}
        clients={clients} onPayment={handlePayment} isPending={addTransaction.isPending}
        change={change}
        loyaltyDiscount={loyaltyDiscount}
        pointsToEarn={pointsToEarn}
        selectedClientData={selectedClientData}
        createWaybill={createWaybill}
        onCreateWaybillChange={setCreateWaybill}
      />

      {/* Shift Dialog */}
      <POSShiftDialog
        open={shiftOpen} onOpenChange={setShiftOpen} currentShift={currentShift}
        startingCash={startingCash} onStartingCashChange={setStartingCash}
        onOpenShift={handleOpenShift} onCloseShift={handleCloseShift}
      />

      {/* PIN Dialog */}
      <Dialog open={pinOpen} onOpenChange={setPinOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle className="text-center">{t('pos_pin_code') || 'ოკ'}</DialogTitle></DialogHeader>
          <div className="flex justify-center">
            <InputOTP maxLength={4} value={pin} onChange={setPin} onComplete={handlePinSubmit}>
              <InputOTPGroup>
                <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} /><InputOTPSlot index={3} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <p className="text-xs text-muted-foreground text-center">{t('pos_demo_pin') || 'ოკ'}</p>
        </DialogContent>
      </Dialog>

      {/* Sales History */}
      <POSSalesHistory 
        open={historyOpen} 
        onOpenChange={async (open) => {
            setHistoryOpen(open);
            if (open) {
                const queued = await offlineQueue.getQueuedSales();
                setOfflineSales(queued);
            }
        }} 
        transactions={transactions} 
        offlineSales={offlineSales}
      />

      <BarcodeScanner open={scannerOpen} onOpenChange={setScannerOpen} onScan={handleBarcodeScan} />

      <ReceiptPopup
        open={!!receiptData} onClose={() => setReceiptData(null)}
        items={receiptData?.items || []} total={receiptData?.total || 0}
        cashAmount={receiptData?.cashAmount} change={receiptData?.change}
        paymentMethod={receiptData?.paymentMethod || 'cash'}
        cashierName={receiptData?.cashierName} invoiceNumber={receiptData?.invoiceNumber}
        clientName={receiptData?.clientName} couponDiscount={receiptData?.couponDiscount}
        autoCloseMs={5000}
      />
    </PageTransition >
  );
}
