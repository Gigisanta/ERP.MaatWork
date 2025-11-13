# Cactus Super Panel — Documento Final (07 nov 2025)

Este documento reúne todo lo necesario para construir un **panel tipo Bloomberg** (gratis y escalable) que cubra **Argentina + EE. UU.**: arquitectura, fuentes (APIs y páginas scrappeables), scraping para X/Reddit, helpers en Python, esquema de datos, endpoints, límites, legal, UI, métricas y roadmap de implementación.

---

## 0) Metas y principios

* **Unificación de datos**: precios, fundamentales, macro, yields, FX, noticias, filings y eventos regulatorios.
* **Barato y escalable**: priorizar APIs públicas/free-tier; bulk + cache para minimizar llamadas.
* **Trazabilidad**: cada punto de datos con `source`, `asof`, `quality_flag` y link al origen.
* **Capas modulares**: ingesta → normalización → almacén (series) → cálculos/indicadores → API interna → UI/Alertas.
* **Respeto de ToS** y robots: usar APIs oficiales primero; scraping como último recurso.

---

## 1) Mapa de fuentes (APIs y scrappeables)

### 1.1 Macro y tasas

* **EE. UU.**

  * **FRED (St. Louis Fed)**: CPI, PCE, empleo, M2, industria, etc. API con key gratuita.
  * **U.S. Treasury Fiscal Data**: rendimientos/curvas y datasets fiscales con filtros poderosos.
  * **ECB SDW** (adicional): tipos de referencia y FX del euro (como serie de respaldo/validez cruzada).
* **Argentina**

  * **BCRA** a través de **datos.gob.ar**: variables monetarias/financieras (base monetaria, tasas, TC oficial…).
  * **INDEC**: IPC y otras estadísticas (vía portal y/o datasets en datos.gob.ar).

### 1.2 Precios de mercado (acciones/ETFs/índices/FX)

* **Histórico bulk y gratis**

  * **Stooq** (CSV): OHLCV diario/horario/minuto para miles de símbolos. Excelente para histórico masivo.
* **Gratuitos con límites (snapshots/intradía ligero)**

  * **Alpha Vantage**: time series (EOD e intradía), indicadores técnicos y fundamentals básicos.
  * **Finnhub**: cotizaciones, perfiles/fundamentales y noticias; plan free con límites.
  * **Twelve Data**: multi‑activo, REST/WS, intradía 1m/5m en free con paginado.
  * **Yahoo Finance (no oficial)**: vía `yfinance`/wrappers (para research; no oficial).
  * **EODHD**: token free limitado (test) con EOD/intradía básico.
  * **marketstack**: EOD y 1 año histórico en free.

### 1.3 Mercado local argentino (emisoras, eventos, market data)

* **CNV – Hechos Relevantes**: listados públicos con paginación; muy valioso para alertas.
* **BYMA** / **BYMADATA**: fichas de emisoras/índices/avisos. Tiempo real o feeds formales suelen requerir contrato/homologación.
* **Matba‑Rofex / Primary / A3 Mercados**: documentación y APIs (REST/WS/FIX); en general con acuerdo comercial (útil mapear para fase PRO).

### 1.4 Cripto & FX

* **Cripto**:

  * **CoinGecko** (con key demo free),
  * **Binance** (endpoints públicos de market data),
  * **Kraken** (ticker/orderbook públicos).
* **FX**:

  * **Frankfurter** (tipos de referencia del BCE, sin key),
  * **exchangerate.host** (gratis, flexible; FIAT/crypto).

### 1.5 Filings, noticias y calendario

* **SEC EDGAR**: submissions + XBRL, sin key; gold standard para 10‑K/10‑Q/8‑K.
* **GDELT**: APIs de noticias globales y eventos; útil para “sentiment/coverage” por ticker/país.
* **TradingEconomics**: calendario económico y mercados con plan free limitado.

---

## 2) Arquitectura técnica (alto nivel)

**Ingesta** → **Normalización** → **Almacén (TimescaleDB)** → **Cálculo/Features** → **API interna (REST/GraphQL + Redis)** → **UI/Alertas**

1. **Ingesta**

