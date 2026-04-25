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

type DialogContextValue = {
  open: () => boolean;
  setOpen: (v: boolean) => void;
};

const DialogCtx = createContext<DialogContextValue>();

function useDialogCtx(): DialogContextValue {
  const ctx = useContext(DialogCtx);
  if (!ctx) throw new Error("Dialog primitives must be used inside <Dialog>");
  return ctx;
}

type DialogProps = ParentProps<{
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}>;

function Dialog(props: DialogProps) {
  // Controlled / uncontrolled handling; when parent passes `open`, we always
  // read from props. Otherwise, we track internal signal-ish state on an
  // accessor that is kept in sync via createEffect.
  const isControlled = () => props.open !== undefined;
  const open = () =>
    isControlled() ? (props.open as boolean) : !!internalOpen;
  let internalOpen = !!props.defaultOpen;
  const setOpen = (v: boolean) => {
    if (!isControlled()) internalOpen = v;
    props.onOpenChange?.(v);
  };

  return (
    <DialogCtx.Provider value={{ open, setOpen }}>
      {props.children}
    </DialogCtx.Provider>
  );
}

function DialogTrigger(props: JSX.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ctx = useDialogCtx();
  const [local, rest] = splitProps(props, ["onClick"]);
  return (
    <button
      type="button"
      data-slot="dialog-trigger"
      onClick={(e) => {
        ctx.setOpen(true);
        if (typeof local.onClick === "function") local.onClick(e);
      }}
      {...rest}
    />
  );
}

function DialogPortal(props: ParentProps) {
  return <Portal>{props.children}</Portal>;
}

function DialogClose(props: JSX.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ctx = useDialogCtx();
  const [local, rest] = splitProps(props, ["onClick"]);
  return (
    <button
      type="button"
      data-slot="dialog-close"
      onClick={(e) => {
        ctx.setOpen(false);
        if (typeof local.onClick === "function") local.onClick(e);
      }}
      {...rest}
    />
  );
}

function DialogOverlay(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const ctx = useDialogCtx();
  const [local, rest] = splitProps(props, ["class", "onClick"]);
  return (
    <div
      data-slot="dialog-overlay"
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

function DialogContent(props: ParentProps<JSX.HTMLAttributes<HTMLDivElement>>) {
  const ctx = useDialogCtx();
  const [local, rest] = splitProps(props, ["class", "children"]);

  createEffect(() => {
    if (!ctx.open()) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") ctx.setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    onCleanup(() => window.removeEventListener("keydown", onKey));
  });

  return (
    <Show when={ctx.open()}>
      <DialogPortal>
        <DialogOverlay />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
          data-slot="dialog-content"
          data-state="open"
          class={cn(
            "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
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
      </DialogPortal>
    </Show>
  );
}

function DialogHeader(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="dialog-header"
      class={cn("flex flex-col gap-2 text-center sm:text-left", local.class)}
      {...rest}
    />
  );
}

function DialogFooter(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="dialog-footer"
      class={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        local.class,
      )}
      {...rest}
    />
  );
}

function DialogTitle(props: JSX.HTMLAttributes<HTMLHeadingElement>) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <h2
      id="dialog-title"
      data-slot="dialog-title"
      class={cn("text-lg leading-none font-semibold", local.class)}
      {...rest}
    />
  );
}

function DialogDescription(props: JSX.HTMLAttributes<HTMLParagraphElement>) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <p
      data-slot="dialog-description"
      class={cn("text-muted-foreground text-sm", local.class)}
      {...rest}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
