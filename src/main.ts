import * as fs from "fs";
import * as path from "path";
import { Alert, Config } from "./types";
import { analyseAllHeartbeats } from "./analyzer";
import { validateAndParseEvents } from "./validator";
import { formatAlerts, formatAlertsAsJson, logValidationStats } from "./utils";

export function detectMissedHeartbeats(
  events: unknown[],
  config: Config,
): Alert[] {
  const { valid } = validateAndParseEvents(events);
  const alerts = analyseAllHeartbeats(valid, config);
  return alerts;
}

function main(): void {
  console.log("Heartbeat Monitor Starting...\n");

  const config: Config = {
    expected_interval_seconds: 60,
    allowed_misses: 3,
  };

  console.log("Configuration:");
  console.log(`Expected interval: ${config.expected_interval_seconds}`);
  console.log(`Allowed Misses: ${config.allowed_misses}`);

  const inputPath = path.join(__dirname, "../data/heartbeats.json");

  try {
    const fileContent = fs.readFileSync(inputPath, "utf-8");
    const events = JSON.parse(fileContent);

    if (!Array.isArray(events)) {
      console.log("Input file must contain an array of events");
      process.exit(1);
    }

    const { valid, invalid } = validateAndParseEvents(events);
    logValidationStats(valid.length, invalid);

    const alerts = analyseAllHeartbeats(valid, config);

    if (alerts.length === 0) {
      console.log("No error found.");
    } else {
      console.log(formatAlerts(alerts));
      console.log("\n" + formatAlertsAsJson(alerts));
    }
  } catch (error) {
    if (error instanceof Error) {
      console.log("error.message");
    } else {
      console.log("unknown Error");
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
