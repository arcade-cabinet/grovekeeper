import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NewGameModal } from "./NewGameModal";

describe("NewGameModal", () => {
  const onClose = vi.fn();
  const onStart = vi.fn();

  beforeEach(() => {
    onClose.mockClear();
    onStart.mockClear();
  });

  it("renders all 5 difficulty tiers", () => {
    render(<NewGameModal open={true} onClose={onClose} onStart={onStart} />);

    expect(screen.getByText("Explore")).toBeDefined();
    // "Normal" appears in both the tile and the description panel (selected by default)
    expect(screen.getAllByText("Normal").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Hard")).toBeDefined();
    expect(screen.getByText("Brutal")).toBeDefined();
    expect(screen.getByText("Ultra Brutal")).toBeDefined();
  });

  it("renders dialog title", () => {
    render(<NewGameModal open={true} onClose={onClose} onStart={onStart} />);
    expect(screen.getByText("Choose Your Challenge")).toBeDefined();
  });

  it("renders Begin Your Grove button", () => {
    render(<NewGameModal open={true} onClose={onClose} onStart={onStart} />);
    expect(screen.getByText("Begin Your Grove")).toBeDefined();
  });

  it("renders Cancel button", () => {
    render(<NewGameModal open={true} onClose={onClose} onStart={onStart} />);
    expect(screen.getByText("Cancel")).toBeDefined();
  });

  it("defaults to Normal difficulty description", () => {
    render(<NewGameModal open={true} onClose={onClose} onStart={onStart} />);
    // Normal's description starts with "Balanced gameplay"
    expect(screen.getByText(/Balanced gameplay/)).toBeDefined();
  });

  it("shows feature summary grid", () => {
    render(<NewGameModal open={true} onClose={onClose} onStart={onStart} />);
    expect(screen.getByText("Growth")).toBeDefined();
    expect(screen.getByText("Yields")).toBeDefined();
    expect(screen.getByText("Exposure")).toBeDefined();
  });

  it("calls onStart with selected difficulty when Begin is clicked", () => {
    render(<NewGameModal open={true} onClose={onClose} onStart={onStart} />);
    fireEvent.click(screen.getByText("Begin Your Grove"));
    expect(onStart).toHaveBeenCalledWith("normal", false);
  });

  it("calls onClose when Cancel is clicked", () => {
    render(<NewGameModal open={true} onClose={onClose} onStart={onStart} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("does not render when open is false", () => {
    render(<NewGameModal open={false} onClose={onClose} onStart={onStart} />);
    expect(screen.queryByText("Choose Your Challenge")).toBeNull();
  });

  it("shows Permadeath section", () => {
    render(<NewGameModal open={true} onClose={onClose} onStart={onStart} />);
    expect(screen.getByText("Permadeath")).toBeDefined();
  });

  it("resets permadeath when switching from forced-on to optional difficulty", () => {
    render(<NewGameModal open={true} onClose={onClose} onStart={onStart} />);
    // Select Ultra Brutal (permadeath forced ON)
    fireEvent.click(screen.getByText("Ultra Brutal"));
    // Switch back to Normal (permadeath optional, should reset to off)
    fireEvent.click(screen.getAllByText("Normal")[0]);
    fireEvent.click(screen.getByText("Begin Your Grove"));
    expect(onStart).toHaveBeenCalledWith("normal", false);
  });
});
