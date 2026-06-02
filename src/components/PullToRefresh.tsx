import React, { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const isTopRef = useRef(true);

  // Resistance factor to make the pull feel natural
  const RESISTANCE = 0.4;
  const THRESHOLD = 60;
  const REFRESH_HEIGHT = 45;

  // Touch and mouse events handling
  const handleStart = (clientY: number) => {
    if (isRefreshing) return;

    const container = containerRef.current;
    if (container) {
      // Only trigger if container is scrolled to the absolute top
      isTopRef.current = container.scrollTop === 0;
      if (isTopRef.current) {
        startYRef.current = clientY;
        setIsPulling(true);
      }
    }
  };

  const handleMove = (clientY: number, e?: TouchEvent | MouseEvent) => {
    if (!isPullingRefActive() || isRefreshing || !isTopRef.current) return;

    const distance = clientY - startYRef.current;
    if (distance > 0) {
      // Prevent standard browser pull-to-refresh / bounce if pulling down
      if (e && e.cancelable) {
        e.preventDefault();
      }
      const pull = Math.min(distance * RESISTANCE, 90);
      setPullDistance(pull);
    }
  };

  const handleEnd = async () => {
    if (!isPullingRefActive()) return;
    setIsPulling(false);
    startYRef.current = 0;

    if (pullDistance >= THRESHOLD) {
      // Trigger refresh
      setPullDistance(REFRESH_HEIGHT);
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (err) {
        console.error('Refresh action failed:', err);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      // Return to 0
      setPullDistance(0);
    }
  };

  // Helper because state is async
  const isPullingRefActive = () => {
    return startYRef.current !== 0;
  };

  // Bind non-passive listeners for touchmove to prevent chrome pull-to-refresh
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onTouchMove = (e: TouchEvent) => {
      if (isRefreshing) return;
      const clientY = e.touches[0].clientY;
      const distance = clientY - startYRef.current;
      
      // If we are at the top and pulling down, we must prevent default
      if (container.scrollTop === 0 && distance > 0 && startYRef.current !== 0) {
        if (e.cancelable) {
          e.preventDefault();
        }
      }
      handleMove(clientY);
    };

    container.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      container.removeEventListener('touchmove', onTouchMove);
    };
  }, [isPulling, isRefreshing, pullDistance]);

  return (
    <div
      ref={containerRef}
      className="scrollable"
      style={{
        position: 'relative',
        overflowY: isRefreshing ? 'hidden' : 'auto', // Prevent scrolling during refresh
      }}
      onTouchStart={(e) => handleStart(e.touches[0].clientY)}
      onTouchEnd={handleEnd}
      onMouseDown={(e) => handleStart(e.clientY)}
      onMouseMove={(e) => {
        if (e.buttons === 1) {
          handleMove(e.clientY);
        }
      }}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
    >
      {/* Pull indicator spinner */}
      <div
        style={{
          position: 'absolute',
          top: `${pullDistance - 35}px`,
          left: 0,
          right: 0,
          height: '35px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: Math.min(pullDistance / THRESHOLD, 1),
          transition: isPulling ? 'none' : 'top 0.3s ease, opacity 0.3s ease',
          pointerEvents: 'none',
          zIndex: 100,
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)',
            border: '1px solid var(--border)',
          }}
        >
          <Loader2
            size={18}
            className={isRefreshing ? 'spin' : ''}
            style={{
              transform: isRefreshing ? 'none' : `rotate(${pullDistance * 6}deg)`,
              transition: isRefreshing ? 'none' : 'transform 0.1s ease',
            }}
          />
        </div>
      </div>

      {/* Actual Content Wrapper with translation effect */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? 'none' : 'transform 0.3s ease',
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </div>
    </div>
  );
}
