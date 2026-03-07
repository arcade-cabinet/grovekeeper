/**
 * Dialogue loader tests (Spec §33).
 *
 * Covers:
 * - Loading dialogue trees from config
 * - Graph validation: valid tree passes, invalid tree fails
 * - All config trees load without graph errors
 */

import {
  getDialogueTrees,
  getDialogueTreeById,
  validateDialogueTree,
  validateAllDialogueTrees,
  loadAndValidateDialogueTrees,
} from "./dialogueLoader";
import type { DialogueTree } from "@/game/ecs/components/dialogue";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTree(overrides: Partial<DialogueTree> = {}): DialogueTree {
  return {
    treeId: "test-tree",
    entryNodeId: "node-a",
    maxDepth: 2,
    nodes: [
      {
        nodeId: "node-a",
        speaker: "Test NPC",
        text: "Hello, traveller.",
        branches: [{ label: "Continue", targetNodeId: "node-b", seedBias: 1.0 }],
      },
      {
        nodeId: "node-b",
        speaker: "Test NPC",
        text: "Safe travels.",
        branches: [],
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Config loading
// ---------------------------------------------------------------------------

describe("Dialogue Loader — Config Loading (Spec §33)", () => {
  it("loads at least one dialogue tree from config", () => {
    const trees = getDialogueTrees();
    expect(trees.length).toBeGreaterThan(0);
  });

  it("each tree has required fields: treeId, entryNodeId, nodes, maxDepth", () => {
    const trees = getDialogueTrees();
    for (const tree of trees) {
      expect(typeof tree.treeId).toBe("string");
      expect(typeof tree.entryNodeId).toBe("string");
      expect(Array.isArray(tree.nodes)).toBe(true);
      expect(typeof tree.maxDepth).toBe("number");
    }
  });

  it("finds a tree by its treeId", () => {
    const trees = getDialogueTrees();
    const firstId = trees[0].treeId;
    const found = getDialogueTreeById(firstId);
    expect(found).toBeDefined();
    expect(found!.treeId).toBe(firstId);
  });

  it("returns undefined for an unknown treeId", () => {
    expect(getDialogueTreeById("__nonexistent_tree__")).toBeUndefined();
  });

  it("config includes expected trees: rowan-greeting, spirit-worldroot", () => {
    expect(getDialogueTreeById("rowan-greeting")).toBeDefined();
    expect(getDialogueTreeById("spirit-worldroot")).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Graph validation — valid trees
// ---------------------------------------------------------------------------

describe("Dialogue Loader — Valid Tree Validation (Spec §33)", () => {
  it("returns no errors for a fully connected tree", () => {
    const errors = validateDialogueTree(makeTree());
    expect(errors).toHaveLength(0);
  });

  it("returns no errors for a single terminal node (no branches)", () => {
    const tree = makeTree({
      nodes: [{ nodeId: "node-a", speaker: "NPC", text: "Goodbye.", branches: [] }],
      entryNodeId: "node-a",
    });
    const errors = validateDialogueTree(tree);
    expect(errors).toHaveLength(0);
  });

  it("returns no errors for a tree with branch conditions and effects", () => {
    const tree = makeTree({
      nodes: [
        {
          nodeId: "node-a",
          speaker: "Spirit",
          text: "Seek the light.",
          branches: [
            {
              label: "Yes",
              targetNodeId: "node-b",
              seedBias: 0.8,
              conditions: [{ type: "has_level", value: 5 }],
            },
          ],
          effects: [{ type: "give_xp", value: 25 }],
        },
        { nodeId: "node-b", speaker: "Spirit", text: "Well done.", branches: [] },
      ],
    });
    expect(validateDialogueTree(tree)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Graph validation — invalid trees
// ---------------------------------------------------------------------------

describe("Dialogue Loader — Invalid Tree Validation (Spec §33)", () => {
  it("reports error when entryNodeId is not in nodes", () => {
    const tree = makeTree({ entryNodeId: "missing-entry" });
    const errors = validateDialogueTree(tree);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("entryNodeId"))).toBe(true);
    expect(errors.some((e) => e.includes("missing-entry"))).toBe(true);
  });

  it("reports error when a branch targetNodeId is not in nodes", () => {
    const tree = makeTree({
      nodes: [
        {
          nodeId: "node-a",
          speaker: "NPC",
          text: "Choose wisely.",
          branches: [
            { label: "Go somewhere", targetNodeId: "does-not-exist", seedBias: 1.0 },
          ],
        },
      ],
    });
    const errors = validateDialogueTree(tree);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("does-not-exist"))).toBe(true);
  });

  it("reports all errors in a tree with multiple broken links", () => {
    const tree: DialogueTree = {
      treeId: "broken-tree",
      entryNodeId: "missing-entry",
      maxDepth: 1,
      nodes: [
        {
          nodeId: "node-a",
          speaker: "NPC",
          text: "Hello",
          branches: [
            { label: "Bad link 1", targetNodeId: "missing-1", seedBias: 0.5 },
            { label: "Bad link 2", targetNodeId: "missing-2", seedBias: 0.5 },
          ],
        },
      ],
    };
    const errors = validateDialogueTree(tree);
    // entryNodeId + 2 broken branches = at least 3 errors
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });

  it("includes treeId and nodeId in error messages for debuggability", () => {
    const tree = makeTree({
      treeId: "my-tree",
      nodes: [
        {
          nodeId: "my-node",
          speaker: "NPC",
          text: "Hi",
          branches: [{ label: "Bad", targetNodeId: "phantom", seedBias: 1.0 }],
        },
      ],
      entryNodeId: "my-node",
    });
    const errors = validateDialogueTree(tree);
    expect(errors[0]).toContain("my-tree");
    expect(errors[0]).toContain("my-node");
    expect(errors[0]).toContain("phantom");
  });
});

// ---------------------------------------------------------------------------
// validateAllDialogueTrees
// ---------------------------------------------------------------------------

describe("Dialogue Loader — validateAllDialogueTrees (Spec §33)", () => {
  it("returns empty map for an array of valid trees", () => {
    const trees = [makeTree({ treeId: "t1" }), makeTree({ treeId: "t2" })];
    const errorMap = validateAllDialogueTrees(trees);
    expect(errorMap.size).toBe(0);
  });

  it("returns only trees with errors in the map", () => {
    const good = makeTree({ treeId: "good-tree" });
    const bad = makeTree({ treeId: "bad-tree", entryNodeId: "missing" });
    const errorMap = validateAllDialogueTrees([good, bad]);
    expect(errorMap.has("good-tree")).toBe(false);
    expect(errorMap.has("bad-tree")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// All config trees are valid
// ---------------------------------------------------------------------------

describe("Dialogue Loader — All Config Trees Valid (Spec §33)", () => {
  it("all config dialogue trees pass graph validation", () => {
    const trees = getDialogueTrees();
    const errorMap = validateAllDialogueTrees(trees);
    const messages: string[] = [];
    for (const [treeId, errs] of errorMap) {
      messages.push(`${treeId}: ${errs.join("; ")}`);
    }
    expect(messages).toHaveLength(0);
  });

  it("loadAndValidateDialogueTrees does not throw", () => {
    expect(() => loadAndValidateDialogueTrees()).not.toThrow();
  });

  it("loadAndValidateDialogueTrees returns all config trees", () => {
    const fromLoader = loadAndValidateDialogueTrees();
    const fromConfig = getDialogueTrees();
    expect(fromLoader).toHaveLength(fromConfig.length);
  });
});
