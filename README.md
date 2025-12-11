# Heartbeat Monitor

A TypeScript-based heartbeat monitoring system that detects when services miss consecutive expected heartbeats and triggers alerts accordingly.

## Overview

This system processes heartbeat events from multiple services and triggers alerts when a service misses a specified number of consecutive heartbeats based on a configured interval.

## Features

-  Detects missed heartbeats based on configurable intervals
-  Handles unordered events (sorts chronologically per service)
-  Gracefully handles malformed events without crashing
-  Type-safe implementation with TypeScript
-  Comprehensive test coverage (30 tests)
-  Returns at most one alert per service

## Quick Start

### Installation
```bash
npm install
```

### Running the Monitor
```bash
# Build the TypeScript code
npm run build

# Run the monitor with sample data
npm start
```

The monitor will read heartbeat events from `data/heartbeats.json` and output detected alerts.

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Configuration

The system accepts two parameters:

- **`expected_interval_seconds`**: Time between expected heartbeats (default: 60 seconds)
- **`allowed_misses`**: Number of consecutive misses before alerting (default: 3)

These can be modified in `src/main.ts`:
```typescript
const config: Config = {
  expected_interval_seconds: 60,
  allowed_misses: 3,
};
```

## How It Works

### 1. Definition of "3 Missed Heartbeats"

A service is considered to have missed 3 consecutive heartbeats when:

**The time gap between two consecutive received heartbeats is ≥ `expected_interval_seconds × (allowed_misses + 1)`**

**Example:**
- Configuration: `interval = 60s`, `allowed_misses = 3`
- Threshold: `60 × (3 + 1) = 240 seconds`
- Heartbeats received: `10:00`, `10:01`, `10:02`, `10:06`
- Gap between `10:02` and `10:06`: `240 seconds`
- **Result**: 3 heartbeats were missed (`10:03`, `10:04`, `10:05`)

**Why this formula?**
- If we expect heartbeats every 60 seconds but receive one at `10:02` and the next at `10:06`:
  - Expected: `10:03`, `10:04`, `10:05`
  - Missing: 3 heartbeats
  - Gap: 4 intervals = `(allowed_misses + 1)` intervals

### 2. Handling Unordered Events

**Problem**: Heartbeat events may arrive out of chronological order due to network delays, processing variations, or logging systems.

**Solution**: 
1. **Group by service**: First, we separate heartbeats by service name
2. **Sort chronologically**: Within each service, we sort heartbeats by timestamp in ascending order (oldest first)
3. **Analyze in order**: Gap detection is performed on the sorted timeline

**Example:**
```typescript
// Input (unordered)
[
  { service: 'push', timestamp: '10:06:00Z' },
  { service: 'push', timestamp: '10:00:00Z' },
  { service: 'push', timestamp: '10:02:00Z' },
  { service: 'push', timestamp: '10:01:00Z' }
]

// After sorting
[
  { service: 'push', timestamp: '10:00:00Z' },
  { service: 'push', timestamp: '10:01:00Z' },
  { service: 'push', timestamp: '10:02:00Z' },
  { service: 'push', timestamp: '10:06:00Z' }
]

// Now gap detection works correctly
```

This ensures that regardless of arrival order, we always analyze the actual temporal sequence of heartbeats.

### 3. Handling Malformed Events

**Problem**: Input data may contain invalid or incomplete events that should not crash the system.

**Solution**: Multi-layer validation with graceful degradation

**Validation Steps:**

1. **Type Guard**: Check if event is an object with required fields
```typescript
   if (!event || typeof event !== 'object') → skip
   if (!('service' in event) || !('timestamp' in event)) → skip
```

2. **Service Validation**: Ensure service name is a non-empty string
```typescript
   if (typeof service !== 'string') → skip
   if (service.trim().length === 0) → skip
```

3. **Timestamp Parsing**: Safely parse ISO 8601 timestamps
```typescript
   try {
     const date = new Date(timestamp);
     if (isNaN(date.getTime())) → skip
   } catch {
     → skip
   }
```

