import type { JSX } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "@/shared/utils";

type SwitchProps = Omit<
  JSX.ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange"
> & {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

function Switch(props: SwitchProps) {
  const [local, rest] = splitProps(props, [
    "class",
    "checked",
    "defaultChecked",
    "onCheckedChange",
    "disabled",
  ]);
  const state = () => (local.checked ? "checked" : "unchecked");
  return (
    <button
      type="button"
      role="switch"
      data-slot="switch"
      data-state={state()}
      aria-checked={!!local.checked}
      disabled={local.disabled}
      onClick={() => local.onCheckedChange?.(!local.checked)}
      class={cn(
        "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        local.class,
      )}
      {...rest}
    >
      <span
        data-slot="switch-thumb"
        data-state={state()}
        class="bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0"
      />
    </button>
  );
}

export { Switch };
