import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Warehouse } from 'lucide-react';
import { toast } from 'sonner';
import { PageTransition } from '@/components/PageTransition';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if this is a recovery callback
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    }
  }, []);

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success('პაროლის აღდგენის ბმული გაიგზავნა!');
      setSent(true);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('პაროლი წარმატებით შეიცვალა!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <PageTransition>
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl" style={{ background: 'var(--gradient-primary)' }}>
              <Warehouse className="h-7 w-7 text-primary-foreground" />
            </div>
            <CardTitle>პაროლის აღდგენა</CardTitle>
          </CardHeader>
          <CardContent>
            {isRecovery ? (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label>ახალი პაროლი</Label>
                  <Input type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
                </div>
                <Button type="submit" className="w-full">პაროლის შეცვლა</Button>
              </form>
            ) : sent ? (
              <p className="text-center text-muted-foreground">შეამოწმეთ ელ-ფოსტა პაროლის აღდგენის ბმულისთვის.</p>
            ) : (
              <form onSubmit={handleSendReset} className="space-y-4">
                <div className="space-y-2">
                  <Label>ელ-ფოსტა</Label>
                  <Input type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full">გაგზავნა</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
