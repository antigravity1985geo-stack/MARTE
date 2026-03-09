import { PageTransition } from '@/components/PageTransition';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export default function FiscalReportPage() {
  const [dateFilter, setDateFilter] = useState('');
  return (
    <PageTransition>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">ფისკალური ანგარიში</h1>
        <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="max-w-xs" />
        <div className="stat-card"><Table><TableHeader><TableRow><TableHead>თარიღი</TableHead><TableHead>ჩეკის ნომერი</TableHead><TableHead>ჯამი</TableHead><TableHead>დღგ</TableHead><TableHead>სტატუსი</TableHead></TableRow></TableHeader>
          <TableBody><TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">ფისკალური ჩანაწერები არ არის</TableCell></TableRow></TableBody>
        </Table></div>
      </div>
    </PageTransition>
  );
}
