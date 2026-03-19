import { PageTransition } from '@/components/PageTransition';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTransactions } from '@/hooks/useTransactions';
import { useProducts } from '@/hooks/useProducts';
import { useClients } from '@/hooks/useClients';
import { useEmployees } from '@/hooks/useEmployees';
import { FileSpreadsheet, FileText, Download, TrendingUp, Package, Users, BarChart3, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { addGeorgianFont } from '@/lib/pdfHelper';

export default function ReportsPage() {
    const { transactions, isLoading: txLoading } = useTransactions();
    const { products, isLoading: prodLoading } = useProducts();
    const { clients, isLoading: clientLoading } = useClients();
    const { employees } = useEmployees();
    const [exporting, setExporting] = useState<string | null>(null);

    const isLoading = txLoading || prodLoading || clientLoading;

    // 1. Sales Report (Excel)
    const exportSalesReport = () => {
        setExporting('sales-excel');
        try {
            const data = transactions.map(t => ({
                'თარიღი': format(new Date(t.date), 'yyyy-MM-dd HH:mm'),
                'ტიპი': t.type === 'sale' ? 'გაყიდვა' : 'მიღება',
                'კლიენტი/მომწოდებელი': t.client_name || t.supplier_name || 'საცალო',
                'ჯამი': t.total,
                'გადახდა': t.payment_method,
                'სტატუსი': t.status
            }));

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Sales');
            XLSX.writeFile(wb, `Sales_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
            toast.success('გაყიდვების რეპორტი ექსპორტირებულია');
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setExporting(null);
        }
    };

    // 2. Inventory Report (Excel)
    const exportInventoryReport = () => {
        setExporting('inv-excel');
        try {
            const data = products.map(p => ({
                'სახელი': p.name,
                'ბარკოდი': p.barcode || '-',
                'ნაშთი': p.stock,
                'თვითღირებულება': p.buy_price || 0,
                'გასაყიდი ფასი': p.sell_price,
                'მარაგის ღირებულება': (p.stock * (p.buy_price || 0)).toFixed(2)
            }));

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
            XLSX.writeFile(wb, `Inventory_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
            toast.success('მარაგების რეპორტი ექსპორტირებულია');
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setExporting(null);
        }
    };

    // 3. P&L Report (PDF)
    const exportPnLReport = async () => {
        setExporting('pnl-pdf');
        try {
            const doc = new jsPDF();
            const hasGeorgianFont = await addGeorgianFont(doc);
            const now = format(new Date(), 'dd.MM.yyyy HH:mm');

            doc.setFontSize(18);
            doc.text('მოგება-ზარალის ანგარიშგება (P&L)', 14, 22);
            doc.setFontSize(10);
            doc.text(`გენერირების თარიღი: ${now}`, 14, 30);

            const sales = transactions.filter(t => t.type === 'sale').reduce((s, t) => s + t.total, 0);
            const costs = transactions.filter(t => t.type === 'purchase').reduce((s, t) => s + t.total, 0);
            const grossProfit = sales - costs;

            autoTable(doc, {
                startY: 40,
                head: [['დასახელება', 'თანხა']],
                body: [
                    ['საერთო ამონაგები (Sales)', `₾${sales.toFixed(2)}`],
                    ['შესყიდვების თვითღირებულება (COGS)', `₾${costs.toFixed(2)}`],
                    ['მთლიანი მოგება (Gross Profit)', `₾${grossProfit.toFixed(2)}`],
                ],
                theme: 'striped',
                headStyles: { 
                  fillColor: [16, 185, 129],
                  font: hasGeorgianFont ? 'NotoSansGeorgian' : undefined,
                },
                bodyStyles: {
                  font: hasGeorgianFont ? 'NotoSansGeorgian' : undefined,
                }
            });

            doc.save(`PnL_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
            toast.success('P&L რეპორტი შენახულია');
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setExporting(null);
        }
    };

    return (
        <PageTransition>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">ანგარიშგების ცენტრი (Reporting Hub)</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            პროფესიული Excel და PDF რეპორტები ბიზნესის ანალიტიკისთვის
                        </p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-primary/40" />
                </div>

                <Tabs defaultValue="all" className="w-full">
                    <TabsList className="grid grid-cols-4 w-full md:w-[600px]">
                        <TabsTrigger value="all">ყველა</TabsTrigger>
                        <TabsTrigger value="sales">გაყიდვები</TabsTrigger>
                        <TabsTrigger value="inventory">მარაგები</TabsTrigger>
                        <TabsTrigger value="financial">ფინანსური</TabsTrigger>
                    </TabsList>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                        {/* Sales Summary Card */}
                        <Card className="hover:shadow-md transition-shadow border-primary/10">
                            <CardHeader className="pb-2">
                                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600 mb-2">
                                    <TrendingUp className="h-6 w-6" />
                                </div>
                                <CardTitle className="text-lg">გაყიდვების რეპორტი</CardTitle>
                                <CardDescription>ტრანზაქციების დეტალური ჩამონათვალი</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button
                                    className="w-full justify-start gap-2"
                                    variant="outline"
                                    onClick={exportSalesReport}
                                    disabled={exporting !== null}
                                >
                                    {exporting === 'sales-excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                                    Excel ექსპორტი (.xlsx)
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Inventory Valuation Card */}
                        <Card className="hover:shadow-md transition-shadow border-primary/10">
                            <CardHeader className="pb-2">
                                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 mb-2">
                                    <Package className="h-6 w-6" />
                                </div>
                                <CardTitle className="text-lg">მარაგების რეპორტი</CardTitle>
                                <CardDescription>ნაშთები და საწყობის ღირებულება</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button
                                    className="w-full justify-start gap-2"
                                    variant="outline"
                                    onClick={exportInventoryReport}
                                    disabled={exporting !== null}
                                >
                                    {exporting === 'inv-excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                                    Excel ექსპორტი (.xlsx)
                                </Button>
                            </CardContent>
                        </Card>

                        {/* P&L Financial Card */}
                        <Card className="hover:shadow-md transition-shadow border-primary/20 bg-primary/5">
                            <CardHeader className="pb-2">
                                <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary mb-2">
                                    <BarChart3 className="h-6 w-6" />
                                </div>
                                <CardTitle className="text-lg">მოგება-ზარალა (P&L)</CardTitle>
                                <CardDescription>ბიზნესის ფინანსური შედეგები</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button
                                    className="w-full justify-start gap-2"
                                    onClick={exportPnLReport}
                                    disabled={exporting !== null}
                                >
                                    {exporting === 'pnl-pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                                    PDF გენერირება
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Clients Report */}
                        <Card className="hover:shadow-md transition-shadow border-primary/10">
                            <CardHeader className="pb-2">
                                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 mb-2">
                                    <Users className="h-6 w-6" />
                                </div>
                                <CardTitle className="text-lg">კლიენტების რეპორტი</CardTitle>
                                <CardDescription>ბრუნვა და ლოიალობის ქულები</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button className="w-full justify-start gap-2" variant="outline" disabled>
                                    <Download className="h-4 w-4" /> მალე დაემატება
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </Tabs>
            </div>
        </PageTransition>
    );
}
