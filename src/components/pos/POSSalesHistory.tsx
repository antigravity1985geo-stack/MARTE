import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

interface Transaction {
  id: string;
  type: string;
  date: string;
  total: number;
  status?: string;
  items?: any[];
}

interface POSSalesHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: Transaction[];
  offlineSales?: any[];
  onRefund?: (id: string) => void;
}

export function POSSalesHistory({ open, onOpenChange, transactions, offlineSales = [], onRefund }: POSSalesHistoryProps) {
    const allSales = [
        ...offlineSales.map(os => ({
            id: os.id,
            type: 'sale',
            date: new Date(os.timestamp).toISOString(),
            total: os.payload.p_total,
            status: 'offline_pending',
            items: os.payload.p_cart
        })),
        ...transactions.filter(t => t.type === 'sale')
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-xl">
        <SheetHeader><SheetTitle>გაყიდვების ისტორია</SheetTitle></SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>თარიღი</TableHead>
                <TableHead>პროდუქტები</TableHead>
                <TableHead>ჯამი</TableHead>
                <TableHead>სტატუსი</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allSales.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">ისტორია ცარიელია</TableCell></TableRow>
              ) : (
                allSales.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs">{new Date(t.date).toLocaleString('ka-GE')}</TableCell>
                    <TableCell className="text-xs">{(t.items || []).length} ერთ.</TableCell>
                    <TableCell className="font-semibold">₾{t.total.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={t.status === 'offline_pending' ? 'outline' : t.status === 'refunded' ? 'destructive' : 'default'} 
                        className={`text-[10px] ${t.status === 'offline_pending' ? 'border-amber-500 text-amber-600 animate-pulse' : ''}`}
                      >
                        {t.status === 'offline_pending' ? 'მოლოდინში (Offline)' : t.status === 'refunded' ? 'სტორნო' : 'დასრულ.'}
                      </Badge>
                      {t.status !== 'offline_pending' && t.status !== 'refunded' && onRefund && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-xs text-destructive hover:text-destructive/90 ml-2 px-2 h-6"
                          onClick={() => {
                            if (window.confirm("ნამდვილად გსურთ არჩეული შეკვეთის გაუქმება (სტორნირება)?")) {
                              onRefund(t.id);
                            }
                          }}
                        >
                          გაუქმება
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
