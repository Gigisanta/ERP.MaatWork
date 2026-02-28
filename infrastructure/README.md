# MaatWork Infrastructure

Infraestructura como código (IaC) para MaatWork usando **Fly.io**.

## Arquitectura Actual (Fly.io)

```
┌─────────────────────────────────────────────────────────────┐
│                       Fly.io                               │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │   maatwork   │    │ maatwork-api │    │ maatwork-db  │ │
│  │   (web app)  │    │   (api)      │    │ (postgresql) │ │
│  │              │    │              │    │              │ │
│  │ Next.js 15   │◄───┤ Express      │◄───┤ PostgreSQL   │ │
│  │ Port: 3000   │    │ Port: 3001   │    │ Port: 5432   │ │
│  └──────────────┘    └──────────────┘    └──────────────┘ │
│         │                   │                    │          │
│         ▼                   ▼                    ▼          │
│  maatwork.fly.dev    maatwork-api.fly.dev   Internal Only  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Costo estimado: ~$5.82/mes** (shared CPU)

## Estructura

```
infrastructure/
├── aws-deprecated/          # ⚠️ AWS Infrastructure (archivado)
├── fly/                     # Fly.io configuration
│   ├── fly-web.toml        # Web app config
│   └── fly-api.toml        # API app config
├── scripts/                 # Scripts utilitarios
└── README.md               # Este archivo
```

## Quick Start (Fly.io)

### Prerequisitos

1. **flyctl** - Instalar: `curl -L https://fly.io/install.sh | sh`
2. **Login**: `fly auth login`

### Deploy

```bash
# Web app
fly deploy --config fly-web.toml

# API
fly deploy --config apps/api/f Ver estadoly.toml

#
fly status maatwork
fly status maatwork-api

# Ver logs
fly logs maatwork
fly logs maatwork-api
```

## Documentación

- [Development Guide](../docs/DEVELOPMENT.md) - Guía de desarrollo local
- [Database Guide](../docs/DATABASE.md) - Schema y migraciones
- [Operations Guide](../docs/OPERATIONS.md) - Deploy y troubleshooting

## Seguridad

### SSL/TLS
- Fly.io maneja SSL automáticamente con Let's Encrypt
- HTTPS forzado por defecto

### Variables de Entorno
- Secretos: `fly secrets set KEY=value`
- No comitear `.env` en git

## Costos Comparativos

| Plataforma | Costo/mes |
|------------|-----------|
| Fly.io (actual) | ~$5.82 |
| Railway (previo) | ~$15 |
| AWS (histórico) | ~$30-35 |

## Histórico

Este proyecto migró de AWS → Railway → Fly.io para optimizar costos.
