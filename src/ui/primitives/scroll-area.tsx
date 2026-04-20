import type { JSX, ParentProps } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "@/shared/utils";

type ScrollAreaProps = ParentProps<JSX.HTMLAttributes<HTMLDivElement>>;

function ScrollArea(props: ScrollAreaProps) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div data-slot="scroll-area" class={cn("relative", local.class)} {...rest}>
      <div
        data-slot="scroll-area-viewport"
        class="size-full rounded-[inherit] overflow-auto"
      >
        {local.children}
      </div>
    </div>
  );
}

function ScrollBar(
  props: JSX.HTMLAttributes<HTMLDivElement> & {
    orientation?: "vertical" | "horizontal";
  },
) {
  const [local, rest] = splitProps(props, ["class", "orientation"]);
  const orientation = () => local.orientation ?? "vertical";
  return (
    <div
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation()}
      class={cn(
        "flex touch-none p-px transition-colors select-none",
        orientation() === "vertical" &&
          "h-full w-2.5 border-l border-l-transparent",
        orientation() === "horizontal" &&
          "h-2.5 flex-col border-t border-t-transparent",
        local.class,
      )}
      {...rest}
    >
      <div
        data-slot="scroll-area-thumb"
        class="bg-border relative flex-1 rounded-full"
      />
    </div>
  );
}

export { ScrollArea, ScrollBar };
