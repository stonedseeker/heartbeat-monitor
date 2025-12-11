import { Alert } from './types';

export function formatAlerts(alerts: Alert[]): string {
    if (alerts.length === 0) {
        return 'No alerts detected';
    }

    const lines = alerts.map(
        (alert) => ` Service: ${alert.service} -> Alert at: ${alert.alert_at}`
    );

    return `Found ${alerts.length} alert(s):\n${lines.join('\n')}`
}

export function formatAlertsAsJson(alerts: Alert[]): string {
    return JSON.stringify(alerts, null, 2);
}

export function logValidationStats(valid: number, invalid: number): void {
    console.log(`\n Validation Statistics:`);
    console.log(` Valid events: ${valid}`);
    console.log(`Invalid events (skipped): ${invalid}`);
    console.log(` Total events: ${valid + invalid}`);
}
