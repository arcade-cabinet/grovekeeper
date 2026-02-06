import type { ResourceType } from "../constants/resources";
import { useGameStore } from "../stores/gameStore";

const RESOURCE_EMOJIS: Record<ResourceType, string> = {
  timber: "\u{1FAB5}",
  sap: "\u{1FAE7}",
  fruit: "\u{1F34E}",
  acorns: "\u{1F330}",
};

export const ResourceBar = () => {
  const resources = useGameStore((s) => s.resources);

  return (
    <div
      className="grid grid-cols-2 gap-x-2 gap-y-0.5 px-2 py-1 rounded-xl text-xs font-bold"
      style={{
        background: "rgba(245, 240, 227, 0.90)",
        border: "2px solid #5D4037",
        boxShadow: "0 4px 12px rgba(26, 58, 42, 0.15)",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {(["timber", "sap", "fruit", "acorns"] as ResourceType[]).map((type) => (
        <div key={type} className="flex items-center gap-1">
          <span>{RESOURCE_EMOJIS[type]}</span>
          <span style={{ color: "#3E2723" }}>{resources[type]}</span>
        </div>
      ))}
    </div>
  );
};