**Examples of Malformed Events (all handled gracefully):**
- `{ "service": "email" }` → Missing timestamp
- `{ "timestamp": "2025-08-04T10:00:00Z" }` → Missing service
- `{ "service": "email", "timestamp": "not-a-date" }` → Invalid timestamp
- `{ "service": "", "timestamp": "2025-08-04T10:00:00Z" }` → Empty service name
- `null`, `undefined`, `"string"`, `123` → Invalid types

**Result**: The system tracks invalid events but continues processing valid ones without interruption.

## Algorithm

### High-Level Flow
```
1. Read events from JSON file
2. Validate & parse each event
   ├─ Valid → Add to parsed array
   └─ Invalid → Increment skip counter
3. Group parsed events by service name
4. For each service:
   ├─ Sort heartbeats chronologically
   ├─ Iterate through consecutive pairs
   ├─ Calculate gap between timestamps
   ├─ If gap ≥ threshold:
   │   ├─ Calculate alert_at = first_timestamp + interval
   │   └─ Return alert (first occurrence only)
   └─ Continue to next service
5. Output all alerts as JSON
```

### Gap Detection Algorithm
```typescript
threshold = interval × (allowed_misses + 1)

for each consecutive pair (current, next):
  gap = next.timestamp - current.timestamp
  
  if gap ≥ threshold:
    alert_at = current.timestamp + interval
    return alert  // Only first alert per service
```

## Project Structure
```
heartbeat-monitor/
├── src/
│   ├── main.ts          # Entry point & CLI
│   ├── types.ts         # TypeScript type definitions
│   ├── validator.ts     # Event validation & parsing
│   ├── analyzer.ts      # Gap detection algorithm
│   └── utils.ts         # Helper functions (formatting, logging)
├── tests/
│   ├── main.test.ts       # Integration tests (required test cases)
│   ├── validator.test.ts  # Validation logic tests
│   └── analyzer.test.ts   # Gap detection tests
├── data/
│   └── heartbeats.json  # Input data
├── dist/                # Compiled JavaScript (generated)
├── package.json         # Dependencies & scripts
├── tsconfig.json        # TypeScript configuration
├── jest.config.js       # Test configuration
└── README.md            # This file
```

## Input Format

The system expects a JSON array of heartbeat events:
```json
[
  {
    "service": "email",
    "timestamp": "2025-08-04T10:00:00Z"
  },
  {
    "service": "sms",
    "timestamp": "2025-08-04T10:01:00Z"
  }
]
```

**Fields:**
- `service` (string, required): Name of the service
- `timestamp` (string, required): ISO 8601 formatted timestamp

## Output Format

The system outputs a JSON array of alerts:
```json
[
  {
    "service": "email",
    "alert_at": "2025-08-04T10:03:00.000Z"
  }
]
```

**Fields:**
- `service` (string): Name of the service with missed heartbeats
- `alert_at` (string): ISO 8601 timestamp of the **first** missed heartbeat

**Important Notes:**
- At most **one alert per service** is returned
- `alert_at` is the time of the **first** missed beat, not the last
- Alerts are only based on events in the input (no prediction beyond last event)

## Test Coverage

The test suite includes all required test cases:

### Required Test Cases (Assignment Specification)

1. ** Working Alert Case** - Service misses 3+ heartbeats
2. ** Near-Miss Case** - Service misses only 2 heartbeats (no alert)
3. ** Unordered Input** - Events arrive out of chronological order
4. ** Malformed Events** - Invalid/incomplete events are handled gracefully

### Additional Test Cases

5. Edge cases (empty input, single heartbeat, all malformed)
6. Multiple services with mixed results
7. Exact threshold boundary testing
8. Multiple gaps (only first alert emitted)
9. Service grouping correctness

**Total: 30 tests, all passing **

### Running Specific Tests
```bash
# Run specific test file
npm test -- validator.test.ts
npm test -- analyzer.test.ts
npm test -- main.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="REQUIRED"
```

## Example Usage

### Example 1: Basic Detection

