import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { useAccountingRules, AccountingRule } from '@/hooks/useAccountingRules';
import { useAccounting } from '@/hooks/useAccounting';
import { useCategories } from '@/hooks/useCategories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Settings2, Trash2, Play, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AccountingRulesPage() {
    const { rules, isLoading, addRule, updateRule, deleteRule } = useAccountingRules();
    const { accounts } = useAccounting();
    const { categories } = useCategories();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<Partial<AccountingRule> | null>(null);
    const [formData, setFormData] = useState<{
        name: string;
        event_type: 'SALE' | 'PURCHASE' | 'EXPENSE' | 'RECEIVING';
        payment_method: string;
        category_id: string;
        debit_account_code: string;
        credit_account_code: string;
        description_template: string;
        is_active: boolean;
    }>({
        name: '',
        event_type: 'SALE',
        payment_method: '',
        category_id: '',
        debit_account_code: '',
        credit_account_code: '',
        description_template: '',
        is_active: true
    });

    const handleOpenAdd = () => {
        setEditingRule(null);
        setFormData({
            name: '',
            event_type: 'SALE',
            payment_method: '',
            category_id: '',
            debit_account_code: '',
            credit_account_code: '',
            description_template: '',
            is_active: true
        });
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (rule: AccountingRule) => {
        setEditingRule(rule);
        setFormData({
            name: rule.name,
            event_type: rule.event_type,
            payment_method: rule.payment_method || '',
            category_id: rule.category_id || '',
            debit_account_code: rule.debit_account_code,
            credit_account_code: rule.credit_account_code,
            description_template: rule.description_template || '',
            is_active: rule.is_active
        });
        setIsDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.debit_account_code || !formData.credit_account_code) {
            toast.error('გთხოვთ შეავსოთ აუცილებელი ველები');
            return;
        }

        const payload = {
            ...formData,
            payment_method: formData.payment_method || null,
            category_id: formData.category_id || null,
            description_template: formData.description_template || null
        };

        if (editingRule?.id) {
            await updateRule(editingRule.id, payload);
            toast.success('წესი განახლდა');
        } else {
            await addRule(payload);
            toast.success('ახალი წესი დაემატა');
        }
        setIsDialogOpen(false);
    };

    const eventTypeLabels = {
        SALE: 'გაყიდვა',
        PURCHASE: 'შესყიდვა',
        EXPENSE: 'ხარჯი',
        RECEIVING: 'მიღება'
    };

    return (
        <PageTransition>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">ავტომატური გატარების წესები</h1>
                        <p className="text-muted-foreground">ბიზნეს ოპერაციების ავტომატური ასახვა ბუღალტერიაში</p>
                    </div>
                    <Button onClick={handleOpenAdd}>
                        <Plus className="mr-2 h-4 w-4" />
                        ახალი წესი
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">აქტიური წესები</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{rules.filter(r => r.is_active).length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">მთლიანი რაოდენობა</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{rules.length}</div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>წესის სახელი</TableHead>
                                    <TableHead>ოპერაცია</TableHead>
                                    <TableHead>დებეტი</TableHead>
                                    <TableHead>კრედიტი</TableHead>
                                    <TableHead>ფილტრები</TableHead>
                                    <TableHead>სტატუსი</TableHead>
                                    <TableHead className="text-right">მოქმედება</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8">იტვირთება...</TableCell>
                                    </TableRow>
                                ) : rules.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            წესები არ არის დამატებული
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    rules.map((rule) => (
                                        <TableRow key={rule.id}>
                                            <TableCell className="font-medium">{rule.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{eventTypeLabels[rule.event_type]}</Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">{rule.debit_account_code}</TableCell>
                                            <TableCell className="font-mono text-xs">{rule.credit_account_code}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {rule.payment_method && (
                                                        <Badge variant="secondary" className="text-[10px]">{rule.payment_method}</Badge>
                                                    )}
                                                    {rule.category_id && (
                                                        <Badge variant="secondary" className="text-[10px]">Category</Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {rule.is_active ? (
                                                    <Badge className="bg-success/20 text-success border-success/20">აქტიური</Badge>
                                                ) : (
                                                    <Badge variant="secondary">პასიური</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button size="icon" variant="ghost" onClick={() => handleOpenEdit(rule)}>
                                                        <Settings2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteRule(rule.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingRule ? 'წესის რედაქტირება' : 'ახალი წესის დამატება'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">დასახელება</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="მაგ: ნაღდი გაყიდვის წესი"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>ოპერაციის ტიპი</Label>
                                <Select
                                    value={formData.event_type}
                                    onValueChange={(value: any) => setFormData({ ...formData, event_type: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SALE">გაყიდვა (Sale)</SelectItem>
                                        <SelectItem value="PURCHASE">შესყიდვა (Purchase)</SelectItem>
                                        <SelectItem value="EXPENSE">ხარჯი (Expense)</SelectItem>
                                        <SelectItem value="RECEIVING">მიღება (Receiving)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>გადახდის მეთოდი</Label>
                                <Select
                                    value={formData.payment_method}
                                    onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="ყველა" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">-- ყველა --</SelectItem>
                                        <SelectItem value="cash">ნაღდი (Cash)</SelectItem>
                                        <SelectItem value="card">ბარათი (Card)</SelectItem>
                                        <SelectItem value="bog_qr">BOG QR</SelectItem>
                                        <SelectItem value="tbc_pay">TBC Pay</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>დებეტის ანგარიში</Label>
                                <Select
                                    value={formData.debit_account_code}
                                    onValueChange={(value) => setFormData({ ...formData, debit_account_code: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="აირჩიეთ" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {accounts?.map(acc => (
                                            <SelectItem key={acc.id} value={acc.code}>
                                                {acc.code} - {acc.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>კრედიტის ანგარიში</Label>
                                <Select
                                    value={formData.credit_account_code}
                                    onValueChange={(value) => setFormData({ ...formData, credit_account_code: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="აირჩიეთ" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {accounts?.map(acc => (
                                            <SelectItem key={acc.id} value={acc.code}>
                                                {acc.code} - {acc.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="template">აღწერის შაბლონი</Label>
                            <Input
                                id="template"
                                value={formData.description_template}
                                onChange={(e) => setFormData({ ...formData, description_template: e.target.value })}
                                placeholder="მაგ: ავტომატური გატარება POS-იდან"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            />
                            <Label htmlFor="is_active">აქტიური წესი</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>გაუქმება</Button>
                        <Button onClick={handleSubmit}>შენახვა</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </PageTransition>
    );
}
