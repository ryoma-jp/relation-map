"""
API Endpoint Tests for Entity and Relation CRUD operations.
Tests cover all main API endpoints with positive and negative scenarios.
"""

import pytest
from fastapi import HTTPException


class TestRootEndpoint:
    """Test root and general endpoints."""
    
    def test_read_root(self, client):
        """Test GET / endpoint."""
        response = client.get("/")
        assert response.status_code == 200
        assert response.json() == {"message": "Relation Map API is running."}


class TestEntityTypeEndpoints:
    """Test Entity Type management endpoints."""
    
    def test_list_entity_types_empty(self, client, db_session):
        """Test listing entity types when empty."""
        response = client.get("/entities/types")
        assert response.status_code == 200
        assert response.json() == []
    
    def test_create_entity_type_success(self, client):
        """Test creating a new entity type successfully."""
        payload = {"name": "Person"}
        response = client.post("/entities/types", json=payload)
        assert response.status_code == 200
        assert response.json() == {"ok": True, "name": "Person"}
    
    def test_create_entity_type_duplicate(self, client):
        """Test creating duplicate entity type."""
        payload = {"name": "Person"}
        client.post("/entities/types", json=payload)
        
        # Create duplicate
        response = client.post("/entities/types", json=payload)
        assert response.status_code == 409
        assert response.json()["detail"] == "Type already exists"
    
    def test_create_entity_type_empty_name(self, client):
        """Test creating entity type with empty name."""
        payload = {"name": "   "}  # Only whitespace
        response = client.post("/entities/types", json=payload)
        assert response.status_code == 400
        assert response.json()["detail"] == "Type name is required"
    
    def test_list_entity_types_after_creation(self, client):
        """Test listing entity types after creation."""
        client.post("/entities/types", json={"name": "Person"})
        client.post("/entities/types", json={"name": "Organization"})
        
        response = client.get("/entities/types")
        assert response.status_code == 200
        types = response.json()
        assert len(types) == 2
        assert "Person" in types
        assert "Organization" in types
    
    def test_delete_entity_type_success(self, client):
        """Test deleting entity type successfully."""
        # Create a type first
        client.post("/entities/types", json={"name": "Temp"})
        
        # Delete it
        response = client.delete("/entities/types/Temp/only")
        assert response.status_code == 200
        assert response.json() == {"ok": True}
    
    def test_delete_entity_type_not_found(self, client):
        """Test deleting non-existent entity type."""
        response = client.delete("/entities/types/NonExistent/only")
        assert response.status_code == 404
    
    def test_delete_entity_type_in_use(self, client):
        """Test deleting entity type that is in use."""
        # Create type and entity
        client.post("/entities/types", json={"name": "Person"})
        client.post("/entities/", json={
            "name": "John",
            "type": "Person",
            "description": "A person"
        })
        
        # Try to delete
        response = client.delete("/entities/types/Person/only")
        assert response.status_code == 409
        assert response.json()["detail"] == "Type is in use"


class TestRelationTypeEndpoints:
    """Test Relation Type management endpoints."""
    
    def test_list_relation_types_empty(self, client):
        """Test listing relation types when empty."""
        response = client.get("/relations/types")
        assert response.status_code == 200
        assert response.json() == []
    
    def test_create_relation_type_success(self, client):
        """Test creating a new relation type successfully."""
        payload = {"name": "Friend"}
        response = client.post("/relations/types", json=payload)
        assert response.status_code == 200
        assert response.json() == {"ok": True, "name": "Friend"}
    
    def test_create_relation_type_duplicate(self, client):
        """Test creating duplicate relation type."""
        payload = {"name": "Friend"}
        client.post("/relations/types", json=payload)
        
        # Create duplicate
        response = client.post("/relations/types", json=payload)
        assert response.status_code == 409
    
    def test_delete_relation_type_success(self, client):
        """Test deleting relation type successfully."""
        client.post("/relations/types", json={"name": "Colleague"})
        response = client.delete("/relations/types/Colleague/only")
        assert response.status_code == 200
        assert response.json() == {"ok": True}


