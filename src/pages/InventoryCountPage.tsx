import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageTransition } from '@/components/PageTransition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import {
    ClipboardList,
    Plus,
    Play,
    CheckCircle2,
    XCircle,
    ScanLine,
    Save,
    AlertTriangle
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface InventoryCount {
    id: string;
    name: string;
    status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
    started_at: string | null;
    completed_at: string | null;
    notes: string | null;
    created_at: string;
}

interface CountItem {
    product_id: string;
    expected_qty: number;
    counted_qty: number;
    variance: number;
    reason?: string;
    product: {
        name: string;
        sku: string;
        unit_price: number;
    };
}

export function InventoryCountPage() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'list' | 'active'>('list');
    const [activeCountId, setActiveCountId] = useState<string | null>(null);

    // Dialogs
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [newCountName, setNewCountName] = useState('');
    const [scannerOpen, setScannerOpen] = useState(false);

    // --- Queries ---
    const { data: counts = [], isLoading: countsLoading } = useQuery({
        queryKey: ['inventory-counts'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('inventory_counts')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data as InventoryCount[];
        }
    });

    const { data: countItems = [], isLoading: itemsLoading } = useQuery({
        queryKey: ['inventory-count-items', activeCountId],
        queryFn: async () => {
            if (!activeCountId) return [];
            const { data, error } = await supabase
                .from('inventory_count_items')
                .select(`
          *,
          product:products (name, sku, unit_price)
        `)
                .eq('count_id', activeCountId);
            if (error) throw error;
            return data as CountItem[];
        },
        enabled: !!activeCountId
    });

    // --- Mutations ---
    const createCount = useMutation({
        mutationFn: async (name: string) => {
            const { data, error } = await supabase
                .from('inventory_counts')
                .insert([{ name, status: 'draft' }])
                .select()
                .single();
            if (error) throw error;

            // Populate with all active products as expected quantities
            const { data: products } = await supabase
                .from('products')
                .select('id, quantity');

            if (products && products.length > 0) {
                const items = products.map(p => ({
                    count_id: data.id,
                    product_id: p.id,
                    expected_qty: p.quantity,
                    counted_qty: 0
                }));
                await supabase.from('inventory_count_items').insert(items);
            }

            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
            setCreateDialogOpen(false);
            setNewCountName('');
            setActiveCountId(data.id);
            setActiveTab('active');
            toast.success('ინვენტარიზაცია შეიქმნა');
        },
        onError: (error: any) => {
            toast.error('ფიქსირდება შეცდომა: ' + error.message);
        }
    });

    const updateCountState = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: InventoryCount['status'] }) => {
            const payload: any = { status };
            if (status === 'in_progress') payload.started_at = new Date().toISOString();
            if (status === 'completed' || status === 'cancelled') payload.completed_at = new Date().toISOString();

            const { error } = await supabase
                .from('inventory_counts')
                .update(payload)
                .eq('id', id);
            if (error) throw error;

            // Upon completion, optionally adjust real stock
            if (status === 'completed') {
                const { data: items } = await supabase
                    .from('inventory_count_items')
                    .select('*')
                    .eq('count_id', id);

                if (items) {
                    for (const item of items) {
                        if (item.expected_qty !== item.counted_qty) {
                            await supabase
                                .from('products')
                                .update({ quantity: item.counted_qty })
                                .eq('id', item.product_id);
                        }
                    }
                }
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
            if (variables.status === 'completed') {
                toast.success('ინვენტარიზაცია დასრულდა და მარაგები განახლდა');
                setActiveTab('list');
                setActiveCountId(null);
            } else if (variables.status === 'in_progress') {
                toast.success('ინვენტარიზაცია დაიწყო');
            }
        }
    });

    const updateItemQty = useMutation({
        mutationFn: async ({ productId, qty }: { productId: string, qty: number }) => {
            const { error } = await supabase
                .from('inventory_count_items')
                .update({ counted_qty: qty })
                .eq('count_id', activeCountId)
                .eq('product_id', productId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory-count-items', activeCountId] });
        }
    });

    // --- Handlers ---
    const handleBatchScan = (code: string) => {
        const item = countItems.find(i => i.product.sku === code || i.product_id === code);
        if (item) {
            updateItemQty.mutate({
                productId: item.product_id,
                qty: item.counted_qty + 1
            });
        } else {
            toast.error(`ბარკოდი ${code} არ მოიძებნა ამ სესიაში`);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'draft': return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">მონახაზი</span>;
            case 'in_progress': return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">მიმდინარე</span>;
            case 'completed': return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">დასრულებული</span>;
            case 'cancelled': return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">გაუქმებული</span>;
            default: return null;
        }
    };

    const activeCountRecord = counts.find(c => c.id === activeCountId);

    return (
        <PageTransition>
            <div className="space-y-6 max-w-[1200px] mx-auto">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <ClipboardList className="h-8 w-8 text-primary" />
                            ინვენტარიზაცია
                        </h1>
                        <p className="text-muted-foreground mt-1">საწყობის ფიზიკური აღწერა და შედარება დანაკლისზე</p>
                    </div>

                    {activeTab === 'list' ? (
                        <Button onClick={() => setCreateDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            ახალი აღწერა
                        </Button>
                    ) : (
                        <Button variant="outline" onClick={() => { setActiveTab('list'); setActiveCountId(null); }}>
                            უკან დაბრუნება
                        </Button>
                    )}
                </div>

                {activeTab === 'list' && (
                    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>დასახელება</TableHead>
                                    <TableHead>სტატუსი</TableHead>
                                    <TableHead>დაწყება</TableHead>
                                    <TableHead>დასრულება</TableHead>
                                    <TableHead className="text-right">მოქმედება</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {countsLoading ? (
                                    <TableRow><TableCell colSpan={5} className="text-center py-8">იტვირთება...</TableCell></TableRow>
                                ) : counts.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">ჩანაწერები არ არის</TableCell></TableRow>
                                ) : (
                                    counts.map((count) => (
                                        <TableRow key={count.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setActiveCountId(count.id); setActiveTab('active'); }}>
                                            <TableCell className="font-medium">{count.name}</TableCell>
                                            <TableCell>{getStatusBadge(count.status)}</TableCell>
                                            <TableCell>{count.started_at ? new Date(count.started_at).toLocaleDateString() : '-'}</TableCell>
                                            <TableCell>{count.completed_at ? new Date(count.completed_at).toLocaleDateString() : '-'}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm">გახსნა</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {activeTab === 'active' && activeCountRecord && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center bg-muted/30 p-4 rounded-xl border">
                            <div>
                                <h2 className="text-xl font-bold">{activeCountRecord.name}</h2>
                                <div className="flex items-center gap-2 mt-1">
                                    {getStatusBadge(activeCountRecord.status)}
                                    <span className="text-sm text-muted-foreground">
                                        {activeCountRecord.started_at && `დაიწყო: ${new Date(activeCountRecord.started_at).toLocaleDateString()}`}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {activeCountRecord.status === 'draft' && (
                                    <Button onClick={() => updateCountState.mutate({ id: activeCountRecord.id, status: 'in_progress' })}>
                                        <Play className="h-4 w-4 mr-2" />
                                        დაწყება
                                    </Button>
                                )}
                                {activeCountRecord.status === 'in_progress' && (
                                    <>
                                        <Button variant="outline" className="border-primary text-primary" onClick={() => setScannerOpen(true)}>
                                            <ScanLine className="h-4 w-4 mr-2" />
                                            ჯგუფური სკანირება
                                        </Button>
                                        <Button variant="default" className="bg-success hover:bg-success/90" onClick={() => updateCountState.mutate({ id: activeCountRecord.id, status: 'completed' })}>
                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                            დასრულება & კორექტირება
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>პროდუქტი</TableHead>
                                        <TableHead>SKU</TableHead>
                                        <TableHead className="text-right">სისტემაში (Expected)</TableHead>
                                        <TableHead className="text-right w-48">რეალური (Counted)</TableHead>
                                        <TableHead className="text-right">სხვაობა</TableHead>
                                        <TableHead className="text-right">სხვაობის ღირ.</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {itemsLoading ? (
                                        <TableRow><TableCell colSpan={6} className="text-center py-8">იტვირთება...</TableCell></TableRow>
                                    ) : countItems.map((item) => {
                                        const variance = item.counted_qty - item.expected_qty;
                                        const varianceValue = variance * item.product.unit_price;
                                        const isDiff = variance !== 0;

                                        return (
                                            <TableRow key={item.product_id} className={isDiff ? 'bg-amber-500/5' : ''}>
                                                <TableCell className="font-medium">{item.product.name}</TableCell>
                                                <TableCell className="font-mono text-xs">{item.product.sku}</TableCell>
                                                <TableCell className="text-right text-muted-foreground">{item.expected_qty}</TableCell>
                                                <TableCell className="text-right">
                                                    <Input
                                                        type="number"
                                                        className="w-24 text-right ml-auto h-8"
                                                        value={item.counted_qty}
                                                        disabled={activeCountRecord.status !== 'in_progress'}
                                                        onChange={(e) => updateItemQty.mutate({ productId: item.product_id, qty: Number(e.target.value) })}
                                                    />
                                                </TableCell>
                                                <TableCell className={`text-right font-bold ${variance < 0 ? 'text-destructive' : variance > 0 ? 'text-success' : 'text-muted-foreground'}`}>
                                                    {variance > 0 ? '+' : ''}{variance}
                                                </TableCell>
                                                <TableCell className={`text-right font-bold ${variance < 0 ? 'text-destructive' : variance > 0 ? 'text-success' : 'text-muted-foreground'}`}>
                                                    {formatCurrency(varianceValue)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                        {activeCountRecord.status === 'in_progress' && (
                            <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-200">
                                <AlertTriangle className="h-4 w-4" />
                                <p>სხვაობები ავტომატურად დაკორექტირდება "დასრულება"-ზე დაჭერისას.</p>
                            </div>
                        )}
                    </div>
                )}

            </div>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>ახალი ინვენტარიზაცია</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>სახელი / აღწერა</Label>
                            <Input
                                placeholder="მაგ: 2026 წლის თებერვლის სრული აღწერა"
                                value={newCountName}
                                onChange={(e) => setNewCountName(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>გაუქმება</Button>
                        <Button onClick={() => createCount.mutate(newCountName)} disabled={!newCountName || createCount.isPending}>
                            {createCount.isPending ? 'იქმნება...' : 'შექმნა'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Batch Scanner */}
            <BarcodeScanner
                open={scannerOpen}
                onOpenChange={setScannerOpen}
                onScan={handleBatchScan}
                batchMode={true}
            />
        </PageTransition>
    );
}
