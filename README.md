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


You can start the full stack (backend, frontend, and database) using Docker Compose:

```bash
git clone https://github.com/yourname/relation-map.git
cd relation-map
docker-compose up --build
```

The backend (FastAPI) will be available at http://localhost:8000
The frontend (React) will be available at http://localhost:3000

For development without Docker, see each directory's README for details.

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

