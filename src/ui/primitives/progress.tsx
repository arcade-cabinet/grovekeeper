import type { JSX } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "@/shared/utils";

type ProgressProps = JSX.HTMLAttributes<HTMLDivElement> & {
  value?: number | null;
  max?: number;
};

function Progress(props: ProgressProps) {
  const [local, rest] = splitProps(props, ["class", "value", "max"]);
  const value = () => local.value ?? 0;
  const max = () => local.max ?? 100;
  const pct = () => Math.max(0, Math.min(100, (value() / max()) * 100));
  return (
    <div
      role="progressbar"
      data-slot="progress"
      aria-valuemin={0}
      aria-valuemax={max()}
      aria-valuenow={value()}
      class={cn(
        "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
        local.class,
      )}
      {...rest}
    >
      <div
        data-slot="progress-indicator"
        class="bg-primary h-full w-full flex-1 transition-all"
        style={{ transform: `translateX(-${100 - pct()}%)` }}
      />
    </div>
  );
}

export { Progress };
