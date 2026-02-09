import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { COLORS } from "../constants/config";
import { useGameStore } from "../stores/gameStore";

interface StatsDashboardProps {
  open: boolean;
  onClose: () => void;
}

export const StatsDashboard = ({ open, onClose }: StatsDashboardProps) => {
  const {
    treesPlanted,
    treesHarvested,
    treesWatered,
    treesMatured,
    lifetimeResources,
    achievements,
    prestigeCount,
    level,
    speciesPlanted,
  } = useGameStore();

  const stats = [
    { label: "Trees Planted", value: treesPlanted, icon: "\uD83C\uDF31" },
    { label: "Trees Matured", value: treesMatured, icon: "\uD83C\uDF33" },
    { label: "Trees Harvested", value: treesHarvested, icon: "\uD83E\uDE93" },
    { label: "Trees Watered", value: treesWatered, icon: "\uD83D\uDCA7" },
    {
      label: "Species Grown",
      value: speciesPlanted.length,
      icon: "\uD83C\uDF3F",
    },
    { label: "Level", value: level, icon: "\u2B50" },
    { label: "Prestige Count", value: prestigeCount, icon: "\u2728" },
    {
      label: "Achievements",
      value: `${achievements.length}`,
      icon: "\uD83C\uDFC6",
    },
  ];

  const resources = [
    {
      label: "Timber",
      value: lifetimeResources.timber ?? 0,
      icon: "\uD83E\uDEB5",
    },
    { label: "Sap", value: lifetimeResources.sap ?? 0, icon: "\uD83D\uDCA7" },
    {
      label: "Fruit",
      value: lifetimeResources.fruit ?? 0,
      icon: "\uD83C\uDF4E",
    },
    {
      label: "Acorns",
      value: lifetimeResources.acorns ?? 0,
      icon: "\uD83C\uDF30",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-sm max-h-[80vh] overflow-y-auto"
        style={{
          background: COLORS.parchment,
          border: `2px solid ${COLORS.barkBrown}`,
        }}
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle style={{ color: COLORS.soilDark }}>
            Grove Statistics
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <section>
            <h3
              className="text-sm font-bold mb-2"
              style={{ color: COLORS.forestGreen }}
            >
              Activity
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="flex items-center gap-2 p-2 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.5)" }}
                >
                  <span className="text-lg">{s.icon}</span>
                  <div>
                    <div
                      className="text-xs opacity-60"
                      style={{ color: COLORS.soilDark }}
                    >
                      {s.label}
                    </div>
                    <div
                      className="text-sm font-bold"
                      style={{ color: COLORS.soilDark }}
                    >
                      {s.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3
              className="text-sm font-bold mb-2"
              style={{ color: COLORS.forestGreen }}
            >
              Lifetime Resources
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {resources.map((r) => (
                <div
                  key={r.label}
                  className="flex items-center gap-2 p-2 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.5)" }}
                >
                  <span className="text-lg">{r.icon}</span>
                  <div>
                    <div
                      className="text-xs opacity-60"
                      style={{ color: COLORS.soilDark }}
                    >
                      {r.label}
                    </div>
                    <div
                      className="text-sm font-bold"
                      style={{ color: COLORS.soilDark }}
                    >
                      {r.value.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};
