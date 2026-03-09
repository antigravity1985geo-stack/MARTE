import { PageTransition } from '@/components/PageTransition';
import { useShifts } from '@/hooks/useShifts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';

export default function ShiftHistoryPage() {
  const { shiftHistory, isLoading } = useShifts();

  if (isLoading) {
    return <PageTransition><div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></PageTransition>;
  }

  return (
    <PageTransition>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">ცვლის ისტორია</h1>
        <div className="stat-card overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>მოლარე</TableHead>
                <TableHead>გახსნა</TableHead>
                <TableHead>დახურვა</TableHead>
                <TableHead>საწყისი</TableHead>
                <TableHead>დახურვის ნაღდი</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shiftHistory.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">ცვლები არ არის</TableCell></TableRow>
              ) : (
                shiftHistory.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.cashierName}</TableCell>
                    <TableCell className="text-xs">{new Date(s.openedAt).toLocaleString('ka-GE')}</TableCell>
                    <TableCell className="text-xs">{s.closedAt ? new Date(s.closedAt).toLocaleString('ka-GE') : '-'}</TableCell>
                    <TableCell>₾{s.openingCash.toFixed(2)}</TableCell>
                    <TableCell>₾{(s.closingCash ?? 0).toFixed(2)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </PageTransition>
  );
}
