import React from 'react';
import { format } from 'date-fns';
import { Pill } from 'lucide-react';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface PrescriptionPrintTemplateProps {
  clinicName: string;
  doctorName?: string;
  patientName: string;
  patientDob?: string;
  medications: Medication[];
  notes?: string;
  date: string;
}

export const PrescriptionPrintTemplate = React.forwardRef<HTMLDivElement, PrescriptionPrintTemplateProps>(
  ({ clinicName, doctorName, patientName, patientDob, medications, notes, date }, ref) => {
    return (
      <div ref={ref} className="print-only-container bg-white text-black p-12 max-w-[800px] mx-auto min-h-[1000px] font-sans">
        {/* Header / Letterhead */}
        <div className="border-b-4 border-black pb-8 mb-10 flex justify-between items-end">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-black flex items-center justify-center rounded-xl">
              <Pill className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter">{clinicName}</h1>
              <p className="text-sm font-bold opacity-70">სამედიცინო დანიშნულება / MEDICAL PRESCRIPTION</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold">{format(new Date(date), 'dd.MM.yyyy')}</p>
            <p className="text-[10px] uppercase tracking-widest opacity-50 font-black">თარიღი / DATE</p>
          </div>
        </div>

        {/* Patient Info */}
        <div className="grid grid-cols-2 gap-8 mb-12 bg-gray-50 p-6 rounded-2xl border-2 border-black/5">
          <div>
            <p className="text-[10px] uppercase font-black opacity-40 mb-1">პაციენტი / PATIENT</p>
            <p className="text-xl font-bold uppercase">{patientName}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase font-black opacity-40 mb-1">დაბადების თარიღი / D.O.B</p>
            <p className="text-xl font-bold">{patientDob ? format(new Date(patientDob), 'dd.MM.yyyy') : '---'}</p>
          </div>
        </div>

        {/* Prescription Body (The "Rx" symbol) */}
        <div className="mb-8">
           <span className="text-5xl font-serif italic font-black opacity-20 relative -left-4">Rx</span>
        </div>

        {/* Medications Table */}
        <div className="space-y-8 mb-16">
          {medications.map((med, i) => (
            <div key={i} className="border-b border-gray-200 pb-6 last:border-0">
               <div className="flex justify-between items-start mb-2">
                 <h2 className="text-2xl font-black uppercase tracking-tight">{med.name}</h2>
                 <span className="text-lg font-bold bg-black text-white px-3 py-1 rounded-lg">{med.dosage}</span>
               </div>
               <div className="grid grid-cols-2 gap-4 text-sm font-bold">
                 <div className="flex items-center gap-2">
                    <span className="opacity-40 uppercase text-[10px]">სიხშირე:</span>
                    <span>{med.frequency}</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="opacity-40 uppercase text-[10px]">ხანგრძლივობა:</span>
                    <span>{med.duration}</span>
                 </div>
               </div>
               {med.instructions && (
                 <div className="mt-3 p-4 bg-gray-100/50 rounded-xl text-sm italic border-l-4 border-black/10">
                   {med.instructions}
                 </div>
               )}
            </div>
          ))}
        </div>

        {/* Additional Notes */}
        {notes && (
          <div className="mb-20">
            <p className="text-[10px] uppercase font-black opacity-40 mb-2">ექიმის შენიშვნა / DOCTOR'S NOTES</p>
            <div className="text-sm leading-relaxed whitespace-pre-wrap font-medium text-gray-700 italic border-2 border-dashed border-gray-200 p-6 rounded-2xl">
              {notes}
            </div>
          </div>
        )}

        {/* Footer / Signature */}
        <div className="mt-auto grid grid-cols-2 gap-20 pt-20 border-t border-gray-100">
           <div>
              <p className="text-[10px] uppercase font-black opacity-40 mb-4">კლინიკის ბეჭედი / CLINIC STAMP</p>
              <div className="w-32 h-32 border-2 border-gray-100 rounded-full flex items-center justify-center text-[10px] text-gray-200 uppercase font-black rotate-12">
                 Place Stamp Here
              </div>
           </div>
           <div className="text-right flex flex-col items-end">
              <p className="text-[10px] uppercase font-black opacity-40 mb-1">ექიმი / PRESCRIBED BY</p>
              <p className="text-xl font-bold uppercase mb-8">{doctorName || 'ექიმი'}</p>
              <div className="w-full border-b-2 border-black max-w-[250px] mt-10" />
              <p className="text-[10px] uppercase font-black opacity-40 mt-2">ხელმოწერა / SIGNATURE</p>
           </div>
        </div>

        <style>{`
          @media print {
            body * { visibility: hidden; }
            .print-only-container, .print-only-container * { visibility: visible; }
            .print-only-container { 
              position: absolute; 
              left: 0; 
              top: 0; 
              width: 100%;
              padding: 40px !important;
            }
          }
        `}</style>
      </div>
    );
  }
);

PrescriptionPrintTemplate.displayName = 'PrescriptionPrintTemplate';
