# Performance Tests

This directory contains performance and load tests for the API.

## Setup

### Option 1: k6 (Recommended)

Install k6:
```bash
# macOS
brew install k6

# Linux
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6
```

### Option 2: Artillery

Install Artillery:
```bash
npm install -g artillery
```

## Running Tests

### k6 Tests

```bash
# Run a specific test
k6 run load/auth-load-test.js

# Run with custom VUs (Virtual Users)
k6 run --vus 10 --duration 30s load/auth-load-test.js
```

### Artillery Tests

```bash
# Run a specific test
artillery run load/auth-load-test.yml

# Run with custom config
artillery run --config config.json load/auth-load-test.yml
```

## Test Structure

- `load/` - Load tests (k6 scripts or Artillery configs)
- `benchmark/` - Benchmark tests for specific operations
- `stress/` - Stress tests for breaking points

## Writing Tests

### k6 Example

```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  const res = http.get('http://localhost:3001/api/v1/health');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

### Artillery Example

```yaml
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: 'Health check'
    flow:
      - get:
          url: '/api/v1/health'
```

