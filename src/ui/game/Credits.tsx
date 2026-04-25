import { createSignal, For, Show } from "solid-js";
import { COLORS } from "@/config/config";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/ui/primitives/dialog";

interface CreditEntry {
  role: string;
  names: string[];
}

const CREDITS: CreditEntry[] = [
  { role: "Direction", names: ["arcade-cabinet"] },
  {
    role: "Built on",
    names: [
      "SolidJS 1.9",
      "BabylonJS 8",
      "Koota 0.6",
      "Tone.js 15",
      "Vite 6",
      "Capacitor 8",
      "Tailwind CSS 4",
      "TypeScript 5.7",
    ],
  },
  {
    role: "Tooling",
    names: ["pnpm", "Biome 2.3", "Vitest 4.1", "Playwright", "GitHub Actions"],
  },
  {
    role: "Assist",
    names: ["Claude (Opus 4.7, 1M context)", "CodeRabbit", "Cronjobs & hooks"],
  },
  { role: "Thanks to", names: ["Every cozy player who waits for trees"] },
];

/** Credits dialog. Trigger renders inline; place it wherever. */
export const Credits = () => {
  const [open, setOpen] = createSignal(false);

  return (
    <Dialog open={open()} onOpenChange={setOpen}>
      <DialogTrigger
        class="h-9 px-3 text-xs rounded-full"
        style={{
          background: "transparent",
          color: `${COLORS.forestGreen}b0`,
          border: `1px solid ${COLORS.forestGreen}40`,
        }}
      >
        Credits
      </DialogTrigger>
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle style={{ color: COLORS.forestGreen }}>
            Grovekeeper — Credits
          </DialogTitle>
          <DialogDescription style={{ color: COLORS.barkBrown }}>
            Every forest begins with a single seed.
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-3 pt-2">
          <For each={CREDITS}>
            {(entry) => (
              <div>
                <h4
                  class="text-xs font-bold uppercase tracking-wider"
                  style={{ color: COLORS.autumnGold }}
                >
                  {entry.role}
                </h4>
                <ul class="text-sm" style={{ color: COLORS.soilDark }}>
                  <For each={entry.names}>{(n) => <li>{n}</li>}</For>
                </ul>
              </div>
            )}
          </For>
        </div>

        <Show when={true}>
          <p
            class="text-xs text-center pt-3"
            style={{ color: `${COLORS.barkBrown}a0` }}
          >
            Open source under the repo's stated license · See CHANGELOG.md
          </p>
        </Show>
      </DialogContent>
    </Dialog>
  );
};