* Conectores por dominio: `macro_ar` (BCRA/INDEC), `macro_us` (FRED/Treasury), `market_hist` (Stooq), `market_live_lite` (AV/Finnhub/Twelve), `filings` (EDGAR), `eventos_ar` (CNV), `news` (GDELT), `fx` (Frankfurter/exchangerate.host), `crypto` (CoinGecko/Binance/Kraken), `social` (Reddit/X).
* Workers con cron/apscheduler, colas y backoff exponencial; **ETag/If‑Modified‑Since** donde aplique; **idempotencia**.

2. **Normalización**

* Identificadores: `ticker`, `isin`, `cusip` (cuando exista), `mic` (bolsa), `country`, `asset_class`.
* Campos canónicos OHLCV: `open, high, low, close, adj_close, volume, currency, tz, source, asof, rev_id`.
* Diccionario de símbolos (CEDEAR↔subyacente US; bonos AR: especie, cupón, vencimiento; ONs; índices BYMA/Matba‑Rofex).

3. **Almacén (DB de series de tiempo)**

* **TimescaleDB** sobre PostgreSQL.
* Tablas por grano: `prices_daily`, `prices_intraday`, `macro_points`, `yields`, `events`, `filings`, `fx_rates`, `crypto_prices`.
* Particionado por fecha + símbolo; compresión de chunks fríos; índices BRIN por fecha.

4. **Cálculo / Feature Store**

* Técnicos: SMA/EMA, RSI, MACD, ATR, BBANDS.
* Riesgo/rendimiento: retornos log, vol anualizada, Sharpe/Sortino, Max Drawdown, **rolling beta** vs benchmark.
* Fundamentales: TTM/YoY (ingresos, EPS, márgenes, ROE/ROA, EV/EBITDA) desde SEC/AV/Finnhub.
* Curvas: US Treasury (pendientes 2s10s, 3m‑10y) y spreads locales (Badlar/Leliq).

5. **API interna**

* Endpoints típicos: `/assets/:id/snapshot`, `/assets/:id/ohlcv?tf=1d&from=...`, `/macro/:series_id`, `/yields?country=US`, `/filings/:ticker`, `/events/:country`, `/fx`, `/crypto`.
* **Redis** para cache de respuestas; **rate‑limiting** por IP/token.

6. **Observabilidad**

* Logging estructurado (JSON), métricas (latencia/fallas por fuente), alertas de jobs; Grafana/Prometheus.

---

## 3) Esquema de datos (mínimo viable)

```text
assets(
  id, symbol, symbol_type, mic, country, currency, name, sector, industry,
  underlying_symbol, isin
)
prices_daily(
  asset_id, date, open, high, low, close, adj_close, volume, currency,
  source, asof
)
prices_intraday(
  asset_id, ts, o, h, l, c, v, currency, source, asof
)
macro_series(
  series_id, provider, name, freq, units
)
macro_points(
  series_id, date, value, revision_id, source_asof
)
yields(
  country, tenor, date, value, provider
)
filings(
  ticker, cik, form, filed_at, url, provider, text_vector
)
events(
  country, issuer, event_type, published_at, url, provider, text_vector
)
fx_rates(
  base, quote, date, rate, provider, asof
)
crypto_prices(
  symbol, ts, price, volume, exchange, provider
)
```

---

## 4) UI del panel (módulos)

* **Snapshot de activo**: último precio/cambio %, rango 52s, volumen, divisa, P/E, EV/EBITDA, margen, ROE, deuda/EBITDA; señales (SMA20/50/200, RSI, MACD); volatilidad 30/90 d; beta.
* **Gráficos**: OHLCV multi‑timeframe; medias y BBANDS; **curva US Treasury** y spreads (2s10s/3m‑10y); mapa de calor sectorial.
* **Fundamentales**: trimestrales/anuales (ingresos, EPS, margen, cash, capex) desde SEC/AV/Finnhub.
* **Eventos/Regulatorio**: Hechos Relevantes (CNV) y Filings (EDGAR) con timeline y búsqueda full‑text.
* **Macro & FX**: panel AR (M2, base monetaria, Badlar, inflación, TC) y US (CPI/PCE, desempleo, Fed Funds, curva y breakevens).
* **Social**: Reddit (subreddits financieros/regionales) y X (búsquedas temáticas por ticker/emisor), con filtros por fecha y score.
* **Atribución** visible (fuente + timestamp) en cada widget.

