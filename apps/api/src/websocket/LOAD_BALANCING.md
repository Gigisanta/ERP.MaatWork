# WebSocket Load Balancing Guide

## Overview

WebSocket connections require special handling when load balancing because they maintain long-lived connections. This guide covers load balancer configuration options for production deployments.

## Requirements for WebSocket Load Balancing

1. **Protocol Support**: Must support WebSocket upgrade from HTTP
2. **Sticky Sessions**: Required for stateful connections to maintain user subscriptions
3. **Connection Persistence**: Keep WebSocket connections alive without frequent reconnections
4. **Health Checks**: Proper health check configuration to avoid dropping connections

## Nginx Configuration

### Basic WebSocket Proxy Configuration

```nginx
upstream websocket_backend {
    ip_hash;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
    server 127.0.0.1:3004;
}

server {
    listen 443 ssl http2;
    server_name ws.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /ws {
        proxy_pass http://websocket_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
}
```

### With SSL Termination

```nginx
upstream websocket_backend {
    ip_hash;
    server 127.0.0.1:3002;
}

server {
    listen 443 ssl http2;
    server_name ws.example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    location /ws {
        proxy_pass http://websocket_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Long timeouts for WebSocket connections
        proxy_connect_timeout 60s;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;

        # Disable buffering
        proxy_buffering off;
    }
}
```

## AWS Application Load Balancer (ALB)

### ALB Configuration

```json
{
  "Type": "aws:elbv2:loadbalancer",
  "Properties": {
    "Scheme": "internet-facing",
    "Subnets": ["subnet-xxx", "subnet-yyy"],
    "SecurityGroups": ["sg-xxx"]
  }
}
```

### Target Group Configuration

```json
{
  "Type": "aws:elbv2:targetgroup",
  "Properties": {
    "Port": 3002,
    "Protocol": "HTTP",
    "VpcId": "vpc-xxx",
    "TargetType": "instance",
    "HealthCheckEnabled": true,
    "HealthCheckIntervalSeconds": 30,
    "HealthCheckPath": "/health",
    "HealthCheckProtocol": "HTTP",
    "HealthCheckTimeoutSeconds": 5,
    "HealthyThresholdCount": 2,
    "UnhealthyThresholdCount": 3
  }
}
```

### Listener Configuration for WebSocket

```json
{
  "Type": "aws:elbv2:listener",
  "Properties": {
    "LoadBalancerArn": "arn:aws:elasticloadbalancing:region:account:loadbalancer/name",
    "Protocol": "HTTPS",
    "Port": 443,
    "Certificates": [
      {
        "CertificateArn": "arn:aws:acm:region:account:certificate/xxx"
      }
    ],
    "DefaultActions": [
      {
        "Type": "forward",
        "TargetGroupArn": "arn:aws:elasticloadbalancing:region:account:targetgroup/name"
      }
    ]
  }
}
```

### Sticky Sessions

AWS ALB automatically handles WebSocket connections with sticky sessions when using:
- Application-based cookies: `AWSALB` cookie
- Duration-based cookies: Set cookie duration

## HAProxy Configuration

```haproxy
frontend websocket_front
    bind *:443 ssl crt /path/to/cert.pem
    default_backend websocket_back

backend websocket_back
    balance leastconn
    stick-table type ip size 200k expire 30m
    stick on src
    server ws1 10.0.0.1:3002 check
    server ws2 10.0.0.2:3002 check
    server ws3 10.0.0.3:3002 check

    # WebSocket upgrade
    http-request set-header X-Forwarded-Proto https if { ssl_fc }
    http-request set-header X-Forwarded-Port %[dst_port]

    # Timeout settings
    timeout connect 10s
    timeout client 7d
    timeout server 7d
```

## Cloudflare (Recommended for Simple Setup)

Cloudflare automatically handles WebSocket connections with sticky sessions using their `__cfduid` cookie. No special configuration needed beyond:

1. **Enable WebSocket Support** in Cloudflare Dashboard
   - Network → Websockets → Enable

