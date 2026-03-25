import { Check } from 'lucide-react';

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function StepIndicator({ steps, currentStep, onStepClick }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <button
            onClick={() => onStepClick?.(i)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              i === currentStep
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                : i < currentStep
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {i < currentStep ? <Check className="w-4 h-4" /> : <span>{i + 1}</span>}
            <span className="hidden sm:inline">{label}</span>
          </button>
          {i < steps.length - 1 && (
            <div className={`w-8 h-0.5 ${i < currentStep ? 'bg-primary-400' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}
