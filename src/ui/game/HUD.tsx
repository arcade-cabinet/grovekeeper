import { Show } from "solid-js";
import { actions as gameActions } from "@/actions";
import { COLORS } from "@/config/config";
import { useTrait } from "@/ecs/solid";
import { koota } from "@/koota";
import type { GameTime } from "@/systems/time";
import { PlayerProgress, Quests } from "@/traits";
import { RiBuilding2Line, RiMenuLine, RiToolsLine } from "@/ui/icons";
import { Button } from "@/ui/primitives/button";
import { QuestPanel } from "./QuestPanel";
import { ResourceBar } from "./ResourceBar";
import { TimeDisplay, TimeDisplayCompact } from "./TimeDisplay";
import { XPBar } from "./XPBar";

interface HUDProps {
  onPlant: () => void;
  onOpenMenu: () => void;
  onOpenTools: () => void;
  onOpenBuild?: () => void;
  gameTime: GameTime | null;
}

export const HUD = (props: HUDProps) => {
  const progress = useTrait(koota, PlayerProgress);
  const selectedTool = () => progress()?.selectedTool ?? "trowel";
  const level = () => progress()?.level ?? 1;
  const questsTrait = useTrait(koota, Quests);
  const activeQuests = () => questsTrait()?.activeQuests ?? [];

  const handleClaimReward = (questId: string) => {
    const quest = activeQuests().find((q) => q.id === questId);
    if (quest?.completed) {
      const a = gameActions();
      a.addXp(quest.rewards.xp);
      if (quest.rewards.resources) {
        for (const r of quest.rewards.resources) {
          a.addResource(r.type, r.amount);
        }
      }
      if (quest.rewards.seeds) {
        for (const s of quest.rewards.seeds) {
          a.addSeed(s.speciesId, s.amount);
        }
      }
      a.completeQuest(questId);
    }
  };

  return (
    <div class="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3">
      <div class="flex items-center gap-1.5 sm:gap-3 min-w-0 overflow-hidden">
        <ResourceBar />
        <XPBar />
        <Show when={props.gameTime}>
          {(t) => (
            <>
              <div class="hidden sm:block">
                <TimeDisplay time={t()} />
              </div>
              <div class="block sm:hidden">
                <TimeDisplayCompact time={t()} />
              </div>
            </>
          )}
        </Show>
      </div>

      <div class="flex items-center gap-1 sm:gap-2">
        <QuestPanel quests={activeQuests()} onClaimReward={handleClaimReward} />

        <Show when={level() >= 3 && props.onOpenBuild}>
          <Button
            size="sm"
            class="h-11 px-2 sm:px-3 rounded-full"
            style={{
              background: COLORS.barkBrown,
              color: "white",
            }}
            onClick={() => props.onOpenBuild?.()}
            aria-label="Open build panel"
          >
            <RiBuilding2Line class="w-4 h-4 sm:mr-1" aria-hidden="true" />
            <span class="hidden sm:inline text-xs">Build</span>
          </Button>
        </Show>

        <Button
          size="sm"
          class="h-11 px-2 sm:px-3 rounded-full"
          style={{
            background: COLORS.forestGreen,
            color: "white",
          }}
          onClick={props.onOpenTools}
          aria-label={`Open tools — current tool: ${selectedTool()}`}
        >
          <RiToolsLine class="w-4 h-4 sm:mr-1" aria-hidden="true" />
          <span class="hidden sm:inline text-xs">{selectedTool()}</span>
        </Button>

        <Button
          size="icon"
          variant="ghost"
          class="w-11 h-11 text-white hover:bg-white/10"
          onClick={props.onOpenMenu}
          aria-label="Open menu"
        >
          <RiMenuLine class="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
};
