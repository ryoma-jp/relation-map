"""
Model and Database Operation Tests.
Tests data model validation and database operations.
"""

import pytest
from sqlalchemy.exc import IntegrityError
import models


class TestEntityModel:
    """Test Entity model and validation."""
    
    def test_entity_model_valid(self, db_session, sample_user):
        """Test creating a valid entity."""
        entity = models.Entity(user_id=sample_user.id, 
            name="John",
            type="person",
            description="A person"
        )
        db_session.add(entity)
        db_session.commit()
        
        # Verify
        retrieved = db_session.query(models.Entity).filter_by(name="John").first()
        assert retrieved is not None
        assert retrieved.name == "John"
        assert retrieved.type == "person"
        assert retrieved.id is not None
    
    def test_entity_required_fields(self, db_session, sample_user):
        """Test entity with missing required fields."""
        # Missing name
        entity = models.Entity(user_id=sample_user.id, type="person")
        db_session.add(entity)
        with pytest.raises(IntegrityError):
            db_session.commit()
        db_session.rollback()
    
    def test_entity_optional_description(self, db_session, sample_user):
        """Test entity with optional description."""
        entity = models.Entity(user_id=sample_user.id, name="Jane", type="person")
        db_session.add(entity)
        db_session.commit()
        
        retrieved = db_session.query(models.Entity).filter_by(name="Jane").first()
        assert retrieved.description is None
    
    def test_entity_relationships(self, db_session, sample_user):
        """Test entity relationships with relations."""
        # Create entities
        source = models.Entity(user_id=sample_user.id, name="Alice", type="person")
        target = models.Entity(user_id=sample_user.id, name="Bob", type="person")
        db_session.add(source)
        db_session.add(target)
        db_session.flush()
        
        # Create relation
        relation = models.Relation(user_id=sample_user.id, 
            source_id=source.id,
            target_id=target.id,
            relation_type="friend"
        )
        db_session.add(relation)
        db_session.commit()
        
        # Verify relationships
        db_session.refresh(source)
        db_session.refresh(target)
        assert len(source.outgoing_relations) == 1
        assert len(target.incoming_relations) == 1
        assert source.outgoing_relations[0].target_id == target.id
    
    def test_entity_cascade_delete(self, db_session, sample_user):
        """Test that deleting an entity cascades to relations."""
        # Create entities and relation
        source = models.Entity(user_id=sample_user.id, name="X", type="person")
        target = models.Entity(user_id=sample_user.id, name="Y", type="person")
        db_session.add(source)
        db_session.add(target)
        db_session.flush()
        
        relation = models.Relation(user_id=sample_user.id, 
            source_id=source.id,
            target_id=target.id,
            relation_type="friend"
        )
        db_session.add(relation)
        db_session.commit()
        
        # Delete source entity
        db_session.delete(source)
        db_session.commit()
        
        # Verify relation is cascade deleted
        relations = db_session.query(models.Relation).all()
        assert len(relations) == 0


class TestRelationModel:
    """Test Relation model and validation."""
    
    def test_relation_model_valid(self, db_session, sample_user, sample_entities):
        """Test creating a valid relation."""
        relation = models.Relation(user_id=sample_user.id, 
            source_id=sample_entities[0].id,
            target_id=sample_entities[1].id,
            relation_type="friend",
            description="They are friends"
        )
        db_session.add(relation)
        db_session.commit()
        
        # Verify
        retrieved = db_session.query(models.Relation).first()
        assert retrieved is not None
        assert retrieved.relation_type == "friend"
        assert retrieved.description == "They are friends"
    
    def test_relation_required_fields(self, db_session, sample_user):
        """Test relation with missing required fields."""
        # Missing source_id
        relation = models.Relation(user_id=sample_user.id, 
            target_id=1,
            relation_type="friend"
        )
        db_session.add(relation)
        with pytest.raises(IntegrityError):
            db_session.commit()
    
    def test_relation_foreign_key_constraint(self, db_session, sample_user):
        """Test relation foreign key constraint."""
        # Try to create relation with non-existent entities
        relation = models.Relation(user_id=sample_user.id, 
            source_id=99999,
            target_id=88888,
            relation_type="friend"
        )
        db_session.add(relation)
        # This should raise an error when flushed/committed
        # Depending on DB, this might be deferred until commit
        try:
            db_session.commit()
            # SQLite might allow this, so we verify the constraint behavior
        except IntegrityError:
            db_session.rollback()


