"""
Version Management Tests for history, snapshots, and restore functionality.
Tests cover version creation, retrieval, and restoration scenarios.
"""

import pytest
from models import Version, Entity, Relation, RelationType, EntityType
from version_service import VersionService


class TestVersionService:
    """Test VersionService methods."""

    def test_create_version_empty_database(self, db_session, sample_user):
        """Test creating first version with empty database."""
        version = VersionService.create_version(db_session, "Initial version", "system", sample_user)
        
        assert version.version_number == 1
        assert version.description == "Initial version"
        assert version.created_by == "system"
        assert version.snapshot is not None
        assert len(version.snapshot["entities"]) == 0
        assert len(version.snapshot["relations"]) == 0

    def test_create_version_with_data(self, db_session, sample_user, sample_entities):
        """Test creating version with entities in database."""
        version = VersionService.create_version(db_session, "With entities", "system", sample_user)
        
        assert version.version_number == 1
        assert len(version.snapshot["entities"]) == 3
        assert version.snapshot["entities"][0]["name"] == "Alice"

    def test_create_version_increments_number(self, db_session, sample_user, sample_entities):
        """Test that version numbers increment properly."""
        version1 = VersionService.create_version(db_session, "v1", "system", sample_user)
        version2 = VersionService.create_version(db_session, "v2", "system", sample_user)
        version3 = VersionService.create_version(db_session, "v3", "system", sample_user)
        
        assert version1.version_number == 1
        assert version2.version_number == 2
        assert version3.version_number == 3

    def test_get_all_versions(self, db_session, sample_user, sample_entities):
        """Test retrieving all versions."""
        v1 = VersionService.create_version(db_session, "v1", "system", sample_user)
        v2 = VersionService.create_version(db_session, "v2", "system", sample_user)
        
        versions = VersionService.get_all_versions(db_session, sample_user.id)
        
        assert len(versions) == 2
        # Should be reverse chronological (newest first)
        assert versions[0].version_number == 2
        assert versions[1].version_number == 1

    def test_get_version_by_id(self, db_session, sample_user, sample_entities):
        """Test retrieving a specific version."""
        v1 = VersionService.create_version(db_session, "v1", "system", sample_user)
        
        retrieved = VersionService.get_version(db_session, v1.id, sample_user.id)
        
        assert retrieved is not None
        assert retrieved.id == v1.id
        assert retrieved.version_number == 1

    def test_get_version_not_found(self, db_session, sample_user):
        """Test retrieving non-existent version."""
        retrieved = VersionService.get_version(db_session, 999, sample_user.id)
        assert retrieved is None

    def test_restore_version_empty_database(self, db_session, sample_user, sample_entities):
        """Test restoring from first version."""
        # Create version with 3 entities
        v1 = VersionService.create_version(db_session, "v1", "system", sample_user)
        
        # Delete all entities
        db_session.query(Entity).delete()
        db_session.commit()
        assert db_session.query(Entity).count() == 0
        
        # Restore
        restored = VersionService.restore_version(db_session, v1.id, create_backup=False, user_id=sample_user.id)
        
        # Should be at v2 now (restore creates a new version)
        assert restored.version_number == 2
        assert db_session.query(Entity).count() == 3

    def test_restore_version_creates_backup(self, db_session, sample_user, sample_entities):
        """Test that restore creates backup when requested."""
        v1 = VersionService.create_version(db_session, "v1", "system", sample_user)
        
        # Modify data
        db_session.query(Entity).delete()
        db_session.commit()
        
        # Restore with backup
        restored = VersionService.restore_version(db_session, v1.id, create_backup=True, user_id=sample_user.id)
        
        # Should have created v2 (backup) and v3 (restore)
        versions = VersionService.get_all_versions(db_session, sample_user.id)
        assert len(versions) == 3

    def test_restore_version_restores_entities(self, db_session, sample_user, sample_entities):
        """Test that restore properly restores all entities."""
        v1 = VersionService.create_version(db_session, "v1", "system", sample_user)
        
        # Delete data
        db_session.query(Relation).delete()
        db_session.query(Entity).delete()
        db_session.commit()
        
        # Verify empty
        assert db_session.query(Entity).count() == 0
        
        # Restore
        VersionService.restore_version(db_session, v1.id, create_backup=False, user_id=sample_user.id)
        
        # Verify restored
        entities = db_session.query(Entity).all()
        assert len(entities) == 3
        assert entities[0].name in ["Alice", "Bob", "Charlie"]

    def test_restore_version_restores_relations(self, db_session, sample_user, sample_entities, sample_relations):
        """Test that restore properly restores all relations."""
        v1 = VersionService.create_version(db_session, "v1", "system", sample_user)
        
        # Delete relations
        db_session.query(Relation).delete()
        db_session.commit()
        
        # Verify empty
        assert db_session.query(Relation).count() == 0
        
        # Restore
        VersionService.restore_version(db_session, v1.id, create_backup=False, user_id=sample_user.id)
        
        # Verify restored
        relations = db_session.query(Relation).all()
        assert len(relations) == 2

    def test_restore_version_not_found(self, db_session, sample_user):
        """Test restoring non-existent version."""
        with pytest.raises(ValueError):
            VersionService.restore_version(db_session, 999, create_backup=False, user_id=sample_user.id)

    def test_snapshot_contains_all_data_types(self, db_session, sample_user, sample_entities, sample_entity_types, sample_relations, sample_relation_types):
        """Test that snapshot includes entities, relations, and types."""
        v1 = VersionService.create_version(db_session, "v1", "system", sample_user)
        
        snapshot = v1.snapshot
        assert "entities" in snapshot
        assert "relations" in snapshot
        assert "entity_types" in snapshot
        assert "relation_types" in snapshot
        
        assert len(snapshot["entities"]) == 3
        assert len(snapshot["relations"]) == 2
        # Entity types are derived from entities, all sample_entities have type="person", so only 1 unique type
        assert len(snapshot["entity_types"]) >= 1
        # Relation types from sample_relation_types fixture (3 types)
        assert len(snapshot["relation_types"]) == 3


