import { useState, useRef, type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';

interface SwipeToDeleteProps {
  children: ReactNode;
  onDelete: () => void;
  threshold?: number;
}

export function SwipeToDelete({ children, onDelete, threshold = 80 }: SwipeToDeleteProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontal = useRef<boolean | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isHorizontal.current = null;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    if (isHorizontal.current === null) {
      isHorizontal.current = Math.abs(dx) > Math.abs(dy);
      if (!isHorizontal.current) {
        setIsSwiping(false);
        return;
      }
    }

    if (!isHorizontal.current) return;

    // Only allow swipe left
    const newOffset = Math.min(0, Math.max(-threshold * 1.5, dx));
    setOffsetX(newOffset);
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (offsetX < -threshold) {
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      setOffsetX(-300);
      setTimeout(onDelete, 200);
    } else {
      setOffsetX(0);
    }
    isHorizontal.current = null;
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Delete background */}
      <div className="absolute inset-y-0 right-0 flex items-center justify-end px-4 bg-destructive rounded-lg w-full">
        <Trash2 className="h-5 w-5 text-destructive-foreground" />
      </div>
      {/* Swipeable content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
        }}
        className="relative z-10 bg-muted/30"
      >
        {children}
      </div>
    </div>
  );
}
