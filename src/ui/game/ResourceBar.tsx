import { createEffect, For } from "solid-js";
import { COLORS } from "@/config/config";
import type { ResourceType } from "@/config/resources";
import { useTrait } from "@/ecs/solid";
import { koota } from "@/koota";
import { Resources } from "@/traits";

const RESOURCE_EMOJIS: Record<ResourceType, string> = {
  timber: "\u{1FAB5}",
  sap: "\u{1FAE7}",
  fruit: "\u{1F34E}",
  acorns: "\u{1F330}",
};

const RESOURCE_LABELS: Record<ResourceType, string> = {
  timber: "Timber",
  sap: "Sap",
  fruit: "Fruit",
  acorns: "Acorns",
};

const RESOURCE_TYPES: ResourceType[] = ["timber", "sap", "fruit", "acorns"];

const ResourceCell = (props: { type: ResourceType; value: number }) => {
  let cellRef: HTMLDivElement | undefined;
  let prev = props.value;

  createEffect(() => {
    const v = props.value;
    if (prev !== v && cellRef) {
      cellRef.classList.remove("resource-bump");
      void cellRef.offsetWidth;
      cellRef.classList.add("resource-bump");
      prev = v;
    }
  });

  return (
    <div
      ref={cellRef}
      role="group"
      class="flex items-center gap-0.5 sm:gap-1 min-w-0 rounded px-1 motion-safe:transition-colors"
      aria-label={`${RESOURCE_LABELS[props.type]}: ${props.value}`}
    >
      <span class="shrink-0" aria-hidden="true">
        {RESOURCE_EMOJIS[props.type]}
      </span>
      <span
        class="truncate tabular-nums"
        aria-hidden="true"
        style={{ color: COLORS.soilDark }}
      >
        {props.value}
        <span class="hidden md:inline"> {RESOURCE_LABELS[props.type]}</span>
      </span>
    </div>
  );
};

export const ResourceBar = () => {
  const resourcesAccessor = useTrait(koota, Resources);
  const resources = () =>
    resourcesAccessor() ?? { timber: 0, sap: 0, fruit: 0, acorns: 0 };

  return (
    <>
      <style>{`
        @keyframes resource-bump {
          0%   { transform: scale(1);    background: transparent; }
          20%  { transform: scale(1.12); background: ${COLORS.leafLight}40; }
          100% { transform: scale(1);    background: transparent; }
        }
        .resource-bump {
          animation: resource-bump 0.4s ease-out;
        }
      `}</style>
      <div
        role="region"
        aria-label="Resources"
        class="grid grid-cols-2 gap-x-2 gap-y-0.5 px-1.5 sm:px-2 py-1 rounded-xl text-xs sm:text-sm font-bold min-w-0 shrink"
        style={{
          background: `${COLORS.parchment}e6`,
          border: `2px solid ${COLORS.barkBrown}`,
          "box-shadow": "0 4px 12px rgba(26, 58, 42, 0.15)",
          "font-variant-numeric": "tabular-nums",
        }}
      >
        <For each={RESOURCE_TYPES}>
          {(type) => <ResourceCell type={type} value={resources()[type]} />}
        </For>
      </div>
    </>
  );
};
