from db import get_db
from models import User, Relation, RelationType

db = next(get_db())

# Check current state
admin = db.query(User).filter(User.username == 'admin').first()
print(f"Admin user: id={admin.id}, username={admin.username}")

# Current types
types = db.query(RelationType).filter(RelationType.user_id == admin.id).all()
print(f"Current RelationTypes: {[(t.name, t.user_id) for t in types]}")

# Current relations
relations = db.query(Relation).filter(Relation.user_id == admin.id).all()
print(f"Current Relations: {len(relations)}")
for r in relations:
    print(f"  type={repr(r.relation_type)}, user_id={r.user_id}")

# Test API
from fastapi.testclient import TestClient
from main import app
from auth import create_access_token

client = TestClient(app)
token_data = {"sub": str(admin.id), "username": admin.username}
token = create_access_token(token_data)
headers = {"Authorization": f"Bearer {token}"}

# Get types
print("\n=== GET /api/relations/types ===")
response = client.get("/api/relations/types", headers=headers)
print(f"Status: {response.status_code}")
print(f"Types returned: {response.json()}")

# Try delete
print("\n=== DELETE /api/relations/types/friend ===")
response = client.delete("/api/relations/types/friend", headers=headers)
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")

# Check after - need fresh query
db.expunge_all()
types_after = db.query(RelationType).filter(RelationType.user_id == admin.id).all()
print(f"\nAfter delete - RelationTypes: {[(t.name, t.user_id) for t in types_after]}")
