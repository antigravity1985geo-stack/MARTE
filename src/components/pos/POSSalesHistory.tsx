import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
}

export function POSSalesHistory({ open, onOpenChange, transactions }: POSSalesHistoryProps) {
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
              {transactions.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">ისტორია ცარიელია</TableCell></TableRow>
              ) : (
                transactions.filter((t) => t.type === 'sale').map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs">{new Date(t.date).toLocaleString('ka-GE')}</TableCell>
                    <TableCell className="text-xs">{(t.items || []).length} ერთ.</TableCell>
                    <TableCell className="font-semibold">₾{t.total.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={t.status === 'refunded' ? 'destructive' : 'default'} className="text-[10px]">
                        {t.status === 'refunded' ? 'სტორნო' : 'დასრულ.'}
                      </Badge>
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
