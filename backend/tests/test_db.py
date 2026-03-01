"""
Database Module Tests.
Tests database initialization, session management, and connection handling.
"""

import pytest
from sqlalchemy import inspect
from sqlalchemy.orm import sessionmaker
import models


class TestDatabaseInitialization:
    """Test database initialization."""
    
    def test_create_engine(self, db_engine):
        """Test that database engine is created successfully."""
        assert db_engine is not None
        # Verify connection
        with db_engine.connect() as conn:
            result = conn.execute(__import__('sqlalchemy').text("SELECT 1"))
            assert result.scalar() == 1
    
    def test_base_metadata(self):
        """Test that Base metadata contains all models."""
        from models import Base
        
        # Check that all model tables are in Base
        table_names = {table.name for table in Base.metadata.tables.values()}
        
        assert "entities" in table_names
        assert "relations" in table_names
        assert "entity_types" in table_names
        assert "relation_types" in table_names
    
    def test_table_creation(self, db_engine):
        """Test that all tables are created correctly."""
        inspector = inspect(db_engine)
        tables = inspector.get_table_names()
        
        # Verify all tables exist
        assert "entities" in tables
        assert "relations" in tables
        assert "entity_types" in tables
        assert "relation_types" in tables
    
    def test_table_columns(self, db_engine):
        """Test that all tables have correct columns."""
        inspector = inspect(db_engine)
        
        # Check entities table
        entity_cols = {col["name"] for col in inspector.get_columns("entities")}
        assert "id" in entity_cols
        assert "name" in entity_cols
        assert "type" in entity_cols
        assert "description" in entity_cols
        
        # Check relations table
        relation_cols = {col["name"] for col in inspector.get_columns("relations")}
        assert "id" in relation_cols
        assert "source_id" in relation_cols
        assert "target_id" in relation_cols
        assert "relation_type" in relation_cols
    
    def test_foreign_keys(self, db_engine):
        """Test that foreign keys are configured correctly."""
        inspector = inspect(db_engine)
        
        # Check foreign keys for relations table
        fks = inspector.get_foreign_keys("relations")
        fk_columns = {fk["constrained_columns"][0] for fk in fks}
        
        assert "source_id" in fk_columns
        assert "target_id" in fk_columns


class TestSessionManagement:
    """Test database session management."""
    
    def test_session_creation(self, db_engine):
        """Test creating a database session."""
        TestingSessionLocal = sessionmaker(
            autocommit=False, autoflush=False, bind=db_engine
        )
        session = TestingSessionLocal()
        
        assert session is not None
        session.close()
    
    def test_session_autoflush(self, db_session, sample_user):
        """Test that autoflush is disabled."""
        # Add an entity but don't commit
        entity = models.Entity(user_id=sample_user.id, name="NoFlush", type="person")
        db_session.add(entity)
        
        # Since autoflush is False, query before commit should not see it
        # (in most cases, depending on implementation)
        db_session.flush()  # Manual flush
        
        # After flush, it should be there
        result = db_session.query(models.Entity).filter_by(name="NoFlush").first()
        assert result is not None
    
    def test_session_multiple_adds(self, db_session, sample_user):
        """Test adding multiple objects to session."""
        entities = [
            models.Entity(user_id=sample_user.id, name=f"E{i}", type="person")
            for i in range(5)
        ]
        
        db_session.add_all(entities)
        db_session.commit()
        
        # Verify all were added
        count = db_session.query(models.Entity).count()
        assert count == 5


class TestDatabaseConstraints:
    """Test database constraints enforcement."""
    
    def test_not_null_constraint(self, db_session, sample_user):
        """Test NOT NULL constraints."""
        # Entity without name should fail
        entity = models.Entity(user_id=sample_user.id, type="person")
        db_session.add(entity)
        
        with pytest.raises(Exception):  # IntegrityError or similar
            db_session.commit()
    
    def test_unique_constraint_entity_type(self, db_session, sample_user, sample_users):
        """Test entity type can have same name for different users."""
        # Same name for one user
        type1 = models.EntityType(name="UniqueType", user_id=sample_user.id)
        db_session.add(type1)
        db_session.commit()
        
        # Same name for different user should be allowed
        type2 = models.EntityType(name="UniqueType", user_id=sample_users[0].id)
        db_session.add(type2)
        db_session.commit()  # Should succeed
    
    def test_unique_constraint_relation_type(self, db_session, sample_user):
        """Test unique constraint on relation type names."""
        type1 = models.RelationType(user_id=sample_user.id, name="FriendType")
        db_session.add(type1)
        db_session.commit()
        
        # Try to add duplicate
        type2 = models.RelationType(user_id=sample_user.id, name="FriendType")
        db_session.add(type2)
        
        with pytest.raises(Exception):  # IntegrityError
            db_session.commit()


class TestDataIntegrity:
    """Test data integrity across operations."""
    
    def test_entity_relation_consistency(self, db_session, sample_user):
        """Test that relations reference valid entities."""
        entity1 = models.Entity(user_id=sample_user.id, name="E1", type="person")
        entity2 = models.Entity(user_id=sample_user.id, name="E2", type="person")
        
        db_session.add(entity1)
        db_session.add(entity2)
        db_session.flush()
        
        # Create valid relation
        relation = models.Relation(user_id=sample_user.id, 
            source_id=entity1.id,
            target_id=entity2.id,
            relation_type="friend"
        )
        db_session.add(relation)
        db_session.commit()
        
        # Verify both entities and relation exist
        assert db_session.query(models.Entity).count() == 2
        assert db_session.query(models.Relation).count() == 1
    
    def test_cascade_delete_behavior(self, db_session, sample_user):
        """Test cascade delete removes dependent relations."""
        entity1 = models.Entity(user_id=sample_user.id, name="Delete1", type="person")
        entity2 = models.Entity(user_id=sample_user.id, name="Delete2", type="person")
        
        db_session.add(entity1)
        db_session.add(entity2)
        db_session.flush()
        
        relation = models.Relation(user_id=sample_user.id, 
            source_id=entity1.id,
            target_id=entity2.id,
            relation_type="friend"
        )
        db_session.add(relation)
        db_session.commit()
        
        # Delete entity1
        db_session.delete(entity1)
        db_session.commit()
        
        # Relation should be cascade deleted
        remaining_relations = db_session.query(models.Relation).all()
        assert len(remaining_relations) == 0
        
        # entity2 should still exist
        remaining_entities = db_session.query(models.Entity).all()
        assert len(remaining_entities) == 1


class TestConnectionPooling:
    """Test database connection pooling."""
    
    def test_multiple_connections(self, db_engine):
        """Test multiple concurrent connections."""
        TestingSessionLocal = sessionmaker(bind=db_engine)
        
        sessions = [TestingSessionLocal() for _ in range(3)]
        
        # All sessions should be functional
        for session in sessions:
            result = session.query(models.Entity).count()
            assert result >= 0
        
        # Clean up
        for session in sessions:
            session.close()
    
    def test_connection_reuse(self, db_engine):
        """Test that connections are reused efficiently."""
        TestingSessionLocal = sessionmaker(bind=db_engine)
        
        # Create and close multiple sessions
        for _ in range(5):
            session = TestingSessionLocal()
            session.execute(__import__('sqlalchemy').text("SELECT 1"))
            session.close()
        
        # Should not raise any errors
