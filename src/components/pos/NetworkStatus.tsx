import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, UploadCloud } from 'lucide-react';
import { offlineQueue } from '@/lib/offlineQueue';

export function NetworkStatus({ onSync }: { onSync?: () => void }) {
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [queueCount, setQueueCount] = useState(0);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initial check
        checkQueue();

        // Setup an interval to check queue length occasionally
        const interval = setInterval(checkQueue, 5000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, []);

    const checkQueue = async () => {
        try {
            const count = await offlineQueue.getQueueCount();
            setQueueCount(count);
        } catch (err) {
            console.warn('Failed to check queue count', err);
        }
    };

    return (
        <div className="flex items-center gap-3">
            {queueCount > 0 && (
                <div className="flex items-center gap-2 bg-amber-500/10 text-amber-600 px-3 py-1.5 rounded-full text-xs font-medium border border-amber-500/20 shadow-sm animate-pulse-slow">
                    <UploadCloud className="w-3 h-3" />
                    <span>რიგშია ეროვნული ბანკისკენ გაგზავნას: {queueCount} ცეკი</span>
                    {isOnline && onSync && (
                        <button onClick={onSync} className="p-1 hover:bg-amber-500/20 rounded">
                            <RefreshCw className="w-3 h-3" />
                        </button>
                    )}
                </div>
            )}

            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm transition-colors ${isOnline
                    ? 'bg-green-500/10 text-green-700 border-green-500/20'
                    : 'bg-red-500/10 text-red-600 border-red-500/20 animate-pulse'
                }`}>
                {isOnline ? (
                    <>
                        <Wifi className="w-3.5 h-3.5" />
                        <span>ონლაინ ქსელში მიერთებულია</span>
                    </>
                ) : (
                    <>
                        <WifiOff className="w-3.5 h-3.5" />
                        <span>კავშირი გაწყვეტილია (ოფლაინ)</span>
                    </>
                )}
            </div>
        </div>
    );
}
