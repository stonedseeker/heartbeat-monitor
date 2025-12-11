import { validateAndParseEvents } from "../src/validator";
import { HeartbeatEvent } from "../src/types";

describe("Event Validator", () => {
  describe("Valid Events", () => {
    test("should parse valid heartbeat events", () => {
      const events: HeartbeatEvent[] = [
        { service: "email", timestamp: "2025-08-04T10:00:00Z" },
        { service: "sms", timestamp: "2025-08-04T10:01:00Z" },
      ];

      const result = validateAndParseEvents(events);

      expect(result.valid).toHaveLength(2);
      expect(result.invalid).toBe(0);
      expect(result.valid[0]?.service).toBe("email");
      expect(result.valid[0]?.timestamp).toBeInstanceOf(Date);
    });

    test("should trim whitespace from service names", () => {
      const events = [
        { service: "  email  ", timestamp: "2025-08-04T10:00:00Z" },
      ];

      const result = validateAndParseEvents(events);

      expect(result.valid).toHaveLength(1);
      expect(result.valid[0]?.service).toBe("email");
    });
  });

  describe("Malformed Events", () => {
    test("should skip events with missing timestamp", () => {
      const events = [
        { service: "email" }, // Missing timestamp
        { service: "sms", timestamp: "2025-08-04T10:00:00Z" }, // Valid
      ];

      const result = validateAndParseEvents(events);

      expect(result.valid).toHaveLength(1);
      expect(result.invalid).toBe(1);
      expect(result.valid[0]?.service).toBe("sms");
    });

    test("should skip events with missing service", () => {
      const events = [
        { timestamp: "2025-08-04T10:00:00Z" }, // Missing service
        { service: "email", timestamp: "2025-08-04T10:00:00Z" }, // Valid
      ];

      const result = validateAndParseEvents(events);

      expect(result.valid).toHaveLength(1);
      expect(result.invalid).toBe(1);
    });

    test("should skip events with invalid timestamp format", () => {
      const events = [
        { service: "email", timestamp: "not-a-real-timestamp" },
        { service: "sms", timestamp: "2025-08-04T10:00:00Z" }, // Valid
      ];

      const result = validateAndParseEvents(events);

      expect(result.valid).toHaveLength(1);
      expect(result.invalid).toBe(1);
    });

    test("should skip events with empty service name", () => {
      const events = [
        { service: "", timestamp: "2025-08-04T10:00:00Z" },
        { service: "   ", timestamp: "2025-08-04T10:00:00Z" }, // Whitespace only
        { service: "email", timestamp: "2025-08-04T10:00:00Z" }, // Valid
      ];

      const result = validateAndParseEvents(events);

      expect(result.valid).toHaveLength(1);
      expect(result.invalid).toBe(2);
    });

    test("should skip completely malformed objects", () => {
      const events = [
        null,
        undefined,
        "string",
        123,
        { randomField: "value" },
        { service: "email", timestamp: "2025-08-04T10:00:00Z" }, // Valid
      ];

      const result = validateAndParseEvents(events);

      expect(result.valid).toHaveLength(1);
      expect(result.invalid).toBe(5);
    });
  });

  describe("Edge Cases", () => {
    test("should handle empty array", () => {
      const result = validateAndParseEvents([]);

      expect(result.valid).toHaveLength(0);
      expect(result.invalid).toBe(0);
    });

    test("should handle all invalid events", () => {
      const events = [
        { service: "email" }, // Missing timestamp
        { timestamp: "2025-08-04T10:00:00Z" }, // Missing service
        null,
      ];

      const result = validateAndParseEvents(events);

      expect(result.valid).toHaveLength(0);
      expect(result.invalid).toBe(3);
    });
  });
});
