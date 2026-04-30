import { Command } from "commander";
import axios from "axios";
import chalk from "chalk";
import ora from "ora";
import { table as createTable } from "table";
import { loadCredentials, refreshAccessToken } from "../utils/auth";

const API_BASE = process.env.API_BASE || "http://185.200.244.215:9400/api";

function getAuthHeaders(): Record<string, string> {
  const credentials = loadCredentials(true);
  if (!credentials?.accessToken) {
    throw new Error('Not authenticated. Run "insighta login" first.');
  }
  return {
    Authorization: `Bearer ${credentials.accessToken}`,
    "X-API-Version": "1",
  };
}

async function makeRequest(
  method: string,
  url: string,
  data?: any,
): Promise<any> {
  try {
    const response = await axios({
      method,
      url,
      data,
      headers: getAuthHeaders(),
    });

    return response;
  } catch (err: any) {
    // Mirror apiFetch: retry on any 401 or 403, not just specific messages
    if (
      err.response?.status === 401 ||
      err.message === "Invalid or expired token"
    ) {
      const newCredentials = await refreshAccessToken();

      if (
        newCredentials?.accessToken &&
        newCredentials?.accessToken !== undefined
      ) {
        console.log("this is the new token: ", newCredentials);
        // Retry the original request with the fresh token
        return await axios({
          method,
          url,
          data,
          headers: {
            Authorization: `Bearer ${newCredentials.accessToken}`,
            "X-API-Version": "1",
          },
        });
      }

      // refreshAccessToken failed — nothing more we can do
      throw err;
    }

    // Any other error (404, 500, network, etc.) — rethrow immediately
    throw err;
  }
}

function formatProfileRow(profile: any): string[] {
  return [
    profile.id || "",
    profile.name || "",
    profile.gender || "",
    profile.gender_probability?.toString() || "",
    profile.age?.toString() || "",
    profile.age_group || "",
    profile.country_id || "",
    profile.country_name || "",
    profile.country_probability?.toString() || "",
    profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "",
  ];
}

interface ListProfilesOptions {
  gender?: string;
  countryId?: string;
  ageGroup?: string;
  minAge?: number;
  maxAge?: number;
  sortBy?: string;
  order?: string;
  page?: number;
  limit?: number;
}

interface ExportProfilesOptions {
  format?: string;
  gender?: string;
  countryId?: string;
  ageGroup?: string;
  minAge?: number;
  maxAge?: number;
}

export async function listProfiles(
  cmd: Command & ListProfilesOptions,
): Promise<void> {
  try {
    const queryParams = new URLSearchParams();
    if (cmd.gender) queryParams.append("gender", cmd.gender);
    if (cmd.countryId) queryParams.append("country_id", cmd.countryId);
    if (cmd.ageGroup) queryParams.append("age_group", cmd.ageGroup);
    if (cmd.minAge) queryParams.append("min_age", cmd.minAge.toString());
    if (cmd.maxAge) queryParams.append("max_age", cmd.maxAge.toString());
    if (cmd.sortBy) queryParams.append("sort_by", cmd.sortBy);
    if (cmd.order) queryParams.append("order", cmd.order);
    if (cmd.page) queryParams.append("page", cmd.page.toString());
    if (cmd.limit) queryParams.append("limit", cmd.limit.toString());

    const url = `${API_BASE}/profiles?${queryParams}`;
    const spinner = ora("Fetching profiles...").start();

    const response = await makeRequest("GET", url);
    spinner.stop();

     if (response?.data && response?.data?.data.length > 0) {
       const tableData = [
         [
           chalk.cyan("ID"),
           chalk.cyan("Name"),
           chalk.cyan("Gender"),
           chalk.cyan("G Prob"),
           chalk.cyan("Age"),
           chalk.cyan("Age Group"),
           chalk.cyan("Country"),
           chalk.cyan("Country Name"),
           chalk.cyan("C Prob"),
           chalk.cyan("Created"),
         ],
         ...(response.data?.data?.map(formatProfileRow) || []),
       ];

      const output = createTable(tableData, {
        columns: {
          0: { width: 38 },
          1: { width: 20 },
          2: { width: 10 },
          3: { width: 8 },
          4: { width: 6 },
          5: { width: 12 },
          6: { width: 8 },
          7: { width: 20 },
          8: { width: 8 },
          9: { width: 12 },
        },
      });

      console.log(`\n${output}\n`);

      const meta = response.data;
      if (meta?.links) {
        const links = [];
        if (meta.links.prev) links.push("← Prev");
        if (meta.links.next) links.push("Next →");
        if (links.length) {
          console.log(
            chalk.gray(
              `Page ${meta.page} of ${meta.total_pages} (${meta.total} total) - ${links.join(" | ")}\n`,
            ),
          );
        }
      }
    } else {
      console.log(chalk.yellow("\nNo profiles found.\n"));
    }
  } catch (err: any) {
    ora().stop();
    if (err.response?.status === 401) {
      console.error(
        chalk.red('\nAuthentication required. Run "insighta login" first.\n'),
      );
    } else {
      console.error(
        chalk.red(`\nError: ${err.response?.data?.message || err.message}\n`),
      );
    }
  }
}

