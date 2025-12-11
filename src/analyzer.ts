import { ParsedHeartbeat, Alert, Config } from './types'


// @param heartbeats - Array of parsed heartbeats for a single service
// @param config Monitoring Config
// @returns Alert object if missed beats detected, null otherwise

export function analyseServiceHeartbeats(
    heartbeats: ParsedHeartbeat[],
    config: Config
): Alert | null {
    // need at least 2 heartbeats to calculate gap
    if (heartbeats.length < 2) {
        return null;
    }

    const sorted = [...heartbeats].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Calculate the threshold in milliseconds
    const thresholdMs = config.expected_interval_seconds * (config.allowed_misses + 1) * 1000;

    for (let i = 0; i < sorted.length - 1; i++) {
        const current = sorted[i];
        const next = sorted[i + 1];

        if (!current || !next) {
            continue;
        }

        const gapMs = next.timestamp.getTime() - current.timestamp.getTime();

        if (gapMs >= thresholdMs) {
            // Calculate alert timestamp: current + one expected_interval_seconds
            // this gives us time of the FIRST missed heartbeat
            const alertTimestamp = new Date(
                current.timestamp.getTime() + config.expected_interval_seconds * 1000
            );

            return {
                service: current.service,
                alert_at: alertTimestamp.toISOString(),
            };
        }
    }
    return null;
}


export function groupHeartbeatsByService(
    heartbeats: ParsedHeartbeat[]
): Map<string, ParsedHeartbeat[]> {
    const grouped = new Map<string, ParsedHeartbeat[]>();

    for (const heartbeat of heartbeats) {
        const existing = grouped.get(heartbeat.service) || [];
        existing.push(heartbeat);
        grouped.set(heartbeat.service, existing);
    }

    return grouped;
}

export function analyseAllHeartbeats(
    heartbeats: ParsedHeartbeat[],
    config: Config
): Alert[] {
    const groupedByService = groupHeartbeatsByService(heartbeats);
    const alerts: Alert[] = [];

    for (const [_service, serviceHeartbeats] of groupedByService) {
        const alert = analyseServiceHeartbeats(serviceHeartbeats, config);

        if (alert) {
            alerts.push(alert);
        }
    }
    return alerts

}
