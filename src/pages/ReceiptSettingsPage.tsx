import { useState, useRef } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { useReceiptStore } from '@/stores/useReceiptStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QRCodeSVG } from 'qrcode.react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function ReceiptSettingsPage() {
  const { receiptConfig, updateConfig } = useReceiptStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('მხოლოდ სურათის ფაილი');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('ფაილი ძალიან დიდია (მაქს. 2MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      updateConfig({ logoUrl: ev.target?.result as string });
      toast.success('ლოგო ატვირთულია');
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    updateConfig({ logoUrl: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <PageTransition>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">ქვითრის კონფიგურაცია</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Settings */}
          <div className="stat-card space-y-4">
            {/* Logo upload */}
            <div className="space-y-2">
              <Label>კომპანიის ლოგო</Label>
              <div className="flex items-center gap-3">
                {receiptConfig.logoUrl ? (
                  <div className="relative">
                    <img
                      src={receiptConfig.logoUrl}
                      alt="ლოგო"
                      className="h-16 w-16 object-contain rounded-lg border bg-muted/30 p-1"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
                      onClick={removeLogo}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="h-16 w-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                )}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {receiptConfig.logoUrl ? 'შეცვლა' : 'ატვირთვა'}
                  </Button>
                  <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG • მაქს. 2MB</p>
                </div>
              </div>
            </div>

            <div className="space-y-2"><Label>კომპანიის სახელი</Label><Input value={receiptConfig.companyName} onChange={(e) => updateConfig({ companyName: e.target.value })} /></div>
            <div className="space-y-2"><Label>მისამართი</Label><Input value={receiptConfig.address} onChange={(e) => updateConfig({ address: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>ტელეფონი</Label><Input value={receiptConfig.phone} onChange={(e) => updateConfig({ phone: e.target.value })} /></div>
              <div className="space-y-2"><Label>საიდენტიფიკაციო</Label><Input value={receiptConfig.tin} onChange={(e) => updateConfig({ tin: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>ქაღალდის ზომა</Label><Select value={receiptConfig.paperSize} onValueChange={(v: any) => updateConfig({ paperSize: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="58mm">58mm</SelectItem><SelectItem value="80mm">80mm</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>შრიფტის ზომა</Label><Input type="number" value={receiptConfig.fontSize} onChange={(e) => updateConfig({ fontSize: parseInt(e.target.value) || 12 })} /></div>
            </div>
            <div className="flex items-center justify-between"><Label>QR კოდის ჩვენება</Label><Switch checked={receiptConfig.showQR} onCheckedChange={(v) => updateConfig({ showQR: v })} /></div>
            <div className="space-y-2"><Label>Footer ტექსტი</Label><Input value={receiptConfig.footer} onChange={(e) => updateConfig({ footer: e.target.value })} /></div>
          </div>

          {/* Preview */}
          <div className="stat-card">
            <h3 className="font-semibold mb-4">პრევიუ</h3>
            <div className={`mx-auto bg-card border rounded-lg p-4 font-mono ${receiptConfig.paperSize === '58mm' ? 'max-w-[232px]' : 'max-w-[320px]'}`} style={{ fontSize: `${receiptConfig.fontSize}px` }}>
              <div className="text-center border-b pb-2 mb-2">
                {receiptConfig.logoUrl && (
                  <img src={receiptConfig.logoUrl} alt="ლოგო" className="h-10 mx-auto mb-1 object-contain" />
                )}
                <p className="font-bold">{receiptConfig.companyName}</p>
                <p className="text-[10px]">{receiptConfig.address}</p>
                <p className="text-[10px]">{receiptConfig.phone}</p>
                <p className="text-[10px]">ს/კ: {receiptConfig.tin}</p>
              </div>
              <div className="border-b pb-2 mb-2">
                <div className="flex justify-between text-[10px]"><span>კოკა-კოლა 0.5ლ x2</span><span>₾4.00</span></div>
                <div className="flex justify-between text-[10px]"><span>შოთის პური x1</span><span>₾1.00</span></div>
              </div>
              <div className="flex justify-between font-bold"><span>ჯამი:</span><span>₾5.00</span></div>
              <div className="flex justify-between text-[10px]"><span>ნაღდი:</span><span>₾10.00</span></div>
              <div className="flex justify-between text-[10px]"><span>ხურდა:</span><span>₾5.00</span></div>
              {receiptConfig.showQR && (
                <div className="flex justify-center mt-3"><QRCodeSVG value="https://rs.ge" size={64} /></div>
              )}
              <p className="text-center text-[9px] mt-2 text-muted-foreground">{receiptConfig.footer}</p>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
