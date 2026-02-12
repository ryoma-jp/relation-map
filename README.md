# relation-map

[![CI/CD Pipeline](https://github.com/ryoichi/relation-map/actions/workflows/ci.yml/badge.svg)](https://github.com/ryoichi/relation-map/actions/workflows/ci.yml)
[![CodeQL](https://github.com/ryoichi/relation-map/actions/workflows/codeql.yml/badge.svg)](https://github.com/ryoichi/relation-map/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An open-source tool to visualize relationships between people and entities.

## Overview

`relation-map` is an open-source project for creating clear and intuitive relationship diagrams.

It helps you understand complex connections between people, organizations, and other entities by turning structured data into visual maps.

Typical use cases include:
- Character relationship diagrams
- Organization and team structures
- Social or network relationship visualization
- Story, game, and world-building support

---

## Features

### Core Features
- **Visualize relationships as an interactive graph** - D3.js powered visualization
- **Simple data-driven structure** - JSON / REST API-friendly
- **Full CRUD operations** - Create, read, update, delete nodes and relationships
- **Export/Import functionality** - Save and share your relationship maps as JSON
- **Designed for extensibility and customization** - Built with React + FastAPI

### UI/UX Features
- **Advanced search and filtering**
  - Full-text search with debounce optimization
  - Filter by node type
  - Filter by relationship type
  - Real-time results update
  
- **Sidebar-based navigation**
  - Collapsible sidebar for compact view
  - Node list with descriptions
  - Relationship list with quick editing
  - Type management panel

- **Type management**
  - Create custom node types
  - Create custom relationship types
  - Rename types (bulk update all related nodes/relationships)
  - Delete types (cascade delete with confirmation)
  - Track usage count for each type

- **Interactive node details**
  - Click on nodes to view detailed information
  - Edit node properties, type, and description
  - Edit relationship properties inline
  - One-click delete functionality

- **Data persistence**
  - Export entire relationship map as JSON
  - Import from JSON files (merge or replace modes)
  - Automatic ID mapping during import
  - Support for zero-usage custom types

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

## Usage Guide

### Creating Nodes

1. Click the **"Add Node"** button in the toolbar
2. Enter node name (required)
3. Select or create a node type (person, organization, place, etc.)
4. Add optional description
5. Click **"Save"** to create the node

### Creating Relationships

1. Click the **"Add Relation"** button in the toolbar
2. Select source node and target node
3. Select or create a relationship type (friend, colleague, parent, etc.)
4. Add optional description
5. Click **"Save"** to create the relationship

### Editing Nodes/Relationships

**From sidebar:**
- Find the node/relationship in the sidebar list
- Click the **"Edit"** (✏️) button
- Modify properties and save

**From graph:**
- Double-click a node to edit
- Right-click for quick delete

### Using Search & Filter

1. **Search**: Use the search box at the top to filter nodes by name
2. **Type Filter**: Use the sidebar "Display Filter" section to show/hide specific node types
3. **Relation Type Filter**: Filter displayed relationships by type
4. Results update in real-time with 300ms debounce

### Managing Types (Custom Classifications)

1. Click the **"📋 Type Management"** button in the sidebar
2. **Add new type**:
   - Click **"+ Add new type"** button in entity/relationship section
   - Enter type name and save
3. **Rename type** (bulk update):
   - Click **"✏️"** button next to the type
   - Enter new name
   - All nodes/relationships using this type are renamed automatically
4. **Delete type** (cascade delete):
   - Click **"🗑️"** button next to the type
   - Confirm deletion
   - All nodes/relationships using this type are deleted
5. **Track usage**: See usage count for each type (0件 = unused custom types)

### Admin Console

When you log in as an admin user, an "🛡️ Admin" button appears in the header.

If the database is empty on first startup, a default admin user is created automatically.
See `backend/main.py` for the default credentials.

You can override the defaults with environment variables:
- `ADMIN_USERNAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

What you can do in the admin console:
- **Registered user management**: view/search the user list and force delete users
- **Audit logs**: review the history of admin actions

**Note**: Force delete removes data tied to the user. The last admin user cannot be deleted.

### Exporting Your Data

1. Click **"📥 Export"** button in the toolbar
2. Your browser downloads a JSON file with all nodes, relationships, and types
3. Share the file with others or use as backup

### Importing Data

1. Click **"📤 Import"** button in the toolbar
2. Select a previously exported JSON file
3. Choose import mode:
   - **Merge**: Add imported data to existing data
   - **Replace**: Clear existing data and load only imported data
4. Click **"Import"** to proceed

---

## Data Model

### Entity (Node)
```json
{
  "id": 1,
  "name": "Alice",
  "type": "person",
  "description": "Main character"
}
```

### Relation (Edge)
```json
{
  "id": 1,
  "source_id": 1,
  "target_id": 2,
  "relation_type": "friend",
  "description": "College friends"
}
```

### Export Format
```json
{
  "version": "1.0",
  "exported_at": "2026-02-01T12:00:00Z",
  "entities": [...],
  "relations": [...],
  "entity_types": ["person", "organization", "place"],
  "relation_types": ["friend", "colleague", "parent"]
}
```

---

## API Reference

### Entities

- `GET /entities/` - List all entities
- `POST /entities/` - Create new entity
- `GET /entities/{id}` - Get entity details
- `PUT /entities/{id}` - Update entity
- `DELETE /entities/{id}` - Delete entity

### Relationships

- `GET /relations/` - List all relationships
- `POST /relations/` - Create new relationship
- `GET /relations/{id}` - Get relationship details
- `PUT /relations/{id}` - Update relationship
- `DELETE /relations/{id}` - Delete relationship

### Data Management

- `GET /export` - Export all data as JSON
- `POST /import` - Import data from JSON (supports merge/replace modes)
- `POST /reset` - Delete all data and reset database

### Type Management

- `GET /entities/types` - List all entity types
- `POST /entities/types` - Create new entity type
- `DELETE /entities/types/{type_name}/only` - Delete entity type (0 usage)
- `PUT /entities/types/{old_type}` - Rename entity type (bulk update)
- `DELETE /entities/types/{type_name}` - Delete entity type (cascade delete)

- `GET /relations/types` - List all relationship types
- `POST /relations/types` - Create new relationship type
- `DELETE /relations/types/{type_name}/only` - Delete relationship type (0 usage)
- `PUT /relations/types/{old_type}` - Rename relationship type (bulk update)
- `DELETE /relations/types/{type_name}` - Delete relationship type (cascade delete)

### Admin

- `GET /admin/users` - List users (admin only, supports `q`, `limit`, `offset`)
- `DELETE /admin/users/{user_id}` - Force delete user (admin only)
- `GET /admin/audit-logs` - List audit logs (admin only)

For full API documentation, visit `http://localhost:8000/docs` (Swagger UI).

---

## Testing

This project includes comprehensive test coverage with unit tests and E2E tests.

### Running Tests Locally

**Backend Unit Tests:**
```bash
bash run-backend-tests.sh
```
This will run all backend unit tests in a Docker container with a test database.

**Frontend Unit Tests:**
```bash
bash run-frontend-tests.sh
```
This will run all frontend unit tests with Jest and React Testing Library.

**E2E Tests:**
```bash
bash run-e2e-tests.sh
```
This will start all services and run Playwright E2E tests in Docker.

### Test Coverage

- **Backend**: 75+ unit tests covering API endpoints, database operations, and business logic
- **Frontend**: 14+ unit tests covering components, forms, and API client
- **E2E**: 10+ integration tests covering user workflows

### Continuous Integration

All tests run automatically on:
- Every push to `main` or `develop` branches
- Every pull request
- Weekly security scans with CodeQL

View test results and coverage reports in the [GitHub Actions](https://github.com/ryoichi/relation-map/actions) tab.

---

## Architecture

```
relation-map/
├── backend/               # FastAPI Python server
│   ├── api.py            # REST API endpoints & business logic
│   ├── models.py         # SQLAlchemy ORM models
│   ├── schemas.py        # Pydantic validation schemas
│   ├── db.py             # Database connection
│   └── requirements.txt
├── frontend/              # React TypeScript client
│   ├── src/
│   │   ├── App.tsx       # Main app component with sidebar & search
│   │   ├── Graph.tsx     # D3.js visualization
│   │   ├── EntityModal.tsx  # Node form
│   │   ├── RelationModal.tsx # Relationship form
│   │   ├── TypeManagementDialog.tsx # Type management UI
│   │   ├── ImportDialog.tsx # Import UI
│   │   ├── api.ts        # API client functions
│   │   └── sampleData.ts # Demo data
│   └── package.json
├── docker-compose.yml     # Docker services configuration
└── README.md             # This file
```

### Technology Stack

**Backend:**
- FastAPI (modern Python web framework)
- SQLAlchemy (ORM)
- Pydantic v2 (data validation)
- PostgreSQL (database)

**Frontend:**
- React 18 (UI framework)
- TypeScript (type safety)
- D3.js (graph visualization)
- lodash (utility functions)

---

## Roadmap

### Completed ✅
- [x] Core relationship visualization
- [x] Interactive UI (drag, zoom, pan, filter)
- [x] Relationship types and styling
- [x] Export / import support
- [x] Search and filtering
- [x] Type management
- [x] Documentation and examples

### In Progress / Planned
- [ ] Unit and E2E tests
- [ ] User authentication
- [ ] Multi-project support
- [ ] Real-time synchronization (WebSocket)
- [ ] Advanced styling and themes
- [ ] Template and preset system
- [ ] Version history / undo-redo
- [ ] Keyboard shortcuts
- [ ] Dark mode

---

## Contributing

Contributions are welcome!

If you have ideas, feature requests, or bug reports:

* Open an Issue on GitHub
* Submit a Pull Request with improvements
* Share feedback and use cases

For detailed development guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

## Support & FAQ

### Q: How do I backup my data?
**A:** Click the "📥 Export" button to download a JSON file. Keep it safe!

### Q: Can I import data from other tools?
**A:** If you can convert your data to the JSON format described in "Data Model", you can import it. Check the export format and adjust your data accordingly.

### Q: How many nodes/relationships can I handle?
**A:** The system has been tested with 1000+ nodes. Performance depends on your machine. For large datasets, filtering helps visualization.

### Q: Can multiple people edit the same map at the same time?
**A:** Not yet. Use Export/Import to share data manually. Real-time sync is on the roadmap.

### Q: How do I delete everything and start fresh?
**A:** Click "Reset" in the data management section, or run `docker compose down -v && docker compose up -d` to reset the database.

---

## Changelog

### v1.0.0 (2026-02-01)
- ✨ Feature 7.1: Basic features refinement complete
  - Export/import functionality
  - Advanced search and filtering
  - Type management system
  - Interactive node details
  - Performance optimization
  - Complete documentation

