import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { PageTransition } from '@/components/PageTransition';

export const formatCurrency = (amount: number) => `₾${amount.toFixed(2)}`;

export interface CustomerDisplayState {
    cart: any[];
    total: number;
    loyaltyPoints?: number;
    promos?: string[];
}

export default function CustomerDisplay() {
    const [state, setState] = useState<CustomerDisplayState>({
        cart: [],
        total: 0,
        promos: ['🎉 შეიძინე 3 ნივთი და მიიღე 1 საჩუქრად!', '🌟 გამოიყენე შენი დაგროვილი ქულები'],
    });

    useEffect(() => {
        // Standard BroadcastChannel API for cross-window communication
        const channel = new BroadcastChannel('pos-display');

        channel.onmessage = (event) => {
            if (event.data) {
                setState((prev) => ({ ...prev, ...event.data }));
            }
        };

        return () => {
            channel.close();
        };
    }, []);

    return (
        <PageTransition>
            <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
                {/* Left Side: Cart Items */}
                <div className="flex-1 p-8 bg-white shadow-xl flex flex-col">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-4 bg-primary/10 rounded-full">
                            <ShoppingCart className="w-8 h-8 text-primary" />
                        </div>
                        <h1 className="text-3xl font-bold">თქვენი კალათა</h1>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-4 space-y-4">
                        <AnimatePresence>
                            {state.cart.map((item, index) => (
                                <motion.div
                                    key={`${item.id}-${index}`}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="flex justify-between items-center p-6 bg-gray-50 rounded-2xl border border-gray-100"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-xl font-bold text-primary">
                                            {item.quantity}x
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-semibold">{item.name}</h3>
                                            <p className="text-gray-500">{formatCurrency(item.price)}</p>
                                        </div>
                                    </div>
                                    <div className="text-2xl font-bold">
                                        {formatCurrency(item.price * item.quantity)}
                                    </div>
                                </motion.div>
                            ))}
                            {state.cart.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4 pt-20">
                                    <ShoppingCart className="w-24 h-24 opacity-20" />
                                    <p className="text-xl">კალათა ცარიელია</p>
                                    <p className="text-sm">კლიენტის ეკრანი მზად არის სკანირებისთვის</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="pt-8 mt-8 border-t-4 border-gray-100">
                        <div className="flex justify-between items-end">
                            <span className="text-2xl text-gray-500 font-medium">სულ ჯამი:</span>
                            <span className="text-6xl font-black text-primary">
                                {formatCurrency(state.total)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right Side: Promos & Loyalty */}
                <div className="w-full md:w-[400px] lg:w-[500px] bg-gradient-to-br from-primary to-primary-hover text-white p-8 flex flex-col min-h-[30vh]">
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-6 opacity-90">სპეციალური შეთავაზებები</h2>
                        <div className="space-y-4">
                            {state.promos?.map((promo, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.2 }}
                                    className="p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20"
                                >
                                    <p className="text-lg font-medium">{promo}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {state.loyaltyPoints !== undefined && (
                        <div className="mt-auto p-8 bg-white text-primary rounded-3xl shadow-2xl text-center">
                            <p className="text-sm font-bold uppercase tracking-wider mb-2 opacity-80">დაგროვილი ქულები</p>
                            <p className="text-5xl font-black">{state.loyaltyPoints}</p>
                        </div>
                    )}
                </div>
            </div>
        </PageTransition>
    );
}
