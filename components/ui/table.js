import { cn } from "@/lib/utils";

export function Table({ className, ...props }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full text-sm", className)} {...props} />
    </div>
  );
}

export function THead({ className, ...props }) {
  return <thead className={cn("border-b text-left text-muted-foreground", className)} {...props} />;
}

export function TBody({ className, ...props }) {
  return <tbody className={cn("divide-y", className)} {...props} />;
}

export function TR({ className, ...props }) {
  return <tr className={cn(className)} {...props} />;
}

export function TH({ className, ...props }) {
  return <th className={cn("px-4 py-3 font-medium", className)} {...props} />;
}

export function TD({ className, ...props }) {
  return <td className={cn("px-4 py-3 align-top", className)} {...props} />;
}
