import { cn } from "@/lib/utils";

export interface Step {
  id: number;
  name: string;
  status: "complete" | "current" | "upcoming";
}

interface ProgressStepsProps {
  steps: Step[];
}

export function ProgressSteps({ steps }: ProgressStepsProps) {
  return (
    <div className="w-full max-w-3xl mx-auto mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, stepIdx) => (
          <div key={step.id} className="flex flex-col items-center">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-medium",
                step.status === "complete" ? "bg-primary text-white" : 
                step.status === "current" ? "bg-primary text-white" : 
                "bg-neutral-300 text-white"
              )}
            >
              {step.id}
            </div>
            <span 
              className={cn(
                "text-sm mt-1",
                step.status === "complete" || step.status === "current" 
                  ? "text-neutral-600" 
                  : "text-neutral-500"
              )}
            >
              {step.name}
            </span>
            
            {stepIdx < steps.length - 1 && (
              <div className="flex-1 h-1 bg-neutral-200 mx-2">
                <div
                  className="h-full bg-primary"
                  style={{
                    width: 
                      step.status === "complete" 
                        ? "100%" 
                        : step.status === "current" 
                        ? "50%" 
                        : "0%"
                  }}
                ></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
