import { detectMissedHeartbeats } from "../src/main";
import { Config } from "../src/types";

describe("Integration Tests - detectMissedHeartbeats", () => {
  const config: Config = {
    expected_interval_seconds: 60,
    allowed_misses: 3,
  };

  test("REQUIRED TEST CASE 1: Working alert case", () => {
    const events = [
      { service: "email", timestamp: "2025-08-04T10:00:00Z" },
      { service: "email", timestamp: "2025-08-04T10:01:00Z" },
      { service: "email", timestamp: "2025-08-04T10:02:00Z" },
      { service: "email", timestamp: "2025-08-04T10:06:00Z" },
    ];

    const alerts = detectMissedHeartbeats(events, config);

    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.service).toBe("email");
    expect(alerts[0]?.alert_at).toBe("2025-08-04T10:03:00.000Z");
  });

  test("REQUIRED TEST CASE 2: Near-miss case (only 2 missed → no alert)", () => {
    const events = [
      { service: "sms", timestamp: "2025-08-04T10:00:00Z" },
      { service: "sms", timestamp: "2025-08-04T10:03:00Z" }, // 180s gap = 2 misses
    ];

    const alerts = detectMissedHeartbeats(events, config);

    expect(alerts).toHaveLength(0);
  });

  test("REQUIRED TEST CASE 3: Unordered input", () => {
    // Events arrive completely out of order
    const events = [
      { service: "push", timestamp: "2025-08-04T10:06:00Z" },
      { service: "push", timestamp: "2025-08-04T10:00:00Z" },
      { service: "push", timestamp: "2025-08-04T10:02:00Z" },
      { service: "push", timestamp: "2025-08-04T10:01:00Z" },
    ];

    const alerts = detectMissedHeartbeats(events, config);

    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.service).toBe("push");
    expect(alerts[0]?.alert_at).toBe("2025-08-04T10:03:00.000Z");
  });

  test("REQUIRED TEST CASE 4: At least 1 malformed event", () => {
    const events = [
      { service: "email" }, // Missing timestamp
      { timestamp: "2025-08-04T10:00:00Z" }, // Missing service
      { service: "email", timestamp: "invalid-date" }, // Invalid timestamp
      { service: "email", timestamp: "2025-08-04T10:00:00Z" }, // Valid
      { service: "email", timestamp: "2025-08-04T10:01:00Z" }, // Valid
      { service: "email", timestamp: "2025-08-04T10:02:00Z" }, // Valid
      { service: "email", timestamp: "2025-08-04T10:06:00Z" }, // Valid
    ];

    const alerts = detectMissedHeartbeats(events, config);

    // Should process only valid events and still detect alert
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.service).toBe("email");
    expect(alerts[0]?.alert_at).toBe("2025-08-04T10:03:00.000Z");
  });

  test("should handle multiple services with mixed results", () => {
    const events = [
      // Email - will alert
      { service: "email", timestamp: "2025-08-04T10:00:00Z" },
      { service: "email", timestamp: "2025-08-04T10:05:00Z" },
      // SMS - no alert (good health)
      { service: "sms", timestamp: "2025-08-04T10:00:00Z" },
      { service: "sms", timestamp: "2025-08-04T10:01:00Z" },
      { service: "sms", timestamp: "2025-08-04T10:02:00Z" },
      // Push - will alert
      { service: "push", timestamp: "2025-08-04T10:00:00Z" },
      { service: "push", timestamp: "2025-08-04T10:04:00Z" },
    ];

    const alerts = detectMissedHeartbeats(events, config);

    expect(alerts).toHaveLength(2);
    expect(alerts.map((a) => a.service).sort()).toEqual(["email", "push"]);
  });

  test("should handle empty events array", () => {
    const alerts = detectMissedHeartbeats([], config);

    expect(alerts).toHaveLength(0);
  });

  test("should handle all malformed events gracefully", () => {
    const events = [
      { service: "email" }, // Missing timestamp
      { timestamp: "2025-08-04T10:00:00Z" }, // Missing service
      null,
      undefined,
      "not an object",
    ];

    const alerts = detectMissedHeartbeats(events, config);

    expect(alerts).toHaveLength(0);
  });

  test("should emit only one alert per service", () => {
    const events = [
      { service: "email", timestamp: "2025-08-04T10:00:00Z" },
      { service: "email", timestamp: "2025-08-04T10:05:00Z" }, // First gap
      { service: "email", timestamp: "2025-08-04T10:10:00Z" }, // Second gap
      { service: "email", timestamp: "2025-08-04T10:15:00Z" }, // Third gap
    ];

    const alerts = detectMissedHeartbeats(events, config);

    // Should only get ONE alert for email
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.service).toBe("email");
    // Alert should be for the FIRST gap
    expect(alerts[0]?.alert_at).toBe("2025-08-04T10:01:00.000Z");
  });

  test("should match example from assignment", () => {
    // Example from assignment description
    const events = [
      { service: "email", timestamp: "2025-08-04T10:00:00Z" },
      { service: "email", timestamp: "2025-08-04T10:01:00Z" },
      { service: "email", timestamp: "2025-08-04T10:02:00Z" },
      { service: "email", timestamp: "2025-08-04T10:06:00Z" },
    ];

    const alerts = detectMissedHeartbeats(events, config);

    expect(alerts).toEqual([
      {
        service: "email",
        alert_at: "2025-08-04T10:03:00.000Z",
      },
    ]);
  });
});
