import { forwardRef, type SelectHTMLAttributes, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, options, placeholder, children, ...props }, ref) => {
    const inputId = id || Math.random().toString(36).substr(2, 9);
    
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-slate-300"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={cn(
              'w-full px-4 py-2.5 pr-10 text-white appearance-none',
              'bg-white/5 border border-white/10 rounded-xl',
              'focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50',
              'transition-all duration-200 cursor-pointer',
              error && 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled className="bg-slate-900">
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                className="bg-slate-900"
              >
                {option.label}
              </option>
            ))}
            {children}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
