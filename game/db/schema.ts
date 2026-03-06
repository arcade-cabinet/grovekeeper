import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const saves = sqliteTable("saves", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  data: text("data").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
