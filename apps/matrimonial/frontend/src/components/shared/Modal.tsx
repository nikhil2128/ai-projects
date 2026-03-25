import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}

export function Modal({
  open,
  onClose,
  children,
  maxWidth = 'max-w-lg',
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl ${maxWidth} w-full max-h-[80vh] flex flex-col`}>
        {children}
      </div>
    </div>
  );
}

function Header({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="p-6 border-b border-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex-1">{children}</div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors ml-4">
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function Body({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex-1 overflow-y-auto p-4 ${className}`}>
      {children}
    </div>
  );
}

Modal.Header = Header;
Modal.Body = Body;