2. **SSL/TLS Mode**: Full or Full (Strict)

3. **Cache Settings**:
   - Cache Level: Standard
   - Browser Cache TTL: Respect Existing Headers

## Kubernetes Ingress

### NGINX Ingress Controller

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: websocket-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2
    nginx.ingress.kubernetes.io/websocket-services: "websocket-service"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "600"
spec:
  ingressClassName: nginx
  rules:
    - host: ws.example.com
      http:
        paths:
          - path: /ws(/|$)(.*)
            pathType: Prefix
            backend:
              service:
                name: websocket-service
                port:
                  number: 3002
```

### Service with Session Affinity

```yaml
apiVersion: v1
kind: Service
metadata:
  name: websocket-service
spec:
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 10800
  ports:
    - port: 3002
      targetPort: 3002
  selector:
    app: websocket-server
  type: ClusterIP
```

## Environment Variables for Load Balancing

Add these to your `.env` file when using a load balancer:

```bash
# WebSocket Load Balancing
WS_PORT=3002
WS_BEHIND_LOAD_BALANCER=true

# Trust proxy for X-Forwarded-* headers
TRUST_PROXY=true
PROXY_COUNT=1

# CORS for load balancer origin
CORS_ORIGINS=https://ws.example.com,https://app.example.com

# Rate limiting (adjust based on load balancer capacity)
RATE_LIMIT_WS_CONNECTIONS_PER_IP=20
RATE_LIMIT_WS_MESSAGES_PER_SECOND=60
```

## Health Check Endpoint

The WebSocket server includes a `/health` endpoint for load balancer health checks:

```bash
curl http://localhost:3002/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Scaling Strategy

### Horizontal Scaling

1. **Multiple WebSocket Server Instances**: Run 2-4 instances for redundancy
2. **Sticky Sessions**: Required for stateful subscriptions
3. **Redis Pub/Sub (Future Enhancement)**: For cross-instance message broadcasting

### Vertical Scaling

For single-instance deployments:
- Increase `maxPayload` for larger messages
- Adjust `heartbeatInterval` for different network conditions
- Tune rate limiting based on expected load

## Monitoring

### Prometheus Metrics

The WebSocket server exposes metrics at `/metrics`:

- `websocket_connections_total`: Total connections
- `websocket_connections_active`: Active connections
- `websocket_messages_total`: Total messages sent/received
- `websocket_messages_sent_total`: Messages sent
- `websocket_messages_received_total`: Messages received
- `websocket_errors_total`: Total errors

### Grafana Dashboard

See `infrastructure/grafana/dashboards/websocket-performance.json` for pre-built dashboard.

## Troubleshooting

### Connection Drops

1. **Check load balancer timeout settings**: Set to 7+ days
2. **Verify sticky sessions are enabled**: Connections may be bouncing between servers
3. **Review rate limiting**: Reduce limits if clients are being dropped

### High Memory Usage

1. **Check connection count**: Look for connection leaks
2. **Review heartbeat settings**: Adjust interval if needed
3. **Monitor message queues**: Large queues may indicate slow clients

### SSL/TLS Issues

1. **Verify certificate chain**: Include intermediate certificates
2. **Check TLS version**: Support TLS 1.2+ only
3. **Verify cipher suites**: Use modern, secure ciphers

## Best Practices

1. **Use SSL/TLS everywhere**: Even internal connections
2. **Implement graceful shutdown**: Allow connections to close cleanly
3. **Monitor connection counts**: Set alerts for unusual spikes
4. **Test failover**: Ensure load balancer redirects to healthy instances
5. **Use connection pooling**: For database access from WebSocket handlers
6. **Limit connection duration**: Force reconnection periodically to clean up resources

## Security Considerations

1. **Origin validation**: Always verify Origin header
2. **Rate limiting**: Protect against connection flooding
3. **Authentication**: Require JWT token before allowing subscriptions
4. **Authorization**: Role-based channel access control
5. **Message validation**: Validate all incoming messages
6. **DDoS protection**: Use Cloudflare or similar for DDoS protection
