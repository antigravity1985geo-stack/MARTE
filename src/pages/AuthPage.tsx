import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Warehouse, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageTransition } from '@/components/PageTransition';
import { useI18n } from '@/hooks/useI18n';
import { supabase } from '@/integrations/supabase/client';

const loginSchema = z.object({
  email: z.string().email('invalid_email'),
  password: z.string().min(6, 'password_min_length'),
});

const registerSchema = z.object({
  fullName: z.string().min(2, 'field_required'),
  businessName: z.string().min(2, 'field_required'),
  industry: z.string().min(1, 'select_industry'),
  email: z.string().email('invalid_email'),
  password: z.string()
    .min(8, 'password_min_8')
    .regex(/[A-Z]/, 'password_upper')
    .regex(/[0-9]/, 'password_digit'),
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const { login, register: authRegister } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref') || undefined;

  const handleGoogleSignIn = async () => {
    setOauthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/app`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message);
      setOauthLoading(false);
    }
  };

  const { register: registerLogin, handleSubmit: handleLoginSubmit, formState: { errors: loginErrors } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  });

  const { register: registerSignup, handleSubmit: handleSignupSubmit, formState: { errors: signupErrors } } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', businessName: '', industry: 'retail', email: '', password: '' }
  });

  const onLogin = async (data: LoginValues) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      toast.success(t('login_success') || 'Logged in successfully!');
      navigate('/app');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async (data: RegisterValues) => {
    setLoading(true);
    try {
      await authRegister(data.email, data.password, data.fullName, data.businessName, data.industry, referralCode);
      toast.success(t('register_success') || 'Registration successful! Please check your email.');
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
            <CardTitle className="text-3xl">
              <span className="gradient-text font-black tracking-tighter">MARTE</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{t('business_management_system') || 'Business Management System'}</p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">{t('auth_login') || 'Login'}</TabsTrigger>
                <TabsTrigger value="register">{t('auth_register') || 'Register'}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLoginSubmit(onLogin)} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>{t('email_label') || 'Email'}</Label>
                    <Input type="email" placeholder="email@example.com" {...registerLogin('email')} />
                    {loginErrors.email && <p className="text-xs text-destructive">{t(loginErrors.email.message as any) || loginErrors.email.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>{t('password_label') || 'Password'}</Label>
                    <Input type="password" placeholder="••••••••" {...registerLogin('password')} />
                    {loginErrors.password && <p className="text-xs text-destructive">{t(loginErrors.password.message as any) || loginErrors.password.message}</p>}
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    {loading ? (t('auth_loading') || 'Loading...') : (t('auth_login') || 'Login')}
                  </Button>

                  <div className="flex items-center justify-between mt-3">
                    <Link to="/reset-password" className="text-sm text-primary hover:underline">
                      {t('forgot_password') || 'დაგავიწყდა პაროლი?'}
                    </Link>
                  </div>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">{t('or') || 'ან'}</span></div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleSignIn}
                    disabled={oauthLoading}
                  >
                    {oauthLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                    )}
                    {t('sign_in_google') || 'შესვლა Google-ით'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleSignupSubmit(onRegister)} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>{t('full_name') || 'Full Name'}</Label>
                    <Input placeholder={t('eg_name') || 'e.g. John Doe'} {...registerSignup('fullName')} />
                    {signupErrors.fullName && <p className="text-xs text-destructive">{t(signupErrors.fullName.message as any) || signupErrors.fullName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>{t('business_name_label') || 'Business Name'}</Label>
                    <Input placeholder={t('eg_business') || 'e.g. LLC Marte'} {...registerSignup('businessName')} />
                    {signupErrors.businessName && <p className="text-xs text-destructive">{t(signupErrors.businessName.message as any) || signupErrors.businessName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>{t('industry_label') || 'Industry'}</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      {...registerSignup('industry')}
                    >
                      <option value="retail">{t('ind_retail') || 'Retail & POS'}</option>
                      <option value="fnb">{t('ind_fnb') || 'Restaurant / F&B'}</option>
                      <option value="salon">{t('ind_salon') || 'Salon / Aesthetic Center'}</option>
                      <option value="clinic">{t('ind_clinic') || 'Clinic / Diagnostics'}</option>
                      <option value="pharmacy">{t('ind_pharmacy') || 'Pharmacy'}</option>
                      <option value="auto">{t('ind_auto') || 'Auto Service / Parts'}</option>
                      <option value="logistics">{t('ind_logistics') || 'Warehouse / Logistics'}</option>
                      <option value="construction">{t('ind_construction') || 'Construction / Development'}</option>
                      <option value="real_estate">{t('ind_real_estate') || 'MARTEHOME (Real Estate)'}</option>
                      <option value="other">{t('ind_other') || 'Other'}</option>
                    </select>
                    {signupErrors.industry && <p className="text-xs text-destructive">{t(signupErrors.industry.message as any) || signupErrors.industry.message}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('email_label') || 'Email'}</Label>
                      <Input type="email" placeholder="email@example.com" {...registerSignup('email')} />
                      {signupErrors.email && <p className="text-xs text-destructive">{t(signupErrors.email.message as any) || signupErrors.email.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>{t('password_label') || 'Password'}</Label>
                      <Input type="password" placeholder="••••••••" {...registerSignup('password')} />
                      {signupErrors.password && <p className="text-xs text-destructive">{t(signupErrors.password.message as any) || signupErrors.password.message}</p>}
                    </div>
                  </div>
                  <Button type="submit" className="w-full mt-6" disabled={loading} style={{ background: 'var(--gradient-primary)' }}>
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    {loading ? (t('processing') || 'Processing...') : (t('register_free') || 'Register for Free')}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
