import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageTransition } from '@/components/PageTransition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Loader2, Shield, Users, Search, UserCog, UserPlus, Mail, Send, Warehouse } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/useAuthStore';
import { useActivityLog } from '@/hooks/useActivityLog';
import type { AppRole } from '@/hooks/useUserRole';

const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'ადმინი',
  cashier: 'მოლარე',
  senior_cashier: 'უფროსი მოლარე',
  warehouse_manager: 'საწყობის მენეჯერი',
  manager: 'მენეჯერი',
  hr: 'HR',
  accountant: 'ბუღალტერი',
  supplier: 'მომწოდებელი',
  driver: 'მძღოლი',
};

const ROLE_VARIANTS: Record<AppRole, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  admin: 'default',
  cashier: 'secondary',
  senior_cashier: 'outline',
  warehouse_manager: 'outline',
  manager: 'default',
  hr: 'secondary',
  accountant: 'outline',
  supplier: 'secondary',
  driver: 'secondary',
};

interface UserWithRole {
  id: string;
  email: string;
  fullName: string;
  role: AppRole | null;
  createdAt: string;
}

export default function AdminPanelPage() {
  const [search, setSearch] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<AppRole>('cashier');
  const [inviteOpen, setInviteOpen] = useState(false);
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { log } = useActivityLog();

  const usersQuery = useQuery({
    queryKey: ['admin_users'],
    queryFn: async () => {
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('id, full_name, created_at')
        .order('created_at', { ascending: true });
      if (profError) throw profError;

      const { data: roles, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      if (roleError) throw roleError;

      const roleMap = new Map<string, AppRole>();
      for (const r of (roles || [])) {
        roleMap.set(r.user_id, r.role as AppRole);
      }

      return (profiles || []).map((p: any) => ({
        id: p.id,
        email: '',
        fullName: p.full_name || 'უცნობი',
        role: roleMap.get(p.id) || null,
        createdAt: p.created_at,
      })) as UserWithRole[];
    },
  });

  const changeRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });
        if (error) throw error;
      }
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin_users'] });
      queryClient.invalidateQueries({ queryKey: ['user_role'] });
      log({ action: 'role_change', entityType: 'role', entityId: vars.userId, details: { newRole: vars.newRole } });
      toast.success('როლი წარმატებით შეიცვალა');
    },
    onError: (err: any) => {
      toast.error(`შეცდომა: ${err.message}`);
    },
  });

  const inviteUser = useMutation({
    mutationFn: async ({ email, fullName, role }: { email: string; fullName: string; role: AppRole }) => {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { email, fullName, role },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin_users'] });
      log({ action: 'invite', entityType: 'user', entityName: vars.fullName || vars.email, details: { email: vars.email, role: vars.role } });
      toast.success('მოწვევა წარმატებით გაიგზავნა!');
      setInviteEmail('');
      setInviteName('');
      setInviteRole('cashier');
      setInviteOpen(false);
    },
    onError: (err: any) => {
      toast.error(`შეცდომა: ${err.message}`);
    },
  });

  const users = usersQuery.data || [];
  const filtered = search
    ? users.filter((u) => u.fullName.toLowerCase().includes(search.toLowerCase()))
    : users;

  const adminCount = users.filter((u) => u.role === 'admin').length;
  const cashierCount = users.filter((u) => u.role === 'cashier' || u.role === 'senior_cashier').length;
  const warehouseCount = users.filter((u) => u.role === 'warehouse_manager').length;

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              ადმინის პანელი
            </h1>
            <p className="text-sm text-muted-foreground mt-1">მომხმარებლების როლების მართვა</p>
          </div>

          {/* Invite Button */}
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                მომხმარებლის მოწვევა
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  ახალი მომხმარებლის მოწვევა
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-name">სახელი და გვარი</Label>
                  <Input
                    id="invite-name"
                    placeholder="მაგ: ნია შამუგია"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-email">ელ-ფოსტა *</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="user@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>როლი *</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                    <SelectTrigger>
                      <SelectValue placeholder="აირჩიეთ როლი" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cashier">🛒 მოლარე</SelectItem>
                      <SelectItem value="senior_cashier">⭐ უფროსი მოლარე</SelectItem>
                      <SelectItem value="warehouse_manager">🏪 საწყობის მენეჯერი</SelectItem>
                      <SelectItem value="manager">💼 მენეჯერი</SelectItem>
                      <SelectItem value="hr">👥 HR</SelectItem>
                      <SelectItem value="accountant">💰 ბუღალტერი</SelectItem>
                      <SelectItem value="supplier">🚚 მომწოდებელი</SelectItem>
                      <SelectItem value="driver">🚗 მძღოლი</SelectItem>
                      <SelectItem value="admin">🛡️ ადმინი</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  მომხმარებელი მიიღებს მოწვევის ელ-ფოსტას პაროლის დასაყენებლად. არჩეული როლი ავტომატურად მიენიჭება.
                </p>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">გაუქმება</Button>
                </DialogClose>
                <Button
                  onClick={() => inviteUser.mutate({ email: inviteEmail, fullName: inviteName, role: inviteRole })}
                  disabled={!inviteEmail || inviteUser.isPending}
                  className="gap-2"
                >
                  {inviteUser.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  მოწვევის გაგზავნა
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">სულ</p>
                  <p className="text-2xl font-bold">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><Shield className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">ადმინები</p>
                  <p className="text-2xl font-bold">{adminCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><UserCog className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">მოლარეები</p>
                  <p className="text-2xl font-bold">{cashierCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><Warehouse className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">საწყობის მენეჯერი</p>
                  <p className="text-2xl font-bold">{warehouseCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search + Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="მომხმარებლის ძებნა..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-auto">
            {usersQuery.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>სახელი</TableHead>
                    <TableHead>როლი</TableHead>
                    <TableHead>რეგისტრაცია</TableHead>
                    <TableHead className="text-right">მოქმედება</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">მომხმარებლები ვერ მოიძებნა</TableCell></TableRow>
                  ) : (
                    filtered.map((u) => {
                      const isSelf = u.id === currentUserId;
                      return (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{u.fullName}</span>
                              {isSelf && <Badge variant="outline" className="text-[10px]">თქვენ</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={u.role ? ROLE_VARIANTS[u.role] : 'secondary'}>
                              {u.role ? ROLE_LABELS[u.role] : 'არ აქვს'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString('ka-GE') : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {isSelf ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : (
                              <Select
                                value={u.role || ''}
                                onValueChange={(val) => changeRole.mutate({ userId: u.id, newRole: val as AppRole })}
                              >
                                <SelectTrigger className="w-[170px] h-8 text-xs">
                                  <SelectValue placeholder="აირჩიეთ" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">🛡️ ადმინი</SelectItem>
                                  <SelectItem value="cashier">🛒 მოლარე</SelectItem>
                                  <SelectItem value="senior_cashier">⭐ უფროსი მოლარე</SelectItem>
                                  <SelectItem value="warehouse_manager">🏪 საწყობის მენეჯერი</SelectItem>
                                  <SelectItem value="manager">💼 მენეჯერი</SelectItem>
                                  <SelectItem value="hr">👥 HR</SelectItem>
                                  <SelectItem value="accountant">💰 ბუღალტერი</SelectItem>
                                  <SelectItem value="supplier">🚚 მომწოდებელი</SelectItem>
                                  <SelectItem value="driver">🚗 მძღოლი</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
