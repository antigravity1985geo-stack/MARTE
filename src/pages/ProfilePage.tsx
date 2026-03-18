import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { User, Mail, Phone, MapPin, Building, Save, KeyRound, RotateCcw, Camera, Globe, Bell, Palette, Shield, Sun, Moon, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import { PageTransition } from '@/components/PageTransition';
import { resetOnboarding } from '@/components/OnboardingTour';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTheme } from 'next-themes';

interface ProfileData {
  full_name: string;
  phone: string;
  address: string;
  company: string;
  bio: string;
  avatar_url: string;
}

interface AppSettings {
  language: string;
  notifications: boolean;
  darkMode: boolean;
  currency: string;
  dateFormat: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  language: 'ka',
  notifications: true,
  darkMode: false,
  currency: '₾',
  dateFormat: 'dd/MM/yyyy',
};

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState<ProfileData>({
    full_name: '',
    phone: '',
    address: '',
    company: '',
    bio: '',
    avatar_url: '',
  });
  const [loading, setLoading] = useState(false);
  const { theme, setTheme } = useTheme();
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, phone, address, company, bio, avatar_url, settings')
      .eq('id', user!.id)
      .single();

    if (data) {
      setProfile({
        full_name: data.full_name || '',
        phone: data.phone || '',
        address: data.address || '',
        company: data.company || '',
        bio: data.bio || '',
        avatar_url: data.avatar_url || '',
      });
      // Load settings from Supabase (cloud-persistent, cross-device)
      if (data.settings && typeof data.settings === 'object') {
        setSettings({ ...DEFAULT_SETTINGS, ...(data.settings as Partial<AppSettings>) });
      }
      setSettingsLoaded(true);
    }
  };

  // Persist settings changes to Supabase (debounced via useEffect)
  useEffect(() => {
    if (!settingsLoaded || !user?.id) return;
    const timer = setTimeout(() => {
      supabase
        .from('profiles')
        .update({ settings: settings as any })
        .eq('id', user.id);
    }, 800);
    return () => clearTimeout(timer);
  }, [settings, settingsLoaded, user?.id]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('ფაილის ზომა არ უნდა აღემატებოდეს 2MB-ს');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('მხოლოდ სურათის ფორმატი დაშვებულია');
      return;
    }

    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        toast.error(`ატვირთვის შეცდომა: ${uploadError.message}`);
        return;
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);

      setProfile((p) => ({ ...p, avatar_url: avatarUrl }));
      toast.success('ფოტო წარმატებით აიტვირთა!');
    } catch (err: any) {
      toast.error('ფოტოს ატვირთვა ვერ მოხერხდა');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.full_name.trim()) {
      toast.error('სახელი სავალდებულოა');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name.trim(),
          phone: profile.phone.trim(),
          address: profile.address.trim(),
          company: profile.company.trim(),
          bio: profile.bio.trim(),
        })
        .eq('id', user!.id);

      if (error) throw error;
      toast.success('პროფილი წარმატებით განახლდა!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new.length < 6) {
      toast.error('პაროლი მინიმუმ 6 სიმბოლო უნდა იყოს');
      return;
    }
    if (passwordData.new !== passwordData.confirm) {
      toast.error('პაროლები არ ემთხვევა');
      return;
    }
    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordData.new });
      if (error) throw error;
      toast.success('პაროლი წარმატებით შეიცვალა!');
      setPasswordData({ current: '', new: '', confirm: '' });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const initials = profile.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const avatarSrc = profile.avatar_url || '';

  return (
    <PageTransition>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">პროფილი & პარამეტრები</h1>
          <p className="text-muted-foreground">მართეთ თქვენი ანგარიში და აპლიკაციის პარამეტრები</p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="profile" className="gap-1.5"><User className="h-3.5 w-3.5" />პროფილი</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5"><Palette className="h-3.5 w-3.5" />პარამეტრები</TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5"><Shield className="h-3.5 w-3.5" />უსაფრთხოება</TabsTrigger>
          </TabsList>

          {/* ===== PROFILE TAB ===== */}
          <TabsContent value="profile" className="space-y-6 mt-6">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Avatar Card */}
              <Card className="md:col-span-1">
                <CardContent className="flex flex-col items-center pt-6">
                  <div className="relative group">
                    <Avatar className="h-28 w-28 border-4 border-background shadow-lg">
                      {avatarSrc ? (
                        <AvatarImage src={avatarSrc} alt={profile.full_name} className="object-cover" />
                      ) : null}
                      <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    >
                      <Camera className="h-6 w-6 text-white" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 text-xs text-muted-foreground"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                  >
                    <Camera className="h-3.5 w-3.5 mr-1" />
                    {uploadingAvatar ? 'იტვირთება...' : 'ფოტოს შეცვლა'}
                  </Button>
                  <h2 className="text-lg font-semibold mt-2">{profile.full_name || 'მომხმარებელი'}</h2>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  {profile.company && (
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                      <Building className="h-3 w-3" /> {profile.company}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Edit Form */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    პირადი მონაცემები
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> სრული სახელი</Label>
                        <Input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} placeholder="გიორგი ბერიძე" maxLength={100} required />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> ელ-ფოსტა</Label>
                        <Input value={user?.email || ''} disabled className="bg-muted" />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> ტელეფონი</Label>
                        <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="+995 5XX XXX XXX" maxLength={20} />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1"><Building className="h-3.5 w-3.5" /> კომპანია</Label>
                        <Input value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} placeholder="კომპანიის სახელი" maxLength={100} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> მისამართი</Label>
                      <Input value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} placeholder="ქალაქი, ქუჩა" maxLength={200} />
                    </div>
                    <div className="space-y-2">
                      <Label>ბიო</Label>
                      <Textarea value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} placeholder="მოკლე აღწერა..." maxLength={500} rows={3} />
                    </div>
                    <Button type="submit" disabled={loading} className="gap-2">
                      <Save className="h-4 w-4" />
                      {loading ? 'ინახება...' : 'შენახვა'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ===== SETTINGS TAB ===== */}
          <TabsContent value="settings" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  აპლიკაციის პარამეტრები
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">ენა</Label>
                    <p className="text-xs text-muted-foreground">აპლიკაციის ინტერფეისის ენა</p>
                  </div>
                  <Select value={settings.language} onValueChange={(v) => setSettings({ ...settings, language: v })}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ka">ქართული</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ru">Русский</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">ვალუტა</Label>
                    <p className="text-xs text-muted-foreground">ნაგულისხმევი ვალუტის სიმბოლო</p>
                  </div>
                  <Select value={settings.currency} onValueChange={(v) => setSettings({ ...settings, currency: v })}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="₾">₾ ლარი (GEL)</SelectItem>
                      <SelectItem value="$">$ დოლარი (USD)</SelectItem>
                      <SelectItem value="€">€ ევრო (EUR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">თარიღის ფორმატი</Label>
                    <p className="text-xs text-muted-foreground">თარიღების გამოსახვის ფორმატი</p>
                  </div>
                  <Select value={settings.dateFormat} onValueChange={(v) => setSettings({ ...settings, dateFormat: v })}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dd/MM/yyyy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="yyyy-MM-dd">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-1">
                      <Bell className="h-3.5 w-3.5" /> შეტყობინებები
                    </Label>
                    <p className="text-xs text-muted-foreground">აპლიკაციის შეტყობინებების ჩართვა</p>
                  </div>
                  <Switch checked={settings.notifications} onCheckedChange={(v) => setSettings({ ...settings, notifications: v })} />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-1">
                      <Palette className="h-3.5 w-3.5" /> თემა
                    </Label>
                    <p className="text-xs text-muted-foreground">აპლიკაციის გარეგნული იერსახე</p>
                  </div>
                  <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                    <Button
                      variant={theme === 'light' ? 'default' : 'ghost'}
                      size="sm"
                      className="h-7 px-2.5 gap-1"
                      onClick={() => setTheme('light')}
                    >
                      <Sun className="h-3.5 w-3.5" />
                      <span className="text-xs">ღია</span>
                    </Button>
                    <Button
                      variant={theme === 'dark' ? 'default' : 'ghost'}
                      size="sm"
                      className="h-7 px-2.5 gap-1"
                      onClick={() => setTheme('dark')}
                    >
                      <Moon className="h-3.5 w-3.5" />
                      <span className="text-xs">მუქი</span>
                    </Button>
                    <Button
                      variant={theme === 'system' ? 'default' : 'ghost'}
                      size="sm"
                      className="h-7 px-2.5 gap-1"
                      onClick={() => setTheme('system')}
                    >
                      <Monitor className="h-3.5 w-3.5" />
                      <span className="text-xs">ავტო</span>
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Onboarding Tour Reset */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">ინტერაქტიული ტური</Label>
                    <p className="text-xs text-muted-foreground">ხელახლა გაიარეთ სისტემის გზამკვლევი</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={async () => { await resetOnboarding(user?.id); window.location.href = '/'; }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    თავიდან
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== SECURITY TAB ===== */}
          <TabsContent value="security" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-primary" />
                  პაროლის შეცვლა
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label>ახალი პაროლი</Label>
                    <Input type="password" value={passwordData.new} onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })} placeholder="••••••••" minLength={6} required />
                  </div>
                  <div className="space-y-2">
                    <Label>პაროლის დადასტურება</Label>
                    <Input type="password" value={passwordData.confirm} onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })} placeholder="••••••••" required />
                  </div>
                  <Button type="submit" variant="outline" disabled={passwordLoading} className="gap-2">
                    <KeyRound className="h-4 w-4" />
                    {passwordLoading ? 'იცვლება...' : 'პაროლის შეცვლა'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Shield className="h-5 w-5" />
                  ანგარიშის ინფორმაცია
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ანგარიშის ID</span>
                  <span className="font-mono text-xs">{user?.id?.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ელ-ფოსტა</span>
                  <span>{user?.email}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
}
