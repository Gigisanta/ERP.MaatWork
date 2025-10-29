# Cactus Analytics Service

Microservicio Python FastAPI para cálculos financieros y obtención de precios de mercado.

## Responsabilidades

- Obtención de precios históricos y actuales via yfinance
- Cálculo de métricas financieras (TWR, Sharpe, Drawdown, α/β, Tracking Error)
- Comparación de carteras con benchmarks
- Procesamiento de datos financieros para reportes

## Instalación

```bash
cd apps/analytics-service
pip install -r requirements.txt
```

## Desarrollo

```bash
python main.py
```

Servicio disponible en: http://localhost:3002
Documentación API: http://localhost:3002/docs

## Endpoints

- `GET /health` - Health check
- `POST /prices/fetch` - Obtener precios actuales
- `POST /prices/backfill` - Backfill histórico
- `POST /metrics/twr` - Time-Weighted Return
- `POST /metrics/risk` - Métricas de riesgo
- `POST /compare/benchmark` - Comparación con benchmark

## Deploy

En VPS con PM2:
```bash
pm2 start "uvicorn main:app --host 0.0.0.0 --port 3002" --name cactus-analytics
```
