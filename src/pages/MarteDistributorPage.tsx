import React from 'react';
import { useDistributor } from '@/hooks/useDistributor';
import { useI18n } from '@/hooks/useI18n';
import { PageTransition } from '@/components/PageTransition';
import { CyberCard } from '@/components/CyberCard';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Wallet, 
  Clock, 
  Copy, 
  CheckCircle2, 
  ExternalLink,
  Info
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function MarteDistributorPage() {
  const { t } = useI18n();
  const { stats, isLoading, copyReferralLink, referralLink } = useDistributor();

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center">Loading...</div>;
  }

  return (
    <PageTransition>
      <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-black tracking-tighter gradient-text uppercase mb-2">
            {t('marte_distributor')}
          </h1>
          <p className="text-muted-foreground">{t('distributor_dashboard')}</p>
        </div>

        {/* Info Alert */}
        <Alert className="bg-primary/5 border-primary/20">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary font-bold">{t('commission_rate')}: 20%</AlertTitle>
          <AlertDescription>
            {t('one_year_rule_note')}
          </AlertDescription>
        </Alert>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title={t('total_earned')}
            value={`${stats?.totalEarned || 0} GEL`}
            icon={Wallet}
            color="success"
          />
          <StatCard
            title={t('pending_commissions')}
            value={`${stats?.pendingAmount || 0} GEL`}
            icon={Clock}
            color="warning"
          />
          <StatCard
            title={t('referred_users_count')}
            value={stats?.referralCount?.toString() || '0'}
            icon={Users}
            color="info"
          />
        </div>

        {/* Referral Link Card */}
        <Card className="p-6 border-primary/20 bg-card/50 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-1">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-primary" />
                {t('referral_link')}
              </h3>
              <p className="text-sm text-muted-foreground">გააზიარეთ ეს ლინკი ახალი მომხმარებლების მოზიდვისთვის</p>
            </div>
            <div className="flex items-center gap-2 max-w-md w-full">
              <Input 
                value={referralLink} 
                readOnly 
                className="font-mono text-xs bg-muted/30 border-primary/20 focus-visible:ring-primary/30"
              />
              <Button 
                variant="outline" 
                size="icon" 
                onClick={copyReferralLink}
                className="shrink-0 hover:bg-primary/10 hover:text-primary border-primary/20"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Referrals & Commissions Tabs/Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Referred Users */}
          <Card className="p-0 overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm">
            <div className="p-4 border-b border-border/40 bg-muted/30">
              <h3 className="font-bold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                {t('referral_stats')}
              </h3>
            </div>
            <div className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('full_name')}</TableHead>
                    <TableHead>{t('date')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats?.referrals?.length ? stats.referrals.map((ref: any) => (
                    <TableRow key={ref.id}>
                      <TableCell className="font-medium">{ref.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(ref.created_at), 'dd.MM.yyyy')}
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                        მომხმარებლები არ მოძებნა
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Commissions */}
          <Card className="p-0 overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm">
            <div className="p-4 border-b border-border/40 bg-muted/30">
              <h3 className="font-bold flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                {t('referral_earnings')}
              </h3>
            </div>
            <div className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('amount')}</TableHead>
                    <TableHead>{t('date')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats?.commissions?.length ? stats.commissions.map((comm: any) => (
                    <TableRow key={comm.id}>
                      <TableCell className="font-bold">
                        {comm.amount} {comm.currency}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(comm.created_at), 'dd.MM.yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={comm.status === 'paid' ? 'default' : 'outline'} className="uppercase text-[10px]">
                          {comm.status === 'paid' ? t('paid_commissions') : t('pending_commissions')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        საკომისიოები არ მოძებნა
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
