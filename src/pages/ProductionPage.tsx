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
import { Plus, Trash2, Loader2, Calculator, Info, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function ProductionPage() {
  const { products } = useProducts();
  const { ingredients, recipes, productionOrders, isLoading, addIngredient, deleteIngredient, addRecipe, updateRecipe, deleteRecipe, addProductionOrder, executeProduction, calculateCost } = useProduction();
  const [ingDialogOpen, setIngDialogOpen] = useState(false);
  const [recDialogOpen, setRecDialogOpen] = useState(false);
  const [ordDialogOpen, setOrdDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<any>(null);
  const [ingForm, setIngForm] = useState({ name: '', unit: 'კგ', price: '', stock: '' });
  const [recForm, setRecForm] = useState({ 
    name: '', 
    product_id: '', 
    wastage_percent: '0', 
    labor_cost: '0', 
    overhead_cost: '0', 
    production_instructions: '',
    ingredients: [] as { ingredient_id: string; quantity: number }[] 
  });
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

  const handleSaveRecipe = async () => {
    if (!recForm.name || recForm.ingredients.length === 0) return;
    try {
      const payload = {
        name: recForm.name,
        product_id: recForm.product_id || undefined,
        wastage_percent: parseFloat(recForm.wastage_percent) || 0,
        labor_cost: parseFloat(recForm.labor_cost) || 0,
        overhead_cost: parseFloat(recForm.overhead_cost) || 0,
        production_instructions: recForm.production_instructions,
        ingredients: recForm.ingredients
      };

      if (editingRecipe) {
        await updateRecipe.mutateAsync({ id: editingRecipe.id, updates: payload });
        toast.success('რეცეპტი განახლდა');
      } else {
        await addRecipe.mutateAsync(payload);
        toast.success('რეცეპტი დაემატა');
      }
      setRecDialogOpen(false); 
      setEditingRecipe(null);
      setRecForm({ name: '', product_id: '', wastage_percent: '0', labor_cost: '0', overhead_cost: '0', production_instructions: '', ingredients: [] });
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
            <Button onClick={() => { setEditingRecipe(null); setRecForm({ name: '', product_id: '', wastage_percent: '0', labor_cost: '0', overhead_cost: '0', production_instructions: '', ingredients: [] }); setRecDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />ახალი რეცეპტი
            </Button>
            <div className="stat-card"><Table><TableHeader><TableRow><TableHead>სახელი</TableHead><TableHead>ინგრედიენტები</TableHead><TableHead>ხარჯების დაშლა</TableHead><TableHead className="text-right">თვითღირებულება</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>{recipes.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">
                    {r.ingredients.map((ri) => { 
                      const ing = ingredients.find((i) => i.id === ri.ingredient_id); 
                      return ing ? `${ing.name} x${ri.quantity}` : ''; 
                    }).join(', ')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                       {r.wastage_percent > 0 && <Badge variant="outline" className="text-[10px] py-0">დანაკარგი: {r.wastage_percent}%</Badge>}
                       {r.labor_cost > 0 && <Badge variant="outline" className="text-[10px] py-0">ხელფასი: ₾{r.labor_cost}</Badge>}
                       {r.overhead_cost > 0 && <Badge variant="outline" className="text-[10px] py-0">ზედნ.: ₾{r.overhead_cost}</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-right">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help border-b border-dotted border-primary/50">₾{calculateCost(r.id).toFixed(2)}</span>
                        </TooltipTrigger>
                        <TooltipContent className="p-3 w-64 space-y-2">
                          <p className="font-bold text-xs uppercase tracking-wider mb-1">ხარჯების დაშლა</p>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between"><span>მასალები:</span> <span>₾{(r.ingredients.reduce((sum, ri) => {
                              const ing = ingredients.find(i => i.id === ri.ingredient_id);
                              return sum + (ing ? ing.cost_per_unit * ri.quantity : 0);
                            }, 0)).toFixed(2)}</span></div>
                            <div className="flex justify-between text-destructive"><span>დანაკარგი ({r.wastage_percent}%):</span> <span>+₾{((r.ingredients.reduce((sum, ri) => {
                              const ing = ingredients.find(i => i.id === ri.ingredient_id);
                              return sum + (ing ? ing.cost_per_unit * ri.quantity : 0);
                            }, 0)) * (r.wastage_percent / 100)).toFixed(2)}</span></div>
                            <div className="flex justify-between"><span>ხელფასი:</span> <span>+₾{r.labor_cost.toFixed(2)}</span></div>
                            <div className="flex justify-between"><span>ზედნადები ხარჯი:</span> <span>+₾{r.overhead_cost.toFixed(2)}</span></div>
                            <div className="flex justify-between border-t pt-1 font-bold"><span>ჯამი:</span> <span className="text-primary">₾{calculateCost(r.id).toFixed(2)}</span></div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                        setEditingRecipe(r);
                        setRecForm({
                          name: r.name,
                          product_id: r.product_id || '',
                          wastage_percent: r.wastage_percent.toString(),
                          labor_cost: r.labor_cost.toString(),
                          overhead_cost: r.overhead_cost.toString(),
                          production_instructions: r.production_instructions || '',
                          ingredients: r.ingredients.map(ri => ({ ingredient_id: ri.ingredient_id, quantity: ri.quantity }))
                        });
                        setRecDialogOpen(true);
                      }}><Edit2 className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={async () => { if(confirm('ნამდვილად გსურთ წაშლა?')) await deleteRecipe.mutateAsync(r.id); }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}</TableBody>
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
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>დაკავშირებული პროდუქტი</Label>
                <Select value={recForm.product_id} onValueChange={(val) => setRecForm({ ...recForm, product_id: val })}>
                  <SelectTrigger><SelectValue placeholder="აირჩიეთ" /></SelectTrigger>
                  <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>დანაკარგი (Wastage %)</Label><Input type="number" value={recForm.wastage_percent} onChange={(e) => setRecForm({ ...recForm, wastage_percent: e.target.value })} /></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>ხელფასი (Labor Cost)</Label><Input type="number" value={recForm.labor_cost} onChange={(e) => setRecForm({ ...recForm, labor_cost: e.target.value })} /></div>
              <div className="space-y-1"><Label>ზედნადები (Overhead)</Label><Input type="number" value={recForm.overhead_cost} onChange={(e) => setRecForm({ ...recForm, overhead_cost: e.target.value })} /></div>
            </div>

            <div className="space-y-1"><Label>ინსტრუქციები (წარმოებისთვის)</Label><Textarea value={recForm.production_instructions} onChange={(e) => setRecForm({ ...recForm, production_instructions: e.target.value })} placeholder="ნაბიჯ-ნაბიჯ ინსტრუქცია..." /></div>

            <div className="border-t pt-3 mt-1">
              <Label className="mb-2 block">შემადგენლობა (BOM)</Label>
              <div className="flex gap-2 mb-2">
                <Select value={selectedIngredient} onValueChange={setSelectedIngredient}><SelectTrigger className="flex-1"><SelectValue placeholder="ინგრედიენტი" /></SelectTrigger><SelectContent>{ingredients.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent></Select>
                <Input type="number" placeholder="რაოდ." value={ingQty} onChange={(e) => setIngQty(e.target.value)} className="w-20" />
                <Button variant="secondary" onClick={addIngToRecipe}>+</Button>
              </div>
              <div className="max-h-32 overflow-auto space-y-1 bg-muted/20 p-2 rounded-md border min-h-[40px]">
                {recForm.ingredients.length > 0 ? recForm.ingredients.map((ri, idx) => { 
                  const ing = ingredients.find((i) => i.id === ri.ingredient_id); 
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs bg-background p-1.5 rounded border shadow-sm">
                      <span>{ing?.name} x{ri.quantity} {ing?.unit}</span>
                      <span className="text-muted-foreground">₾{(ing ? ing.cost_per_unit * ri.quantity : 0).toFixed(2)}</span>
                    </div>
                  ); 
                }) : <p className="text-[10px] text-muted-foreground text-center py-2">ინგრედიენტები არ არის</p>}
              </div>
            </div>

            <div className="bg-primary/5 p-3 rounded-lg border border-primary/20 flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-semibold">
                <Calculator className="h-4 w-4" />
                <span>ჯამური თვითღირებულება:</span>
              </div>
              <span className="text-lg font-bold text-primary">
                ₾{(() => {
                  const materialCost = recForm.ingredients.reduce((sum, ri) => {
                    const ing = ingredients.find(i => i.id === ri.ingredient_id);
                    return sum + (ing ? ing.cost_per_unit * ri.quantity : 0);
                  }, 0);
                  const wastage = parseFloat(recForm.wastage_percent) || 0;
                  const labor = parseFloat(recForm.labor_cost) || 0;
                  const overhead = parseFloat(recForm.overhead_cost) || 0;
                  return (materialCost * (1 + wastage / 100) + labor + overhead).toFixed(2);
                })()}
              </span>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSaveRecipe} className="w-full" disabled={addRecipe.isPending || updateRecipe.isPending}>{(addRecipe.isPending || updateRecipe.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingRecipe ? 'ცვლილებების შენახვა' : 'რეცეპტის შენახვა'}</Button></DialogFooter>
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
