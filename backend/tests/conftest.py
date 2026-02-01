"""
Pytest configuration and fixtures for Backend tests.
Provides test database session, FastAPI test client, and sample data fixtures.
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
import sys
import os

# Add parent directory to path to allow imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import database module before app to set up test engine
import db
from models import Base
import models
import schemas

# Create a persistent connection for SQLite in-memory database
from sqlalchemy.pool import StaticPool

# We need to create the engine with a StaticPool to maintain a single connection
# This ensures the in-memory database persists across multiple sessions
TEST_CONNECTION = None

def get_test_engine():
    """Create or return test engine with persistent connection."""
    global TEST_CONNECTION
    if TEST_CONNECTION is None:
        # Create the engine with StaticPool to keep a single connection
        engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool
        )
        # Create all tables immediately
        Base.metadata.create_all(bind=engine)
        TEST_CONNECTION = engine
    return TEST_CONNECTION

TEST_ENGINE = get_test_engine()

# Override db.engine with test engine BEFORE importing app
db.engine = TEST_ENGINE
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)
db.SessionLocal = TestingSessionLocal

# Now import app after database is configured for testing
from main import app
import api


# ===== Database Fixtures =====

@pytest.fixture(scope="function")
def db_engine():
    """Provide the test database engine."""
    return TEST_ENGINE


@pytest.fixture(scope="function")
def db_session(db_engine):
    """Create a test database session."""
    session = TestingSessionLocal()
    
    yield session
    
    # Cleanup - clear all data between tests for test isolation
    session.rollback()
    for table in reversed(Base.metadata.sorted_tables):
        session.execute(table.delete())
    session.commit()
    session.close()


@pytest.fixture(scope="function")
def client(db_session):
    """Create FastAPI test client with test database."""
    def override_get_db():
        yield db_session
    
    # Override the get_db dependency
    app.dependency_overrides[api.get_db] = override_get_db
    
    yield TestClient(app)
    
    # Cleanup
    app.dependency_overrides.clear()


# ===== Sample Data Fixtures =====

@pytest.fixture
def sample_entity_type(db_session):
    """Create a sample entity type."""
    entity_type = models.EntityType(name="Person")
    db_session.add(entity_type)
    db_session.commit()
    db_session.refresh(entity_type)
    return entity_type


@pytest.fixture
def sample_entity_types(db_session):
    """Create multiple sample entity types."""
    types_data = [
        {"name": "Person"},
        {"name": "Organization"},
        {"name": "Place"},
    ]
    types = []
    for type_data in types_data:
        entity_type = models.EntityType(**type_data)
        db_session.add(entity_type)
        types.append(entity_type)
    db_session.commit()
    for t in types:
        db_session.refresh(t)
    return types


@pytest.fixture
def sample_relation_type(db_session):
    """Create a sample relation type."""
    relation_type = models.RelationType(name="Friend")
    db_session.add(relation_type)
    db_session.commit()
    db_session.refresh(relation_type)
    return relation_type


@pytest.fixture
def sample_relation_types(db_session):
    """Create multiple sample relation types."""
    types_data = [
        {"name": "Friend"},
        {"name": "Family"},
        {"name": "Colleague"},
    ]
    types = []
    for type_data in types_data:
        relation_type = models.RelationType(**type_data)
        db_session.add(relation_type)
        types.append(relation_type)
    db_session.commit()
    for t in types:
        db_session.refresh(t)
    return types


@pytest.fixture
def sample_entity(db_session):
    """Create a sample entity."""
    entity = models.Entity(
        name="John Doe",
        type="person",
        description="A test person"
    )
    db_session.add(entity)
    db_session.commit()
    db_session.refresh(entity)
    return entity


@pytest.fixture
def sample_entities(db_session):
    """Create multiple sample entities."""
    entities_data = [
        {"name": "Alice", "type": "person", "description": "Alice person"},
        {"name": "Bob", "type": "person", "description": "Bob person"},
        {"name": "Charlie", "type": "person", "description": "Charlie person"},
    ]
    entities = []
    for entity_data in entities_data:
        entity = models.Entity(**entity_data)
        db_session.add(entity)
        entities.append(entity)
    db_session.commit()
    for e in entities:
        db_session.refresh(e)
    return entities


@pytest.fixture
def sample_relation(db_session, sample_entities):
    """Create a sample relation between two entities."""
    relation = models.Relation(
        source_id=sample_entities[0].id,
        target_id=sample_entities[1].id,
        relation_type="friend",
        description="They are friends"
    )
    db_session.add(relation)
    db_session.commit()
    db_session.refresh(relation)
    return relation


@pytest.fixture
def sample_relations(db_session, sample_entities):
    """Create multiple sample relations."""
    relations_data = [
        {
            "source_id": sample_entities[0].id,
            "target_id": sample_entities[1].id,
            "relation_type": "friend",
            "description": "Alice and Bob are friends"
        },
        {
            "source_id": sample_entities[1].id,
            "target_id": sample_entities[2].id,
            "relation_type": "colleague",
            "description": "Bob and Charlie are colleagues"
        },
    ]
    relations = []
    for relation_data in relations_data:
        relation = models.Relation(**relation_data)
        db_session.add(relation)
        relations.append(relation)
    db_session.commit()
    for r in relations:
        db_session.refresh(r)
    return relations
