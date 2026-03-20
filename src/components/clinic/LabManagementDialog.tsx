import { useState } from 'react'
import {
  X, Plus, Trash2, Edit2, Save,
  Building2, FlaskConical, Phone, Mail, MapPin, 
  ChevronRight, ArrowLeft, Settings2
} from 'lucide-react'
import {
  useDentalLabs, useLabWorkTypes,
  useLabManagementActions
} from '@/hooks/useDentalLab'
import {
  LabOrderCategory, CATEGORY_LABELS
} from '@/types/dentalLab'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'react-hot-toast'

export function LabManagementDialog({ onClose }: { onClose: () => void }) {
  const { labs } = useDentalLabs()
  const { createLab, updateLab, createWorkType, updateWorkType, busy } = useLabManagementActions()
  
  const [view, setView] = useState<'labs' | 'types'>('labs')
  const [selectedLab, setSelectedLab] = useState<any>(null)
  const { types } = useLabWorkTypes(selectedLab?.id)

  const [newLab, setNewLab] = useState({ name: '', contact_name: '', phone: '', email: '', address: '', turnaround_days: 7, notes: '' })
  const [newType, setNewType] = useState({ name: '', category: 'crown' as LabOrderCategory, material: '', base_cost: 0, unit: 'piece' })

  const handleAddLab = async () => {
    if (!newLab.name) return toast.error('მიუთითეთ სახელი')
    const ok = await createLab({ ...newLab, is_active: true })
    if (ok) setNewLab({ name: '', contact_name: '', phone: '', email: '', address: '', turnaround_days: 7, notes: '' })
  }

  const handleAddType = async () => {
    if (!newType.name || !selectedLab) return toast.error('მიუთითეთ დასახელება')
    const ok = await createWorkType({ ...newType, lab_id: selectedLab.id, is_active: true })
    if (ok) setNewType({ name: '', category: 'crown', material: '', base_cost: 0, unit: 'piece' })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white/50 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            {view === 'types' && (
              <Button variant="ghost" size="icon" onClick={() => setView('labs')} className="rounded-xl">
                <ArrowLeft size={18} />
              </Button>
            )}
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <Settings2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {view === 'labs' ? 'ლაბორატორიების მართვა' : `${selectedLab?.name}: სამუშაო ტიპები`}
              </h2>
              <p className="text-xs text-slate-400 font-medium">Lab & Service Management</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-rose-50 hover:text-rose-500">
            <X size={20} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {view === 'labs' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Add Lab Form */}
              <div className="space-y-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-primary/70">ახალი ლაბორატორია</h3>
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <label className="text-xs font-bold text-slate-500 ml-1">დასახელება *</label>
                    <Input value={newLab.name} onChange={e => setNewLab({...newLab, name: e.target.value})} placeholder="მაგ: Dental Lab Elite" className="rounded-xl h-11" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <label className="text-xs font-bold text-slate-500 ml-1">საკონტაქტო პირი</label>
                      <Input value={newLab.contact_name} onChange={e => setNewLab({...newLab, contact_name: e.target.value})} placeholder="სახელი" className="rounded-xl h-11" />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs font-bold text-slate-500 ml-1">მობილური</label>
                      <Input value={newLab.phone} onChange={e => setNewLab({...newLab, phone: e.target.value})} placeholder="599..." className="rounded-xl h-11" />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-bold text-slate-500 ml-1">ელ-ფოსტა</label>
                    <Input value={newLab.email} onChange={e => setNewLab({...newLab, email: e.target.value})} placeholder="lab@example.com" className="rounded-xl h-11" />
                  </div>
                  <Button onClick={handleAddLab} disabled={busy} className="w-full h-11 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 gap-2">
                    <Plus size={18} /> დამატება
                  </Button>
                </div>
              </div>

              {/* Labs List */}
              <div className="space-y-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">არსებული ლაბორატორიები</h3>
                <div className="space-y-3">
                  {labs.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border-2 border-dashed border-slate-200">
                      <Building2 size={32} className="mx-auto text-slate-200 mb-2" />
                      <p className="text-xs text-slate-400 font-medium">ლაბორატორიები არ არის</p>
                    </div>
                  ) : (
                    labs.map(lab => (
                      <div key={lab.id} className="group p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl hover:border-primary/50 transition-all shadow-sm hover:shadow-md">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                               <Building2 size={20} />
                             </div>
                             <div>
                               <p className="text-sm font-bold text-slate-900 dark:text-white">{lab.name}</p>
                               <p className="text-[10px] text-slate-400 font-medium">{lab.contact_name || 'საკონტაქტო პირი არაა'}</p>
                             </div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedLab(lab); setView('types') }} className="rounded-lg h-9 gap-1 text-[10px] font-bold uppercase tracking-wider hover:bg-primary/5 hover:text-primary">
                            სერვისები <ChevronRight size={14} />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* Add Type Form */}
               <div className="space-y-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-primary/70">ახალი სერვისი / ტიპი</h3>
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <label className="text-xs font-bold text-slate-500 ml-1">დასახელება *</label>
                    <Input value={newType.name} onChange={e => setNewType({...newType, name: e.target.value})} placeholder="მაგ: ცირკონის გვირგვინი" className="rounded-xl h-11" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <label className="text-xs font-bold text-slate-500 ml-1">კატეგორია</label>
                      <select 
                        value={newType.category} 
                        onChange={e => setNewType({...newType, category: e.target.value as LabOrderCategory})}
                        className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-2">
                       <label className="text-xs font-bold text-slate-500 ml-1">საწყისი ფასი (ლაბ)</label>
                       <Input type="number" value={newType.base_cost} onChange={e => setNewType({...newType, base_cost: parseFloat(e.target.value) || 0})} className="rounded-xl h-11" />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-bold text-slate-500 ml-1">მასალა</label>
                    <Input value={newType.material} onChange={e => setNewType({...newType, material: e.target.value})} placeholder="მაგ: Zirconia" className="rounded-xl h-11" />
                  </div>
                  <Button onClick={handleAddType} disabled={busy} className="w-full h-11 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 gap-2">
                    <Plus size={18} /> დამატება
                  </Button>
                </div>
              </div>

              {/* Types List */}
              <div className="space-y-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">სერვისების სია</h3>
                <div className="space-y-3">
                  {types.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border-2 border-dashed border-slate-200">
                      <FlaskConical size={32} className="mx-auto text-slate-200 mb-2" />
                      <p className="text-xs text-slate-400 font-medium">სერვისები არ არის</p>
                    </div>
                  ) : (
                    types.map(t => (
                      <div key={t.id} className="group p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl hover:border-primary/50 transition-all shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                               <FlaskConical size={20} />
                             </div>
                             <div>
                               <p className="text-sm font-bold text-slate-900 dark:text-white">{t.name}</p>
                               <div className="flex items-center gap-2 mt-0.5">
                                 <Badge variant="outline" className="text-[9px] px-1.5 h-4 border-slate-200 text-slate-400 uppercase tracking-tighter">{CATEGORY_LABELS[t.category]}</Badge>
                                 <span className="text-[10px] text-primary font-black">₾{t.base_cost}</span>
                               </div>
                             </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <Button variant="default" onClick={onClose} className="rounded-xl px-8 h-11 font-bold">
            დასრულება
          </Button>
        </div>
      </div>
    </div>
  )
}
