import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { useLandedCosts, LandedCostHeader } from '@/hooks/useLandedCosts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Calculator, Truck, Save, CheckCircle2, History } from 'lucide-react';
import { toast } from 'sonner';

export default function LandedCostPage() {
    const { landedCosts, isLoading, createLandedCost, applyLandedCost } = useLandedCosts();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        transaction_id: '',
        total_additional_cost: '',
        allocation_method: 'value' as 'value' | 'quantity',
        description: ''
    });

    const handleSubmit = async () => {
        if (!formData.transaction_id || !formData.total_additional_cost) {
            toast.error('გთხოვთ შეავსოთ ველები');
            return;
        }

        const { error } = await createLandedCost({
            transaction_id: formData.transaction_id,
            total_additional_cost: parseFloat(formData.total_additional_cost),
            allocation_method: formData.allocation_method,
            description: formData.description
        });

        if (!error) {
            toast.success('ზედნადები ხარჯი დაფიქსირდა');
        }
    };

    const handleApply = async (id: string) => {
        const { error } = await applyLandedCost(id);
        if (!error) {
            toast.success('ხარჯები განაწილდა თვითღირებულებაზე');
        }
    };

    return (
        <PageTransition>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">ზედნადები ხარჯები (Landed Cost)</h1>
                        <p className="text-muted-foreground">ტრანსპორტირებისა და საბაჟო ხარჯების გადანაწილება პროდუქციაზე</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Form */}
                    <Card className="lg:col-span-1">
                        <CardHeader><CardTitle className="text-lg">ახალი გადანაწილება</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <Label>მიღების ოპერაცია (Transaction ID)</Label>
                                <Input
                                    placeholder="ID ან ტრანზაქციის ნომერი"
                                    value={formData.transaction_id}
                                    onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>დამატებითი ხარჯი (₾)</Label>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={formData.total_additional_cost}
                                    onChange={(e) => setFormData({ ...formData, total_additional_cost: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>გადანაწილების მეთოდი</Label>
                                <Select
                                    value={formData.allocation_method}
                                    onValueChange={(v: any) => setFormData({ ...formData, allocation_method: v })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="value">ღირებულების პროპორციულად (Value)</SelectItem>
                                        <SelectItem value="quantity">რაოდენობის პროპორციულად (Quantity)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>კომენტარი</Label>
                                <Input
                                    placeholder="მაგ: DHL ტრანსპორტირება"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <Button className="w-full" onClick={handleSubmit}>
                                <Calculator className="mr-2 h-4 w-4" />
                                გამოთვლა და შენახვა
                            </Button>
                        </CardContent>
                    </Card>

                    {/* History */}
                    <Card className="lg:col-span-2">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center text-lg">
                                <History className="mr-2 h-5 w-5 text-muted-foreground" />
                                ისტორია
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>თარიღი</TableHead>
                                        <TableHead>დამატებითი ხარჯი</TableHead>
                                        <TableHead>მეთოდი</TableHead>
                                        <TableHead>სტატუსი</TableHead>
                                        <TableHead className="text-right">მოქმედება</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {landedCosts.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                ისტორია ცარიელია
                                            </TableCell>
                                        </TableRow>
                                    ) : landedCosts.map((lc) => (
                                        <TableRow key={lc.id}>
                                            <TableCell className="text-xs">{new Date(lc.created_at).toLocaleDateString()}</TableCell>
                                            <TableCell className="font-bold">₾{lc.total_additional_cost.toFixed(2)}</TableCell>
                                            <TableCell className="text-xs italic capitalize">{lc.allocation_method}</TableCell>
                                            <TableCell>
                                                <Badge variant={lc.status === 'applied' ? 'default' : 'secondary'}>
                                                    {lc.status === 'applied' ? 'გატარებული' : 'დრაფტი'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {lc.status === 'draft' && (
                                                    <Button size="sm" onClick={() => handleApply(lc.id)}>
                                                        <Save className="mr-2 h-3 w-3" />
                                                        გატარება
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </PageTransition>
    );
}
