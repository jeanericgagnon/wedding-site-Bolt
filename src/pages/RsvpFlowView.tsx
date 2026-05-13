import { type ReactNode } from 'react';

interface RsvpFlowViewProps {
  formContent: ReactNode;
  pickerContent: ReactNode;
  step: 'pick' | 'form' | 'success';
  successContent: ReactNode;
}

export function RsvpFlowView({
  formContent,
  pickerContent,
  step,
  successContent,
}: RsvpFlowViewProps) {
  return (
    <div className="container relative z-10 mx-auto max-w-2xl px-4 pb-14">
      {step === 'pick' && pickerContent}
      {step === 'form' && formContent}
      {step === 'success' && successContent}
    </div>
  );
}
