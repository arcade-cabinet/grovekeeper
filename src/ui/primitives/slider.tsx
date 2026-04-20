import type { JSX } from "solid-js";
import { createMemo, splitProps } from "solid-js";

import { cn } from "@/shared/utils";

type SliderProps = Omit<
  JSX.HTMLAttributes<HTMLDivElement>,
  "onChange" | "style"
> & {
  value?: number[];
  defaultValue?: number[];
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onValueChange?: (v: number[]) => void;
  style?: JSX.CSSProperties | string;
};

function Slider(props: SliderProps) {
  const [local, rest] = splitProps(props, [
    "class",
    "value",
    "defaultValue",
    "min",
    "max",
    "step",
    "disabled",
    "onValueChange",
    "style",
  ]);
  const min = createMemo(() => local.min ?? 0);
  const max = createMemo(() => local.max ?? 100);
  const step = createMemo(() => local.step ?? 1);

  const singleValue = createMemo(() =>
    Array.isArray(local.value)
      ? local.value[0]
      : Array.isArray(local.defaultValue)
        ? local.defaultValue[0]
        : min(),
  );

  const pct = () => {
    const span = Math.max(1e-6, max() - min());
    return ((singleValue() - min()) / span) * 100;
  };

  return (
    <div
      data-slot="slider"
      data-orientation="horizontal"
      class={cn(
        "relative flex w-full touch-none items-center select-none",
        local.disabled && "opacity-50 pointer-events-none",
        local.class,
      )}
      style={local.style as JSX.CSSProperties}
      {...rest}
    >
      <div
        data-slot="slider-track"
        data-orientation="horizontal"
        class="bg-muted relative grow overflow-hidden rounded-full h-1.5 w-full"
      >
        <div
          data-slot="slider-range"
          data-orientation="horizontal"
          class="bg-primary absolute h-full"
          style={{ width: `${pct()}%` }}
        />
      </div>
      <input
        type="range"
        min={min()}
        max={max()}
        step={step()}
        value={singleValue()}
        disabled={local.disabled}
        class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onInput={(e) => {
          const v = Number(e.currentTarget.value);
          local.onValueChange?.([v]);
        }}
      />
      <span
        data-slot="slider-thumb"
        class="border-primary bg-background ring-ring/50 block size-4 shrink-0 rounded-full border shadow-sm transition-[color,box-shadow] absolute -translate-x-1/2 pointer-events-none"
        style={{ left: `${pct()}%` }}
      />
    </div>
  );
}

export { Slider };