---

## 5) Alertas sugeridas

* **Precio/Técnico**: cruce SMA50/200, breakout 20D, ATR‑trailing stop.
* **Riesgo**: VaR diario > umbral; beta > 1.3; volatilidad 30D > p90.
* **Fundamentales**: nuevos 10‑Q/10‑K; cambios de guidance; sorpresa EPS.
* **Macro**: decisión de tasa BCRA; IPC mensual AR; NFP/IPC US.
* **Eventos AR**: nuevo Hecho Relevante para emisoras en watchlist.

---

## 6) Límites, licencias y buenas prácticas

* **Usar API oficial** siempre que exista (FRED, Treasury, datos.gob.ar, SEC, GDELT, Reddit, CoinGecko).
* **Alpha Vantage / Finnhub / Twelve / marketstack / EODHD**: respetar límites del plan free (colas, backoff, cache fuerte).
* **Yahoo Finance (no oficial)**: sólo para research; no redistribuir.
* **BYMA/Matba‑Rofex/A3**: para datos en tiempo real o históricos intradía “limpios/garantizados” suelen requerir contratos.
* **Scraping de páginas**: respetar robots, `User‑Agent` identificable, `ETag`/`If‑Modified‑Since`, sleeps aleatorios, reintentos exponenciales.
* **X (Twitter)**: entorno cambiante; mantener librerías al día y contemplar que puede romperse.

---

## 7) Endpoints útiles (plantillas)

* **FRED**: `/fred/series/observations?series_id=<ID>&api_key=<KEY>&file_type=json&observation_start=1990-01-01`
* **Treasury**: `.../services/api/fiscal_service/<dataset>?format=json&filter=...`
* **datos.gob.ar (series)**: `/series/api/series/?ids=<SERIE_ID>&format=json&start_date=YYYY-MM-DD`
* **SEC EDGAR**: `https://data.sec.gov/submissions/CIK<CIK>.json` y `.../api/xbrl/companyfacts/CIK<CIK>.json`
* **Stooq (CSV)**: `https://stooq.com/q/l/?s=<symbol>&i=<d|h|m>`
* **Alpha Vantage**: `.../query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=<S>&apikey=<KEY>`
* **Finnhub**: `.../stock/profile2?symbol=<S>&token=<KEY>`
* **Twelve Data**: `.../time_series?symbol=<S>&interval=1min&apikey=<KEY>` (paginado)
* **Frankfurter**: `https://api.frankfurter.dev/latest?from=USD&to=ARS,EUR`
* **exchangerate.host**: `https://api.exchangerate.host/latest?base=USD&symbols=ARS,EUR`
* **CoinGecko (v3/v4)**: `.../coins/markets?vs_currency=usd&ids=...` (requiere key)
* **Binance (Market Data Only)**: base `https://data-api.binance.vision`
* **Kraken**: `https://api.kraken.com/0/public/Ticker?pair=...`
* **GDELT**: `http://api.gdeltproject.org/api/v2/doc/doc?query=<q>&format=json&maxrecords=250&sort=datedesc`
* **Reddit (PRAW/OAuth)**: wrapper Python (ver helpers más abajo).

---

## 8) Scraping y social listening (X/Reddit) — sistemas y decisiones

### 8.1 X (Twitter) — enfoques viables en 2025

* **twscrape**: pool de cuentas/sesiones, rotación automática y soporte de búsquedas, timelines, likers/retweeters. Requiere curar/guardar cookies y atender rate limits.
* **snscrape**: útil como *fallback*; propenso a romperse ante cambios de X.
* **Nitter**: inestable salvo que hospedes uno propio con sesiones; mantenimiento alto.
* **Terceros (Apify, Scrapfly)**: confiables y simples, pero **no gratis**.

### 8.2 Reddit — usar API oficial

* **PRAW**: OAuth sencillo, estable y con buen rate limit; evita parsear HTML.

---

## 9) Helpers en Python (listos para integrar)

