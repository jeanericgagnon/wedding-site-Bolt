import React from 'react';
import { Check } from 'lucide-react';

interface Step {
  id: number;
  label: string;
  completed: boolean;
  current: boolean;
}

interface ProgressIndicatorProps {
  steps: Step[];
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ steps }) => {
  return (
    <div className="w-full py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between relative">
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" style={{ zIndex: 0 }} />
          <div
            className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500"
            style={{
              width: `${((steps.filter(s => s.completed).length) / (steps.length - 1)) * 100}%`,
              zIndex: 1
            }}
          />

          {steps.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center relative" style={{ zIndex: 2 }}>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                  step.completed
                    ? 'bg-primary text-white'
                    : step.current
                    ? 'bg-primary text-white ring-4 ring-primary/20'
                    : 'bg-surface border-2 border-border text-text-tertiary'
                }`}
              >
                {step.completed ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span>{step.id}</span>
                )}
              </div>
              <span
                className={`mt-2 text-xs font-medium text-center max-w-[100px] ${
                  step.current ? 'text-text-primary' : 'text-text-tertiary'
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
