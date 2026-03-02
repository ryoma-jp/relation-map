#!/usr/bin/env python3
from fastapi.testclient import TestClient
from main import app
from db import get_db
from models import User
from auth import create_access_token
import json

# Create test client
client = TestClient(app)

# Get admin user
db = next(get_db())
admin = db.query(User).filter(User.username == 'admin').first()

# Create token manually
token_data = {"sub": str(admin.id), "username": admin.username}
token = create_access_token(token_data)
headers = {"Authorization": f"Bearer {token}"}

print(f"Using admin token for user: {admin.username} (id={admin.id})")

# Try DELETE
print("\n=== Calling DELETE /api/relations/types/friend ===")
response = client.delete("/api/relations/types/friend", headers=headers)
print(f"Status: {response.status_code}")
print(f"Body: {json.dumps(response.json(), indent=2)}")

# Check DB state after delete
print("\n=== Database state after DELETE ===")
db.expunge_all()
db_relations = db.query(__import__('models').Relation).all()
print(f"Relations remaining: {len(db_relations)}")
for r in db_relations:
    print(f"  id={r.id}, user_id={r.user_id}, type={repr(r.relation_type)}")
