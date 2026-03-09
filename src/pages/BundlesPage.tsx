import { useState } from 'react';
import { Plus, Trash2, Tag, Percent, ArrowLeft, Loader2, Save, ShoppingBag, ShoppingCart } from 'lucide-react';
import { PageTransition } from '@/components/PageTransition';
import { useBundles } from '@/hooks/useBundles';
import { useProducts } from '@/hooks/useProducts';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

export default function BundlesPage() {
    const { bundles, isLoading: loadingBundles, addBundle, deleteBundle } = useBundles();
    const { products, isLoading: loadingProducts } = useProducts();

    const [isAdding, setIsAdding] = useState(false);
    const [newBundleName, setNewBundleName] = useState('');
    const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('percentage');
    const [discountValue, setDiscountValue] = useState<number>(0);
    const [selectedItems, setSelectedItems] = useState<{ productId: string; quantity: number }[]>([]);

    if (loadingBundles || loadingProducts) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const handleCreate = async () => {
        if (!newBundleName.trim()) { toast.error('შეიყვანეთ კრებულის სახელი'); return; }
        if (selectedItems.length === 0) { toast.error('აირჩიეთ მინიმუმ 1 პროდუქტი'); return; }

        try {
            await addBundle.mutateAsync({
                bundle: {
                    name: newBundleName,
                    discount_type: discountValue > 0 ? discountType : null,
                    discount_value: discountValue,
                    active: true
                },
                items: selectedItems
            });

            toast.success('პროდუქტების კრებული წარმატებით შეიქმნა!');
            setIsAdding(false);
            setNewBundleName('');
            setDiscountValue(0);
            setSelectedItems([]);
        } catch (err: any) {
            toast.error(err.message || 'შეცდომა კრებულის შექმნისას');
        }
    };

    const addItem = (productId: string) => {
        if (!productId) return;
        const existing = selectedItems.find(i => i.productId === productId);
        if (existing) {
            setSelectedItems(selectedItems.map(i => i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            setSelectedItems([...selectedItems, { productId, quantity: 1 }]);
        }
    };

    const removeItem = (productId: string) => {
        setSelectedItems(selectedItems.filter(i => i.productId !== productId));
    };

    const updateItemQty = (productId: string, qty: number) => {
        if (qty <= 0) { removeItem(productId); return; }
        setSelectedItems(selectedItems.map(i => i.productId === productId ? { ...i, quantity: qty } : i));
    };

    // Calculate standard total price of selected items
    const standardTotal = selectedItems.reduce((acc, item) => {
        const p = products.find(prod => prod.id === item.productId);
        return acc + ((p?.sell_price || 0) * item.quantity);
    }, 0);

    // Calculate discounted total
    let discountedTotal = standardTotal;
    if (discountValue > 0) {
        if (discountType === 'percentage') {
            discountedTotal = standardTotal * (1 - (discountValue / 100));
        } else {
            discountedTotal = Math.max(0, standardTotal - discountValue);
        }
    }

    return (
        <PageTransition>
            <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
                <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Combo / პროდუქტების კრებული</h1>
                        <p className="text-gray-500 mt-1">მართეთ კრებულები და ავტომატური ფასდაკლებები POS-ისთვის</p>
                    </div>
                    {!isAdding && (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-hover flex items-center gap-2 font-medium"
                        >
                            <Plus className="w-5 h-5" />
                            ახალი კრებულის დამატება
                        </button>
                    )}
                </div>

                {isAdding ? (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex items-center justify-between mb-8 border-b pb-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <ShoppingBag className="w-6 h-6 text-primary" />
                                ახალი კრებულის შექმნა
                            </h2>
                            <button
                                onClick={() => setIsAdding(false)}
                                className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 flex items-center gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                უკან დაბრუნება
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Left Column: Bundle Details */}
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">კრებულის სახელი *</label>
                                    <input
                                        type="text"
                                        value={newBundleName}
                                        onChange={(e) => setNewBundleName(e.target.value)}
                                        placeholder="მაგ: ბურგერის მენიუ კომპლექსი"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">ფასდაკლების ტიპი</label>
                                        <select
                                            value={discountType}
                                            onChange={(e) => setDiscountType(e.target.value as any)}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        >
                                            <option value="percentage">პროცენტი (%)</option>
                                            <option value="fixed">ფიქსირებული (₾)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">ფასდაკლების მოცულობა</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={discountValue}
                                            onChange={(e) => setDiscountValue(Number(e.target.value))}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="bg-primary/5 rounded-2xl p-6 mt-6 border border-primary/10">
                                    <h3 className="font-medium text-primary mb-4">შემაჯამებელი ინფორმაცია</h3>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between items-center text-gray-600">
                                            <span>პროდუქტების საერთო ფასი:</span>
                                            <span className="font-semibold line-through">{formatCurrency(standardTotal)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-gray-600">
                                            <span>ფასდაკლება ({discountType === 'percentage' ? `${discountValue}%` : `₾${discountValue}`}):</span>
                                            <span className="font-semibold text-red-500">
                                                -{formatCurrency(standardTotal - discountedTotal)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center pt-3 border-t border-primary/20 text-lg">
                                            <span className="font-bold text-gray-900">კრებულის საბოლოო ფასი:</span>
                                            <span className="font-black text-primary">{formatCurrency(discountedTotal)}</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleCreate}
                                    disabled={addBundle.isPending}
                                    className="w-full py-4 bg-primary text-white rounded-xl hover:bg-primary-hover font-bold flex items-center justify-center gap-2 mt-8 disabled:opacity-50 transition-all shadow-lg shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-0.5"
                                >
                                    {addBundle.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    {addBundle.isPending ? 'ინახება...' : 'შექმნა და შენახვა'}
                                </button>
                            </div>

                            {/* Right Column: Items */}
                            <div className="space-y-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">აირჩიეთ პროდუქტები კრებულისთვის</label>
                                <select
                                    onChange={(e) => addItem(e.target.value)}
                                    value=""
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                >
                                    <option value="" disabled>+ პროდუქტის დამატება...</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.sell_price)})</option>
                                    ))}
                                </select>

                                <div className="bg-gray-50 rounded-2xl border border-gray-100 mt-4 min-h-[300px] p-4">
                                    {selectedItems.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-400 py-20">
                                            <ShoppingCart className="w-16 h-16 mb-4 opacity-20" />
                                            <p>არცერთი პროდუქტი არ არის დამატებული</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {selectedItems.map((item) => {
                                                const prod = products.find(p => p.id === item.productId);
                                                if (!prod) return null;
                                                return (
                                                    <div key={item.productId} className="flex justify-between items-center p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                                {item.quantity}x
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold">{prod.name}</h4>
                                                                <p className="text-sm text-gray-500">{formatCurrency(prod.sell_price)} / ცალი</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={item.quantity}
                                                                onChange={(e) => updateItemQty(item.productId, Number(e.target.value))}
                                                                className="w-16 px-2 py-1 text-center border rounded-lg focus:ring-primary/20 focus:border-primary"
                                                            />
                                                            <button
                                                                onClick={() => removeItem(item.productId)}
                                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                            >
                                                                <Trash2 className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {bundles.map((bundle) => {
                            // Calculate bundle totals
                            const bundleStdTotal = bundle.items.reduce((acc, bi) => {
                                const prod = products.find(p => p.id === bi.product_id);
                                return acc + ((prod?.sell_price || 0) * bi.quantity);
                            }, 0);

                            let bundleDiscountedTotal = bundleStdTotal;
                            if (bundle.discount_value > 0) {
                                if (bundle.discount_type === 'percentage') {
                                    bundleDiscountedTotal = bundleStdTotal * (1 - (bundle.discount_value / 100));
                                } else {
                                    bundleDiscountedTotal = Math.max(0, bundleStdTotal - bundle.discount_value);
                                }
                            }

                            return (
                                <div key={bundle.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group flex flex-col h-full relative overflow-hidden">

                                    {/* Decorative corner shape */}
                                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-colors"></div>

                                    <div className="flex justify-between items-start mb-6 relative z-10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border border-primary/10">
                                                {bundle.discount_value > 0 ? <Percent className="w-6 h-6 text-primary" /> : <Tag className="w-6 h-6 text-primary" />}
                                            </div>
                                            <h3 className="font-bold text-lg text-gray-900 leading-tight pr-2">{bundle.name}</h3>
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (window.confirm('ნამდვილად გსურთ კრებულის წაშლა?')) {
                                                    deleteBundle.mutate(bundle.id);
                                                }
                                            }}
                                            className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="flex-1 space-y-3 mb-6 relative z-10 w-full">
                                        {bundle.items.map((item, idx) => {
                                            const product = products.find(p => p.id === item.product_id);
                                            return (
                                                <div key={idx} className="flex justify-between items-center text-sm px-3 py-2 bg-gray-50/50 rounded-lg">
                                                    <span className="text-gray-700 font-medium truncate pr-3">{product?.name || 'უცნობი'}</span>
                                                    <span className="text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-100 shadow-sm shrink-0">x {item.quantity}</span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-gray-100 relative z-10">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm font-medium text-gray-400">საწყისი ფასი:</span>
                                            <span className="text-sm text-gray-400 line-through decoration-gray-300">{formatCurrency(bundleStdTotal)}</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <span className="text-sm font-bold text-gray-700">კრებულის ფასი:</span>
                                            <div className="flex items-center gap-2 text-primary font-black text-2xl">
                                                {formatCurrency(bundleDiscountedTotal)}
                                            </div>
                                        </div>
                                        {bundle.discount_value > 0 && (
                                            <div className="mt-3 flex gap-2">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-bold w-full justify-center border border-green-100">
                                                    ზოგავთ {formatCurrency(bundleStdTotal - bundleDiscountedTotal)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {bundles.length === 0 && (
                            <div className="col-span-full h-64 flex flex-col items-center justify-center text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200 px-8 text-center hidden md:flex">
                                <ShoppingBag className="w-16 h-16 mb-4 text-gray-300" />
                                <p className="text-lg font-medium text-gray-500 mb-1">არცერთი კრებული არ მოიძებნა</p>
                                <p className="text-sm">დაამატეთ ახალი "Combo", რათა მარტივად გაყიდოთ პროდუქტების ნაკრები</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </PageTransition>
    );
}
