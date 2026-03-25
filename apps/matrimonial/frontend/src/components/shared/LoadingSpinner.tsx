import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
};

export function LoadingSpinner({
  className = 'text-primary-500',
  size = 'md',
  fullScreen = false,
}: LoadingSpinnerProps) {
  const spinner = <Loader2 className={`${sizeClasses[size]} ${className} animate-spin`} />;

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-orange-50">
        {spinner}
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      {spinner}
    </div>
  );
}
