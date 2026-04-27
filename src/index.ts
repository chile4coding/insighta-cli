#!/usr/bin/env node

import { Command } from "commander";
import { login, logout, whoami } from "./commands/auth";
import {
  listProfiles,
  getProfile,
  searchProfiles,
  createProfile,
  exportProfiles,
  deleteProfile,
} from "./commands/profiles";

const program = new Command();

program
  .name("insighta")
  .description(
    "Insighta Labs+ CLI - Command-line interface for Profile Intelligence Service",
  )
  .version("1.0.0");

// Auth commands
program.command("login").description("Login via GitHub OAuth").action(login);

program
  .command("logout")
  .description("Logout and clear credentials")
  .action(logout);

program
  .command("whoami")
  .description("Display current user info")
  .action(whoami);

// Profile commands
const profiles = program.command("profiles").description("Manage profiles");

profiles
  .command("list")
  .description("List profiles with filters")
  .option("-g, --gender <gender>", "Filter by gender (male/female)")
  .option("-c, --country-id <country>", "Filter by country ID (e.g., NG, US)")
  .option(
    "--age-group <group>",
    "Filter by age group (child/teenager/adult/senior)",
  )
  .option("--min-age <age>", "Minimum age", parseInt)
  .option("--max-age <age>", "Maximum age", parseInt)
  .option(
    "--sort-by <field>",
    "Sort by (age/created_at/gender_probability)",
    "created_at",
  )
  .option("--order <order>", "Sort order (asc/desc)", "asc")
  .option("--page <page>", "Page number", parseInt, 1)
  .option("--limit <limit>", "Items per page (max 50)", parseInt, 10)
  .action(listProfiles);

profiles
  .command("get <id>")
  .description("Get profile by ID")
  .action(getProfile);

profiles
  .command("delete <id>")
  .description("Delete profile (admin only)")
  .action(deleteProfile);

profiles
  .command("search <query>")
  .description("Search profiles using natural language")
  .action(searchProfiles);

profiles
  .command("create")
  .description("Create a new profile (admin only)")
  .requiredOption("-n, --name <name>", "Profile name")
  .action(createProfile);

profiles
  .command("export")
  .description("Export profiles to CSV")
  .option("-f, --format <format>", "Export format (csv)", "csv")
  .option("-g, --gender <gender>", "Filter by gender (male/female)")
  .option("-c, --country-id <country>", "Filter by country ID (e.g., NG, US)")
  .option(
    "--age-group <group>",
    "Filter by age group (child/teenager/adult/senior)",
  )
  .option("--min-age <age>", "Minimum age", parseInt)
  .option("--max-age <age>", "Maximum age", parseInt)
  .action(exportProfiles);

program.parse(process.argv);