> Estructura sugerida del paquete: `cactus_ingestors/`
>
> * `core/` (fetchers por proveedor)
> * `parsers/` (HTML/XBRL/CSV)
> * `store/` (DB/JSONL)
> * `jobs/` (apscheduler/cron wrappers)
> * `utils/ratelimit.py`, `utils/http.py`

### 9.1 CNV – Hechos Relevantes (requests + BS4)

```python
# cactus_ingestors/core/cnv.py
import time, random, requests
from bs4 import BeautifulSoup

BASE = "https://www.cnv.gov.ar/sitioWeb/HechosRelevantes"
HEADERS = {"User-Agent":"Mozilla/5.0 (compatible; CactusBot/1.0)"}

def fetch_cnv_page(page:int=1) -> str:
    r = requests.get(f"{BASE}?page={page}", headers=HEADERS, timeout=30)
    r.raise_for_status()
    return r.text

def parse_cnv(html: str):
    soup = BeautifulSoup(html, "html.parser")
    rows = []
    items = soup.select("div#mainContent .table-responsive table tbody tr")
    for tr in items:
        tds = tr.find_all("td")
        if len(tds) < 3:
            continue
        fecha = tds[0].get_text(strip=True)
        emisor = tds[1].get_text(strip=True)
        titulo = tds[2].get_text(strip=True)
        a = tds[2].find("a")
        href = a["href"] if a else None
        link = href if (href and href.startswith("http")) else (f"https://www.cnv.gov.ar{href}" if href else None)
        rows.append({
            "fecha": fecha,
            "emisor": emisor,
            "titulo": titulo,
            "url": link,
            "source": "CNV"
        })
    return rows

def crawl_cnv(pages:int=5, jitter=(0.8,1.6)):
    all_rows = []
    for p in range(1, pages+1):
        all_rows += parse_cnv(fetch_cnv_page(p))
        time.sleep(random.uniform(*jitter))
    return all_rows
```

### 9.2 BYMADATA – Descubrimiento de secciones públicas

```python
# cactus_ingestors/core/bymadata.py
import requests
from bs4 import BeautifulSoup

BASE = "https://open.bymadata.com.ar/"
HEADERS = {"User-Agent":"Mozilla/5.0 (CactusBot/1.0)"}

def discover_links():
    r = requests.get(BASE, headers=HEADERS, timeout=30)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    links = []
    for a in soup.select("a[href]"):
        txt = a.get_text(" ", strip=True).lower()
        href = a["href"]
        if any(k in txt for k in ["emisoras","noticias","eventos","avisos","series"]):
            url = href if href.startswith("http") else BASE.rstrip("/")+"/"+href.lstrip("/")
            links.append({"text": txt, "href": url})
    return links
```

### 9.3 SEC EDGAR – API oficial

```python
# cactus_ingestors/core/edgar.py
import requests
UA = {"User-Agent":"CactusBot/1.0 giolivo.santarelli@example.com"}

def submissions(cik:int):
    url = f"https://data.sec.gov/submissions/CIK{int(cik):010d}.json"
    r = requests.get(url, headers=UA, timeout=30)
    r.raise_for_status()
    return r.json()

def company_facts(cik:int):
    url = f"https://data.sec.gov/api/xbrl/companyfacts/CIK{int(cik):010d}.json"
    r = requests.get(url, headers=UA, timeout=30)
    r.raise_for_status()
    return r.json()
```

### 9.4 Macro US (FRED/Treasury)

```python
# cactus_ingestors/core/us_macro.py
import requests

def fred_series(series_id:str, api_key:str, start="1990-01-01"):
    url = "https://api.stlouisfed.org/fred/series/observations"
    params = {"series_id":series_id, "api_key":api_key, "file_type":"json", "observation_start":start}
    r = requests.get(url, params=params, timeout=30)
    r.raise_for_status()
    return r.json().get("observations", [])

def treasury_dataset(dataset:str, filters:dict):
    base = "https://api.fiscaldata.treasury.gov/services/api/fiscal_service"
    url = f"{base}/{dataset}"
    r = requests.get(url, params={"format":"json", **(filters or {})}, timeout=30)
    r.raise_for_status()
    return r.json().get("data", [])
```

### 9.5 Macro AR (datos.gob.ar: BCRA/INDEC)

