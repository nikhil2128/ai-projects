interface ErrorAlertProps {
  message: string;
  className?: string;
}

export function ErrorAlert({
  message,
  className = 'mb-6',
}: ErrorAlertProps) {
  if (!message) return null;

  return (
    <div className={`p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm ${className}`}>
      {message}
    </div>
  );
}
