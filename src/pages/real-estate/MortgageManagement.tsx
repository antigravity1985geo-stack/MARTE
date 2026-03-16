import { PageTransition } from '@/components/PageTransition';
import { Button } from '@/components/ui/button';
import { Plus, Key } from 'lucide-react';

export default function MortgageManagement() {
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">გირაო / იპოთეკა</h1>
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> ახალი ხელშეკრულება
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center h-[400px] border-2 border-dashed rounded-xl bg-muted/30">
          <Key className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
          <p className="text-muted-foreground">აქტიური ხელშეკრულებები არ მოიძებნა.</p>
        </div>
      </div>
    </PageTransition>
  );
}
