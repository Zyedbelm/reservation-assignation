import React, { useState, useEffect } from 'react';
import { Clock, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AutoSyncTimerProps {
  className?: string;
}

const AutoSyncTimer = ({ className = "" }: AutoSyncTimerProps) => {
  const [timeUntilNext, setTimeUntilNext] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
  }>({ hours: 0, minutes: 0, seconds: 0, total: 0 });

  const calculateTimeUntilNext = () => {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Calculate next 6-hour mark (0, 6, 12, 18)
    let nextSyncHour: number;
    
    if (currentHour < 6) {
      nextSyncHour = 6;
    } else if (currentHour < 12) {
      nextSyncHour = 12;
    } else if (currentHour < 18) {
      nextSyncHour = 18;
    } else {
      nextSyncHour = 24; // Next day at 0:00
    }
    
    const nextSync = new Date(now);
    
    if (nextSyncHour === 24) {
      nextSync.setDate(nextSync.getDate() + 1);
      nextSync.setHours(0, 0, 0, 0);
    } else {
      nextSync.setHours(nextSyncHour, 0, 0, 0);
    }
    
    const diff = nextSync.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { hours, minutes, seconds, total: diff };
  };

  useEffect(() => {
    const updateTimer = () => {
      setTimeUntilNext(calculateTimeUntilNext());
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, []);

  // Calculate rotation angle (360 degrees = 6 hours)
  const totalSeconds = 6 * 60 * 60; // 6 hours in seconds
  const remainingSeconds = timeUntilNext.hours * 3600 + timeUntilNext.minutes * 60 + timeUntilNext.seconds;
  const progressAngle = ((totalSeconds - remainingSeconds) / totalSeconds) * 360;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        {/* Circular timer background */}
        <div className="w-12 h-12 rounded-full border-4 border-gray-200 relative">
          {/* Progress circle */}
          <svg 
            className="absolute inset-0 w-12 h-12 transform -rotate-90" 
            viewBox="0 0 48 48"
          >
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              className="text-blue-500"
              strokeDasharray={`${(progressAngle / 360) * 125.6} 125.6`}
              strokeLinecap="round"
            />
          </svg>
          
          {/* Clock icon in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <RotateCcw className="w-5 h-5 text-blue-600" />
          </div>
        </div>
      </div>
      
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Prochain sync auto</span>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-xs">
            {String(timeUntilNext.hours).padStart(2, '0')}:
            {String(timeUntilNext.minutes).padStart(2, '0')}:
            {String(timeUntilNext.seconds).padStart(2, '0')}
          </Badge>
        </div>
      </div>
    </div>
  );
};

export default AutoSyncTimer;