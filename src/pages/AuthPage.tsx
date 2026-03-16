import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Warehouse } from 'lucide-react';
import { toast } from 'sonner';
import { PageTransition } from '@/components/PageTransition';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('retail');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('წარმატებით შეხვედით!');
      navigate('/app');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(email, password, fullName, businessName, industry);
      toast.success('რეგისტრაცია წარმატებულია! გთხოვთ შეამოწმოთ ელ-ფოსტა.');
      // Optionally login automatically after some time, or wait for email verification.
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
            <p className="text-sm text-muted-foreground mt-1">ბიზნესის მართვის სისტემა</p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">შესვლა</TabsTrigger>
                <TabsTrigger value="register">რეგისტრაცია</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>ელ-ფოსტა</Label>
                    <Input type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>პაროლი</Label>
                    <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'იტვირთება...' : 'შესვლა'}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>სრული სახელი</Label>
                    <Input placeholder="გიორგი ბერიძე" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>ბიზნესის (კომპანიის) სახელი</Label>
                    <Input placeholder="მაგ: შპს მარტე" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>ინდუსტრია</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                    >
                      <option value="retail">საცალო ვაჭრობა & POS</option>
                      <option value="fnb">რესტორანი / F&B</option>
                      <option value="salon">სალონი / ესთეტიკური ცენტრი</option>
                      <option value="pharmacy">აფთიაქი</option>
                      <option value="real_estate">MARTEHOME (ბინების ყიდვა-გაყიდვა)</option>
                      <option value="construction">მშენებლობა</option>
                      <option value="other">სხვა</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>ელ-ფოსტა</Label>
                      <Input type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>პაროლი</Label>
                      <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                  </div>
                  <Button type="submit" className="w-full mt-6" disabled={loading} style={{ background: 'var(--gradient-primary)' }}>
                    {loading ? 'მიმდინარეობს...' : 'უფასოდ რეგისტრაცია'}
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
