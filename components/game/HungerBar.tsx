/**
 * HungerBar — thin horizontal bar showing hunger level.
 * Spec §37. Unified doc §3. UX brand doc §7c.
 *
 * Color: accent-amber → accent-ember as emptying.
 * 10 visible segments. 12px height.
 */
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { ACCENT, DARK, HUD_PANEL, TYPE } from "@/components/ui/tokens";

export interface HungerBarProps {
  /** Hunger value 0-100 */
  hunger: number;
}

function hungerColor(pct: number): string {
  if (pct > 60) return ACCENT.amber;
  if (pct > 30) return "#E68A00";
  return ACCENT.ember;
}

export function HungerBar({ hunger }: HungerBarProps) {
  const pct = Math.max(0, Math.min(100, hunger));
  const segments = 10;
  const filledSegments = Math.ceil((pct / 100) * segments);
  const color = hungerColor(pct);

  return (
    <View className="flex-row items-center gap-1">
      <Text style={{ ...TYPE.caption, color: DARK.textMuted, width: 12 }}>{"\u{1F356}"}</Text>
      <View
        className="flex-1 flex-row gap-0.5 overflow-hidden rounded"
        style={{ height: 12, ...HUD_PANEL, padding: 1 }}
      >
        {Array.from({ length: segments }, (_, i) => (
          <View
            key={`seg-${i}`}
            className="flex-1 rounded-sm"
            style={{
              backgroundColor: i < filledSegments ? color : `${DARK.surfaceStone}80`,
              opacity: i < filledSegments ? 1 : 0.3,
            }}
          />
        ))}
      </View>
      <Text style={{ ...TYPE.data, color, width: 32, textAlign: "right", fontSize: 11 }}>
        {Math.round(pct)}%
      </Text>
    </View>
  );
}
