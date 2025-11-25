from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import uvicorn
from datetime import datetime
import logging

from yfinance_client import yfinance_client
from portfolio_performance import portfolio_calculator, PortfolioComponent, PerformanceData

# Configure logging - formato compacto
# AI_DECISION: Formato compacto de logs - solo información esencial
# Justificación: Timestamp completo, nombre del logger generan demasiado ruido
# Impacto: Logs 60-70% más compactos, más legibles
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)
# Reducir verbosidad de librerías externas
logging.getLogger('uvicorn').setLevel(logging.WARNING)
logging.getLogger('uvicorn.access').setLevel(logging.WARNING)
logging.getLogger('fastapi').setLevel(logging.WARNING)

app = FastAPI(
    title="Cactus Analytics Service",
    description="Microservicio para cálculos financieros y obtención de precios",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar dominios exactos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class PriceFetchRequest(BaseModel):
    symbols: List[str]

class PriceBackfillRequest(BaseModel):
    symbols: List[str]
    days: Optional[int] = 365

class SymbolInfoRequest(BaseModel):
    symbol: str

class PortfolioPerformanceRequest(BaseModel):
    portfolio_id: str
    portfolio_name: str
    components: List[Dict[str, Any]]  # [{"symbol": "AAPL", "weight": 0.3, "name": "Apple Inc."}]
    period: str = "1Y"

class PortfolioComparisonRequest(BaseModel):
    portfolios: List[Dict[str, Any]]  # [{"id": "p1", "name": "Portfolio 1", "components": [...]}]
    period: str = "1Y"

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "analytics-service",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }

