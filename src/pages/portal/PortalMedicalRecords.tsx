import { usePatientPortal } from "@/hooks/usePatientPortal";
import { Badge } from "@/components/ui/badge";
import { Loader2, ClipboardList, ImageIcon, Maximize2, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ka } from "date-fns/locale";

export const PortalMedicalRecords = () => {
  const { records, loading, patient } = usePatientPortal();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin portal-text-primary" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center space-y-4">
        <div className="p-4 bg-slate-100 rounded-full">
          <ClipboardList className="h-10 w-10 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold">მონაცემები ვერ მოიძებნა</h2>
        <p className="text-sm text-muted-foreground">
          თქვენი ტელეფონის ნომრით სამედიცინო ბარათი არ ფიქსირდება.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 animate-slide-up pb-24">
      <div className="flex flex-col gap-2 pt-4">
        <Badge className="w-fit bg-emerald-500/10 text-emerald-600 border-none text-[10px] font-black uppercase tracking-widest px-3 py-1">
          EHR & Medical Data
        </Badge>
        <h1 className="text-3xl font-black tracking-tighter">სამედიცინო ისტორია</h1>
        <p className="text-sm text-muted-foreground font-medium opacity-60">
          თქვენი ჩანაწერები, დიაგნოზები და ფოტოალბომი.
        </p>
      </div>

      <div className="space-y-4">
        {records?.length === 0 ? (
          <div className="text-center py-20 opacity-40">
            <ClipboardList className="h-12 w-12 mx-auto mb-4" />
            <p className="font-bold uppercase tracking-widest text-xs">ჩანაწერები არ არის</p>
          </div>
        ) : (
          records?.map((record) => (
            <div key={record.id} className="glass-card bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-xl border border-white/5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 portal-bg-primary/10 portal-text-primary flex items-center justify-center rounded-2xl">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                      {format(parseISO(record.created_at), 'd MMMM, yyyy', { locale: ka })}
                    </p>
                    <p className="text-sm font-bold mt-0.5">ექიმი: {record.employees?.full_name}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl">
                <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                  {record.notes}
                </p>
              </div>

              {record.photo_urls && record.photo_urls.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <ImageIcon className="h-3 w-3" /> ფოტომასალა
                  </p>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {record.photo_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer" className="shrink-0 relative rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                        <img src={url} alt="Medical" className="h-32 w-32 object-cover" />
                        <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <Maximize2 className="h-5 w-5 text-white" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