```python
# cactus_ingestors/core/ar_macro.py
import requests

def series_ar(ids:str, start="2010-01-01"):
    url = "https://datos.gob.ar/series/api/series/"
    r = requests.get(url, params={"ids": ids, "format":"json", "start_date": start}, timeout=30)
    r.raise_for_status()
    return r.json()
```

### 9.6 Stooq – Históricos CSV

```python
# cactus_ingestors/core/stooq.py
import io, requests, pandas as pd

def stooq_csv(symbol:str, timeframe="d"):
    url = f"https://stooq.com/q/l/?s={symbol.lower()}&i={timeframe}"
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    return pd.read_csv(io.StringIO(r.text))
```

### 9.7 Reddit – PRAW (OAuth)

```python
# cactus_ingestors/core/reddit.py
import praw

def build_reddit_client(client_id, client_secret, user_agent):
    return praw.Reddit(client_id=client_id, client_secret=client_secret, user_agent=user_agent)

def fetch_sub_posts(r, subreddit="argentina", limit=50):
    sub = r.subreddit(subreddit)
    return [{
        "id": p.id, "title": p.title, "score": p.score,
        "created_utc": p.created_utc, "url": p.url
    } for p in sub.new(limit=limit)]
```

### 9.8 X (Twitter) – twscrape (async, pool de cuentas)

```python
# cactus_ingestors/core/x_twscrape.py
import asyncio
from twscrape import API

async def search_x(query:str, limit:int=100):
    api = API()  # requiere que hayas agregado cuentas con el CLI de twscrape
    out = []
    async for t in api.search(query, limit=limit):
        out.append({
            "id": t.id,
            "date": t.date,
            "user": t.user.username if t.user else None,
            "text": t.rawContent,
            "replyCount": t.replyCount,
            "retweetCount": t.retweetCount,
            "likeCount": t.likeCount,
            "url": f"https://x.com/{t.user.username}/status/{t.id}" if t.user else None
        })
    return out

# Ejemplo de uso
# asyncio.run(search_x("(Merval OR BYMA) lang:es", 50))
```

### 9.9 Utilidades HTTP (retries, ETag/IMS)

```python
# cactus_ingestors/utils/http.py
import requests, time, random
DEFAULT_HEADERS = {"User-Agent":"Mozilla/5.0 CactusBot/1.0"}

def http_get(url, params=None, headers=None, retries=3, backoff=1.5, etag_cache=None, ims=None):
    hdrs = DEFAULT_HEADERS.copy()
    if headers: hdrs.update(headers)
    if etag_cache and url in etag_cache:
        hdrs["If-None-Match"] = etag_cache[url]
    if ims: hdrs["If-Modified-Since"] = ims
    for i in range(retries):
        r = requests.get(url, params=params, headers=hdrs, timeout=30)
        if r.status_code in (200, 304):
            if r.headers.get("ETag") and etag_cache is not None:
                etag_cache[url] = r.headers["ETag"]
            return r
        time.sleep(backoff * (i+1) + random.random())
    r.raise_for_status()
```

---

## 10) Cadencias y orquestación (plan operativo)

* **MVP (Sprint 1)**

  * Ingesta estable: Stooq (EOD), FRED, Treasury, datos.gob.ar (BCRA/INDEC).
  * Esquema TimescaleDB + materialized views para agregados básicos.
  * UI: Snapshot, OHLCV diario, Curva US, Panel Macro AR/US.
* **Sprint 2**

  * SEC EDGAR (submissions + companyfacts) y CNV Hechos Relevantes (crawler c/2 h) con búsqueda full‑text.
  * UI: pestañas de **Fundamentales** y **Eventos/Filings**.
* **Sprint 3**

  * Intradía ligero (Alpha Vantage / Finnhub / Twelve) con colas y cache; señales técnicas y alertas.
* **Sprint 4**

  * Enriquecimiento AR (BYMADATA), optimizaciones (compresión, índices BRIN, views), feature store de factores.

**Programación de jobs** (sugerencia)

