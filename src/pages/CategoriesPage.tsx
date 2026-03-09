import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { useCategories } from '@/hooks/useCategories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CategoriesPage() {
  const { categories, subcategories, isLoading, addCategory, updateCategory, deleteCategory, addSubcategory, updateSubcategory, deleteSubcategory } = useCategories();
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [subEditDialogOpen, setSubEditDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [parentCatId, setParentCatId] = useState('');

  const handleSaveCategory = async () => {
    if (!name.trim()) return;
    try {
      if (editingId) {
        await updateCategory.mutateAsync({ id: editingId, name: name.trim() });
        toast.success('განახლდა');
      } else {
        await addCategory.mutateAsync(name.trim());
        toast.success('დაემატა');
      }
      setCatDialogOpen(false); setName(''); setEditingId(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSaveSubcategory = async () => {
    if (!name.trim() || !parentCatId) return;
    try {
      await addSubcategory.mutateAsync({ name: name.trim(), categoryId: parentCatId });
      toast.success('ქვეკატეგორია დაემატა');
      setSubDialogOpen(false); setName('');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategory.mutateAsync(id);
      toast.success('წაშლილია');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteSubcategory = async (id: string) => {
    try {
      await deleteSubcategory.mutateAsync(id);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdateSubcategory = async () => {
    if (!name.trim() || !editingSubId) return;
    try {
      await updateSubcategory.mutateAsync({ id: editingSubId, name: name.trim() });
      toast.success('ქვეკატეგორია განახლდა');
      setSubEditDialogOpen(false); setName(''); setEditingSubId(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (isLoading) {
    return (
      <PageTransition>
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">კატეგორიები</h1>
          <Button onClick={() => { setEditingId(null); setName(''); setCatDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" />დამატება</Button>
        </div>
        <div className="stat-card">
          {categories.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">კატეგორიები ვერ მოიძებნა</p>
          ) : (
            <Accordion type="multiple">
              {categories.map((cat) => (
                <AccordionItem key={cat.id} value={cat.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <span>{cat.name}</span>
                      <span className="text-xs text-muted-foreground">({subcategories.filter((s) => s.category_id === cat.id).length} ქვეკატ.)</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pl-4">
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => { setEditingId(cat.id); setName(cat.name); setCatDialogOpen(true); }}><Pencil className="h-3 w-3 mr-1" />რედაქტირება</Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteCategory(cat.id)}><Trash2 className="h-3 w-3 mr-1" />წაშლა</Button>
                        <Button size="sm" variant="outline" onClick={() => { setParentCatId(cat.id); setName(''); setSubDialogOpen(true); }}><Plus className="h-3 w-3 mr-1" />ქვეკატეგორია</Button>
                      </div>
                      {subcategories.filter((s) => s.category_id === cat.id).map((sub) => (
                        <div key={sub.id} className="flex items-center justify-between py-1 px-3 rounded bg-muted/30">
                          <span className="text-sm">{sub.name}</span>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditingSubId(sub.id); setName(sub.name); setSubEditDialogOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleDeleteSubcategory(sub.id)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </div>

      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>{editingId ? 'რედაქტირება' : 'ახალი კატეგორია'}</DialogTitle></DialogHeader>
          <div className="space-y-2"><Label>სახელი</Label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} /></div>
          <DialogFooter><Button onClick={handleSaveCategory} disabled={addCategory.isPending || updateCategory.isPending}>შენახვა</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={subDialogOpen} onOpenChange={setSubDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>ახალი ქვეკატეგორია</DialogTitle></DialogHeader>
          <div className="space-y-2"><Label>სახელი</Label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} /></div>
          <DialogFooter><Button onClick={handleSaveSubcategory} disabled={addSubcategory.isPending}>დამატება</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={subEditDialogOpen} onOpenChange={setSubEditDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>ქვეკატეგორიის რედაქტირება</DialogTitle></DialogHeader>
          <div className="space-y-2"><Label>სახელი</Label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} /></div>
          <DialogFooter><Button onClick={handleUpdateSubcategory} disabled={updateSubcategory.isPending}>განახლება</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