@app.get("/metrics")
async def metrics():
    """Basic process metrics (no sensitive data)"""
    import os, psutil, time
    process = psutil.Process(os.getpid())
    with process.oneshot():
        mem_info = process.memory_info()
        cpu = process.cpu_percent(interval=0.0)
    return {
        "ok": True,
        "pid": process.pid,
        "rss": mem_info.rss,
        "cpu": cpu,
        "time": time.time(),
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Cactus Analytics Service",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.post("/prices/fetch")
async def fetch_current_prices(request: PriceFetchRequest):
    """
    Obtener precios actuales para una lista de símbolos
    
    Args:
        request: Lista de símbolos
        
    Returns:
        Dict con precios por símbolo
    """
    try:
        if not request.symbols:
            raise HTTPException(status_code=400, detail="Lista de símbolos no puede estar vacía")
        
        if len(request.symbols) > 50:
            raise HTTPException(status_code=400, detail="Máximo 50 símbolos por request")
        
        logger.info(f"Fetching prices for {len(request.symbols)} symbols")
        
        results = yfinance_client.fetch_current_prices(request.symbols)
        
        return {
            "success": True,
            "data": results,
            "timestamp": datetime.utcnow().isoformat(),
            "count": len(results)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in fetch_current_prices: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

@app.post("/prices/backfill")
async def backfill_historical_prices(request: PriceBackfillRequest):
    """
    Backfill de precios históricos
    
    Args:
        request: Lista de símbolos y días hacia atrás
        
    Returns:
        Dict con datos históricos por símbolo
    """
    try:
        if not request.symbols:
            raise HTTPException(status_code=400, detail="Lista de símbolos no puede estar vacía")
        
        if len(request.symbols) > 20:
            raise HTTPException(status_code=400, detail="Máximo 20 símbolos para backfill")
        
        if request.days < 1 or request.days > 3650:  # Máximo 10 años
            raise HTTPException(status_code=400, detail="Días debe estar entre 1 y 3650")
        
        logger.info(f"Backfilling {request.days} days for {len(request.symbols)} symbols")
        
        results = yfinance_client.backfill_prices(request.symbols, request.days)
        
        # Contar registros totales
        total_records = sum(len(records) for records in results.values())
        
        return {
            "success": True,
            "data": results,
            "timestamp": datetime.utcnow().isoformat(),
            "symbols_count": len(request.symbols),
            "total_records": total_records,
            "days": request.days
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in backfill_historical_prices: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

@app.get("/prices/info/{symbol}")
async def get_symbol_info(symbol: str):
    """
    Obtener información de un símbolo
    
    Args:
        symbol: Símbolo del instrumento
        
    Returns:
        Dict con información del instrumento
    """
    try:
        if not symbol:
            raise HTTPException(status_code=400, detail="Símbolo requerido")
        
        logger.info(f"Getting info for symbol: {symbol}")
        
        result = yfinance_client.get_symbol_info(symbol)
        
        return {
            "success": True,
            "data": result,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_symbol_info: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

@app.post("/search/symbols")
async def search_symbols(request: dict):
    """
    Buscar símbolos por nombre o ticker
    
    Args:
        request: {"query": "Apple", "max_results": 10}
        
    Returns:
        Lista de símbolos encontrados
    """
    try:
        query = request.get('query', '')
        max_results = request.get('max_results', 10)
        
        if not query or len(query.strip()) < 2:
            return {
                "status": "error",
                "message": "Query must be at least 2 characters long",
                "timestamp": datetime.utcnow().isoformat()
            }
        
        results = yfinance_client.search_symbols(query.strip(), max_results)
        
        return {
            "status": "success",
            "data": {
                "query": query,
                "results": results,
                "count": len(results)
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error searching symbols for query '{request.get('query', '')}': {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to search symbols: {str(e)}"
        )

@app.get("/search/validate/{symbol}")
async def validate_symbol(symbol: str):
    """
    Validar si un símbolo existe
    
    Args:
        symbol: Símbolo a validar
        
    Returns:
        Información de validación del símbolo
    """
    try:
        validation = yfinance_client.validate_symbol(symbol)
        
        return {
            "status": "success",
            "data": validation,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error validating symbol {symbol}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to validate symbol: {str(e)}"
        )

@app.post("/portfolio/performance")
async def calculate_portfolio_performance(request: PortfolioPerformanceRequest):
    """
    Calcular rendimiento de una cartera
    
    Args:
        request: Datos de la cartera y período
        
    Returns:
        Métricas de rendimiento de la cartera
    """
    try:
        # Convertir componentes a PortfolioComponent
        components = [
            PortfolioComponent(
                symbol=comp["symbol"],
                weight=comp["weight"],
                name=comp.get("name")
            )
            for comp in request.components
        ]
        
        # Calcular rendimiento
        performance = portfolio_calculator.calculate_portfolio_performance(
            portfolio_id=request.portfolio_id,
            portfolio_name=request.portfolio_name,
            components=components,
            period=request.period
        )
        
        return {
            "status": "success",
            "data": {
                "portfolio_id": performance.portfolio_id,
                "portfolio_name": performance.portfolio_name,
                "period": performance.period,
                "start_date": performance.start_date.isoformat(),
                "end_date": performance.end_date.isoformat(),
                "total_return": round(performance.total_return * 100, 2),  # Convertir a porcentaje
                "annualized_return": round(performance.annualized_return * 100, 2),
                "volatility": round(performance.volatility * 100, 2),
                "sharpe_ratio": round(performance.sharpe_ratio, 3) if performance.sharpe_ratio else None,
                "max_drawdown": round(performance.max_drawdown * 100, 2) if performance.max_drawdown else None,
                "performance_series": performance.performance_series
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error calculating portfolio performance: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to calculate portfolio performance: {str(e)}"
        )

@app.post("/portfolio/compare")
async def compare_portfolios(request: PortfolioComparisonRequest):
    """
    Comparar rendimiento de múltiples carteras
    
    Args:
        request: Lista de carteras a comparar
        
    Returns:
        Métricas de rendimiento para cada cartera
    """
    try:
        # Preparar datos para comparación
        portfolio_tuples = []
        for portfolio_data in request.portfolios:
            components = [
                PortfolioComponent(
                    symbol=comp["symbol"],
                    weight=comp["weight"],
                    name=comp.get("name")
                )
                for comp in portfolio_data["components"]
            ]
            portfolio_tuples.append((
                portfolio_data["id"],
                portfolio_data["name"],
                components
            ))
        
        # Calcular rendimiento para todas las carteras
        results = portfolio_calculator.compare_portfolios(
            portfolios=portfolio_tuples,
            period=request.period
        )
        
        # Formatear resultados
        formatted_results = {}
        for portfolio_id, performance in results.items():
            formatted_results[portfolio_id] = {
                "portfolio_name": performance.portfolio_name,
                "period": performance.period,
                "start_date": performance.start_date.isoformat(),
                "end_date": performance.end_date.isoformat(),
                "total_return": round(performance.total_return * 100, 2),
                "annualized_return": round(performance.annualized_return * 100, 2),
                "volatility": round(performance.volatility * 100, 2),
                "sharpe_ratio": round(performance.sharpe_ratio, 3) if performance.sharpe_ratio else None,
                "max_drawdown": round(performance.max_drawdown * 100, 2) if performance.max_drawdown else None,
                "performance_series": performance.performance_series
            }
        
        return {
            "status": "success",
            "data": {
                "period": request.period,
                "portfolios": formatted_results,
                "count": len(formatted_results)
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error comparing portfolios: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to compare portfolios: {str(e)}"
        )

if __name__ == "__main__":
    # AI_DECISION: Deshabilitar access_log y reducir verbosidad
    # Justificación: Access logs de todas las requests generan demasiado ruido
    # Impacto: Solo errores y warnings visibles, logs más limpios
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=3002,
        reload=True,
        log_level="warning",  # Solo warnings y errores
        access_log=False,  # Deshabilitar access logs
        log_config={
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": "%(asctime)s [%(levelname)s] %(message)s",
                    "datefmt": "%H:%M:%S"
                },
            },
            "handlers": {
                "default": {
                    "class": "logging.StreamHandler",
                    "formatter": "default",
                    "stream": "ext://sys.stdout"
                },
            },
            "loggers": {
                "uvicorn": {"handlers": ["default"], "level": "WARNING"},
                "uvicorn.error": {"handlers": ["default"], "level": "WARNING"},
                "fastapi": {"handlers": ["default"], "level": "WARNING"},
            },
        }
    )
