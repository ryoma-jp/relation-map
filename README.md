# relation-map

An open-source tool to visualize relationships between people and entities.

## Overview

`relation-map` is an open-source project for creating clear and intuitive
relationship diagrams.

It helps you understand complex connections between people, organizations,
and other entities by turning structured data into visual maps.

Typical use cases include:
- Character relationship diagrams
- Organization and team structures
- Social or network relationship visualization
- Story, game, and world-building support

---

## Features

- Visualize relationships as a graph or diagram
- Simple data-driven structure (JSON / API-friendly)
- Designed for extensibility and customization
- Web-based and framework-agnostic (TBD)

---

## Use Cases

- 📚 Writers & creators: organize character relationships
- 🎮 Game developers: manage character and faction connections
- 🧠 Planners & researchers: explore complex human or entity networks
- 🛠 Developers: embed relationship maps into other applications

---

## Getting Started

### Prerequisites

- Docker (version 20.10 or later)
- Docker Compose (version 2.0 or later)

### Quick Start with Docker Compose

You can start the full stack (backend, frontend, and database) using Docker Compose:

```bash
git clone https://github.com/yourname/relation-map.git
cd relation-map
docker compose up --build
```

The services will be available at:
- **Backend (FastAPI)**: http://localhost:8000
- **Frontend (React)**: http://localhost:3000
- **Database (PostgreSQL)**: localhost:5432

### Docker Compose Commands

**Start services in detached mode:**
```bash
docker compose up -d
```

**Stop services:**
```bash
docker compose down
```

**View logs:**
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
```

**Rebuild after code changes:**
```bash
docker compose up --build
```

**Reset database (removes all data):**
```bash
docker compose down -v
docker compose up -d
```

### Development Without Docker

For local development without Docker, see each directory's README for details:
- [Backend Setup](backend/README.md)
- [Frontend Setup](frontend/README.md)

### Troubleshooting

**Port already in use:**
If ports 3000, 8000, or 5432 are already in use, modify the port mappings in `docker-compose.yml`.

**Container fails to start:**
Check the logs with `docker compose logs <service-name>` to identify the issue.

---

## Data Model (Concept)

A simple example of relationship data:

```json
{
  "entities": [
    { "id": "a", "name": "Alice" },
    { "id": "b", "name": "Bob" }
  ],
  "relations": [
    { "from": "a", "to": "b", "type": "friend" }
  ]
}
```

---

## Roadmap

* [ ] Core relationship visualization
* [ ] Interactive UI (drag, zoom, filter)
* [ ] Relationship types and styling
* [ ] Export / import support
* [ ] Documentation and examples

---

## Contributing

Contributions are welcome!

If you have ideas, feature requests, or bug reports:

* Open an Issue
* Submit a Pull Request
* Share feedback and use cases

---

## License

This project is licensed under the MIT License.

