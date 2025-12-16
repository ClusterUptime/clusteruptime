# ClusterUptime ⚡️

[![CI](https://github.com/clusteruptime/clusteruptime/actions/workflows/ci.yml/badge.svg)](https://github.com/clusteruptime/clusteruptime/actions/workflows/ci.yml)
[![Docker](https://github.com/clusteruptime/clusteruptime/actions/workflows/docker.yml/badge.svg)](https://github.com/clusteruptime/clusteruptime/actions/workflows/docker.yml)

**The ultra-lightweight, open-source uptime monitor.**  
Blazing fast performance with a stunning modern design.

<div align="center">
  <img src="assets/dashboard-overview.png" alt="Dashboard Preview" width="100%" />
</div>

<div align="center">
  <img src="assets/monitor-detail.png" alt="Monitor Detail" width="100%" />
</div>

## Features

- 🚀 **Real-time Monitoring** – HTTP/HTTPS checks with sub-second precision.
- 📊 **Beautiful Metrics** – Visualize latency and downtime instantly.
- 🛡️ **Self-Hosted** – Built with Go + SQLite. Single binary, no bloat.
- 🔑 **API First** – Automate everything. Full control via REST API & Keys.

---

## Quick Start

### 🐳 Docker
Run the container in seconds:

```bash
docker run -d -p 9090:9090 \
  -v uptime_data:/data \
  jesuspaz/clusteruptime:latest
```

### 🛠️ From Source
```bash
# Backend
make dev-backend

# Frontend
make dev-frontend
```

## Configuration

Zero config required to start. Optional tweaks via Environment Variables:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `LISTEN_ADDR` | `:9090` | Port to listen on. |
| `DB_PATH` | `/data/clusteruptime.db` | Path to the SQLite database. |

## Automation

Manage your stack programmatically. Included script in `tools/`:

```bash
python3 tools/create_stack.py --key "sk_live_..." --group "Google" --urls https://google.com
```

---

_Simple. Efficient. Open Source._