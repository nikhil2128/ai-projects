interface SelectionGroupProps<T extends string> {
  options: readonly T[];
  value: T | '';
  onChange: (value: T) => void;
  columns?: number;
  disabled?: boolean;
  className?: string;
}

export function SelectionGroup<T extends string>({
  options,
  value,
  onChange,
  columns = 3,
  disabled = false,
  className = '',
}: SelectionGroupProps<T>) {
  return (
    <div className={`grid grid-cols-${columns} gap-3 ${className}`}>
      {options.map(option => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          disabled={disabled}
          className={`py-3 rounded-xl border-2 font-medium text-sm transition-all ${
            value === option
              ? 'border-primary-500 bg-primary-50 text-primary-700'
              : 'border-gray-200 hover:border-gray-300 text-gray-600'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
