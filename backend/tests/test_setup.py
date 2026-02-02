"""
Test fixtures and basic setup verification.
"""



def test_db_session(db_session):
    """Verify database session is working."""
    assert db_session is not None


def test_client(client):
    """Verify FastAPI test client is working."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Relation Map API is running."}


def test_sample_entity_type(sample_entity_type):
    """Verify sample entity type fixture."""
    assert sample_entity_type.name == "Person"
    assert sample_entity_type.id is not None


def test_sample_entity(sample_entity):
    """Verify sample entity fixture."""
    assert sample_entity.name == "John Doe"
    assert sample_entity.type == "person"
    assert sample_entity.id is not None


def test_sample_entities(sample_entities):
    """Verify sample entities fixture."""
    assert len(sample_entities) == 3
    assert sample_entities[0].name == "Alice"
    assert sample_entities[1].name == "Bob"
    assert sample_entities[2].name == "Charlie"
