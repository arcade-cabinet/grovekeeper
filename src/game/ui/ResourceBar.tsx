import { useEffect, useRef } from "react";
import { COLORS } from "../constants/config";
import type { ResourceType } from "../constants/resources";
import { useGameStore } from "../stores/gameStore";

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

/**
 * Individual resource cell with change animation.
 * Uses a ref to track the previous value and triggers a CSS animation
 * (scale bump + highlight flash) when the value changes.
 */
const ResourceCell = ({ type, value }: { type: ResourceType; value: number }) => {
  const prevRef = useRef(value);
  const cellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prevRef.current !== value && cellRef.current) {
      const el = cellRef.current;
      // Remove and re-add to restart animation
      el.classList.remove("resource-bump");
      // Force reflow so removing/adding the class triggers a new animation
      void el.offsetWidth;
      el.classList.add("resource-bump");
      prevRef.current = value;
    }
  }, [value]);

  return (
    <div
      ref={cellRef}
      className="flex items-center gap-0.5 sm:gap-1 min-w-0 rounded px-1 motion-safe:transition-colors"
    >
      <span className="shrink-0">{RESOURCE_EMOJIS[type]}</span>
      <span className="truncate tabular-nums" style={{ color: COLORS.soilDark }}>
        {value}
        <span className="hidden md:inline"> {RESOURCE_LABELS[type]}</span>
      </span>
    </div>
  );
};

export const ResourceBar = () => {
  const resources = useGameStore((s) => s.resources);

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
        className="grid grid-cols-2 gap-x-2 gap-y-0.5 px-1.5 sm:px-2 py-1 rounded-xl text-xs sm:text-sm font-bold min-w-0 shrink"
        style={{
          background: `${COLORS.parchment}e6`,
          border: `2px solid ${COLORS.barkBrown}`,
          boxShadow: "0 4px 12px rgba(26, 58, 42, 0.15)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {RESOURCE_TYPES.map((type) => (
          <ResourceCell key={type} type={type} value={resources[type]} />
        ))}
      </div>
    </>
  );
};
