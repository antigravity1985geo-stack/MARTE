import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import {
  useQueueCounters, useCounterTickets, useIssueTicket,
  useCounterActions, useQueueStats, useQueueSound,
} from '@/hooks/useQueue';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Plus, PhoneCall, CheckCircle, SkipForward, Power, Loader2, Users, Clock, Timer } from 'lucide-react';
import { toast } from 'sonner';

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  waiting:   { label: 'მოლოდინში',      variant: 'secondary' },
  called:    { label: 'გამოძახებული',    variant: 'default' },
  serving:   { label: 'მომსახურებაში',   variant: 'default' },
  completed: { label: 'დასრულებული',     variant: 'outline' },
  no_show:   { label: 'არ გამოცხადება',  variant: 'destructive' },
  cancelled: { label: 'გაუქმებული',      variant: 'outline' },
};

export default function QueuePage() {
  const { counters, loading: countersLoading, toggleCounter } = useQueueCounters();
  const [selectedCounterId, setSelectedCounterId] = useState<string | null>(null);

  // Auto-select first counter
  const activeCounter = selectedCounterId ?? counters[0]?.id ?? null;

  const { tickets, waiting, called, serving, completed, loading: ticketsLoading, avgServiceMin } = useCounterTickets(activeCounter);
  const { issue, busy: issueBusy } = useIssueTicket();
  const { callNext, updateStatus, cancelTicket, busy: actionBusy } = useCounterActions();
  const stats = useQueueStats(activeCounter);
  const { playBeep } = useQueueSound();

  const handleIssue = async () => {
    if (!activeCounter) { toast.error('აირჩიეთ სადგური'); return; }
    const t = await issue(activeCounter);
    if (t) playBeep();
  };

  const handleCallNext = async () => {
    if (!activeCounter) return;
    const result = await callNext(activeCounter);
    if (result) playBeep();
  };

  const handleComplete = async (ticketId: string) => {
    await updateStatus(ticketId, 'completed');
    toast.success('დასრულებულია');
  };

  const handleCancel = async (ticketId: string) => {
    await cancelTicket(ticketId);
  };

  if (countersLoading) {
    return (
      <PageTransition>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageTransition>
    );
  }

  const counter = counters.find(c => c.id === activeCounter);

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">რიგების მართვა</h1>
        </div>

        {/* Counter selector */}
        {counters.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {counters.map(c => (
              <Button
                key={c.id}
                size="sm"
                variant={activeCounter === c.id ? 'default' : 'outline'}
                onClick={() => setSelectedCounterId(c.id)}
                className="rounded-xl"
              >
                {c.name}
                {c.is_open && <span className="ml-1.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
              </Button>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-3xl font-bold text-primary">{waiting.length}</p>
            <p className="text-xs text-muted-foreground">მოლოდინში</p>
          </Card>
          <Card className="p-4 text-center">
            <PhoneCall className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-3xl font-bold text-accent">
              {serving?.ticket_number ?? called?.ticket_number ?? '—'}
            </p>
            <p className="text-xs text-muted-foreground">მომსახურებაში</p>
          </Card>
          <Card className="p-4 text-center">
            <CheckCircle className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-3xl font-bold">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">დასრულებული</p>
          </Card>
          <Card className="p-4 text-center">
            <Timer className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-3xl font-bold">{Math.round(avgServiceMin)}</p>
            <p className="text-xs text-muted-foreground">საშ. წუთი</p>
          </Card>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          {counter && (
            <Button
              size="sm"
              variant={counter.is_open ? 'destructive' : 'default'}
              onClick={() => toggleCounter(counter.id, !counter.is_open)}
              className="rounded-xl"
            >
              <Power className="mr-1.5 h-4 w-4" />
              {counter.is_open ? 'დახურვა' : 'გახსნა'}
            </Button>
          )}
          <Button size="sm" onClick={handleIssue} disabled={issueBusy} className="rounded-xl">
            <Plus className="mr-1.5 h-4 w-4" />
            ახალი ბილეთი
          </Button>
          <Button size="sm" variant="outline" onClick={handleCallNext} disabled={actionBusy} className="rounded-xl">
            <PhoneCall className="mr-1.5 h-4 w-4" />
            შემდეგი
          </Button>
        </div>

        {/* Tickets table */}
        <Card className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ნომერი</TableHead>
                <TableHead>პაციენტი</TableHead>
                <TableHead>სტატუსი</TableHead>
                <TableHead>დრო</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ticketsLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    ბილეთები არ არის
                  </TableCell>
                </TableRow>
              ) : tickets.slice().reverse().slice(0, 30).map(t => {
                const st = statusMap[t.status] ?? { label: t.status, variant: 'outline' as const };
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono font-bold">{t.ticket_number}</TableCell>
                    <TableCell className="text-sm">{t.patient_name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(t.issued_at).toLocaleTimeString('ka-GE')}
                    </TableCell>
                    <TableCell className="flex gap-1">
                      {(t.status === 'serving' || t.status === 'called') && (
                        <Button size="sm" variant="ghost" onClick={() => handleComplete(t.id)}>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          დასრულება
                        </Button>
                      )}
                      {t.status === 'waiting' && (
                        <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => handleCancel(t.id)}>
                          <SkipForward className="h-4 w-4 mr-1" />
                          გაუქმება
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>
    </PageTransition>
  );
}
