import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { useProduction } from '@/hooks/useProduction';
import { useProducts } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ProductionPage() {
  const { products } = useProducts();
  const { ingredients, recipes, productionOrders, isLoading, addIngredient, deleteIngredient, addRecipe, addProductionOrder, executeProduction, calculateCost } = useProduction();
  const [ingDialogOpen, setIngDialogOpen] = useState(false);
  const [recDialogOpen, setRecDialogOpen] = useState(false);
  const [ordDialogOpen, setOrdDialogOpen] = useState(false);
  const [ingForm, setIngForm] = useState({ name: '', unit: 'კგ', price: '', stock: '' });
  const [recForm, setRecForm] = useState({ name: '', product_id: '', ingredients: [] as { ingredient_id: string; quantity: number }[] });
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [ingQty, setIngQty] = useState('');
  const [ordRecipeId, setOrdRecipeId] = useState('');
  const [ordQty, setOrdQty] = useState('');

  const handleAddIngredient = async () => {
    if (!ingForm.name || !ingForm.price) return;
    try {
      await addIngredient.mutateAsync({ name: ingForm.name, unit: ingForm.unit, cost_per_unit: parseFloat(ingForm.price), current_stock: parseFloat(ingForm.stock) || 0 });
      toast.success('ინგრედიენტი დაემატა');
      setIngDialogOpen(false); setIngForm({ name: '', unit: 'კგ', price: '', stock: '' });
    } catch (err: any) { toast.error(err.message); }
  };

  const handleAddRecipe = async () => {
    if (!recForm.name || recForm.ingredients.length === 0) return;
    try {
      await addRecipe.mutateAsync({
        name: recForm.name,
        product_id: recForm.product_id || undefined,
        ingredients: recForm.ingredients
      });
      toast.success('რეცეპტი დაემატა');
      setRecDialogOpen(false); setRecForm({ name: '', product_id: '', ingredients: [] });
    } catch (err: any) { toast.error(err.message); }
  };

  const addIngToRecipe = () => {
    if (!selectedIngredient || !ingQty) return;
    setRecForm((prev) => ({ ...prev, ingredients: [...prev.ingredients, { ingredient_id: selectedIngredient, quantity: parseFloat(ingQty) }] }));
    setSelectedIngredient(''); setIngQty('');
  };

  const handleAddOrder = async () => {
    if (!ordRecipeId || !ordQty) return;
    const recipe = recipes.find((r) => r.id === ordRecipeId);
    try {
      await addProductionOrder.mutateAsync({ recipe_id: ordRecipeId, recipe_name: recipe?.name || '', quantity: parseInt(ordQty) });
      toast.success('ორდერი შეიქმნა');
      setOrdDialogOpen(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleExecute = async (orderId: string) => {
    try {
      await executeProduction.mutateAsync(orderId);
      toast.success('წარმოება დასრულდა');
    } catch (err: any) { toast.error(err.message); }
  };

  if (isLoading) {
    return <PageTransition><div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></PageTransition>;
  }

  return (
    <PageTransition>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">წარმოება</h1>
        <Tabs defaultValue="ingredients">
          <TabsList><TabsTrigger value="ingredients">ინგრედიენტები</TabsTrigger><TabsTrigger value="recipes">რეცეპტები</TabsTrigger><TabsTrigger value="orders">ორდერები</TabsTrigger></TabsList>

          <TabsContent value="ingredients" className="space-y-4 mt-4">
            <Button onClick={() => setIngDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />დამატება</Button>
            <div className="stat-card"><Table><TableHeader><TableRow><TableHead>სახელი</TableHead><TableHead>ერთეული</TableHead><TableHead>ფასი</TableHead><TableHead>მარაგი</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>{ingredients.map((i) => (<TableRow key={i.id}><TableCell>{i.name}</TableCell><TableCell>{i.unit}</TableCell><TableCell>₾{i.cost_per_unit.toFixed(2)}</TableCell><TableCell>{i.current_stock}</TableCell><TableCell><Button size="icon" variant="ghost" className="text-destructive" onClick={async () => { try { await deleteIngredient.mutateAsync(i.id); toast.success('წაშლილია'); } catch { } }}><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>))}</TableBody>
            </Table></div>
          </TabsContent>

          <TabsContent value="recipes" className="space-y-4 mt-4">
            <Button onClick={() => setRecDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />ახალი რეცეპტი</Button>
            <div className="stat-card"><Table><TableHeader><TableRow><TableHead>სახელი</TableHead><TableHead>ინგრედიენტები</TableHead><TableHead>თვითღირებულება</TableHead></TableRow></TableHeader>
              <TableBody>{recipes.map((r) => (<TableRow key={r.id}><TableCell className="font-medium">{r.name}</TableCell><TableCell className="text-xs">{r.ingredients.map((ri) => { const ing = ingredients.find((i) => i.id === ri.ingredient_id); return ing ? `${ing.name} x${ri.quantity}` : ''; }).join(', ')}</TableCell><TableCell className="font-semibold">₾{calculateCost(r.id).toFixed(2)}</TableCell></TableRow>))}</TableBody>
            </Table></div>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4 mt-4">
            <Button onClick={() => setOrdDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />ახალი ორდერი</Button>
            <div className="stat-card"><Table><TableHeader><TableRow><TableHead>თარიღი</TableHead><TableHead>რეცეპტი</TableHead><TableHead>რაოდ.</TableHead><TableHead>სტატუსი</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>{productionOrders.map((o) => (<TableRow key={o.id}><TableCell className="text-xs">{new Date(o.created_at).toLocaleDateString('ka-GE')}</TableCell><TableCell>{o.recipe_name}</TableCell><TableCell>{o.quantity}</TableCell><TableCell><Badge variant={o.status === 'completed' ? 'default' : 'secondary'}>{o.status === 'completed' ? 'დასრულ.' : o.status === 'in_progress' ? 'მიმდინარე' : 'მოლოდინში'}</Badge></TableCell><TableCell>{o.status !== 'completed' && <Button size="sm" variant="outline" onClick={() => handleExecute(o.id)} disabled={executeProduction.isPending}>დასრულება</Button>}</TableCell></TableRow>))}</TableBody>
            </Table></div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={ingDialogOpen} onOpenChange={setIngDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>ახალი ინგრედიენტი</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1"><Label>სახელი</Label><Input value={ingForm.name} onChange={(e) => setIngForm({ ...ingForm, name: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label>ერთეული</Label><Input value={ingForm.unit} onChange={(e) => setIngForm({ ...ingForm, unit: e.target.value })} /></div>
              <div className="space-y-1"><Label>ფასი</Label><Input type="number" value={ingForm.price} onChange={(e) => setIngForm({ ...ingForm, price: e.target.value })} /></div>
              <div className="space-y-1"><Label>მარაგი</Label><Input type="number" value={ingForm.stock} onChange={(e) => setIngForm({ ...ingForm, stock: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleAddIngredient} disabled={addIngredient.isPending}>{addIngredient.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}დამატება</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={recDialogOpen} onOpenChange={setRecDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>ახალი რეცეპტი</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1"><Label>არაავტომატური სახელი</Label><Input value={recForm.name} onChange={(e) => setRecForm({ ...recForm, name: e.target.value })} /></div>
            <div className="space-y-1"><Label>დაკავშირებული პროდუქტი (POS-ისთვის)</Label>
              <Select value={recForm.product_id} onValueChange={(val) => setRecForm({ ...recForm, product_id: val })}>
                <SelectTrigger><SelectValue placeholder="აირჩიეთ პროდუქტი" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Select value={selectedIngredient} onValueChange={setSelectedIngredient}><SelectTrigger><SelectValue placeholder="ინგრედიენტი" /></SelectTrigger><SelectContent>{ingredients.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent></Select>
              <Input type="number" placeholder="რაოდ." value={ingQty} onChange={(e) => setIngQty(e.target.value)} className="w-24" />
              <Button onClick={addIngToRecipe}>+</Button>
            </div>
            {recForm.ingredients.length > 0 && <div className="space-y-1">{recForm.ingredients.map((ri, idx) => { const ing = ingredients.find((i) => i.id === ri.ingredient_id); return <div key={idx} className="text-sm bg-muted/30 px-2 py-1 rounded">{ing?.name} x{ri.quantity}</div>; })}</div>}
          </div>
          <DialogFooter><Button onClick={handleAddRecipe} disabled={addRecipe.isPending}>{addRecipe.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}შენახვა</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={ordDialogOpen} onOpenChange={setOrdDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>ახალი ორდერი</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1"><Label>რეცეპტი</Label><Select value={ordRecipeId} onValueChange={setOrdRecipeId}><SelectTrigger><SelectValue placeholder="აირჩიეთ" /></SelectTrigger><SelectContent>{recipes.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>რაოდენობა</Label><Input type="number" value={ordQty} onChange={(e) => setOrdQty(e.target.value)} /></div>
          </div>
          <DialogFooter><Button onClick={handleAddOrder} disabled={addProductionOrder.isPending}>{addProductionOrder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}შექმნა</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
