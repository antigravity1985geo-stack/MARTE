import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Warehouse, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageTransition } from '@/components/PageTransition';

const emailSchema = z.object({
  email: z.string().email('შეიყვანეთ ვალიდური ელ-ფოსტა'),
});

const passwordSchema = z.object({
  newPassword: z.string().min(6, 'პაროლი უნდა შეიცავდეს მინიმუმ 6 სიმბოლოს'),
});

type EmailValues = z.infer<typeof emailSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

export default function ResetPasswordPage() {
  const [sent, setSent] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if this is a recovery callback
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    }
  }, []);

  const { register: registerEmail, handleSubmit: handleEmailSubmit, formState: { errors: emailErrors } } = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  const { register: registerPassword, handleSubmit: handlePasswordSubmit, formState: { errors: passwordErrors } } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: '' },
  });

  const onSendReset = async (data: EmailValues) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success('პაროლის აღდგენის ბმული გაიგზავნა!');
      setSent(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onUpdatePassword = async (data: PasswordValues) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: data.newPassword });
      if (error) throw error;
      toast.success('პაროლი წარმატებით შეიცვალა!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
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
              <form onSubmit={handlePasswordSubmit(onUpdatePassword)} className="space-y-4">
                <div className="space-y-2">
                  <Label>ახალი პაროლი</Label>
                  <Input type="password" placeholder="••••••••" {...registerPassword('newPassword')} />
                  {passwordErrors.newPassword && <p className="text-xs text-destructive">{passwordErrors.newPassword.message}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {loading ? 'იტვირთება...' : 'პაროლის შეცვლა'}
                </Button>
              </form>
            ) : sent ? (
              <p className="text-center text-muted-foreground">შეამოწმეთ ელ-ფოსტა პაროლის აღდგენის ბმულისთვის.</p>
            ) : (
              <form onSubmit={handleEmailSubmit(onSendReset)} className="space-y-4">
                <div className="space-y-2">
                  <Label>ელ-ფოსტა</Label>
                  <Input type="email" placeholder="email@example.com" {...registerEmail('email')} />
                  {emailErrors.email && <p className="text-xs text-destructive">{emailErrors.email.message}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {loading ? 'იტვირთება...' : 'გაგზავნა'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
