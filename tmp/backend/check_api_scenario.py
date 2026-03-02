#!/usr/bin/env python3
"""Check what GET /relations/types returns"""
from fastapi.testclient import TestClient
from main import app
from db import get_db
from models import User, Relation, RelationType, Entity
from auth import create_access_token

# Setup
db = next(get_db())

# Clean up
for model in [Relation, RelationType, Entity]:
    db.query(model).delete()
db.commit()

admin = db.query(User).filter(User.username == 'admin').first()

# Scenario: Create a RelationType but have NO actual Relation using it
rt = RelationType(user_id=admin.id, name="friend")
db.add(rt)
db.commit()

print("==== Database State ====")
print(f"RelationTypes: {[(t.id, t.user_id, t.name) for t in db.query(RelationType).all()]}")
print(f"Relations: {[(r.id, r.user_id, r.relation_type) for r in db.query(Relation).all()]}")

# Test API
client = TestClient(app)
token_data = {"sub": str(admin.id), "username": admin.username}
token = create_access_token(token_data)
headers = {"Authorization": f"Bearer {token}"}

print("\n==== GET /api/relations/types ====")
response = client.get("/api/relations/types", headers=headers)
print(f"Status: {response.status_code}")
print(f"Types: {response.json()}")

print("\n==== GET /api/relations ====")
response = client.get("/api/relations/", headers=headers)
print(f"Status: {response.status_code}")
print(f"Relations count: {len(response.json())}")
print(f"Relations: {response.json()}")
