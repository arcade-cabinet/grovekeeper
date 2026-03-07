/**
 * gameStore -- Backward-compatibility shim.
 *
 * All logic has been decomposed into the game/stores/ subpackage.
 * This file re-exports everything from the barrel so existing imports
 * of "@/game/stores/gameStore" continue to work unchanged.
 *
 * New code should import from "@/game/stores" directly.
 */

export * from "./index";
