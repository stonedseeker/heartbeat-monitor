import {
  analyseServiceHeartbeats,
  groupHeartbeatsByService,
  analyseAllHeartbeats,
} from "../src/analyzer";
import { ParsedHeartbeat, Config } from "../src/types";

describe("Analyzer - Gap Detection", () => {
  const config: Config = {
    expected_interval_seconds: 60,
    allowed_misses: 3,
  };

  describe("analyseServiceHeartbeats", () => {
    test("REQUIRED: should trigger alert for working alert case", () => {
      // Email service: 10:00, 10:01, 10:02, 10:06
      // Gap from 10:02 → 10:06 = 240s (4 × 60s = 3 missed)
      const heartbeats: ParsedHeartbeat[] = [
        { service: "email", timestamp: new Date("2025-08-04T10:00:00Z") },
        { service: "email", timestamp: new Date("2025-08-04T10:01:00Z") },
        { service: "email", timestamp: new Date("2025-08-04T10:02:00Z") },
        { service: "email", timestamp: new Date("2025-08-04T10:06:00Z") },
      ];

      const alert = analyseServiceHeartbeats(heartbeats, config);

      expect(alert).not.toBeNull();
      expect(alert?.service).toBe("email");
      expect(alert?.alert_at).toBe("2025-08-04T10:03:00.000Z");
    });

    test("REQUIRED: should NOT trigger alert for near-miss case (only 2 missed)", () => {
      // Gap of 180s = 3 × 60s = only 2 missed heartbeats
      // Threshold is 240s (4 × 60s) for 3 misses
      const heartbeats: ParsedHeartbeat[] = [
        { service: "sms", timestamp: new Date("2025-08-04T10:00:00Z") },
        { service: "sms", timestamp: new Date("2025-08-04T10:03:00Z") }, // 180s gap
      ];

      const alert = analyseServiceHeartbeats(heartbeats, config);

      expect(alert).toBeNull();
    });

    test("REQUIRED: should handle unordered input correctly", () => {
      // Events arrive out of order - should still detect correctly
      const heartbeats: ParsedHeartbeat[] = [
        { service: "push", timestamp: new Date("2025-08-04T10:06:00Z") }, // Out of order
        { service: "push", timestamp: new Date("2025-08-04T10:00:00Z") },
        { service: "push", timestamp: new Date("2025-08-04T10:02:00Z") },
        { service: "push", timestamp: new Date("2025-08-04T10:01:00Z") }, // Out of order
      ];

      const alert = analyseServiceHeartbeats(heartbeats, config);

      expect(alert).not.toBeNull();
      expect(alert?.service).toBe("push");
      expect(alert?.alert_at).toBe("2025-08-04T10:03:00.000Z");
    });

    test("should return null when less than 2 heartbeats", () => {
      const heartbeats: ParsedHeartbeat[] = [
        { service: "email", timestamp: new Date("2025-08-04T10:00:00Z") },
      ];

      const alert = analyseServiceHeartbeats(heartbeats, config);

      expect(alert).toBeNull();
    });

    test("should return null when no gaps exceed threshold", () => {
      // All heartbeats within expected interval
      const heartbeats: ParsedHeartbeat[] = [
        { service: "email", timestamp: new Date("2025-08-04T10:00:00Z") },
        { service: "email", timestamp: new Date("2025-08-04T10:01:00Z") },
        { service: "email", timestamp: new Date("2025-08-04T10:02:00Z") },
        { service: "email", timestamp: new Date("2025-08-04T10:03:00Z") },
      ];

      const alert = analyseServiceHeartbeats(heartbeats, config);

      expect(alert).toBeNull();
    });

    test("should detect alert at exact threshold (gap = 240s)", () => {
      // Gap exactly equals threshold
      const heartbeats: ParsedHeartbeat[] = [
        { service: "test", timestamp: new Date("2025-08-04T10:00:00Z") },
        { service: "test", timestamp: new Date("2025-08-04T10:04:00Z") }, // Exactly 240s
      ];

      const alert = analyseServiceHeartbeats(heartbeats, config);

      expect(alert).not.toBeNull();
      expect(alert?.alert_at).toBe("2025-08-04T10:01:00.000Z");
    });

    test("should only return first alert for service with multiple gaps", () => {
      // Two gaps that would trigger alerts - should only return first
      const heartbeats: ParsedHeartbeat[] = [
        { service: "email", timestamp: new Date("2025-08-04T10:00:00Z") },
        { service: "email", timestamp: new Date("2025-08-04T10:05:00Z") }, // First gap: 300s
        { service: "email", timestamp: new Date("2025-08-04T10:10:00Z") }, // Second gap: 300s
      ];

      const alert = analyseServiceHeartbeats(heartbeats, config);

      expect(alert).not.toBeNull();
      // Should be first missed beat from first gap
      expect(alert?.alert_at).toBe("2025-08-04T10:01:00.000Z");
    });
  });

  describe("groupHeartbeatsByService", () => {
    test("should group heartbeats by service name", () => {
      const heartbeats: ParsedHeartbeat[] = [
        { service: "email", timestamp: new Date("2025-08-04T10:00:00Z") },
        { service: "sms", timestamp: new Date("2025-08-04T10:00:00Z") },
        { service: "email", timestamp: new Date("2025-08-04T10:01:00Z") },
        { service: "push", timestamp: new Date("2025-08-04T10:00:00Z") },
      ];

      const grouped = groupHeartbeatsByService(heartbeats);

      expect(grouped.size).toBe(3);
      expect(grouped.get("email")).toHaveLength(2);
      expect(grouped.get("sms")).toHaveLength(1);
      expect(grouped.get("push")).toHaveLength(1);
    });

    test("should handle empty array", () => {
      const grouped = groupHeartbeatsByService([]);

      expect(grouped.size).toBe(0);
    });
  });

  describe("analyseAllHeartbeats", () => {
    test("should analyze multiple services and return all alerts", () => {
      const heartbeats: ParsedHeartbeat[] = [
        // Email service - will trigger alert
        { service: "email", timestamp: new Date("2025-08-04T10:00:00Z") },
        { service: "email", timestamp: new Date("2025-08-04T10:01:00Z") },
        { service: "email", timestamp: new Date("2025-08-04T10:02:00Z") },
        { service: "email", timestamp: new Date("2025-08-04T10:06:00Z") },
        // SMS service - no alert (within threshold)
        { service: "sms", timestamp: new Date("2025-08-04T10:00:00Z") },
        { service: "sms", timestamp: new Date("2025-08-04T10:01:00Z") },
        { service: "sms", timestamp: new Date("2025-08-04T10:02:00Z") },
        // Push service - will trigger alert
        { service: "push", timestamp: new Date("2025-08-04T10:00:00Z") },
        { service: "push", timestamp: new Date("2025-08-04T10:05:00Z") },
      ];

      const alerts = analyseAllHeartbeats(heartbeats, config);

      expect(alerts).toHaveLength(2);

      const emailAlert = alerts.find((a) => a.service === "email");
      const pushAlert = alerts.find((a) => a.service === "push");

      expect(emailAlert).toBeDefined();
      expect(pushAlert).toBeDefined();
      expect(alerts.find((a) => a.service === "sms")).toBeUndefined();
    });

    test("should return empty array when no alerts", () => {
      const heartbeats: ParsedHeartbeat[] = [
        { service: "email", timestamp: new Date("2025-08-04T10:00:00Z") },
        { service: "email", timestamp: new Date("2025-08-04T10:01:00Z") },
      ];

      const alerts = analyseAllHeartbeats(heartbeats, config);

      expect(alerts).toHaveLength(0);
    });

    test("should handle empty input", () => {
      const alerts = analyseAllHeartbeats([], config);

      expect(alerts).toHaveLength(0);
    });
  });
});
