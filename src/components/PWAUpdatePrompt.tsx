import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      // Check for updates every 60 seconds
      if (r) {
        setInterval(() => { r.update(); }, 60 * 1000);
      }
    },
  });

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[100] bg-card border border-border rounded-xl shadow-lg p-4"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <RefreshCw className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">ახალი ვერსია ხელმისაწვდომია</p>
              <p className="text-xs text-muted-foreground mt-0.5">განაახლეთ აპლიკაცია უახლესი ფუნქციების მისაღებად</p>
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={() => updateServiceWorker(true)}>
                  <RefreshCw className="h-3 w-3 mr-1" />განახლება
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setNeedRefresh(false)}>
                  <X className="h-3 w-3 mr-1" />მოგვიანებით
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}