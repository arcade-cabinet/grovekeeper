import { createSignal, For, Show } from "solid-js";
import { COLORS } from "@/config/config";
import { DIFFICULTY_TIERS, type DifficultyTier } from "@/config/difficulty";
import { Button } from "@/ui/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/ui/primitives/dialog";
import { Switch } from "@/ui/primitives/switch";

interface NewGameModalProps {
  open: boolean;
  onClose: () => void;
  onStart: (difficulty: string, permadeath: boolean) => void;
}

const ICONS: Record<string, string> = {
  leaf: "\u{1F33F}",
  sun: "\u2600\uFE0F",
  flame: "\u{1F525}",
  skull: "\u{1F480}",
  zap: "\u26A1",
};

export const NewGameModal = (props: NewGameModalProps) => {
  const [selected, setSelected] = createSignal<DifficultyTier>(
    DIFFICULTY_TIERS.find((t) => t.id === "normal") ?? DIFFICULTY_TIERS[0],
  );
  const [permadeath, setPermadeath] = createSignal(false);

  const handleSelect = (tier: DifficultyTier) => {
    setSelected(tier);
    if (tier.permadeathForced === "on") setPermadeath(true);
    else setPermadeath(false);
  };

  const handleStart = () => {
    props.onStart(selected().id, permadeath());
  };

  const topRow = DIFFICULTY_TIERS.slice(0, 3);
  const bottomRow = DIFFICULTY_TIERS.slice(3);

  return (
    <Dialog open={props.open} onOpenChange={(o) => !o && props.onClose()}>
      <DialogContent
        class="max-w-sm max-h-[90vh] overflow-y-auto"
        style={{ background: COLORS.skyMist }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: COLORS.soilDark }}>
            Choose Your Challenge
          </DialogTitle>
        </DialogHeader>

        <div class="space-y-3 mt-1">
          <div class="grid grid-cols-3 gap-2">
            <For each={topRow}>
              {(tier) => (
                <DifficultyTile
                  tier={tier}
                  isSelected={selected().id === tier.id}
                  onSelect={() => handleSelect(tier)}
                />
              )}
            </For>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <For each={bottomRow}>
              {(tier) => (
                <DifficultyTile
                  tier={tier}
                  isSelected={selected().id === tier.id}
                  onSelect={() => handleSelect(tier)}
                />
              )}
            </For>
          </div>

          <div
            class="rounded-lg p-3 text-sm"
            style={{
              background: "white",
              border: `2px solid ${selected().color}40`,
            }}
          >
            <div class="flex items-center gap-2 mb-1">
              <span class="text-lg" aria-hidden="true">
                {ICONS[selected().icon] ?? ""}
              </span>
              <span
                class="font-bold text-base"
                style={{ color: selected().color }}
              >
                {selected().name}
              </span>
            </div>
            <p class="text-gray-600 text-xs leading-relaxed">
              {selected().description}
            </p>

            <div class="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
              <FeatureRow
                label="Growth"
                value={`${selected().growthSpeedMult}x`}
              />
              <FeatureRow
                label="Yields"
                value={`${selected().resourceYieldMult}x`}
              />
              <FeatureRow
                label="Exposure"
                value={selected().exposureEnabled ? "Active" : "Off"}
              />
              <FeatureRow
                label="Disasters"
                value={
                  selected().disasterFrequency > 0
                    ? `${selected().disasterFrequency}/yr`
                    : "None"
                }
              />
              <FeatureRow
                label="Building Decay"
                value={
                  selected().buildingDegradationRate > 0
                    ? `${selected().buildingDegradationRate}%/season`
                    : "None"
                }
              />
              <FeatureRow
                label="Diseases"
                value={selected().cropDiseaseEnabled ? "Active" : "None"}
              />
            </div>
          </div>

          <div
            class="flex items-center justify-between rounded-lg p-3"
            style={{ background: "white", border: "1px solid #E0E0E0" }}
          >
            <div>
              <p
                class="text-sm font-semibold"
                style={{ color: COLORS.soilDark }}
              >
                Permadeath
              </p>
              <p class="text-[11px] text-gray-500">
                {permadeathLabel(selected().permadeathForced)}
              </p>
            </div>
            <Switch
              checked={permadeath()}
              onCheckedChange={setPermadeath}
              disabled={selected().permadeathForced !== "optional"}
            />
          </div>

          <div class="flex gap-2 pt-1">
            <Button
              variant="outline"
              class="flex-1 h-11"
              style={{
                "border-color": COLORS.barkBrown,
                color: COLORS.soilDark,
              }}
              onClick={props.onClose}
            >
              Cancel
            </Button>
            <Button
              class="flex-1 h-11 font-bold"
              style={{
                background: `linear-gradient(135deg, ${selected().color} 0%, ${selected().color}dd 100%)`,
                color: "white",
                "box-shadow": `0 4px 12px ${selected().color}40`,
              }}
              onClick={handleStart}
            >
              Begin Your Grove
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

function permadeathLabel(forced: string): string {
  if (forced === "on") return "Always on for this difficulty";
  if (forced === "off") return "Disabled for this difficulty";
  return "Optional \u2014 death is permanent";
}

function DifficultyTile(props: {
  tier: DifficultyTier;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isRecommended = () => props.tier.id === "normal";

  return (
    <button
      type="button"
      aria-label={`${props.tier.name} difficulty${isRecommended() ? " (Recommended)" : ""}: ${props.tier.tagline}`}
      class="relative flex flex-col items-center justify-center p-2 rounded-lg transition-all motion-reduce:transition-none min-h-[72px]"
      style={{
        background: props.isSelected ? `${props.tier.color}15` : "white",
        border: `2px solid ${props.isSelected ? props.tier.color : "#E0E0E0"}`,
        "box-shadow": props.isSelected
          ? `0 2px 8px ${props.tier.color}30`
          : "none",
      }}
      onClick={props.onSelect}
    >
      <Show when={isRecommended()}>
        <span
          class="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap"
          style={{ background: props.tier.color, color: "white" }}
        >
          Recommended
        </span>
      </Show>
      <span class="text-xl mb-0.5" aria-hidden="true">
        {ICONS[props.tier.icon] ?? ""}
      </span>
      <span
        class="text-xs font-bold"
        style={{
          color: props.isSelected ? props.tier.color : COLORS.soilDark,
        }}
      >
        {props.tier.name}
      </span>
    </button>
  );
}

function FeatureRow(props: { label: string; value: string }) {
  return (
    <div class="flex justify-between">
      <span class="text-gray-500">{props.label}</span>
      <span class="font-medium text-gray-700">{props.value}</span>
    </div>
  );
}
