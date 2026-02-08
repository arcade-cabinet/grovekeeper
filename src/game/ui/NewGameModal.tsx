/**
 * NewGameModal — Difficulty selection UI for starting a new grove.
 *
 * Mobile-first layout: 3 tiles top row (Explore/Normal/Hard),
 * 2 tiles bottom row (Brutal/Ultra Brutal). Shows description panel
 * and permadeath toggle based on selected difficulty.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { COLORS } from "../constants/config";
import { DIFFICULTY_TIERS, type DifficultyTier } from "../constants/difficulty";

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

export const NewGameModal = ({ open, onClose, onStart }: NewGameModalProps) => {
  const [selected, setSelected] = useState<DifficultyTier>(
    DIFFICULTY_TIERS.find((t) => t.id === "normal") ?? DIFFICULTY_TIERS[0],
  );
  const [permadeath, setPermadeath] = useState(false);

  const handleSelect = (tier: DifficultyTier) => {
    setSelected(tier);
    // Reset permadeath based on forced state (including optional → default off)
    if (tier.permadeathForced === "on") setPermadeath(true);
    else setPermadeath(false);
  };

  const handleStart = () => {
    onStart(selected.id, permadeath);
  };

  // Split tiers into rows: top 3, bottom 2
  const topRow = DIFFICULTY_TIERS.slice(0, 3);
  const bottomRow = DIFFICULTY_TIERS.slice(3);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent
        className="max-w-sm max-h-[90vh] overflow-y-auto"
        style={{ background: COLORS.skyMist }}
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle style={{ color: COLORS.soilDark }}>
            Choose Your Challenge
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-1">
          {/* Top row: Explore, Normal, Hard */}
          <div className="grid grid-cols-3 gap-2">
            {topRow.map((tier) => (
              <DifficultyTile
                key={tier.id}
                tier={tier}
                isSelected={selected.id === tier.id}
                onSelect={() => handleSelect(tier)}
              />
            ))}
          </div>

          {/* Bottom row: Brutal, Ultra Brutal */}
          <div className="grid grid-cols-2 gap-2">
            {bottomRow.map((tier) => (
              <DifficultyTile
                key={tier.id}
                tier={tier}
                isSelected={selected.id === tier.id}
                onSelect={() => handleSelect(tier)}
              />
            ))}
          </div>

          {/* Description panel */}
          <div
            className="rounded-lg p-3 text-sm"
            style={{
              background: "white",
              border: `2px solid ${selected.color}40`,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{ICONS[selected.icon] ?? ""}</span>
              <span
                className="font-bold text-base"
                style={{ color: selected.color }}
              >
                {selected.name}
              </span>
            </div>
            <p className="text-gray-600 text-xs leading-relaxed">
              {selected.description}
            </p>

            {/* Feature summary */}
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
              <FeatureRow
                label="Growth"
                value={`${selected.growthSpeedMult}x`}
              />
              <FeatureRow
                label="Yields"
                value={`${selected.resourceYieldMult}x`}
              />
              <FeatureRow
                label="Exposure"
                value={selected.exposureEnabled ? "Active" : "Off"}
              />
              <FeatureRow
                label="Disasters"
                value={
                  selected.disasterFrequency > 0
                    ? `${selected.disasterFrequency}/yr`
                    : "None"
                }
              />
              <FeatureRow
                label="Building Decay"
                value={
                  selected.buildingDegradationRate > 0
                    ? `${selected.buildingDegradationRate}%/season`
                    : "None"
                }
              />
              <FeatureRow
                label="Diseases"
                value={selected.cropDiseaseEnabled ? "Active" : "None"}
              />
            </div>
          </div>

          {/* Permadeath toggle */}
          <div
            className="flex items-center justify-between rounded-lg p-3"
            style={{ background: "white", border: "1px solid #E0E0E0" }}
          >
            <div>
              <p
                className="text-sm font-semibold"
                style={{ color: COLORS.soilDark }}
              >
                Permadeath
              </p>
              <p className="text-[11px] text-gray-500">
                {permadeathLabel(selected.permadeathForced)}
              </p>
            </div>
            <Switch
              checked={permadeath}
              onCheckedChange={setPermadeath}
              disabled={selected.permadeathForced !== "optional"}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1 h-11"
              style={{ borderColor: COLORS.barkBrown, color: COLORS.soilDark }}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 h-11 font-bold"
              style={{
                background: `linear-gradient(135deg, ${selected.color} 0%, ${selected.color}dd 100%)`,
                color: "white",
                boxShadow: `0 4px 12px ${selected.color}40`,
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

// ─── Helpers ─────────────────────────────────────────────────

function permadeathLabel(forced: string): string {
  if (forced === "on") return "Always on for this difficulty";
  if (forced === "off") return "Disabled for this difficulty";
  return "Optional \u2014 death is permanent";
}

// ─── Sub-components ──────────────────────────────────────────

function DifficultyTile({
  tier,
  isSelected,
  onSelect,
}: Readonly<{
  tier: DifficultyTier;
  isSelected: boolean;
  onSelect: () => void;
}>) {
  const isRecommended = tier.id === "normal";

  return (
    <button
      aria-label={`${tier.name} difficulty${isRecommended ? " (Recommended)" : ""}: ${tier.tagline}`}
      className="relative flex flex-col items-center justify-center p-2 rounded-lg transition-all motion-reduce:transition-none min-h-[72px]"
      style={{
        background: isSelected ? `${tier.color}15` : "white",
        border: `2px solid ${isSelected ? tier.color : "#E0E0E0"}`,
        boxShadow: isSelected ? `0 2px 8px ${tier.color}30` : "none",
      }}
      onClick={onSelect}
    >
      {isRecommended && (
        <span
          className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap"
          style={{ background: tier.color, color: "white" }}
        >
          Recommended
        </span>
      )}
      <span className="text-xl mb-0.5">{ICONS[tier.icon] ?? ""}</span>
      <span
        className="text-xs font-bold"
        style={{ color: isSelected ? tier.color : COLORS.soilDark }}
      >
        {tier.name}
      </span>
    </button>
  );
}

function FeatureRow({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-700">{value}</span>
    </div>
  );
}
