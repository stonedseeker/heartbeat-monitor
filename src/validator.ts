import { HeartbeatEvent, ParsedHeartbeat, ValidationResult } from "./types";

function hasRequiredFields(event: unknown): event is HeartbeatEvent {
  return (
    typeof event == "object" &&
    event !== null &&
    "service" in event &&
    "timestamp" in event
  );
}

function isValidService(service: unknown): service is string {
  return typeof service === "string" && service.trim().length > 0;
}

function parseTimestamp(timestamp: unknown): Date | null {
  if (typeof timestamp !== "string") {
    return null;
  }

  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return null;
    }

    return date;
  } catch {
    return null;
  }
}

function parseEvent(event: unknown): ParsedHeartbeat | null {
  if (!hasRequiredFields(event)) {
    return null;
  }

  if (!isValidService(event.service)) {
    return null;
  }

  const timestamp = parseTimestamp(event.timestamp);
  if (!timestamp) {
    return null;
  }
  return {
    service: event.service.trim(),
    timestamp,
  };
}

export function validateAndParseEvents(events: unknown[]): ValidationResult {
  const valid: ParsedHeartbeat[] = [];
  let invalid = 0;

  for (const event of events) {
    const parsed = parseEvent(event);

    if (parsed) {
      valid.push(parsed);
    } else {
      invalid++;
    }
  }
  return { valid, invalid };
}