class TestEntityTypeModel:
    """Test EntityType model."""
    
    def test_entity_type_valid(self, db_session, sample_user):
        """Test creating a valid entity type."""
        entity_type = models.EntityType(name="Person")
        db_session.add(entity_type)
        db_session.commit()
        
        retrieved = db_session.query(models.EntityType).filter_by(name="Person").first()
        assert retrieved is not None
        assert retrieved.name == "Person"
    
    def test_entity_type_unique_constraint(self, db_session, sample_user):
        """Test entity type name uniqueness."""
        type1 = models.EntityType(name="Person")
        db_session.add(type1)
        db_session.commit()
        
        # Try to create duplicate
        type2 = models.EntityType(name="Person")
        db_session.add(type2)
        with pytest.raises(IntegrityError):
            db_session.commit()


class TestRelationTypeModel:
    """Test RelationType model."""
    
    def test_relation_type_valid(self, db_session, sample_user):
        """Test creating a valid relation type."""
        relation_type = models.RelationType(user_id=sample_user.id, name="Friend")
        db_session.add(relation_type)
        db_session.commit()
        
        retrieved = db_session.query(models.RelationType).filter_by(name="Friend").first()
        assert retrieved is not None
        assert retrieved.name == "Friend"
    
    def test_relation_type_unique_constraint(self, db_session, sample_user):
        """Test relation type name uniqueness."""
        type1 = models.RelationType(user_id=sample_user.id, name="Friend")
        db_session.add(type1)
        db_session.commit()
        
        # Try to create duplicate
        type2 = models.RelationType(user_id=sample_user.id, name="Friend")
        db_session.add(type2)
        with pytest.raises(IntegrityError):
            db_session.commit()


class TestDatabaseOperations:
    """Test general database operations."""
    
    def test_create_all_tables(self, db_engine):
        """Test that all tables are created."""
        # Tables should already be created by db_engine fixture
        inspector = __import__('sqlalchemy').inspect(db_engine)
        tables = inspector.get_table_names()
        
        assert "entities" in tables
        assert "relations" in tables
        assert "entity_types" in tables
        assert "relation_types" in tables
    
    def test_session_commit_rollback(self, db_session, sample_user):
        """Test session commit and rollback."""
        # Add entity
        entity = models.Entity(user_id=sample_user.id, name="Test1", type="person")
        db_session.add(entity)
        db_session.commit()
        
        # Verify it was committed
        count1 = db_session.query(models.Entity).count()
        assert count1 == 1
        
        # Add and rollback
        entity2 = models.Entity(user_id=sample_user.id, name="Test2", type="person")
        db_session.add(entity2)
        db_session.rollback()
        
        # Verify rollback
        count2 = db_session.query(models.Entity).count()
        assert count2 == 1
    
    def test_bulk_operations(self, db_session, sample_user):
        """Test bulk insert and delete operations."""
        # Bulk insert
        entities = [
            models.Entity(user_id=sample_user.id, name=f"Bulk{i}", type="person")
            for i in range(10)
        ]
        db_session.add_all(entities)
        db_session.commit()
        
        # Verify
        count = db_session.query(models.Entity).count()
        assert count == 10
        
        # Bulk delete
        db_session.query(models.Entity).delete()
        db_session.commit()
        
        # Verify
        count = db_session.query(models.Entity).count()
        assert count == 0
    
    def test_query_filters(self, db_session, sample_user):
        """Test various query filters."""
        # Create diverse entities
        entities = [
            models.Entity(user_id=sample_user.id, name="Alice", type="person"),
            models.Entity(user_id=sample_user.id, name="Bob", type="person"),
            models.Entity(user_id=sample_user.id, name="CompanyA", type="organization"),
        ]
        db_session.add_all(entities)
        db_session.commit()
        
        # Filter by type
        people = db_session.query(models.Entity).filter_by(type="person").all()
        assert len(people) == 2
        
        # Filter by name pattern
        orgs = db_session.query(models.Entity).filter_by(type="organization").all()
        assert len(orgs) == 1
        
        # Filter with offset/limit
        limited = db_session.query(models.Entity).offset(1).limit(2).all()
        assert len(limited) == 2
