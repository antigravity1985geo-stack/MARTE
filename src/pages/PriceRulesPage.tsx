import { useState } from 'react';
import { Plus, Trash2, Tag, Percent, ArrowLeft, Loader2, Save, Tags, Clock, Users, Layers, Zap } from 'lucide-react';
import { PageTransition } from '@/components/PageTransition';
import { usePriceRules, PriceRuleType } from '@/hooks/usePriceRules';
import { useCategories } from '@/hooks/useCategories';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

export default function PriceRulesPage() {
    const { rules, isLoading: loadingRules, addRule, deleteRule, updateRule } = usePriceRules();
    const { categories, isLoading: loadingCategories } = useCategories();

    const [isAdding, setIsAdding] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [type, setType] = useState<PriceRuleType>('bulk');
    const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('percentage');
    const [discountValue, setDiscountValue] = useState<number>(0);
    const [priority, setPriority] = useState<number>(0);
    const [active, setActive] = useState(true);

    // Conditions
    const [minQty, setMinQty] = useState(3);
    const [timeAfter, setTimeAfter] = useState('18:00');
    const [timeBefore, setTimeBefore] = useState('23:59');
    const [categoryId, setCategoryId] = useState('');
    const [loyaltyTier, setLoyaltyTier] = useState('gold');

    if (loadingRules || loadingCategories) {
        return (
            <div className="flex justify-center items-center h-full min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const getTypeIcon = (t: PriceRuleType) => {
        switch (t) {
            case 'bulk': return <Layers className="w-5 h-5" />;
            case 'time_based': return <Clock className="w-5 h-5" />;
            case 'category': return <Tags className="w-5 h-5" />;
            case 'loyalty_tier': return <Users className="w-5 h-5" />;
            case 'bundle': return <Zap className="w-5 h-5" />;
            default: return <Tag className="w-5 h-5" />;
        }
    };

    const getTypeName = (t: PriceRuleType) => {
        switch (t) {
            case 'bulk': return 'რაოდენობაზე';
            case 'time_based': return 'დროზე დამოკიდებული';
            case 'category': return 'კატეგორიაზე';
            case 'loyalty_tier': return 'ლოიალობის დონეზე';
            case 'bundle': return 'სპეციალური კრებული';
            default: return t;
        }
    };

    const handleCreate = async () => {
        if (!name.trim()) { toast.error('შეიყვანეთ წესის სახელი'); return; }
        if (discountValue <= 0) { toast.error('ფასდაკლების მნიშვნელობა უნდა იყოს 0-ზე მეტი'); return; }

        let condition: any = {};
        if (type === 'bulk') condition.min_qty = minQty;
        if (type === 'time_based') { condition.after = timeAfter; condition.before = timeBefore; }
        if (type === 'category') {
            if (!categoryId) { toast.error('აირჩიეთ კატეგორია'); return; }
            condition.category_id = categoryId;
        }
        if (type === 'loyalty_tier') condition.tier = loyaltyTier;

        try {
            await addRule.mutateAsync({
                name, type, discount_type: discountType, discount_value: discountValue,
                priority, active, condition, valid_from: null, valid_until: null
            });

            toast.success('წესი წარმატებით შეიქმნა!');
            setIsAdding(false);
            setName(''); setDiscountValue(0); setPriority(0);
        } catch (err: any) {
            toast.error(err.message || 'შეცდომა შექმნისას');
        }
    };

    return (
        <PageTransition>
            <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
                <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">დინამიური ფასები / ფასდაკლებები</h1>
                        <p className="text-gray-500 mt-1">მართეთ ავტომატური ფასდაკლების წესები POS-ისთვის</p>
                    </div>
                    {!isAdding && (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-hover flex items-center gap-2 font-medium"
                        >
                            <Plus className="w-5 h-5" />
                            ახალი წესის დამატება
                        </button>
                    )}
                </div>

                {isAdding ? (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex items-center justify-between mb-8 border-b pb-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Zap className="w-6 h-6 text-primary" />
                                ახალი ფასდაკლების გაწერა
                            </h2>
                            <button
                                onClick={() => setIsAdding(false)}
                                className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 flex items-center gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                გაუქმება
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Left Column: Basic Details */}
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">წესის სახელწოდება *</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="მაგ: Happy Hour პარასკევს"
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
                                        <label className="block text-sm font-medium text-gray-700 mb-2">მოცულობა</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={discountValue}
                                            onChange={(e) => setDiscountValue(Number(e.target.value))}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">პრიორიტეტი (მეტი = მნიშვნელოვანი)</label>
                                    <input
                                        type="number"
                                        value={priority}
                                        onChange={(e) => setPriority(Number(e.target.value))}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    />
                                </div>

                                <label className="flex items-center gap-3 cursor-pointer p-4 border rounded-xl bg-gray-50">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                                        checked={active}
                                        onChange={(e) => setActive(e.target.checked)}
                                    />
                                    <span className="font-medium">აქტიური წესი (ჩართვა/გამორთვა)</span>
                                </label>
                            </div>

                            {/* Right Column: Conditions */}
                            <div className="space-y-6">
                                <div className="p-5 bg-primary/5 rounded-2xl border border-primary/10">
                                    <label className="block text-sm font-bold text-primary mb-3">რა შემთხვევაში მოქმედებს? (პირობა)</label>
                                    <select
                                        value={type}
                                        onChange={(e) => setType(e.target.value as PriceRuleType)}
                                        className="w-full px-4 py-3 mb-4 bg-white border border-primary/20 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    >
                                        <option value="bulk">გარკვეულ რაოდენობაზე (Bulk)</option>
                                        <option value="time_based">დროის მიხედვით (Time-based / Happy Hour)</option>
                                        <option value="category">კონკრეტულ კატეგორიაზე (Category)</option>
                                    </select>

                                    {/* Conditional Fields */}
                                    {type === 'bulk' && (
                                        <div className="animate-in fade-in zoom-in-95 duration-200">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">მინიმალური რაოდენობა კალათაში</label>
                                            <input
                                                type="number" min="1" value={minQty}
                                                onChange={(e) => setMinQty(Number(e.target.value))}
                                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl"
                                            />
                                            <p className="text-xs text-gray-500 mt-2">მაგ: შეიყვანეთ 3. თუ მომხმარებელი იყიდის 3 ან მეტ პროდუქტს, ფასდაკლება გააქტიურდება.</p>
                                        </div>
                                    )}

                                    {type === 'time_based' && (
                                        <div className="animate-in fade-in zoom-in-95 duration-200 space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">საიდან (ფასდაკლების დაწყება)</label>
                                                <input
                                                    type="time" value={timeAfter}
                                                    onChange={(e) => setTimeAfter(e.target.value)}
                                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">სადამდე (ფასდაკლების დასრულება)</label>
                                                <input
                                                    type="time" value={timeBefore}
                                                    onChange={(e) => setTimeBefore(e.target.value)}
                                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {type === 'category' && (
                                        <div className="animate-in fade-in zoom-in-95 duration-200">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">აირჩიეთ კატეგორია</label>
                                            <select
                                                value={categoryId}
                                                onChange={(e) => setCategoryId(e.target.value)}
                                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl"
                                            >
                                                <option value="" disabled>-- კატეგორია --</option>
                                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={handleCreate}
                                    disabled={addRule.isPending}
                                    className="w-full py-4 bg-primary text-white rounded-xl hover:bg-primary-hover font-bold flex items-center justify-center gap-2 mt-8 disabled:opacity-50 transition-all shadow-lg shadow-primary/30"
                                >
                                    {addRule.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    {addRule.isPending ? 'ინახება...' : 'წესის შენახვა'}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rules.map((rule) => (
                            <div key={rule.id} className={`bg-white rounded-3xl p-6 shadow-sm border ${rule.active ? 'border-primary/20 ring-1 ring-primary/10' : 'border-gray-200 opacity-60'} hover:shadow-md transition-all flex flex-col h-full relative`}>
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${rule.active ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'}`}>
                                            {getTypeIcon(rule.type)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900 leading-tight pr-2">{rule.name}</h3>
                                            <p className="text-xs text-gray-500 mt-1">{getTypeName(rule.type)}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 space-y-3 mb-6">
                                    <div className="bg-gray-50 rounded-xl p-3 text-sm">
                                        {rule.type === 'bulk' && <p>რაოდენობა ≥ <span className="font-bold text-primary">{rule.condition.min_qty}</span> ცალი</p>}
                                        {rule.type === 'time_based' && <p>დრო: <span className="font-bold text-primary">{rule.condition.after} - {rule.condition.before}</span></p>}
                                        {rule.type === 'category' && <p>კატეგორია ID: <span className="font-bold text-primary truncate block">{rule.condition.category_id}</span></p>}
                                    </div>
                                </div>

                                <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-end">
                                    <div>
                                        <span className="text-xs font-semibold text-gray-400 block mb-1">ფასდაკლების ტიპი</span>
                                        <div className="flex items-center gap-1 font-bold text-lg text-green-600">
                                            {rule.discount_type === 'percentage' ? <><Percent className="w-4 h-4" />{rule.discount_value}%</> : <>- ₾{rule.discount_value}</>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (window.confirm('ნამდვილად გსურთ წესის წაშლა?')) {
                                                deleteRule.mutate(rule.id);
                                            }
                                        }}
                                        className="p-2 text-gray-300 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {rules.length === 0 && (
                            <div className="col-span-full h-64 flex flex-col items-center justify-center text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200 px-8 text-center hidden md:flex">
                                <Zap className="w-16 h-16 mb-4 text-gray-300" />
                                <p className="text-lg font-medium text-gray-500 mb-1">არცერთი წესი არ არის შექმნილი</p>
                                <p className="text-sm">დაამატეთ ახალი წესი, რათა POS-მა ავტომატურად დაითვალოს ფასდაკლებები</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </PageTransition>
    );
}
