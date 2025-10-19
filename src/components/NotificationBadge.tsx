
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface NotificationBadgeProps {
  count: number;
  className?: string;
}

const NotificationBadge = ({ count, className = "" }: NotificationBadgeProps) => {
  if (count === 0) return null;
  
  return (
    <Badge 
      variant="destructive" 
      className={`ml-2 min-w-[20px] h-5 text-xs font-semibold flex items-center justify-center px-1.5 ${className}`}
    >
      {count > 99 ? '99+' : count}
    </Badge>
  );
};

export default NotificationBadge;
