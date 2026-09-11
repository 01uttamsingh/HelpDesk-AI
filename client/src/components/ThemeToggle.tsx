import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const targetTheme = isDark ? "light" : "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size={showLabel ? "sm" : "icon-sm"}
      onClick={toggleTheme}
      title={`Switch to ${targetTheme} mode`}
      aria-label={`Switch to ${targetTheme} mode`}
      data-testid="theme-toggle"
      className={cn(
        "cursor-pointer border-border/60 hover:bg-muted/50 transition-colors shadow-2xs relative",
        showLabel ? "gap-2 justify-start px-3 w-full h-9 text-xs font-medium" : "h-8 w-8",
        className
      )}
    >
      <div className="relative flex items-center justify-center">
        {isDark ? (
          <Sun className="h-4 w-4 text-amber-400 transition-transform duration-200 rotate-0 scale-100" />
        ) : (
          <Moon className="h-4 w-4 text-slate-700 transition-transform duration-200 rotate-0 scale-100" />
        )}
      </div>

      {showLabel && (
        <span className="text-xs font-medium text-foreground">
          {isDark ? "Light mode" : "Dark mode"}
        </span>
      )}
    </Button>
  );
}

export default ThemeToggle;