**Input:**
```json
[
  { "service": "email", "timestamp": "2025-08-04T10:00:00Z" },
  { "service": "email", "timestamp": "2025-08-04T10:01:00Z" },
  { "service": "email", "timestamp": "2025-08-04T10:02:00Z" },
  { "service": "email", "timestamp": "2025-08-04T10:06:00Z" }
]
```

**Output:**
```json
[
  {
    "service": "email",
    "alert_at": "2025-08-04T10:03:00.000Z"
  }
]
```

**Explanation:** Gap from `10:02` to `10:06` is 240 seconds (4 intervals), indicating 3 missed heartbeats at `10:03`, `10:04`, `10:05`.

### Example 2: Near Miss (No Alert)

**Input:**
```json
[
  { "service": "sms", "timestamp": "2025-08-04T10:00:00Z" },
  { "service": "sms", "timestamp": "2025-08-04T10:03:00Z" }
]
```

**Output:**
```json
[]
```

**Explanation:** Gap is 180 seconds (3 intervals), indicating only 2 missed heartbeats. Threshold requires ≥240 seconds.

### Example 3: Multiple Services

**Input:**
```json
[
  { "service": "email", "timestamp": "2025-08-04T10:00:00Z" },
  { "service": "email", "timestamp": "2025-08-04T10:05:00Z" },
  { "service": "sms", "timestamp": "2025-08-04T10:00:00Z" },
  { "service": "sms", "timestamp": "2025-08-04T10:01:00Z" }
]
```

**Output:**
```json
[
  {
    "service": "email",
    "alert_at": "2025-08-04T10:01:00.000Z"
  }
]
```

**Explanation:** Email service has a 300-second gap (5 intervals), triggering an alert. SMS service is healthy.

## Development

### Available Scripts
```bash
npm run build        # Compile TypeScript to JavaScript
npm start           # Run the compiled application
npm run dev         # Run with ts-node (no compilation needed)
npm test            # Run all tests
npm run test:watch  # Run tests in watch mode
npm run test:coverage  # Generate coverage report
npm run clean       # Remove dist/ directory
```

### Adding New Features

1. Update types in `src/types.ts`
2. Implement logic in appropriate module
3. Add tests in `tests/`
4. Run `npm test` to verify
5. Update README if needed

## Design Decisions

### Why TypeScript?

- **Type Safety**: Catch errors at compile time
- **Better IDE Support**: Auto-completion and inline documentation
- **Maintainability**: Self-documenting code through types
- **Refactoring**: Easier to modify with confidence

### Why Functional Style?

- **Testability**: Pure functions are easier to test
- **Readability**: Clear data transformations
- **Predictability**: No side effects in core logic

### Why Minimal Dependencies?

- **Simplicity**: Easy to understand and maintain
- **Security**: Fewer attack vectors
- **Performance**: Less overhead
- **Setup**: Quick installation


## Limitations & Assumptions

1. **No real-time streaming**: Processes batch of events, not live stream
2. **No state persistence**: Each run is independent
3. **No alerting mechanism**: Only detects and outputs alerts (doesn't send notifications)
4. **ISO 8601 timestamps**: Expects standard ISO format
5. **Single configuration**: Same interval/threshold for all services
6. **No time zones**: All timestamps treated as UTC

## Future Enhancements

- [ ] Per-service configuration (different intervals per service)
- [ ] Real-time streaming support
- [ ] Alert notification integration (email, Slack, PagerDuty)
- [ ] Web dashboard for visualization
- [ ] Historical trend analysis
- [ ] Configurable alert severity levels
- [ ] Multiple threshold levels

## Troubleshooting

### Build Errors
```bash
# Clean and rebuild
npm run clean
npm install
npm run build
```

### Test Failures
```bash
# Run tests with verbose output
npm test -- --verbose

**Assignment Completion Checklist:**

-  Implements heartbeat monitoring system
-  Sorts events per service chronologically
-  Detects 3 consecutive missed heartbeats
-  Returns correct alert timestamp (first missed beat)
-  Handles malformed events gracefully
-  Returns at most one alert per service
-  Includes all required test cases
-  Easy to setup and run
-  Clear documentation
-  TypeScript with full type safety
