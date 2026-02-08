import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NpcDialogue } from "./NpcDialogue";

// Mock the gameStore
vi.mock("../stores/gameStore", () => ({
  useGameStore: Object.assign(() => ({}), {
    getState: () => ({
      addXp: vi.fn(),
      addResource: vi.fn(),
      addSeed: vi.fn(),
    }),
  }),
}));

// Mock Toast and FloatingParticles
vi.mock("./Toast", () => ({ showToast: vi.fn() }));
vi.mock("./FloatingParticles", () => ({ showParticle: vi.fn() }));

describe("NpcDialogue", () => {
  let onClose: () => void;
  let onOpenTrade: () => void;

  beforeEach(() => {
    onClose = vi.fn();
    onOpenTrade = vi.fn();
  });

  it("renders nothing when npcTemplateId is null", () => {
    const { container } = render(
      <NpcDialogue open={true} onClose={onClose} npcTemplateId={null} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders NPC greeting when opened with valid template", () => {
    render(
      <NpcDialogue open={true} onClose={onClose} npcTemplateId="elder-rowan" />,
    );
    expect(screen.getByText("Elder Rowan")).toBeTruthy();
    expect(screen.getByText(/young grovekeeper/i)).toBeTruthy();
  });

  it("displays dialogue choices as buttons", () => {
    render(
      <NpcDialogue open={true} onClose={onClose} npcTemplateId="elder-rowan" />,
    );
    expect(screen.getByText("Tell me about growing trees")).toBeTruthy();
    expect(screen.getByText("Goodbye")).toBeTruthy();
  });

  it("advances to next node when choice has next", () => {
    render(
      <NpcDialogue open={true} onClose={onClose} npcTemplateId="elder-rowan" />,
    );
    fireEvent.click(screen.getByText("Tell me about growing trees"));
    expect(screen.getByText(/Water your saplings/i)).toBeTruthy();
  });

  it("closes dialogue when choice has next: null and no open action", () => {
    render(
      <NpcDialogue open={true} onClose={onClose} npcTemplateId="elder-rowan" />,
    );
    fireEvent.click(screen.getByText("Goodbye"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onOpenTrade for trade action", () => {
    render(
      <NpcDialogue
        open={true}
        onClose={onClose}
        npcTemplateId="hazel"
        onOpenTrade={onOpenTrade}
      />,
    );
    fireEvent.click(screen.getByText("Let's trade"));
    expect(onOpenTrade).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("shows NPC title badge", () => {
    render(<NpcDialogue open={true} onClose={onClose} npcTemplateId="hazel" />);
    expect(screen.getByText("Wandering Trader")).toBeTruthy();
  });
});
