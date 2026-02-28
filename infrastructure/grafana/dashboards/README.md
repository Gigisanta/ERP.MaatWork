# Grafana Dashboards for MAATWORK

This directory contains Grafana dashboard configurations for monitoring the MAATWORK API and infrastructure.

## Dashboard Overview

### 1. **API HTTP Performance** (`api-http-performance.json`)
**UID:** `maatwork-api-http`

Monitors HTTP request metrics including:
- Request rate by method and route
- Request duration (p95/p99 percentiles)
- Error rate tracking
- Error breakdown by status code and route
- Request distribution by status code
- Active connections

**Key Metrics:**
- `http_request_duration_seconds` - Request latency histogram
- `http_requests_total` - Request counter by method/route/status
- `http_errors_total` - Error counter by method/route/status
- `active_connections` - Current active connections

**Alert Thresholds:**
- P99 latency > 1s (yellow), > 5s (red)
- Error rate > 10 reqps (yellow), > 50 reqps (red)
- Active connections > 50 (yellow), > 100 (red)

---

### 2. **API Cache Performance** (`api-cache-performance.json`)
**UID:** `maatwork-api-cache`

Monitors Redis caching effectiveness:
- Overall cache hit rate
- Cache hits/misses by type
- Cache hit rate trends by cache type
- Cache memory usage by type
- Cache key count by type
- Cache operations rate

**Cache Types Tracked:**
- `pipeline` - Pipeline metrics cache
- `instruments` - Financial instruments cache
- `benchmarks` - Benchmark data cache
- `lookupTables` - Lookup tables cache
- `benchmarkComponents` - Benchmark components cache
- `contactsList` - Contacts list cache
- `teamMetrics` - Team metrics cache
- `portfolioAssignments` - Portfolio assignments cache
- `aumAggregations` - AUM aggregations cache
- `pipelineMetrics` - Pipeline metrics cache
- `taskStatistics` - Task statistics cache
- `dashboardKpis` - Dashboard KPIs cache

**Key Metrics:**
- `cache_hits_total` - Cache hit counter by type
- `cache_misses_total` - Cache miss counter by type
- `cache_size_bytes` - Estimated cache memory size
- `cache_key_count` - Number of keys in cache

**Alert Thresholds:**
- Overall hit rate < 50% (red), < 80% (yellow)
- Individual cache size > 10MB (yellow), > 100MB (red)
- Key count > 1000 (yellow), > 10000 (red)

---

### 3. **API Database Performance** (`api-database-performance.json`)
**UID:** `maatwork-api-database`

Monitors PostgreSQL query performance:
- Query rate by operation and table
- Query duration (p95/p99 percentiles)
- Query distribution by table and operation
- Total query rate
- Top 10 tables by query rate
- Slow query detection (>100ms p99)

**Key Metrics:**
- `db_query_duration_seconds` - Query latency histogram
- `db_queries_total` - Query counter by operation/table

**Alert Thresholds:**
- P99 query latency > 100ms (yellow), > 500ms (red)
- Total query rate > 100 qps (yellow), > 500 qps (red)

---

### 4. **API Memory & System Resources** (`api-memory-system.json`)
**UID:** `maatwork-api-memory`

Monitors Node.js memory usage:
- Heap used vs heap total memory
- RSS and external memory
- Heap memory utilization percentage
- Memory usage breakdown
- Cache memory usage by type
- Memory statistics table

**Key Metrics:**
- `nodejs_heap_used_bytes` - Heap used memory
- `nodejs_heap_total_bytes` - Heap total memory
- `nodejs_external_memory_bytes` - External memory (C++ objects)
- `nodejs_rss_bytes` - Resident set size
- `memory_usage_bytes` - Memory usage by type
- `cache_size_bytes` - Cache memory usage

**Alert Thresholds:**
- Heap used > 512MB (yellow), > 1GB (red)
- RSS > 1GB (yellow), > 2GB (red)
- Heap utilization > 60% (yellow), > 80% (red)
- Individual cache size > 10MB (yellow), > 100MB (red)

---

## Installation

### Prerequisites

1. **Prometheus** - Metrics collection and storage
2. **Grafana** - Visualization and alerting
3. **MAATWORK API** - Exposes metrics at `/metrics` endpoint

### Step 1: Configure Prometheus

Add the MAATWORK API to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'maatwork-api'
    scrape_interval: 5s
    metrics_path: '/metrics'
    static_configs:
      - targets: ['localhost:3001']
        labels:
          app: 'maatwork-api'
          environment: 'production'
