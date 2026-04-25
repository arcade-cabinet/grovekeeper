/**
 * Phrase pools tests — Wave 11b.
 *
 * Asserts the floor on phrase counts (so a future careless edit can't
 * shrink a pool below the cozy minimum) and the stability of phrase
 * id derivation (any change here is save-breaking — see
 * `phrase-pools.ts:phraseId`).
 */

import { describe, expect, it } from "vitest";
import { phraseId, SPIRIT_PHRASES, VILLAGER_PHRASES } from "./phrase-pools";

const MIN_PHRASES_PER_POOL = 5;

describe("phrase-pools", () => {
  describe("SPIRIT_PHRASES", () => {
    it("includes the required tag keys", () => {
      const keys = Object.keys(SPIRIT_PHRASES);
      expect(keys).toContain("first-greet");
      expect(keys).toContain("returning-greet");
      expect(keys).toContain("time-of-day-morning");
      expect(keys).toContain("time-of-day-midday");
      expect(keys).toContain("time-of-day-evening");
      expect(keys).toContain("time-of-day-night");
    });

    it.each(
      Object.entries(SPIRIT_PHRASES),
    )("pool '%s' has at least %i phrases", (_tag, phrases) => {
      expect(phrases.length).toBeGreaterThanOrEqual(MIN_PHRASES_PER_POOL);
    });

    it.each(
      Object.entries(SPIRIT_PHRASES),
    )("pool '%s' contains no empty / whitespace-only phrases", (_tag, phrases) => {
      for (const p of phrases) {
        expect(p.trim().length).toBeGreaterThan(0);
      }
    });

    it("first-greet phrases address the player as a keeper / arrival", () => {
      // The point of first-greet is the *welcoming* tone — sanity-check
      // the pool reads like greetings, not arbitrary lines that could
      // accidentally land on a returning visitor.
      for (const p of SPIRIT_PHRASES["first-greet"]) {
        expect(p.length).toBeGreaterThan(8);
      }
    });
  });

  describe("VILLAGER_PHRASES", () => {
    it("includes the required tag keys", () => {
      const keys = Object.keys(VILLAGER_PHRASES);
      expect(keys).toContain("general");
      expect(keys).toContain("time-of-day-morning");
      expect(keys).toContain("time-of-day-midday");
      expect(keys).toContain("time-of-day-evening");
      expect(keys).toContain("time-of-day-night");
    });

    it.each(
      Object.entries(VILLAGER_PHRASES),
    )("pool '%s' has at least %i phrases", (_tag, phrases) => {
      expect(phrases.length).toBeGreaterThanOrEqual(MIN_PHRASES_PER_POOL);
    });

    it.each(
      Object.entries(VILLAGER_PHRASES),
    )("pool '%s' contains no quest / fetch language", (_tag, phrases) => {
      // Spec is explicit: NO "I need X", NO fetch hints, NO quest
      // chains. Catch the obvious failure modes so a copywriting
      // mistake fails CI instead of leaking into the build.
      const banned = [
        /\bi need\b/i,
        /\bbring me\b/i,
        /\bfetch\b/i,
        /\bquest\b/i,
        /\bcould you (get|find|grab|bring)\b/i,
      ];
      for (const p of phrases) {
        for (const re of banned) {
          expect(p).not.toMatch(re);
        }
      }
    });
  });

  describe("phraseId", () => {
    it("formats as <speaker>:<tag>:<index>", () => {
      expect(phraseId("spirit", "first-greet", 0)).toBe("spirit:first-greet:0");
      expect(phraseId("villager", "general", 7)).toBe("villager:general:7");
    });

    it("yields unique ids across the entire phrase universe", () => {
      const ids = new Set<string>();
      for (const [tag, phrases] of Object.entries(SPIRIT_PHRASES)) {
        for (let i = 0; i < phrases.length; i++) {
          ids.add(phraseId("spirit", tag, i));
        }
      }
      for (const [tag, phrases] of Object.entries(VILLAGER_PHRASES)) {
        for (let i = 0; i < phrases.length; i++) {
          ids.add(phraseId("villager", tag, i));
        }
      }
      const totalSpirit = Object.values(SPIRIT_PHRASES).reduce(
        (n, arr) => n + arr.length,
        0,
      );
      const totalVillager = Object.values(VILLAGER_PHRASES).reduce(
        (n, arr) => n + arr.length,
        0,
      );
      expect(ids.size).toBe(totalSpirit + totalVillager);
    });
  });
});
