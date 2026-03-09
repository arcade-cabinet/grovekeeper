/**
 * React bindings for the Miniplex ECS world.
 * Provides declarative <ECS.Entities> component for rendering ECS data in React.
 *
 * NOTE: Requires `miniplex-react` package to be installed.
 * Install with: npx expo install miniplex-react
 */
import { createReactAPI } from "miniplex-react";
import { world } from "./world.ts";

export const ECS = createReactAPI(world);
