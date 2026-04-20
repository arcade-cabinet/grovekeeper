import type { JSX, ParentProps } from "solid-js";
import {
  createContext,
  createSignal,
  Show,
  splitProps,
  useContext,
} from "solid-js";

import { cn } from "@/shared/utils";

type TabsContextValue = {
  value: () => string | undefined;
  setValue: (v: string) => void;
};

const TabsCtx = createContext<TabsContextValue>();

function useTabsCtx() {
  const ctx = useContext(TabsCtx);
  if (!ctx) throw new Error("Tabs primitives must be used inside <Tabs>");
  return ctx;
}

type TabsProps = ParentProps<
  JSX.HTMLAttributes<HTMLDivElement> & {
    value?: string;
    defaultValue?: string;
    onValueChange?: (v: string) => void;
  }
>;

function Tabs(props: TabsProps) {
  const [local, rest] = splitProps(props, [
    "class",
    "value",
    "defaultValue",
    "onValueChange",
    "children",
  ]);
  const [internal, setInternal] = createSignal<string | undefined>(
    local.defaultValue,
  );
  const value = () => (local.value !== undefined ? local.value : internal());
  const setValue = (v: string) => {
    if (local.value === undefined) setInternal(v);
    local.onValueChange?.(v);
  };
  return (
    <TabsCtx.Provider value={{ value, setValue }}>
      <div
        data-slot="tabs"
        class={cn("flex flex-col gap-2", local.class)}
        {...rest}
      >
        {local.children}
      </div>
    </TabsCtx.Provider>
  );
}

function TabsList(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <div
      role="tablist"
      data-slot="tabs-list"
      class={cn(
        "bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]",
        local.class,
      )}
      {...rest}
    />
  );
}

type TabsTriggerProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
};

function TabsTrigger(props: TabsTriggerProps) {
  const ctx = useTabsCtx();
  const [local, rest] = splitProps(props, ["class", "value", "onClick"]);
  const active = () => ctx.value() === local.value;
  return (
    <button
      type="button"
      role="tab"
      data-slot="tabs-trigger"
      data-state={active() ? "active" : "inactive"}
      aria-selected={active()}
      onClick={(e) => {
        ctx.setValue(local.value);
        if (typeof local.onClick === "function") local.onClick(e);
      }}
      class={cn(
        "data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        local.class,
      )}
      {...rest}
    />
  );
}

type TabsContentProps = ParentProps<
  JSX.HTMLAttributes<HTMLDivElement> & {
    value: string;
  }
>;

function TabsContent(props: TabsContentProps) {
  const ctx = useTabsCtx();
  const [local, rest] = splitProps(props, ["class", "value", "children"]);
  return (
    <Show when={ctx.value() === local.value}>
      <div
        role="tabpanel"
        data-slot="tabs-content"
        data-state="active"
        class={cn("flex-1 outline-none", local.class)}
        {...rest}
      >
        {local.children}
      </div>
    </Show>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
