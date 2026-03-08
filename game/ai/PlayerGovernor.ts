/**
 * Re-export shim — PlayerGovernor has been decomposed into game/ai/governor/.
 * This file exists so any import from "@/game/ai/PlayerGovernor" continues to work.
 */

export type { GovernorProfile, PlayerGovernorConfig } from "./governor/index.ts";
export { PlayerGovernor } from "./governor/index.ts";
