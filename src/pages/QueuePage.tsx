import { PageTransition } from '@/components/PageTransition';
import { useQueue, useQueueActive } from '@/hooks/useQueue';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, PhoneCall, CheckCircle, SkipForward, RotateCcw, Power, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const formatNumber = (n: number) => `Q-${String(n).padStart(3, '0')}`;

export default function QueuePage() {
  const { tickets, isLoading, generateTicket, callNext, completeTicket, skipTicket, resetQueue } = useQueue();
  const { isActive, activateQueue, deactivateQueue } = useQueueActive();
  const serving = tickets.filter((t) => t.status === 'serving');
  const waiting = tickets.filter((t) => t.status === 'waiting');
  const statusMap: Record<string, string> = { waiting: 'მოლოდინში', serving: 'მომსახურებაში', completed: 'დასრულებული' };

  const handleGenerate = async () => {
    if (!isActive) { toast.error('ჯერ ჩართეთ რიგი'); return; }
    try { await generateTicket.mutateAsync(undefined); toast.success('ბილეთი გენერირებულია'); }
    catch (err: any) { toast.error(err.message); }
  };

  const handleCallNext = async () => {
    try {
      const t = await callNext.mutateAsync('cashier-1');
      if (t) toast.success(`გამოძახება: ${formatNumber(t.number)}`);
      else toast.error('რიგი ცარიელია');
    } catch (err: any) { toast.error(err.message); }
  };

  if (isLoading) {
    return <PageTransition><div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></PageTransition>;
  }

  return (
    <PageTransition>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">რიგების მართვა</h1>
          <div className="flex gap-2">
            <Button size="sm" variant={isActive ? 'destructive' : 'default'} onClick={() => { isActive ? deactivateQueue() : activateQueue(); toast.success(isActive ? 'რიგი გამორთულია' : 'რიგი ჩართულია'); }}>
              <Power className="mr-1 h-4 w-4" />{isActive ? 'გამორთვა' : 'ჩართვა'}
            </Button>
            <Button size="sm" variant="outline" onClick={async () => { try { await resetQueue.mutateAsync(); toast.success('რიგი გასუფთავდა'); } catch (err: any) { toast.error(err.message); } }}>
              <RotateCcw className="mr-1 h-4 w-4" />გასუფთავება
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="stat-card text-center">
            <p className="text-sm text-muted-foreground">მოლოდინში</p>
            <p className="text-4xl font-bold text-primary mt-2"><AnimatedNumber value={waiting.length} /></p>
          </div>
          <div className="stat-card text-center">
            <p className="text-sm text-muted-foreground">მომსახურებაში</p>
            <p className="text-4xl font-bold text-accent mt-2">{serving.length > 0 ? formatNumber(serving[0].number) : '-'}</p>
          </div>
          <div className="stat-card flex flex-col items-center justify-center gap-3">
            <Button onClick={handleGenerate} className="w-full" disabled={generateTicket.isPending}><Plus className="mr-2 h-4 w-4" />ახალი ბილეთი</Button>
            <Button onClick={handleCallNext} variant="outline" className="w-full" disabled={callNext.isPending}><PhoneCall className="mr-2 h-4 w-4" />შემდეგი</Button>
          </div>
        </div>
        <div className="stat-card overflow-auto">
          <Table><TableHeader><TableRow><TableHead>ნომერი</TableHead><TableHead>სტატუსი</TableHead><TableHead>დრო</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>{tickets.slice().reverse().slice(0, 20).map((t) => (
              <TableRow key={t.id}><TableCell className="font-mono font-bold">{formatNumber(t.number)}</TableCell>
                <TableCell><Badge variant={t.status === 'waiting' ? 'secondary' : t.status === 'serving' ? 'default' : 'outline'}>{statusMap[t.status]}</Badge></TableCell>
                <TableCell className="text-xs">{new Date(t.created_at).toLocaleTimeString('ka-GE')}</TableCell>
                <TableCell className="flex gap-1">
                  {t.status === 'serving' && <Button size="sm" variant="ghost" onClick={async () => { try { await completeTicket.mutateAsync(t.id); toast.success('დასრულებულია'); } catch {} }}><CheckCircle className="h-4 w-4 mr-1" />დასრულება</Button>}
                  {t.status === 'waiting' && <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={async () => { try { await skipTicket.mutateAsync(t.id); toast.success('გამოტოვებულია'); } catch {} }}><SkipForward className="h-4 w-4 mr-1" />გამოტოვება</Button>}
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </div>
      </div>
    </PageTransition>
  );
}
