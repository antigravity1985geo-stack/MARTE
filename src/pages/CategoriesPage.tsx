import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { useCategories, type SupabaseCategory } from '@/hooks/useCategories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/hooks/useI18n';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTranslatedField } from '@/lib/i18n/content';
import { Textarea } from '@/components/ui/textarea';

export default function CategoriesPage() {
  const { categories, subcategories, isLoading, addCategory, updateCategory, deleteCategory, addSubcategory, updateSubcategory, deleteSubcategory } = useCategories();
  const { lang, t } = useI18n();
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [subEditDialogOpen, setSubEditDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  
  const [catForm, setCatForm] = useState({
    name: '',
    name_en: '',
    name_ru: '',
    name_az: '',
    description: '',
    description_en: '',
    description_ru: '',
    description_az: ''
  });
  
  const [name, setName] = useState(''); // Still used for subcategories for now
  const [parentCatId, setParentCatId] = useState('');

  const handleSaveCategory = async () => {
    if (!catForm.name.trim()) return;
    try {
      const payload = {
        name: catForm.name.trim(),
        name_en: catForm.name_en.trim(),
        name_ru: catForm.name_ru.trim(),
        name_az: catForm.name_az.trim(),
        description: catForm.description.trim(),
        description_en: catForm.description_en.trim(),
        description_ru: catForm.description_ru.trim(),
        description_az: catForm.description_az.trim(),
      };

      if (editingId) {
        await updateCategory.mutateAsync({ id: editingId, updates: payload });
        toast.success(t('updated') || 'Updated');
      } else {
        await addCategory.mutateAsync(payload);
        toast.success(t('added') || 'Added');
      }
      setCatDialogOpen(false);
      setEditingId(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSaveSubcategory = async () => {
    if (!name.trim() || !parentCatId) return;
    try {
      await addSubcategory.mutateAsync({ name: name.trim(), categoryId: parentCatId });
      toast.success(t('subcategory_added') || 'Subcategory added');
      setSubDialogOpen(false); setName('');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm(t('confirm_delete') || 'Are you sure?')) return;
    try {
      await deleteCategory.mutateAsync(id);
      toast.success(t('deleted') || 'Deleted');
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
      toast.success(t('subcategory_updated') || 'Subcategory updated');
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
          <h1 className="text-2xl font-bold">{t('categories')}</h1>
          <Button onClick={() => { 
            setEditingId(null); 
            setCatForm({ name: '', name_en: '', name_ru: '', name_az: '', description: '', description_en: '', description_ru: '', description_az: '' }); 
            setCatDialogOpen(true); 
          }}>
            <Plus className="mr-2 h-4 w-4" />{t('add') || 'Add'}
          </Button>
        </div>
        <div className="stat-card">
          {categories.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t('no_categories_found') || 'No categories found'}</p>
          ) : (
            <Accordion type="multiple">
              {categories.map((cat) => (
                <AccordionItem key={cat.id} value={cat.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <span>{getTranslatedField(cat, 'name', lang)}</span>
                      <span className="text-xs text-muted-foreground">({subcategories.filter((s) => s.category_id === cat.id).length} {t('subcategories_short') || 'sub.'})</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pl-4">
                      <div className="flex gap-2 mb-2">
                        <Button size="sm" variant="ghost" onClick={() => { 
                          setEditingId(cat.id); 
                          setCatForm({ 
                            name: cat.name || '', 
                            name_en: cat.name_en || '', 
                            name_ru: cat.name_ru || '', 
                            name_az: cat.name_az || '',
                            description: cat.description || '',
                            description_en: cat.description_en || '',
                            description_ru: cat.description_ru || '',
                            description_az: cat.description_az || ''
                          }); 
                          setCatDialogOpen(true); 
                        }}>
                          <Pencil className="h-3 w-3 mr-1" />{t('edit') || 'Edit'}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteCategory(cat.id)}>
                          <Trash2 className="h-3 w-3 mr-1" />{t('delete') || 'Delete'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setParentCatId(cat.id); setName(''); setSubDialogOpen(true); }}>
                          <Plus className="h-3 w-3 mr-1" />{t('subcategory') || 'Subcategory'}
                        </Button>
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
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editingId ? (t('edit') || 'Edit') : (t('new_category') || 'New Category')}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <Tabs defaultValue="ka" className="w-full">
              <TabsList className="grid w-full grid-cols-4 h-9">
                <TabsTrigger value="ka" className="text-xs">KA</TabsTrigger>
                <TabsTrigger value="en" className="text-xs">EN</TabsTrigger>
                <TabsTrigger value="ru" className="text-xs">RU</TabsTrigger>
                <TabsTrigger value="az" className="text-xs">AZ</TabsTrigger>
              </TabsList>
              
              <TabsContent value="ka" className="space-y-3 pt-3">
                <div className="space-y-1"><Label>დასახელება</Label><Input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} /></div>
                <div className="space-y-1"><Label>აღწერა</Label><Textarea value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} /></div>
              </TabsContent>
              
              <TabsContent value="en" className="space-y-3 pt-3">
                <div className="space-y-1"><Label>Name (EN)</Label><Input value={catForm.name_en} onChange={(e) => setCatForm({ ...catForm, name_en: e.target.value })} /></div>
                <div className="space-y-1"><Label>Description (EN)</Label><Textarea value={catForm.description_en} onChange={(e) => setCatForm({ ...catForm, description_en: e.target.value })} /></div>
              </TabsContent>
              
              <TabsContent value="ru" className="space-y-3 pt-3">
                <div className="space-y-1"><Label>Название (RU)</Label><Input value={catForm.name_ru} onChange={(e) => setCatForm({ ...catForm, name_ru: e.target.value })} /></div>
                <div className="space-y-1"><Label>Описание (RU)</Label><Textarea value={catForm.description_ru} onChange={(e) => setCatForm({ ...catForm, description_ru: e.target.value })} /></div>
              </TabsContent>
              
              <TabsContent value="az" className="space-y-3 pt-3">
                <div className="space-y-1"><Label>Ad (AZ)</Label><Input value={catForm.name_az} onChange={(e) => setCatForm({ ...catForm, name_az: e.target.value })} /></div>
                <div className="space-y-1"><Label>Təsvir (AZ)</Label><Textarea value={catForm.description_az} onChange={(e) => setCatForm({ ...catForm, description_az: e.target.value })} /></div>
              </TabsContent>
            </Tabs>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveCategory} disabled={addCategory.isPending || updateCategory.isPending}>
              {(addCategory.isPending || updateCategory.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('save') || 'Save'}
            </Button>
          </DialogFooter>
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
