# ANALYTICS SERVICE

**Parent:** `/AGENTS.md`

## OVERVIEW

Python FastAPI service running on port 3002. Provides financial analytics using yfinance.

## STRUCTURE

```
apps/analytics-service/
├── main.py               # Entry point (port 3002)
├── tests/               # pytest tests
├── pyproject.toml       # Python dependencies
└── requirements.txt    # pip dependencies
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add endpoint | `main.py` | FastAPI routes |
| Add test | `tests/` | pytest files |
| Dependencies | `pyproject.toml` | Poetry config |

## CONVENTIONS

- **Testing**: pytest with fixtures
- **Types**: Type hints (Python 3.11+)
- **Linting**: black, isort, mypy

## COMMANDS

```bash
pnpm dev:analytics     # Start service (3002)
pytest                 # Run tests
```

## NOTES

- Uses yfinance for market data
- FastAPI async patterns
- Port: 3002
