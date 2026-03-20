import { usePortalAuth, usePortalClinical } from "@/hooks/usePatientPortal";
import { Badge } from "@/components/ui/badge";
import { Loader2, Pill, Printer } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ka } from "date-fns/locale";

export const PortalPrescriptions = () => {
  const { session } = usePortalAuth();
  const patientId = session?.patient_id ?? null;
  const { prescriptions, loading } = usePortalClinical(patientId);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin portal-text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center space-y-4">
        <div className="p-4 bg-slate-100 rounded-full">
          <Pill className="h-10 w-10 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold">მონაცემები ვერ მოიძებნა</h2>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 animate-slide-up pb-24">
      <div className="flex flex-col gap-2 pt-4">
        <Badge className="w-fit bg-blue-500/10 text-blue-600 border-none text-[10px] font-black uppercase tracking-widest px-3 py-1">
          RX & Prescriptions
        </Badge>
        <h1 className="text-3xl font-black tracking-tighter">რეცეპტები</h1>
        <p className="text-sm text-muted-foreground font-medium opacity-60">
          აქ ინახება თქვენი ყველა გამოწერილი რეცეპტი.
        </p>
      </div>

      <div className="space-y-4">
        {prescriptions?.length === 0 ? (
          <div className="text-center py-20 opacity-40">
            <Pill className="h-12 w-12 mx-auto mb-4" />
            <p className="font-bold uppercase tracking-widest text-xs">რეცეპტები არ არის</p>
          </div>
        ) : (
          prescriptions?.map((pres: any) => (
            <div key={pres.id} className="glass-card bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-xl border border-white/5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-blue-500/10 text-blue-600 flex items-center justify-center rounded-2xl">
                    <Pill className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                      {format(parseISO(pres.created_at), 'd MMMM, yyyy', { locale: ka })}
                    </p>
                    <p className="text-sm font-bold mt-0.5">ექიმი: {pres.employees?.full_name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => window.print()} 
                  className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200 transition-colors"
                >
                  <Printer className="h-4 w-4 text-slate-500" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {pres.medications?.map((m: any, idx: number) => (
                  <div key={idx} className="flex flex-col gap-1 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                    <span className="font-black text-xs portal-text-primary uppercase">{m.name}</span>
                    <span className="text-[11px] text-muted-foreground font-bold">
                      {m.dosage} • {m.frequency} • {m.duration}
                    </span>
                    {m.instructions && (
                      <p className="text-[10px] italic opacity-70 mt-1">{m.instructions}</p>
                    )}
                  </div>
                ))}
              </div>

              {pres.notes && (
                <div className="mt-4 text-[11px] text-muted-foreground bg-primary/5 p-3 rounded-xl border-l-4 border-primary/20 italic">
                  <strong>შენიშვნა:</strong> {pres.notes}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="p-8 bg-slate-900 text-white rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <p className="text-sm font-bold opacity-80 mb-2 italic">e-Prescription ✨</p>
        <p className="text-xs text-white/50 leading-relaxed">
          რეცეპტი ხელმისაწვდომია ელექტრონულად. აფთიაქში შეგიძლიათ წარადგინოთ ეს QR ან ამობეჭდილი ვარიანტი.
        </p>
      </div>
    </div>
  );
};
