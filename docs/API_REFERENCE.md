# relation-map API Reference

Complete API documentation for relation-map backend.

**Base URL**: `http://localhost:8000`

**Format**: JSON (Content-Type: `application/json`)

---

## Table of Contents

1. [Entities (Nodes)](#entities-nodes)
2. [Relationships (Edges)](#relationships-edges)
3. [Data Management](#data-management)
4. [Type Management](#type-management)
5. [Error Handling](#error-handling)

---

## Entities (Nodes)

### List Entities

**Endpoint** `GET /entities/`

**Query Parameters:**
- `skip` (optional, default: 0) - Number of records to skip for pagination
- `limit` (optional, default: 100) - Maximum number of records to return

**Response:**
```json
[
  {
    "id": 1,
    "name": "Alice",
    "type": "person",
    "description": "Main character"
  },
  {
    "id": 2,
    "name": "Bob",
    "type": "person",
    "description": ""
  }
]
```

**Status Code:** 200 OK

---

### Get Single Entity

**Endpoint** `GET /entities/{entity_id}`

**Path Parameters:**
- `entity_id` (required) - Entity ID as integer

**Response:**
```json
{
  "id": 1,
  "name": "Alice",
  "type": "person",
  "description": "Main character"
}
```

**Status Codes:**
- 200 OK
- 404 Not Found (if entity doesn't exist)

---

### Create Entity

**Endpoint** `POST /entities/`

**Request Body:**
```json
{
  "name": "Charlie",
  "type": "person",
  "description": "Secondary character"
}
```

**Request Field Rules:**
- `name` (required, string) - Entity name, non-empty
- `type` (required, string) - Entity type classification
- `description` (optional, string) - Extended description

**Response:**
```json
{
  "id": 3,
  "name": "Charlie",
  "type": "person",
  "description": "Secondary character"
}
```

**Status Code:** 201 Created (or 200 if server doesn't return 201)

---

### Update Entity

**Endpoint** `PUT /entities/{entity_id}`

**Path Parameters:**
- `entity_id` (required) - Entity ID to update

**Request Body:**
```json
{
  "name": "Charlie Updated",
  "type": "organization",
  "description": "Now an organization"
}
```

**Response:**
```json
{
  "id": 3,
  "name": "Charlie Updated",
  "type": "organization",
  "description": "Now an organization"
}
```

**Status Codes:**
- 200 OK
- 404 Not Found (if entity doesn't exist)

---

### Delete Entity

**Endpoint** `DELETE /entities/{entity_id}`

**Path Parameters:**
- `entity_id` (required) - Entity ID to delete

**Response:**
```json
{
  "ok": true
}
```

**Status Codes:**
- 200 OK
- 404 Not Found (if entity doesn't exist)

**Side Effects:** 
- Deletes the entity
- Cascades to delete all relationships where this entity is source or target

---

## Relationships (Edges)

### List Relationships

**Endpoint** `GET /relations/`

**Query Parameters:**
- `skip` (optional, default: 0) - Number of records to skip
- `limit` (optional, default: 100) - Maximum number of records

**Response:**
```json
[
  {
    "id": 1,
    "source_id": 1,
    "target_id": 2,
    "relation_type": "friend",
    "description": "College friends"
  }
]
```

**Status Code:** 200 OK

---

### Get Single Relationship

**Endpoint** `GET /relations/{relation_id}`

**Path Parameters:**
- `relation_id` (required) - Relationship ID

**Response:**
```json
{
  "id": 1,
  "source_id": 1,
  "target_id": 2,
  "relation_type": "friend",
  "description": "College friends"
}
```

**Status Codes:**
- 200 OK
- 404 Not Found

---

### Create Relationship

**Endpoint** `POST /relations/`

**Request Body:**
```json
{
  "source_id": 1,
  "target_id": 2,
  "relation_type": "friend",
  "description": "College friends"
}
```

**Request Field Rules:**
- `source_id` (required, integer) - ID of source entity
- `target_id` (required, integer) - ID of target entity
- `relation_type` (required, string) - Type of relationship
- `description` (optional, string) - Additional details

**Response:**
```json
{
  "id": 1,
  "source_id": 1,
  "target_id": 2,
  "relation_type": "friend",
  "description": "College friends"
}
```

**Status Code:** 201 Created (or 200)

---

### Update Relationship

**Endpoint** `PUT /relations/{relation_id}`

**Path Parameters:**
- `relation_id` (required) - Relationship ID to update

**Request Body:**
```json
{
  "source_id": 1,
  "target_id": 2,
  "relation_type": "colleague",
  "description": "Worked together at company X"
}
```

**Response:**
```json
{
  "id": 1,
  "source_id": 1,
  "target_id": 2,
  "relation_type": "colleague",
  "description": "Worked together at company X"
}
```

**Status Codes:**
- 200 OK
- 404 Not Found

---

### Delete Relationship

**Endpoint** `DELETE /relations/{relation_id}`

**Path Parameters:**
- `relation_id` (required) - Relationship ID to delete

**Response:**
```json
{
  "ok": true
}
```

**Status Codes:**
- 200 OK
- 404 Not Found

---

## Data Management

### Export Data

**Endpoint** `GET /export`

**Description** Export all entities, relationships, and types as JSON

**Query Parameters:** None

**Response:**
```json
{
  "version": "1.0",
  "exported_at": "2026-02-01T12:00:00.000Z",
  "entities": [
    {
      "id": 1,
      "name": "Alice",
      "type": "person",
      "description": "Main character"
    }
  ],
  "relations": [
    {
      "id": 1,
      "source_id": 1,
      "target_id": 2,
      "relation_type": "friend",
      "description": "College friends"
    }
  ],
  "entity_types": ["person", "organization", "place"],
  "relation_types": ["friend", "colleague", "parent"]
}
```

**Status Code:** 200 OK

---

### Import Data

**Endpoint** `POST /import`

**Query Parameters:**
- `mode` (optional, default: "merge", enum: ["merge", "replace"])
  - `merge`: Add imported data to existing data
  - `replace`: Delete all existing data and load only imported data

**Request Body:** (same as Export response format)
```json
{
  "version": "1.0",
  "exported_at": "2026-02-01T12:00:00.000Z",
  "entities": [...],
  "relations": [...],
  "entity_types": [...],
  "relation_types": [...]
}
```

**Response:**
```json
{
  "ok": true,
  "imported_entities": 3,
  "imported_relations": 2,
  "skipped": 0
}
```

**Status Codes:**
- 200 OK
- 400 Bad Request (invalid data format)
- 500 Internal Server Error (database error)

**Notes:**
- IDs are automatically remapped during import
- Entity type and relationship type lists are created if they don't exist
- In replace mode, all existing data is deleted first

---

### Reset Database

**Endpoint** `POST /reset`

**Description** Delete all entities, relationships, and types. Use with caution!

**Request Body:** None

**Response:**
```json
{
  "ok": true,
  "message": "All data has been reset"
}
```

**Status Code:** 200 OK

---

## Type Management

### List Entity Types

**Endpoint** `GET /entities/types`

**Description** Get all entity types currently in the system

**Response:**
```json
["person", "organization", "place", "event"]
```

**Status Code:** 200 OK

---

### Create Entity Type

**Endpoint** `POST /entities/types`

**Request Body:**
```json
{
  "name": "custom_type"
}
```

**Request Field Rules:**
- `name` (required, string) - Type name, must be unique

**Response:**
```json
{
  "ok": true,
  "name": "custom_type"
}
```

**Status Codes:**
- 200 OK
- 400 Bad Request (empty name)
- 409 Conflict (type already exists)

---

### Delete Entity Type (With 0 Usage Only)

**Endpoint** `DELETE /entities/types/{type_name}/only`

**Path Parameters:**
- `type_name` (required) - Type name to delete

**Description** Delete a type only if it has no entities using it

**Response:**
```json
{
  "ok": true
}
```

**Status Codes:**
- 200 OK
- 404 Not Found (type doesn't exist)
- 409 Conflict (type is in use)

---

### Rename Entity Type (Bulk Update)

**Endpoint** `PUT /entities/types/{old_type}`

**Path Parameters:**
- `old_type` (required) - Current type name

**Query Parameters:**
- `new_type` (required) - New type name

**Description** Rename a type and update all entities using it

**Response:**
```json
{
  "ok": true,
  "updated_count": 3,
  "old_type": "person",
  "new_type": "human"
}
```

**Status Codes:**
- 200 OK
- 404 Not Found (old_type doesn't exist)
- 409 Conflict (new_type already exists)

---

### Delete Entity Type (Cascade Delete)

**Endpoint** `DELETE /entities/types/{type_name}`

**Path Parameters:**
- `type_name` (required) - Type name to delete

**Description** Delete a type and all entities using it (as well as related relationships)

**Response:**
```json
{
  "ok": true,
  "deleted_entities": 3,
  "deleted_relations": 2
}
```

**Status Codes:**
- 200 OK
- 404 Not Found (no entities with this type)

---

### List Relationship Types

**Endpoint** `GET /relations/types`

**Description** Get all relationship types in the system

**Response:**
```json
["friend", "colleague", "parent", "sibling"]
```

**Status Code:** 200 OK

---

### Create Relationship Type

**Endpoint** `POST /relations/types`

**Request Body:**
```json
{
  "name": "mentor"
}
```

**Response:**
```json
{
  "ok": true,
  "name": "mentor"
}
```

**Status Codes:**
- 200 OK
- 400 Bad Request
- 409 Conflict

---

### Delete Relationship Type (With 0 Usage Only)

**Endpoint** `DELETE /relations/types/{type_name}/only`

**Path Parameters:**
- `type_name` (required) - Type name

**Status Codes:**
- 200 OK
- 404 Not Found
- 409 Conflict (in use)

---

### Rename Relationship Type (Bulk Update)

**Endpoint** `PUT /relations/types/{old_type}`

**Query Parameters:**
- `new_type` (required) - New type name

**Status Codes:**
- 200 OK
- 404 Not Found
- 409 Conflict

---

### Delete Relationship Type (Cascade Delete)

**Endpoint** `DELETE /relations/types/{type_name}`

**Description** Delete type and all relationships using it

**Status Codes:**
- 200 OK
- 404 Not Found

---

## Error Handling

### Error Response Format

All errors follow this format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes

| Status | Meaning |
|--------|---------|
| 200 | OK - Request succeeded |
| 201 | Created - Resource created (optional for this API) |
| 400 | Bad Request - Invalid input |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource conflicts (e.g., duplicate name) |
| 422 | Unprocessable Entity - Validation failed |
| 500 | Internal Server Error - Server error |

### Example Error Response

```json
{
  "detail": "Type 'person' already exists"
}
```

---

## Best Practices

### Pagination
For large datasets, use pagination:
```
GET /entities/?skip=0&limit=50
```

### Type Management
- Create custom types before creating entities/relationships with those types
- Always check for conflicts before renaming/deleting types
- Use `/only` endpoint to delete 0-usage types safely

### Data Backup
- Regularly export data using `GET /export`
- Save exports to version control or cloud storage
- Use `POST /import?mode=replace` to restore from backups

### Batch Operations
- To migrate data between environments, use Export + Import
- Import operations are atomic (either all succeed or all fail)

---

## Interactive API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

These interfaces allow you to try endpoints directly in your browser.