class TestVersionEndpoints:
    """Test version management API endpoints."""

    def test_list_versions_empty(self, authenticated_client):
        """Test listing versions when empty."""
        response = authenticated_client.get("/api/versions")
        assert response.status_code == 200
        assert response.json() == []

    def test_list_versions_after_entity_creation(self, authenticated_client):
        """Test version is created automatically after entity creation."""
        # Create entity
        entity_data = {"name": "Test", "type": "person"}
        authenticated_client.post("/api/entities/", json=entity_data)
        
        # List versions
        response = authenticated_client.get("/api/versions")
        assert response.status_code == 200
        versions = response.json()
        assert len(versions) == 1
        assert versions[0]["version_number"] == 1
        assert "Added entity: Test" in versions[0]["description"]

    def test_list_versions_multiple(self, authenticated_client):
        """Test listing multiple versions."""
        # Create multiple entities
        for i in range(3):
            entity_data = {"name": f"Entity{i}", "type": "person"}
            authenticated_client.post("/api/entities/", json=entity_data)
        
        # List versions
        response = authenticated_client.get("/api/versions")
        assert response.status_code == 200
        versions = response.json()
        assert len(versions) == 3

    def test_get_version(self, authenticated_client):
        """Test getting a specific version."""
        # Create entity (creates v1)
        entity_data = {"name": "Test", "type": "person"}
        authenticated_client.post("/api/entities/", json=entity_data)
        
        # Get versions list
        response = authenticated_client.get("/api/versions")
        version_id = response.json()[0]["id"]
        
        # Get specific version
        response = authenticated_client.get(f"/api/versions/{version_id}")
        assert response.status_code == 200
        version = response.json()
        assert version["version_number"] == 1
        assert version["snapshot"]["entities"][0]["name"] == "Test"

    def test_get_version_not_found(self, authenticated_client):
        """Test getting non-existent version."""
        response = authenticated_client.get("/api/versions/999")
        assert response.status_code == 404

    def test_create_checkpoint(self, authenticated_client):
        """Test creating a checkpoint."""
        # Create entity first
        entity_data = {"name": "Test", "type": "person"}
        authenticated_client.post("/api/entities/", json=entity_data)
        
        # Create checkpoint
        response = authenticated_client.post("/api/versions/create-checkpoint?description=My%20Checkpoint")
        assert response.status_code == 200
        checkpoint = response.json()
        assert checkpoint["description"] == "My Checkpoint"
        assert checkpoint["version_number"] == 2

    def test_restore_version(self, authenticated_client):
        """Test restoring to a previous version."""
        # Create entity
        entity_data1 = {"name": "Entity1", "type": "person"}
        resp = authenticated_client.post("/api/entities/", json=entity_data1)
        entity1_id = resp.json()["id"]
        
        # Get v1
        versions = authenticated_client.get("/api/versions").json()
        v1_id = versions[0]["id"]
        v1_version_number = versions[0]["version_number"]
        
        # Create another entity (creates v2)
        entity_data2 = {"name": "Entity2", "type": "person"}
        authenticated_client.post("/api/entities/", json=entity_data2)
        
        # Verify 2 entities exist
        entities = authenticated_client.get("/api/entities/").json()
        assert len(entities) == 2
        
        # Restore to v1
        response = authenticated_client.post(f"/api/versions/{v1_id}/restore?create_backup=true")
        assert response.status_code == 200
        assert response.json()["ok"] is True
        
        # Verify only 1 entity exists again
        entities = authenticated_client.get("/api/entities/").json()
        assert len(entities) == 1

    def test_restore_version_not_found(self, authenticated_client):
        """Test restoring non-existent version."""
        response = authenticated_client.post("/api/versions/999/restore")
        assert response.status_code == 404

    def test_version_created_on_entity_update(self, authenticated_client):
        """Test version is created when entity is updated."""
        # Create entity
        entity_data = {"name": "Original", "type": "person"}
        resp = authenticated_client.post("/api/entities/", json=entity_data)
        entity_id = resp.json()["id"]
        
        # Update entity
        updated_data = {"name": "Updated", "type": "person"}
        authenticated_client.put(f"/api/entities/{entity_id}", json=updated_data)
        
        # Check versions
        versions = authenticated_client.get("/api/versions").json()
        assert len(versions) == 2
        assert "Updated entity" in versions[0]["description"]

    def test_version_created_on_entity_delete(self, authenticated_client):
        """Test version is created when entity is deleted."""
        # Create entity
        entity_data = {"name": "ToDelete", "type": "person"}
        resp = authenticated_client.post("/api/entities/", json=entity_data)
        entity_id = resp.json()["id"]
        
        # Delete entity
        authenticated_client.delete(f"/api/entities/{entity_id}")
        
        # Check versions
        versions = authenticated_client.get("/api/versions").json()
        assert len(versions) == 2
        assert "Deleted entity" in versions[0]["description"]

    def test_version_created_on_relation_create(self, authenticated_client, sample_user, sample_entities):
        """Test version is created when relation is created."""
        # Create entity relationship
        relation_data = {
            "source_id": sample_entities[0].id,
            "target_id": sample_entities[1].id,
            "relation_type": "friend"
        }
        authenticated_client.post("/api/relations/", json=relation_data)
        
        # Check versions
        versions = authenticated_client.get("/api/versions").json()
        assert len(versions) >= 1
        assert any("Added relation" in v["description"] for v in versions)

    def test_restore_preserves_type_definitions(self, authenticated_client):
        """Test that restore preserves entity and relation type definitions."""
        # Create entity type
        authenticated_client.post("/api/entities/types", json={"name": "CustomType"})
        
        # Create entity with custom type
        entity_data = {"name": "Test", "type": "CustomType"}
        authenticated_client.post("/api/entities/", json=entity_data)
        
        # Create version
        versions = authenticated_client.get("/api/versions").json()
        v1_id = versions[0]["id"]
        
        # Delete all and restore
        authenticated_client.post("/api/reset")
        authenticated_client.post(f"/api/versions/{v1_id}/restore?create_backup=false")
        
        # Verify custom type still exists
        types = authenticated_client.get("/api/entities/types").json()
        assert "CustomType" in types