class TestEntityCRUD:
    """Test Entity CRUD operations."""
    
    def test_create_entity_success(self, client):
        """Test creating an entity successfully."""
        payload = {
            "name": "Alice",
            "type": "person",
            "description": "A test person"
        }
        response = client.post("/entities/", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Alice"
        assert data["type"] == "person"
        assert data["description"] == "A test person"
        assert "id" in data
    
    def test_create_entity_missing_required_field(self, client):
        """Test creating entity without required field."""
        payload = {"type": "person"}  # Missing 'name'
        response = client.post("/entities/", json=payload)
        assert response.status_code == 422  # Validation error
    
    def test_read_entities_empty(self, client):
        """Test reading entities when list is empty."""
        response = client.get("/entities/")
        assert response.status_code == 200
        assert response.json() == []
    
    def test_read_entities_after_creation(self, client):
        """Test reading entities after creating some."""
        # Create entities
        client.post("/entities/", json={
            "name": "Alice",
            "type": "person"
        })
        client.post("/entities/", json={
            "name": "Bob",
            "type": "person"
        })
        
        response = client.get("/entities/")
        assert response.status_code == 200
        entities = response.json()
        assert len(entities) == 2
        assert entities[0]["name"] == "Alice"
        assert entities[1]["name"] == "Bob"
    
    def test_read_entity_by_id_success(self, client):
        """Test reading a specific entity by ID."""
        # Create entity
        create_response = client.post("/entities/", json={
            "name": "Charlie",
            "type": "person"
        })
        entity_id = create_response.json()["id"]
        
        # Read it
        response = client.get(f"/entities/{entity_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == entity_id
        assert data["name"] == "Charlie"
    
    def test_read_entity_not_found(self, client):
        """Test reading non-existent entity."""
        response = client.get("/entities/99999")
        assert response.status_code == 404
        assert response.json()["detail"] == "Entity not found"
    
    def test_update_entity_success(self, client):
        """Test updating an entity."""
        # Create entity
        create_response = client.post("/entities/", json={
            "name": "David",
            "type": "person",
            "description": "Original"
        })
        entity_id = create_response.json()["id"]
        
        # Update it
        payload = {
            "name": "David Smith",
            "type": "person",
            "description": "Updated"
        }
        response = client.put(f"/entities/{entity_id}", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "David Smith"
        assert data["description"] == "Updated"
    
    def test_update_entity_not_found(self, client):
        """Test updating non-existent entity."""
        payload = {"name": "Test", "type": "person"}
        response = client.put("/entities/99999", json=payload)
        assert response.status_code == 404
    
    def test_delete_entity_success(self, client):
        """Test deleting an entity."""
        # Create entity
        create_response = client.post("/entities/", json={
            "name": "Eve",
            "type": "person"
        })
        entity_id = create_response.json()["id"]
        
        # Delete it
        response = client.delete(f"/entities/{entity_id}")
        assert response.status_code == 200
        assert response.json() == {"ok": True}
        
        # Verify it's gone
        get_response = client.get(f"/entities/{entity_id}")
        assert get_response.status_code == 404
    
    def test_delete_entity_not_found(self, client):
        """Test deleting non-existent entity."""
        response = client.delete("/entities/99999")
        assert response.status_code == 404
    
    def test_read_entities_with_pagination(self, client):
        """Test reading entities with skip and limit parameters."""
        # Create 5 entities
        for i in range(5):
            client.post("/entities/", json={
                "name": f"Entity{i}",
                "type": "person"
            })
        
        # Test skip
        response = client.get("/entities/?skip=2&limit=2")
        assert response.status_code == 200
        entities = response.json()
        assert len(entities) == 2


class TestRelationCRUD:
    """Test Relation CRUD operations."""
    
    def test_create_relation_success(self, client, sample_entities):
        """Test creating a relation successfully."""
        payload = {
            "source_id": sample_entities[0].id,
            "target_id": sample_entities[1].id,
            "relation_type": "friend",
            "description": "They are friends"
        }
        response = client.post("/relations/", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["source_id"] == sample_entities[0].id
        assert data["target_id"] == sample_entities[1].id
        assert data["relation_type"] == "friend"
        assert "id" in data
    
    def test_create_relation_missing_entity(self, client):
        """Test creating relation with non-existent entities."""
        payload = {
            "source_id": 99999,
            "target_id": 88888,
            "relation_type": "friend"
        }
        response = client.post("/relations/", json=payload)
        # This might be 200 (allows orphaned relations) or 400 (validates entities exist)
        # depending on implementation
        assert response.status_code in [200, 400, 404]
    
    def test_read_relations_empty(self, client):
        """Test reading relations when list is empty."""
        response = client.get("/relations/")
        assert response.status_code == 200
        assert response.json() == []
    
    def test_read_relations_after_creation(self, client, sample_entities):
        """Test reading relations after creating some."""
        # Create relations
        client.post("/relations/", json={
            "source_id": sample_entities[0].id,
            "target_id": sample_entities[1].id,
            "relation_type": "friend"
        })
        client.post("/relations/", json={
            "source_id": sample_entities[1].id,
            "target_id": sample_entities[2].id,
            "relation_type": "colleague"
        })
        
        response = client.get("/relations/")
        assert response.status_code == 200
        relations = response.json()
        assert len(relations) == 2
    
    def test_read_relation_by_id_success(self, client, sample_entities):
        """Test reading a specific relation by ID."""
        # Create relation
        create_response = client.post("/relations/", json={
            "source_id": sample_entities[0].id,
            "target_id": sample_entities[1].id,
            "relation_type": "family"
        })
        relation_id = create_response.json()["id"]
        
        # Read it
        response = client.get(f"/relations/{relation_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == relation_id
        assert data["relation_type"] == "family"
    
    def test_read_relation_not_found(self, client):
        """Test reading non-existent relation."""
        response = client.get("/relations/99999")
        assert response.status_code == 404
    
    def test_update_relation_success(self, client, sample_entities):
        """Test updating a relation."""
        # Create relation
        create_response = client.post("/relations/", json={
            "source_id": sample_entities[0].id,
            "target_id": sample_entities[1].id,
            "relation_type": "friend"
        })
        relation_id = create_response.json()["id"]
        
        # Update it
        payload = {
            "source_id": sample_entities[0].id,
            "target_id": sample_entities[2].id,
            "relation_type": "colleague"
        }
        response = client.put(f"/relations/{relation_id}", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["relation_type"] == "colleague"
    
    def test_delete_relation_success(self, client, sample_entities):
        """Test deleting a relation."""
        # Create relation
        create_response = client.post("/relations/", json={
            "source_id": sample_entities[0].id,
            "target_id": sample_entities[1].id,
            "relation_type": "friend"
        })
        relation_id = create_response.json()["id"]
        
        # Delete it
        response = client.delete(f"/relations/{relation_id}")
        assert response.status_code == 200
        assert response.json() == {"ok": True}
        
        # Verify it's gone
        get_response = client.get(f"/relations/{relation_id}")
        assert get_response.status_code == 404


class TestDataManagement:
    """Test data export, import, and reset operations."""
    
    def test_reset_data_empty(self, client):
        """Test resetting data when there's nothing to reset."""
        response = client.post("/reset")
        assert response.status_code == 200
        assert response.json()["ok"] is True
    
    def test_reset_data_with_entities(self, client, sample_entities, sample_relations):
        """Test resetting data with existing entities and relations."""
        # Verify data exists
        entities_before = client.get("/entities/").json()
        assert len(entities_before) > 0
        
        # Reset
        response = client.post("/reset")
        assert response.status_code == 200
        assert response.json()["ok"] is True
        
        # Verify data is gone
        entities_after = client.get("/entities/").json()
        assert len(entities_after) == 0
        relations_after = client.get("/relations/").json()
        assert len(relations_after) == 0
    
    def test_export_data_empty(self, client):
        """Test exporting data when empty."""
        response = client.get("/export")
        assert response.status_code == 200
        data = response.json()
        assert "version" in data
        assert "exported_at" in data
        assert data["entities"] == []
        assert data["relations"] == []
    
    def test_export_data_with_content(self, client, sample_entities, sample_relations):
        """Test exporting data with content."""
        response = client.get("/export")
        assert response.status_code == 200
        data = response.json()
        assert len(data["entities"]) == 3  # sample_entities creates 3
        assert len(data["relations"]) == 2  # sample_relations creates 2
        assert "entity_types" in data
        assert "relation_types" in data
    
    def test_import_data_replace_mode(self, client):
        """Test importing data in replace mode."""
        import_payload = {
            "version": "1.0",
            "entities": [
                {"name": "Import1", "type": "person", "description": None},
                {"name": "Import2", "type": "organization", "description": None}
            ],
            "relations": [],
            "entity_types": ["person", "organization"],
            "relation_types": []
        }
        
        response = client.post("/import?mode=replace", json=import_payload)
        assert response.status_code == 200
        result = response.json()
        assert result["ok"] is True
        assert result["imported_entities"] == 2
        
        # Verify data is imported
        entities = client.get("/entities/").json()
        assert len(entities) == 2


class TestTypeManagement:
    """Test type renaming and deletion operations."""
    
    def test_delete_entity_type_with_cascade(self, client):
        """Test deleting entity type cascades to entities."""
        # Create type and entities
        client.post("/entities/types", json={"name": "Temp"})
        entity1 = client.post("/entities/", json={
            "name": "E1", "type": "Temp"
        }).json()
        entity2 = client.post("/entities/", json={
            "name": "E2", "type": "Temp"
        }).json()
        
        # Delete type (should cascade)
        response = client.delete("/entities/types/Temp")
        assert response.status_code == 200
        assert response.json()["deleted_entities"] == 2
        
        # Verify entities are gone
        entities = client.get("/entities/").json()
        assert len(entities) == 0
    
    def test_delete_relation_type(self, client, sample_entities):
        """Test deleting relation type."""
        # Create relations
        client.post("/relations/", json={
            "source_id": sample_entities[0].id,
            "target_id": sample_entities[1].id,
            "relation_type": "temp_type"
        })
        
        # Delete relation type
        response = client.delete("/relations/types/temp_type")
        assert response.status_code == 200
        assert response.json()["deleted_count"] == 1
        
        # Verify relations are gone
        relations = client.get("/relations/").json()
        assert len(relations) == 0