export async function getProfile(id: string): Promise<void> {
  const url = `${API_BASE}/profiles/${id}`;

  try {
    const spinner = ora("Fetching profile...").start();
    const response = await makeRequest("GET", url);
    spinner.stop();

    if (response?.data?.data) {
      const p = response.data.data;
      console.log(
        chalk.cyan("\n┌─ Profile Details ─────────────────────────────"),
      );
      console.log(chalk.gray(`│  ID:               ${p.id}`));
      console.log(chalk.gray(`│  Name:             ${p.name}`));
      console.log(chalk.gray(`│  Gender:           ${p.gender || "N/A"}`));
      console.log(
        chalk.gray(`│  Gender Prob:      ${p.gender_probability || "N/A"}`),
      );
      console.log(chalk.gray(`│  Age:              ${p.age || "N/A"}`));
      console.log(chalk.gray(`│  Age Group:        ${p.age_group || "N/A"}`));
      console.log(chalk.gray(`│  Country ID:       ${p.country_id || "N/A"}`));
      console.log(
        chalk.gray(`│  Country Name:     ${p.country_name || "N/A"}`),
      );
      console.log(
        chalk.gray(`│  Country Prob:     ${p.country_probability || "N/A"}`),
      );
      console.log(
        chalk.gray(
          `│  Created At:       ${p.created_at ? new Date(p.created_at).toISOString() : "N/A"}`,
        ),
      );
      console.log(
        chalk.gray("└──────────────────────────────────────────────\n"),
      );
    } else {
      console.log(chalk.yellow("\nProfile not found.\n"));
    }
  } catch (err: any) {
    ora().stop();
    if (err.response?.status === 404) {
      console.error(chalk.red("\nProfile not found.\n"));
    } else if (err.response?.status === 401) {
      console.error(
        chalk.red('\nAuthentication required. Run "insighta login" first.\n'),
      );
    } else {
      console.error(
        chalk.red(`\nError: ${err.response?.data?.message || err.message}\n`),
      );
    }
  }
}

export async function deleteProfile(id: string): Promise<void> {
  try {
    const spinner = ora("Deleting profile...").start();
    const response = await makeRequest("DELETE", `${API_BASE}/profiles/${id}`);
    spinner.stop();

    if (response?.status === 200 || response?.status === 204) {
      console.log(chalk.green("\n✓ Profile deleted successfully!\n"));
    } else {
      console.log(chalk.yellow("\nNo content returned from server.\n"));
    }
  } catch (err: any) {
    ora().stop();
    if (err.response?.status === 404) {
      console.error(chalk.red("\nProfile not found.\n"));
    } else if (err.response?.status === 401) {
      console.error(
        chalk.red('\nAuthentication required. Run "insighta login" first.\n'),
      );
    } else if (err.response?.status === 403) {
      console.error(
        chalk.red("\nInsufficient permissions. Admin access required.\n"),
      );
    } else {
      console.error(
        chalk.red(`\nError: ${err.response?.data?.message || err.message}\n`),
      );
    }
  }
}

