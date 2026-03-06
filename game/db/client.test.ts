import { getTableColumns, getTableName } from "drizzle-orm";
import { saves, settings } from "./schema";

describe("db schema", () => {
  describe("saves table", () => {
    it("has the correct table name", () => {
      expect(getTableName(saves)).toBe("saves");
    });

    it("has all required columns", () => {
      const columns = getTableColumns(saves);
      const columnNames = Object.keys(columns);
      expect(columnNames).toContain("id");
      expect(columnNames).toContain("name");
      expect(columnNames).toContain("data");
      expect(columnNames).toContain("createdAt");
      expect(columnNames).toContain("updatedAt");
    });
  });

  describe("settings table", () => {
    it("has the correct table name", () => {
      expect(getTableName(settings)).toBe("settings");
    });

    it("has all required columns", () => {
      const columns = getTableColumns(settings);
      const columnNames = Object.keys(columns);
      expect(columnNames).toContain("key");
      expect(columnNames).toContain("value");
    });
  });
});
