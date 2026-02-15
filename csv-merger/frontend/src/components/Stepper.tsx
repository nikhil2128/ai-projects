import { Upload, Search, FileOutput } from "lucide-react";
import { AppStep } from "../types";
import React from "react";

interface StepperProps {
  currentStep: AppStep;
}

const steps: { key: AppStep; label: string; icon: React.ReactNode }[] = [
  { key: "upload", label: "Upload", icon: <Upload size={18} /> },
  { key: "analyze", label: "Analyze", icon: <Search size={18} /> },
  { key: "result", label: "Result", icon: <FileOutput size={18} /> },
];

export function Stepper({ currentStep }: StepperProps) {
  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="stepper">
      {steps.map((step, idx) => {
        const isActive = idx === currentIndex;
        const isCompleted = idx < currentIndex;

        return (
          <div
            key={step.key}
            className={`stepper__step ${isActive ? "stepper__step--active" : ""} ${isCompleted ? "stepper__step--completed" : ""
              }`}
          >
            <div className="stepper__circle">
              {step.icon}
            </div>
            <span className="stepper__label">{step.label}</span>
            {idx < steps.length - 1 && <div className="stepper__line" />}
          </div>
        );
      })}
    </div>
  );
}
