import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOffline = () => { setIsOffline(true); setWasOffline(true); };
    const handleOnline = () => {
      setIsOffline(false);
      if (wasOffline) {
        setShowReconnected(true);
        setTimeout(() => setShowReconnected(false), 3000);
      }
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [wasOffline]);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 bg-destructive text-destructive-foreground py-2 px-4 text-sm font-medium shadow-lg"
        >
          <WifiOff className="h-4 w-4" />
          ინტერნეტ კავშირი არ არის — ოფლაინ რეჟიმი
        </motion.div>
      )}
      {showReconnected && !isOffline && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 px-4 text-sm font-medium shadow-lg"
        >
          <Wifi className="h-4 w-4" />
          კავშირი აღდგა!
        </motion.div>
      )}
    </AnimatePresence>
  );
}