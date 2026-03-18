import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { useReceiptConfig } from '@/hooks/useReceiptConfig';
import { useAuthStore } from '@/stores/useAuthStore';
import { FileUpload } from '@/components/ui/file-upload';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QRCodeSVG } from 'qrcode.react';
import { X } from 'lucide-react';
import { toast } from 'sonner';

export default function ReceiptSettingsPage() {
  const { receiptConfig, updateConfig } = useReceiptConfig();
  const { activeTenantId } = useAuthStore();

  const removeLogo = () => {
    updateConfig.mutate({ logoUrl: '' });
  };

  return (
    <PageTransition>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">ქვითრის კონფიგურაცია</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Settings */}
          <div className="stat-card space-y-4">
            {/* Logo upload */}
            <div className="space-y-4">
              <Label>კომპანიის ლოგო</Label>
              <div className="max-w-sm">
                <FileUpload
                  bucket="tenant-assets"
                  path={activeTenantId || 'public'}
                  onUploadSuccess={(url) => updateConfig.mutate({ logoUrl: url })}
                  currentImageUrl={receiptConfig.logoUrl}
                  className="h-32 mb-2"
                />
                {receiptConfig.logoUrl && (
                  <Button variant="ghost" size="sm" onClick={removeLogo} className="text-destructive w-full">
                    <X className="h-4 w-4 mr-1" /> ლოგოს წაშლა
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2"><Label>კომპანიის სახელი</Label><Input value={receiptConfig.storeName} onChange={(e) => updateConfig.mutate({ storeName: e.target.value })} /></div>
            <div className="space-y-2"><Label>მისამართი</Label><Input value={receiptConfig.storeAddress} onChange={(e) => updateConfig.mutate({ storeAddress: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>ტელეფონი</Label><Input value={receiptConfig.phone} onChange={(e) => updateConfig.mutate({ phone: e.target.value })} /></div>
              <div className="space-y-2"><Label>საიდენტიფიკაციო</Label><Input value={receiptConfig.taxId} onChange={(e) => updateConfig.mutate({ taxId: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>შრიფტის ზომა</Label><Input type="number" value={12} disabled /></div>
            </div>
            <div className="flex items-center justify-between"><Label>QR კოდის ჩვენება</Label><Switch checked={receiptConfig.showBarcode} onCheckedChange={(v) => updateConfig.mutate({ showBarcode: v })} /></div>
            <div className="space-y-2"><Label>Footer ტექსტი</Label><Input value={receiptConfig.footerText} onChange={(e) => updateConfig.mutate({ footerText: e.target.value })} /></div>
          </div>

          {/* Preview */}
          <div className="stat-card">
            <h3 className="font-semibold mb-4">პრევიუ</h3>
            <div className={`mx-auto bg-card border rounded-lg p-4 font-mono ${receiptConfig.paperSize === '58mm' ? 'max-w-[232px]' : 'max-w-[320px]'}`} style={{ fontSize: `12px` }}>
              <div className="text-center border-b pb-2 mb-2">
                {receiptConfig.logoUrl && (
                  <img src={receiptConfig.logoUrl} alt="ლოგო" className="h-10 mx-auto mb-1 object-contain" />
                )}
                <p className="font-bold">{receiptConfig.storeName}</p>
                <p className="text-[10px]">{receiptConfig.storeAddress}</p>
                <p className="text-[10px]">{receiptConfig.phone}</p>
                <p className="text-[10px]">ს/კ: {receiptConfig.taxId}</p>
              </div>
              <div className="border-b pb-2 mb-2">
                <div className="flex justify-between text-[10px]"><span>კოკა-კოლა 0.5ლ x2</span><span>₾4.00</span></div>
                <div className="flex justify-between text-[10px]"><span>შოთის პური x1</span><span>₾1.00</span></div>
              </div>
              <div className="flex justify-between font-bold"><span>ჯამი:</span><span>₾5.00</span></div>
              <div className="flex justify-between text-[10px]"><span>ნაღდი:</span><span>₾10.00</span></div>
              <div className="flex justify-between text-[10px]"><span>ხურდა:</span><span>₾5.00</span></div>
              {receiptConfig.showBarcode && (
                <div className="flex justify-center mt-3"><QRCodeSVG value="https://rs.ge" size={64} /></div>
              )}
              <p className="text-center text-[9px] mt-2 text-muted-foreground">{receiptConfig.footerText}</p>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
