/**
 * React bindings for the Miniplex ECS world.
 * Provides declarative <ECS.Entities> component for rendering ECS data in React.
 */
import { createReactAPI } from "miniplex-react";
import { world } from "./world";

export const ECS = createReactAPI(world);
