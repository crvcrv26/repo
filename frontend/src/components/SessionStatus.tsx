import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../services/api';
import { 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface SessionStatusProps {
  className?: string;
}

export default function SessionStatus({ className = '' }: SessionStatusProps) {
  const { user } = useAuth();
  const [sessionStatus, setSessionStatus] = useState<'valid' | 'checking' | 'invalid'>('checking');
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  const checkSession = async () => {
    if (!user) return;
    
    try {
      setSessionStatus('checking');
      await authAPI.validateSession();
      setSessionStatus('valid');
      setLastChecked(new Date());
    } catch (error: any) {
      if (error.response?.status === 401) {
        setSessionStatus('invalid');
      }
    }
  };

  useEffect(() => {
    if (user) {
      checkSession();
      
      // Check session every 30 seconds
      const interval = setInterval(checkSession, 30000);
      
      return () => clearInterval(interval);
    }
  }, [user]);

  if (!user) return null;

  return (
    <div className={`flex items-center space-x-2 text-sm ${className}`}>
      {sessionStatus === 'checking' && (
        <>
          <ClockIcon className="h-4 w-4 text-yellow-500 animate-spin" />
          <span className="text-yellow-600">Checking session...</span>
        </>
      )}
      
      {sessionStatus === 'valid' && (
        <>
          <CheckCircleIcon className="h-4 w-4 text-green-500" />
          <span className="text-green-600">Session active</span>
        </>
      )}
      
      {sessionStatus === 'invalid' && (
        <>
          <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
          <span className="text-red-600">Session expired</span>
        </>
      )}
      
      <span className="text-gray-400 text-xs">
        Last checked: {lastChecked.toLocaleTimeString()}
      </span>
    </div>
  );
}
