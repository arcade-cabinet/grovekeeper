CREATE TABLE `achievements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`achievement_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `grid_cells` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`grid_x` integer NOT NULL,
	`grid_z` integer NOT NULL,
	`zone_id` text DEFAULT 'starting-grove' NOT NULL,
	`type` text DEFAULT 'soil' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `player` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`level` integer DEFAULT 1 NOT NULL,
	`xp` integer DEFAULT 0 NOT NULL,
	`coins` integer DEFAULT 100 NOT NULL,
	`stamina` real DEFAULT 100 NOT NULL,
	`max_stamina` real DEFAULT 100 NOT NULL,
	`selected_tool` text DEFAULT 'trowel' NOT NULL,
	`selected_species` text DEFAULT 'white-oak' NOT NULL,
	`grid_size` integer DEFAULT 12 NOT NULL,
	`prestige_count` integer DEFAULT 0 NOT NULL,
	`active_border_cosmetic` text,
	`body_temp` real DEFAULT 37 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `quest_goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`quest_id` text NOT NULL,
	`goal_id` text NOT NULL,
	`target` integer DEFAULT 1 NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `quests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`quest_id` text NOT NULL,
	`difficulty` text DEFAULT 'normal' NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`rewards_json` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `resources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`current` integer DEFAULT 0 NOT NULL,
	`lifetime` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `save_config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`difficulty` text DEFAULT 'normal' NOT NULL,
	`permadeath` integer DEFAULT false NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `seeds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`species_id` text NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`has_seen_rules` integer DEFAULT false NOT NULL,
	`haptics_enabled` integer DEFAULT true NOT NULL,
	`sound_enabled` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `structures` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`template_id` text NOT NULL,
	`world_x` integer NOT NULL,
	`world_z` integer NOT NULL,
	`zone_id` text DEFAULT 'starting-grove' NOT NULL,
	`integrity` real DEFAULT 100 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `time_state` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_time_us` real DEFAULT 0 NOT NULL,
	`season` text DEFAULT 'spring' NOT NULL,
	`day` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tool_upgrades` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tool_id` text NOT NULL,
	`tier` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tracking` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`trees_planted` integer DEFAULT 0 NOT NULL,
	`trees_matured` integer DEFAULT 0 NOT NULL,
	`trees_harvested` integer DEFAULT 0 NOT NULL,
	`trees_watered` integer DEFAULT 0 NOT NULL,
	`seasons_experienced_json` text DEFAULT '[]' NOT NULL,
	`species_planted_json` text DEFAULT '[]' NOT NULL,
	`tool_use_counts_json` text DEFAULT '{}' NOT NULL,
	`wild_trees_harvested` integer DEFAULT 0 NOT NULL,
	`wild_trees_regrown` integer DEFAULT 0 NOT NULL,
	`visited_zone_types_json` text DEFAULT '[]' NOT NULL,
	`trees_planted_in_spring` integer DEFAULT 0 NOT NULL,
	`trees_harvested_in_autumn` integer DEFAULT 0 NOT NULL,
	`wild_species_harvested_json` text DEFAULT '[]' NOT NULL,
	`completed_quest_ids_json` text DEFAULT '[]' NOT NULL,
	`completed_goal_ids_json` text DEFAULT '[]' NOT NULL,
	`last_quest_refresh` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `trees` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`species_id` text NOT NULL,
	`grid_x` integer NOT NULL,
	`grid_z` integer NOT NULL,
	`zone_id` text DEFAULT 'starting-grove' NOT NULL,
	`stage` integer DEFAULT 0 NOT NULL,
	`progress` real DEFAULT 0 NOT NULL,
	`watered` integer DEFAULT false NOT NULL,
	`fertilized` integer DEFAULT false NOT NULL,
	`pruned` integer DEFAULT false NOT NULL,
	`total_growth_time` real DEFAULT 0 NOT NULL,
	`planted_at` integer NOT NULL,
	`mesh_seed` integer DEFAULT 0 NOT NULL,
	`harvest_cooldown_elapsed` real DEFAULT 0 NOT NULL,
	`harvest_ready` integer DEFAULT false NOT NULL,
	`blight_type` text
);
--> statement-breakpoint
CREATE TABLE `unlocks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`item_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `world_state` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`world_seed` text DEFAULT '' NOT NULL,
	`discovered_zones_json` text DEFAULT '["starting-grove"]' NOT NULL,
	`current_zone_id` text DEFAULT 'starting-grove' NOT NULL,
	`player_pos_x` real DEFAULT 6 NOT NULL,
	`player_pos_z` real DEFAULT 6 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chunks` (
	`world_id` text NOT NULL,
	`chunk_x` integer NOT NULL,
	`chunk_z` integer NOT NULL,
	`biome` text NOT NULL,
	`generated_at` integer NOT NULL,
	`modified_blocks_json` text DEFAULT '[]' NOT NULL,
	PRIMARY KEY(`world_id`, `chunk_x`, `chunk_z`),
	FOREIGN KEY (`world_id`) REFERENCES `worlds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `dialogue_history` (
	`world_id` text NOT NULL,
	`npc_id` text NOT NULL,
	`last_phrase_id` text NOT NULL,
	`said_at` integer NOT NULL,
	PRIMARY KEY(`world_id`, `npc_id`),
	FOREIGN KEY (`world_id`) REFERENCES `worlds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `groves` (
	`id` text PRIMARY KEY NOT NULL,
	`world_id` text NOT NULL,
	`chunk_x` integer NOT NULL,
	`chunk_z` integer NOT NULL,
	`biome` text NOT NULL,
	`state` text DEFAULT 'discovered' NOT NULL,
	`discovered_at` integer NOT NULL,
	`claimed_at` integer,
	`hearth_lit_at` integer,
	FOREIGN KEY (`world_id`) REFERENCES `worlds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `groves_world_chunk_uq` ON `groves` (`world_id`,`chunk_x`,`chunk_z`);--> statement-breakpoint
CREATE INDEX `groves_world_state_idx` ON `groves` (`world_id`,`state`);--> statement-breakpoint
CREATE TABLE `inventory` (
	`world_id` text NOT NULL,
	`item_id` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`world_id`, `item_id`),
	FOREIGN KEY (`world_id`) REFERENCES `worlds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `known_recipes` (
	`world_id` text NOT NULL,
	`recipe_id` text NOT NULL,
	`learned_at` integer NOT NULL,
	PRIMARY KEY(`world_id`, `recipe_id`),
	FOREIGN KEY (`world_id`) REFERENCES `worlds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `placed_structures` (
	`id` text PRIMARY KEY NOT NULL,
	`world_id` text NOT NULL,
	`grove_id` text,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`z` real NOT NULL,
	`type` text NOT NULL,
	`rotation` real DEFAULT 0 NOT NULL,
	`placed_at` integer NOT NULL,
	FOREIGN KEY (`world_id`) REFERENCES `worlds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`grove_id`) REFERENCES `groves`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `placed_structures_world_idx` ON `placed_structures` (`world_id`);--> statement-breakpoint
CREATE INDEX `placed_structures_grove_idx` ON `placed_structures` (`grove_id`);--> statement-breakpoint
CREATE TABLE `worlds` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT 'Grovekeeper' NOT NULL,
	`gardener_name` text DEFAULT 'Gardener' NOT NULL,
	`world_seed` text NOT NULL,
	`difficulty` text DEFAULT 'sapling' NOT NULL,
	`created_at` integer NOT NULL,
	`last_played_at` integer NOT NULL
);
