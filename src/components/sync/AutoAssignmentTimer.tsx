
import React, { useState, useEffect } from 'react';
import { Timer, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AutoAssignmentTimerProps {
  className?: string;
}

const AutoAssignmentTimer = ({ className = "" }: AutoAssignmentTimerProps) => {
  const [timeUntilNext, setTimeUntilNext] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
  }>({ hours: 0, minutes: 0, seconds: 0, total: 0 });

  const calculateTimeUntilNext = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Calculate next 6-hour interval at minute 30 (0:30, 6:30, 12:30, 18:30)
    let nextAssignmentHour: number;
    
    if (currentHour < 6 || (currentHour === 6 && currentMinute < 30)) {
      nextAssignmentHour = 6;
    } else if (currentHour < 12 || (currentHour === 12 && currentMinute < 30)) {
      nextAssignmentHour = 12;
    } else if (currentHour < 18 || (currentHour === 18 && currentMinute < 30)) {
      nextAssignmentHour = 18;
    } else {
      nextAssignmentHour = 24; // Next day at 0:30
    }
    
    const nextAssignment = new Date(now);
    
    if (nextAssignmentHour === 24) {
      nextAssignment.setDate(nextAssignment.getDate() + 1);
      nextAssignment.setHours(0, 30, 0, 0);
    } else {
      nextAssignment.setHours(nextAssignmentHour, 30, 0, 0);
    }
    
    const diff = nextAssignment.getTime() - now.getTime();
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
              className="text-purple-500"
              strokeDasharray={`${(progressAngle / 360) * 125.6} 125.6`}
              strokeLinecap="round"
            />
          </svg>
          
          {/* Timer icon in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Timer className="w-5 h-5 text-purple-600" />
          </div>
        </div>
      </div>
      
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Prochaine auto-assignation</span>
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

export default AutoAssignmentTimer;
