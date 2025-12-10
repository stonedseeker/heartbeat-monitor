//Configuration for heartbeat monitoring

export interface Config {
    expected_interval_seconds: number; // expected time between heartbeats in seconds
    allowed_misses: number; // allowed consequtive misses before alert
}

export interface HeartbeatEvent {
    service?: string;
    timestamp?: string;
}

export interface ParsedHeartbeat {
    service: string;
    timestamp: Date;
}

export interface Alert {
    service: string;
    alert_at: string;
}

export interface ValidationResult {
    valid: ParsedHeartbeat[];
    invalid: number;
}
