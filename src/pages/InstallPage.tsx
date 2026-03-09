import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download, Smartphone, Monitor, CheckCircle, Share, Plus,
  MoreVertical, Wifi, WifiOff, Zap, Shield, Bell
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => setIsInstalled(true));

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
  };

  if (isStandalone || isInstalled) {
    return (
      <div className="max-w-lg mx-auto space-y-6 py-8">
        <Card className="border-primary/30">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">აპლიკაცია დაინსტალირებულია!</h1>
            <p className="text-muted-foreground">MARTE უკვე დაინსტალირებულია თქვენს მოწყობილობაზე და მუშაობს ოფლაინ რეჟიმშიც.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto shadow-lg">
          <Download className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">დააინსტალირე MARTE</h1>
        <p className="text-muted-foreground">დააინსტალირე აპლიკაცია შენს მოწყობილობაზე სწრაფი წვდომისთვის</p>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Zap, label: 'სწრაფი გაშვება', desc: 'ერთი დაჭერით' },
          { icon: WifiOff, label: 'ოფლაინ რეჟიმი', desc: 'ინტერნეტის გარეშე' },
          { icon: Shield, label: 'უსაფრთხო', desc: 'დაშიფრული' },
          { icon: Bell, label: 'შეტყობინებები', desc: 'რეალტაიმ ალერტები' },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="p-3 text-center space-y-1">
              <item.icon className="h-5 w-5 text-primary mx-auto" />
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-[10px] text-muted-foreground">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Install button for Android/Desktop */}
      {deferredPrompt && (
        <Card className="border-primary/30">
          <CardContent className="p-6 text-center space-y-4">
            <Monitor className="h-8 w-8 text-primary mx-auto" />
            <h2 className="text-lg font-bold">მზადაა ინსტალაციისთვის</h2>
            <Button size="lg" className="gap-2 text-lg px-8" onClick={handleInstall}>
              <Download className="h-5 w-5" />დაინსტალირება
            </Button>
          </CardContent>
        </Card>
      )}

      {/* iOS Instructions */}
      {isIOS && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Smartphone className="h-5 w-5 text-primary" />iPhone / iPad-ზე ინსტალაცია</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { step: 1, icon: Share, text: 'დააჭირეთ Share ღილაკს (ქვემოთ ცენტრში)' },
              { step: 2, icon: Plus, text: 'აირჩიეთ "Add to Home Screen"' },
              { step: 3, icon: CheckCircle, text: 'დააჭირეთ "Add" — მზადაა!' },
            ].map(item => (
              <div key={item.step} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">{item.step}</div>
                <item.icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm">{item.text}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Android Instructions (when no prompt) */}
      {!isIOS && !deferredPrompt && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Smartphone className="h-5 w-5 text-primary" />Android-ზე ინსტალაცია</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { step: 1, icon: MoreVertical, text: 'Chrome-ში დააჭირეთ ⋮ მენიუს (ზედა მარჯვენა კუთხე)' },
              { step: 2, icon: Download, text: 'აირჩიეთ "Install app" ან "Add to Home screen"' },
              { step: 3, icon: CheckCircle, text: 'დაადასტურეთ — აპლიკაცია გამოჩნდება Home Screen-ზე' },
            ].map(item => (
              <div key={item.step} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">{item.step}</div>
                <item.icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm">{item.text}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Desktop Instructions */}
      {!isIOS && !deferredPrompt && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Monitor className="h-5 w-5 text-primary" />Desktop-ზე ინსტალაცია</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Chrome-ში მისამართის ზოლში გამოჩნდება <Download className="h-3.5 w-3.5 inline mx-0.5" /> ინსტალაციის ღილაკი. დააჭირეთ და აპლიკაცია დაინსტალირდება.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}