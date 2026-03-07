/**
 * Tests for NpcDialogue pure logic (Spec §15, §33).
 *
 * Imports from .ts (not .tsx) to avoid JSX runtime initialization.
 * See codebase pattern: "JSX runtime chain breaks .tsx pure-function tests".
 */

import {
  getActiveDialogueNode,
  resolveEntityDisplayName,
} from "./NpcDialogue.logic";
import type { DialogueTree } from "@/game/ecs/components/dialogue";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const TEST_TREE: DialogueTree = {
  treeId: "test-tree",
  entryNodeId: "node-a",
  maxDepth: 2,
  nodes: [
    {
      nodeId: "node-a",
      speaker: "Elder Rowan",
      text: "Hello traveler!",
      branches: [{ label: "Continue", targetNodeId: "node-b", seedBias: 1.0 }],
    },
    {
      nodeId: "node-b",
      speaker: "Elder Rowan",
      text: "Safe travels.",
      branches: [],
    },
  ],
};

// ---------------------------------------------------------------------------
// getActiveDialogueNode (Spec §33)
// ---------------------------------------------------------------------------

describe("getActiveDialogueNode (Spec §33)", () => {
  it("returns undefined when tree is undefined", () => {
    expect(getActiveDialogueNode(undefined, "node-a")).toBeUndefined();
  });

  it("returns undefined when nodeId is null", () => {
    expect(getActiveDialogueNode(TEST_TREE, null)).toBeUndefined();
  });

  it("returns undefined when nodeId is not found in the tree", () => {
    expect(getActiveDialogueNode(TEST_TREE, "missing-node")).toBeUndefined();
  });

  it("returns the correct node matching nodeId", () => {
    const node = getActiveDialogueNode(TEST_TREE, "node-a");
    expect(node?.text).toBe("Hello traveler!");
    expect(node?.speaker).toBe("Elder Rowan");
  });

  it("returns a different node when nodeId changes", () => {
    const node = getActiveDialogueNode(TEST_TREE, "node-b");
    expect(node?.text).toBe("Safe travels.");
  });

  it("returns the correct branches on the resolved node", () => {
    const node = getActiveDialogueNode(TEST_TREE, "node-a");
    expect(node?.branches).toHaveLength(1);
    expect(node?.branches[0].targetNodeId).toBe("node-b");
    expect(node?.branches[0].label).toBe("Continue");
  });

  it("returns a terminal node with empty branches array", () => {
    const node = getActiveDialogueNode(TEST_TREE, "node-b");
    expect(node?.branches).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// resolveEntityDisplayName (Spec §15)
// ---------------------------------------------------------------------------

describe("resolveEntityDisplayName (Spec §15)", () => {
  it("returns npc.name when NPC component is present", () => {
    expect(
      resolveEntityDisplayName(
        { name: "Elder Rowan" },
        { spiritId: "spirit-1" },
        "entity_42",
      ),
    ).toBe("Elder Rowan");
  });

  it("prefers NPC name over spirit id", () => {
    expect(
      resolveEntityDisplayName({ name: "The Merchant" }, { spiritId: "spirit-3" }),
    ).toBe("The Merchant");
  });

  it("returns spirit label when no NPC component", () => {
    expect(
      resolveEntityDisplayName(undefined, { spiritId: "spirit-1" }, "entity_42"),
    ).toBe("Spirit: spirit-1");
  });

  it("uses entityId as fallback when neither npc nor spirit", () => {
    expect(resolveEntityDisplayName(undefined, undefined, "entity_42")).toBe(
      "entity_42",
    );
  });

  it("returns Unknown when all arguments are undefined", () => {
    expect(resolveEntityDisplayName()).toBe("Unknown");
  });

  it("returns Unknown when entityId is also undefined", () => {
    expect(resolveEntityDisplayName(undefined, undefined, undefined)).toBe(
      "Unknown",
    );
  });
});