```

### Step 2: Import Dashboards to Grafana

1. Navigate to **Dashboards → Import** in Grafana
2. Upload each JSON file from this directory
3. Select your Prometheus data source
4. Click **Import**

Alternatively, use the Grafana API:

```bash
# Import all dashboards
for dashboard in infrastructure/grafana/dashboards/*.json; do
  curl -X POST \
    http://localhost:3000/api/dashboards/db \
    -H "Content-Type: application/json" \
    -u admin:admin \
    -d @$dashboard
done
```

### Step 3: Verify Dashboards

1. Check that all dashboards load correctly
2. Verify metrics are being scraped by Prometheus
3. Confirm visualizations show data

---

## Metrics Endpoint

The MAATWORK API exposes Prometheus-compatible metrics at:

```
GET http://localhost:3001/metrics
```

Also available in JSON format:

```
GET http://localhost:3001/metrics/json
```

---

## Alerting

### Recommended Alert Rules

Create these alerts in Prometheus or Grafana:

```yaml
groups:
  - name: maatwork_api_alerts
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: sum(rate(http_errors_total[5m])) > 50
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High HTTP error rate detected"
          description: "Error rate is {{ $value }} reqps"

      # Slow response time
      - alert: SlowResponseTime
        expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "API response times are slow"
          description: "P99 latency is {{ $value }}s"

      # Low cache hit rate
      - alert: LowCacheHitRate
        expr: sum(rate(cache_hits_total[5m])) / (sum(rate(cache_hits_total[5m])) + sum(rate(cache_misses_total[5m]))) < 0.5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Cache hit rate is below 50%"
          description: "Current hit rate is {{ $value | humanizePercentage }}"

      # High memory usage
      - alert: HighMemoryUsage
        expr: nodejs_heap_used_bytes / nodejs_heap_total_bytes > 0.8
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Heap memory usage is high"
          description: "Heap utilization is {{ $value | humanizePercentage }}"

      # Slow database queries
      - alert: SlowDatabaseQueries
        expr: histogram_quantile(0.99, rate(db_query_duration_seconds_bucket[5m])) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Database queries are slow"
          description: "P99 query latency is {{ $value }}s"

      # High connection count
      - alert: HighConnectionCount
        expr: active_connections > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High number of active connections"
          description: "Active connections: {{ $value }}"
```

---

## Dashboard Refresh Rates

- **Auto-refresh:** 5 seconds (configured in each dashboard)
- **Prometheus scrape interval:** 5 seconds
- **Metrics update frequency:**
  - HTTP request metrics: Real-time (per request)
  - Cache metrics: Real-time (per cache operation)
  - Database metrics: Real-time (per query)
  - Memory metrics: Every 30 seconds (background job)

---

## Customization

### Adjusting Time Ranges

Change the default time range in each dashboard JSON:

```json
"time": {
  "from": "now-1h",
  "to": "now"
}
```

Common presets:
- `now-5m` - Last 5 minutes
- `now-1h` - Last hour
- `now-6h` - Last 6 hours
- `now-24h` - Last 24 hours
- `now-7d` - Last 7 days

### Adjusting Thresholds

Modify thresholds in the `fieldConfig.thresholds` section of each panel.

Example for HTTP latency:
```json
"thresholds": {
  "mode": "absolute",
  "steps": [
    {"color": "green", "value": null},
    {"color": "yellow", "value": 0.5},  // Change to 0.3 for stricter threshold
    {"color": "red", "value": 1}
  ]
}
```

### Adding Custom Panels

Use the Grafana UI to add custom panels, then export the updated dashboard JSON.

---

## Troubleshooting

### No Data Showing

1. **Verify Prometheus scraping:**
   ```bash
   curl http://localhost:9090/api/v1/targets
   ```

2. **Check metrics endpoint:**
   ```bash
   curl http://localhost:3001/metrics
   ```

3. **Verify Prometheus configuration:**
   - Check `prometheus.yml` includes MAATWORK target
   - Ensure job name matches dashboard queries
   - Confirm metrics path is `/metrics`

### Inconsistent Data

1. Check time synchronization between API and Grafana server
2. Verify scrape interval matches dashboard refresh rate
3. Check for multiple API instances (might cause data gaps)

### High Memory Alerts

1. Review cache usage in Cache Performance dashboard
2. Check for memory leaks in Memory & System Resources dashboard
3. Consider adjusting cache TTLs in `apps/api/src/config/redis.ts`
4. Verify connection pool settings in database configuration

---

## Performance Considerations

### Recommended Prometheus Retention

For production:

```yaml
# prometheus.yml
global:
  scrape_interval: 5s
  evaluation_interval: 5s

# Storage configuration
storage:
  tsdb:
    retention.time: 15d
    retention.size: 50GB
```

### Grafana Performance Tips

1. Limit dashboard panels to < 20 per dashboard
2. Use variable time ranges for longer periods
3. Enable query caching in Grafana
4. Consider downsampling for long-term retention

---

## Related Documentation

- [MAATWORK Architecture](../../../docs/ARCHITECTURE.md)
- [MAATWORK Operations](../../../docs/OPERATIONS.md)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)

---

## Support

For issues or questions:
1. Check Grafana dashboard panel errors
2. Review Prometheus target status
3. Examine API logs for metrics errors
4. Open an issue in the MAATWORK repository

---

## License

Same as MAATWORK project.
