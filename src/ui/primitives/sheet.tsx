import type { JSX, ParentProps } from "solid-js";
import {
  createContext,
  createEffect,
  onCleanup,
  Show,
  splitProps,
  useContext,
} from "solid-js";
import { Portal } from "solid-js/web";

import { cn } from "@/shared/utils";

type SheetContextValue = {
  open: () => boolean;
  setOpen: (v: boolean) => void;
};

const SheetCtx = createContext<SheetContextValue>();

function useSheetCtx(): SheetContextValue {
  const ctx = useContext(SheetCtx);
  if (!ctx) throw new Error("Sheet primitives must be used inside <Sheet>");
  return ctx;
}

type SheetProps = ParentProps<{
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}>;

function Sheet(props: SheetProps) {
  const isControlled = () => props.open !== undefined;
  const open = () =>
    isControlled() ? (props.open as boolean) : !!internalOpen;
  let internalOpen = !!props.defaultOpen;
  const setOpen = (v: boolean) => {
    if (!isControlled()) internalOpen = v;
    props.onOpenChange?.(v);
  };
  return (
    <SheetCtx.Provider value={{ open, setOpen }}>
      {props.children}
    </SheetCtx.Provider>
  );
}

function SheetTrigger(props: JSX.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ctx = useSheetCtx();
  const [local, rest] = splitProps(props, ["onClick"]);
  return (
    <button
      type="button"
      data-slot="sheet-trigger"
      onClick={(e) => {
        ctx.setOpen(true);
        if (typeof local.onClick === "function") local.onClick(e);
      }}
      {...rest}
    />
  );
}

function SheetClose(props: JSX.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ctx = useSheetCtx();
  const [local, rest] = splitProps(props, ["onClick"]);
  return (
    <button
      type="button"
      data-slot="sheet-close"
      onClick={(e) => {
        ctx.setOpen(false);
        if (typeof local.onClick === "function") local.onClick(e);
      }}
      {...rest}
    />
  );
}

function SheetPortal(props: ParentProps) {
  return <Portal>{props.children}</Portal>;
}

function SheetOverlay(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const ctx = useSheetCtx();
  const [local, rest] = splitProps(props, ["class", "onClick"]);
  return (
    <div
      data-slot="sheet-overlay"
      data-state={ctx.open() ? "open" : "closed"}
      role="presentation"
      class={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        local.class,
      )}
      onClick={(e) => {
        ctx.setOpen(false);
        if (typeof local.onClick === "function") local.onClick(e);
      }}
      {...rest}
    />
  );
}

type SheetContentProps = ParentProps<
  JSX.HTMLAttributes<HTMLDivElement> & {
    side?: "top" | "right" | "bottom" | "left";
  }
>;

function SheetContent(props: SheetContentProps) {
  const ctx = useSheetCtx();
  const [local, rest] = splitProps(props, ["class", "children", "side"]);

  createEffect(() => {
    if (!ctx.open()) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") ctx.setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    onCleanup(() => window.removeEventListener("keydown", onKey));
  });

  const side = () => local.side ?? "right";

  return (
    <Show when={ctx.open()}>
      <SheetPortal>
        <SheetOverlay />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sheet-title"
          data-slot="sheet-content"
          data-state="open"
          class={cn(
            "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
            side() === "right" &&
              "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
            side() === "left" &&
              "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
            side() === "top" &&
              "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b",
            side() === "bottom" &&
              "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t",
            local.class,
          )}
          {...rest}
        >
          {local.children}
          <button
            type="button"
            onClick={() => ctx.setOpen(false)}
            class="ring-offset-background focus:ring-ring absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="size-4"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
            <span class="sr-only">Close</span>
          </button>
        </div>
      </SheetPortal>
    </Show>
  );
}

function SheetHeader(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="sheet-header"
      class={cn("flex flex-col gap-1.5 p-4", local.class)}
      {...rest}
    />
  );
}

function SheetFooter(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="sheet-footer"
      class={cn("mt-auto flex flex-col gap-2 p-4", local.class)}
      {...rest}
    />
  );
}

function SheetTitle(props: JSX.HTMLAttributes<HTMLHeadingElement>) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <h2
      id="sheet-title"
      data-slot="sheet-title"
      class={cn("text-foreground font-semibold", local.class)}
      {...rest}
    />
  );
}

function SheetDescription(props: JSX.HTMLAttributes<HTMLParagraphElement>) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <p
      data-slot="sheet-description"
      class={cn("text-muted-foreground text-sm", local.class)}
      {...rest}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