* Macro US/AR: diario 07:15 ART.
* Stooq EOD: 19:30 ART.
* CNV HR: cada 2 h (08:00–22:00 ART).
* SEC filings: cada 1 h (14:00–21:00 ART, horario de NY 12:00–19:00 según DST).
* Intradía ligero: cada 5–15 min en horarios de mercado (con límites por proveedor).
* Social (Reddit/X): cada 6 h; picos manuales cuando se necesite.

---

## 11) Métricas clave para decidir

* **Rendimiento anualizado y volatilidad** (30/90/252 d), **Sortino**, **Calmar**, **Max Drawdown**.
* **Relativos**: vs benchmark (SPY, S&P Merval, sector, CEDEAR basket).
* **Curva de tasas**: pendiente 2s10s y 3m‑10y; alarmas por inversión.
* **Sensibilidades macro**: betas rolling a inflación, tasa y crecimiento (regresión con FRED/BCRA).
* **Fundamentales**: crecimiento ingresos/EPS, margen neto, cobertura de intereses, EV/EBITDA; calidad de datos (revisiones FRED/ALFRED cuando uses revisiones).

---

## 12) Seguridad y costos (cero o mínimos)

* **Cache por capa**: HTTP (ETag/IMS), Redis en API, materialized views para queries pesadas.
* **Idempotencia**: jobs con locks (evitar duplicados) y DLQ para errores.
* **Costos**: base en fuentes gratuitas; la “cuota” es el rate‑limit. Priorizar **bulk** sobre llamadas unitarias.
* **Escalabilidad**: contenedores livianos; workers por dominio; colas con prioridad (market_live > filings > macro > social).

---

## 13) Integración con tu app (Cactus)

* Backend: FastAPI/Django REST + SQLAlchemy/psycopg.
* DB: PostgreSQL + TimescaleDB (dev: SQLite para prototipos, pero migrar a PG cuanto antes).
* Frontend: Next.js/React + Recharts; Tailwind; componentes para tablas y filtros.
* **Endpoints internos propuestos**:

  * `GET /assets/:symbol/snapshot`
  * `GET /assets/:symbol/ohlcv?tf=1d&from=YYYY-MM-DD`
  * `GET /macro/:series_id?from=YYYY-MM-DD`
  * `GET /yields?country=US&date=YYYY-MM-DD`
  * `GET /filings/:ticker?from=YYYY-MM-DD`
  * `GET /events/ar?issuer=...&from=...`
  * `GET /fx?base=USD&quotes=ARS,EUR`
  * `GET /social/reddit?sub=...` | `GET /social/x?q=...`

---

## 14) Checklist de entrega (para cerrar la feature)

* [ ] Variables `.env` (FRED_KEY, TREASURY_KEY opcional, REDDIT_CLIENT_ID/SECRET/UA, COINGECKO_KEY, AV_KEY, FINNHUB_KEY, TW_SCRAPE_POOL configurado).
* [ ] Deploy de TimescaleDB con extensiones activadas (Hypertables + compresión).
* [ ] Jobs/apscheduler con ventanas y *locks*.
* [ ] Redis configurado (cache API 60–300s por endpoint según criticidad).
* [ ] Widgets UI con **fuente + timestamp** visible.
* [ ] Alerta básica:

  * Curva 2s10s invertida,
  * Nuevo Hecho Relevante de emisoras en watchlist,
  * Publicación 10‑Q/10‑K del watchlist,
  * RSI>70/<30 con filtro de volumen.
* [ ] Documentación interna de endpoints, límites y estrategia de fallback por proveedor.

---

## 15) Notas y recomendaciones operativas

* Empezar **historificando** (Stooq/FRED/Treasury/BCRA/INDEC), luego sumar intradía **ligero** (AV/Twelve/Finnhub) y, por último, capas “social” y noticias.
* Para **Argentina real‑time**, evaluar acuerdos con BYMA/Matba‑Rofex si más adelante necesitás fiabilidad/latencia.
* **X (Twitter)** cambia a menudo: mantén `twscrape` actualizado y define colas y “cortes” en caso de fallo; cachea todo.
* Mantén un **diccionario de símbolos** de cosecha propia para CEDEAR ↔ subyacente, ONs, obligaciones negociables, bonos, letras y especies BYMA.
* Prioriza **calidad**: si una fuente da un valor conflictivo, marca el registro con `quality_flag = suspect` y conserva la procedencia.

---
