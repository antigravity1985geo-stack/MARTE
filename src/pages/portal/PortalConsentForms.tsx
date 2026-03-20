import { useState, useRef, useEffect } from "react";
import { usePatientPortal } from "@/hooks/usePatientPortal";
import { useSignConsent, useSignaturePad } from "@/hooks/useConsentForms";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, FileCheck2, PenLine, Shield, 
  X, CheckCircle2, Eraser, Info
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ka } from "date-fns/locale";
import { STATUS_META, ConsentForm, renderTemplate } from "@/types/consentForms";
import { toast } from "sonner";

// ─── Local Signature Pad (Simplified) ───────────────────────────
function PortalSignaturePad({ onCapture }: { onCapture: (data: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { clear, getDataURL, isEmpty } = useSignaturePad(canvasRef);

  return (
    <div className="space-y-4">
      <div className="relative border-2 border-dashed border-slate-200 rounded-[2rem] overflow-hidden bg-slate-50/50 h-40">
        <canvas
          ref={canvasRef}
          width={window.innerWidth - 80}
          height={160}
          className="w-full h-full touch-none cursor-crosshair"
        />
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
            <p className="text-sm font-bold uppercase tracking-widest">მოაწერეთ ხელი</p>
          </div>
        )}
      </div>
      <div className="flex gap-3">
        <button onClick={clear} className="flex-1 py-4 border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-400">
          <Eraser className="inline mr-2 h-3 w-3" /> გასუფთავება
        </button>
        <button 
          onClick={() => {
            const data = getDataURL();
            if (data) onCapture(data);
          }} 
          disabled={isEmpty}
          className="flex-1 py-4 portal-bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest disabled:opacity-30"
        >
          <CheckCircle2 className="inline mr-2 h-3 w-3" /> დადასტურება
        </button>
      </div>
    </div>
  );
}

export const PortalConsentForms = () => {
  const { consentForms, loading, patient } = usePatientPortal();
  const { signAsPatient, busy } = useSignConsent();
  const [signingForm, setSigningForm] = useState<ConsentForm | null>(null);
  const [capturedSig, setCapturedSig] = useState<string | null>(null);

  const handleSign = async () => {
    if (!signingForm || !capturedSig) return;
    const ok = await signAsPatient(signingForm.id, capturedSig);
    if (ok) {
      toast.success("ფორმა წარმატებით ხელმოწერილია");
      setSigningForm(null);
      setCapturedSig(null);
      // Data will refresh via real-time or refetch in hook if implemented
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin portal-text-primary" /></div>;

  return (
    <div className="p-4 space-y-6 animate-slide-up pb-24">
      <div className="flex flex-col gap-2 pt-4">
        <Badge className="w-fit bg-purple-500/10 text-purple-500 border-none text-[10px] font-black uppercase tracking-widest px-3 py-1">
          Legal & Consents
        </Badge>
        <h1 className="text-3xl font-black tracking-tighter">თანხმობის ფორმები</h1>
        <p className="text-sm text-muted-foreground font-medium opacity-60">
          გთხოვთ გაეცნოთ და მოაწეროთ ხელი საჭირო დოკუმენტებს.
        </p>
      </div>

      <div className="space-y-4">
        {consentForms?.length === 0 ? (
          <div className="text-center py-20 opacity-40">
            <Shield className="h-12 w-12 mx-auto mb-4" />
            <p className="font-bold uppercase tracking-widest text-xs">ფორმები არ არის</p>
          </div>
        ) : (
          consentForms?.map((form) => (
            <div key={form.id} className="glass-card bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-xl border border-white/5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold">{(form.template as any)?.name}</p>
                  <p className="text-[10px] text-muted-foreground font-medium mt-1 uppercase tracking-widest">
                    {format(parseISO(form.created_at), 'd MMM, yyyy', { locale: ka })}
                  </p>
                </div>
                <Badge className={`text-[9px] font-black border-none uppercase px-2 py-0 ${STATUS_META[form.status].color} ${STATUS_META[form.status].text}`}>
                  {STATUS_META[form.status].label}
                </Badge>
              </div>
              
              {form.status === 'pending' && (
                <button 
                  onClick={() => setSigningForm(form)}
                  className="w-full py-4 portal-bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-portal-primary/20"
                >
                  <PenLine className="inline mr-2 h-3 w-3" /> ხელმოწერა
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Signing Modal Overlay */}
      {signingForm && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex flex-col p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <Badge className="bg-white/10 text-white border-white/10 text-[10px] font-black uppercase tracking-widest">Document Review</Badge>
            <button onClick={() => { setSigningForm(null); setCapturedSig(null); }} className="h-10 w-10 bg-white/10 rounded-full flex items-center justify-center text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-white tracking-tighter">{(signingForm.template as any)?.name}</h2>
              <p className="text-white/40 text-xs font-medium uppercase tracking-widest">Digital Consent Verification</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8">
              <pre className="whitespace-pre-wrap font-sans text-sm text-white/80 leading-relaxed italic">
                {signingForm.rendered_body}
              </pre>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3 text-amber-200">
              <Info className="h-5 w-5 shrink-0" />
              <p className="text-xs font-medium">გთხოვთ ყურადღებით წაიკითხოთ ტექსტი ხელმოწერამდე.</p>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-2">თქვენი ხელმოწერა</p>
              <PortalSignaturePad onCapture={sig => setCapturedSig(sig)} />
              
              {capturedSig && (
                <button 
                  onClick={handleSign}
                  disabled={busy}
                  className="w-full py-6 bg-emerald-500 text-white rounded-[2rem] text-lg font-black shadow-2xl shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  {busy ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : "ხელმოწერის დასრულება"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