export async function searchProfiles(query: string): Promise<void> {
  try {
    const url = `${API_BASE}/profiles/search?q=${encodeURIComponent(query)}`;
    const spinner = ora("Searching...").start();
    const response = await makeRequest("GET", url);
    spinner.stop();

     if (response?.data && response.data.data?.length > 0) {
       const tableData = [
         [
           chalk.cyan("ID"),
           chalk.cyan("Name"),
           chalk.cyan("Gender"),
           chalk.cyan("G Prob"),
           chalk.cyan("Age"),
           chalk.cyan("Age Group"),
           chalk.cyan("Country"),
           chalk.cyan("Country Name"),
           chalk.cyan("C Prob"),
           chalk.cyan("Created"),
         ],
         ...(response.data?.data?.map(formatProfileRow) || []),
       ];

      const output = createTable(tableData, {
        columns: {
          0: { width: 38 },
          1: { width: 20 },
          2: { width: 10 },
          3: { width: 8 },
          4: { width: 6 },
          5: { width: 12 },
          6: { width: 8 },
          7: { width: 20 },
          8: { width: 8 },
          9: { width: 12 },
        },
      });

      console.log(`\n${output}\n`);

      if (response.links) {
        const links = [];
        if (response.links.prev) links.push("← Prev");
        if (response.links.next) links.push("Next →");
        if (links.length) {
          console.log(
            chalk.gray(
              `Page ${response.page} of ${response.total_pages} (${response.total} total)\n`,
            ),
          );
        }
      }
    } else {
      console.log(chalk.yellow("\nNo results found.\n"));
    }
  } catch (err: any) {
    ora().stop();
    if (err.response?.status === 400) {
      console.error(
        chalk.yellow(
          '\nUnable to interpret query. Try something like "male adults from Nigeria"\n',
        ),
      );
    } else if (err.response?.status === 401) {
      console.error(
        chalk.red('\nAuthentication required. Run "insighta login" first.\n'),
      );
    } else {
      console.error(
        chalk.red(`\nError: ${err.response?.data?.message || err.message}\n`),
      );
    }
  }
}

export async function createProfile(cmd: Command): Promise<void> {
  try {
    const spinner = ora("Creating profile...").start();
    const response = await makeRequest("POST", `${API_BASE}/profiles`, {
      name: cmd.name,
    });
    spinner.stop();

    if (response?.data && response?.data.data) {
      const p = response?.data?.data;
      console.log(chalk.green("\n✓ Profile created successfully!\n"));
      console.log(chalk.cyan("┌─ New Profile ─────────────────────────────"));
      console.log(chalk.gray(`│  ID:               ${p.id}`));
      console.log(chalk.gray(`│  Name:             ${p.name}`));
      console.log(chalk.gray(`│  Gender:           ${p.gender || "N/A"}`));
      console.log(
        chalk.gray(`│  Gender Prob:      ${p.gender_probability || "N/A"}`),
      );
      console.log(chalk.gray(`│  Age:              ${p.age || "N/A"}`));
      console.log(chalk.gray(`│  Age Group:        ${p.age_group || "N/A"}`));
      console.log(chalk.gray(`│  Country:          ${p.country_id || "N/A"}`));
      console.log(
        chalk.gray(`│  Country Name:     ${p.country_name || "N/A"}`),
      );
      console.log(chalk.gray("└──────────────────────────────────────────\n"));
    }
  } catch (err: any) {
    ora().stop();
    if (err.response?.status === 401) {
      console.error(
        chalk.red('\nAuthentication required. Run "insighta login" first.\n'),
      );
    } else if (err.response?.status === 403) {
      console.error(
        chalk.red("\nInsufficient permissions. Admin access required.\n"),
      );
    } else if (err.response?.status === 422) {
      console.error(
        chalk.yellow(`\nValidation error: ${err.response.data.message}\n`),
      );
    } else {
      console.error(
        chalk.red(`\nError: ${err.response?.data?.message || err.message}\n`),
      );
    }
  }
}

export async function exportProfiles(
  cmd: Command & ExportProfilesOptions,
): Promise<void> {
  try {
    const queryParams = new URLSearchParams();
    queryParams.append("format", cmd.format || "csv");
    if (cmd.gender) queryParams.append("gender", cmd.gender);
    if (cmd.countryId) queryParams.append("country_id", cmd.countryId);
    if (cmd.ageGroup) queryParams.append("age_group", cmd.ageGroup);
    if (cmd.minAge) queryParams.append("min_age", cmd.minAge.toString());
    if (cmd.maxAge) queryParams.append("max_age", cmd.maxAge.toString());

    const url = `${API_BASE}/profiles/export?${queryParams}`;
    const spinner = ora("Exporting profiles...").start();

    const credentials = loadCredentials(true);
    if (!credentials?.accessToken) {
      spinner.stop();
      throw new Error('Not authenticated. Run "insighta login" first.');
    }

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        "X-API-Version": "1",
      },
      responseType: "text",
    });

    spinner.stop();

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .split("T")[0];
    const filename = `profiles_${timestamp}.csv`;

    require("fs").writeFileSync(filename, response.data);

    console.log(chalk.green(`\n✓ Export complete! Saved to: ${filename}\n`));
  } catch (err: any) {
    ora().stop();
    if (err.response?.status === 401) {
      console.error(
        chalk.red('\nAuthentication required. Run "insighta login" first.\n'),
      );
    } else {
      console.error(
        chalk.red(`\nError: ${err.response?.data?.message || err.message}\n`),
      );
    }
  }
}
