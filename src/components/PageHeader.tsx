import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Gradient colors: [from, via, to] for bg, [from, to] for icon */
  gradientFrom?: string;
  gradientVia?: string;
  gradientTo?: string;
  iconFrom?: string;
  iconTo?: string;
  children?: ReactNode;
  /** Custom icon element instead of LucideIcon */
  customIcon?: ReactNode;
}

export function PageHeader({
  icon: Icon,
  title,
  description,
  gradientFrom = "from-primary/10",
  gradientVia = "via-blue-500/10",
  gradientTo = "to-indigo-500/10",
  iconFrom = "from-primary",
  iconTo = "to-blue-600",
  children,
  customIcon,
}: PageHeaderProps) {
  return (
    <div className={`rounded-xl bg-gradient-to-r ${gradientFrom} ${gradientVia} ${gradientTo} p-6 border border-border/50`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            {customIcon || (
              <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${iconFrom} ${iconTo} flex items-center justify-center`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
            )}
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
          </div>
          <p className="text-muted-foreground mt-1">{description}</p>
        </div>
        {children && <div className="flex gap-2 flex-wrap">{children}</div>}
      </div>
    </div>
  );
}
