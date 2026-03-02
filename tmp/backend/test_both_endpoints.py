from fastapi.testclient import TestClient
from main import app
from db import get_db
from models import User, Relation, RelationType, Entity
from auth import create_access_token

# Recreate test data
db = next(get_db())

# Clean up
for m in [Relation, RelationType, Entity]:
    db.query(m).delete()
db.commit()

admin = db.query(User).filter(User.username == 'admin').first()

# Test data
e1 = Entity(user_id=admin.id, name="Alice", type="person")
e2 = Entity(user_id=admin.id, name="Bob", type="person")
db.add_all([e1, e2])
db.flush()

rt = RelationType(user_id=admin.id, name="friend")
db.add(rt)
db.flush()

rel = Relation(user_id=admin.id, source_id=e1.id, target_id=e2.id, relation_type="friend")
db.add(rel)
db.commit()

print("Test data created")

# Setup client
client = TestClient(app)
token_data = {"sub": str(admin.id), "username": admin.username}
token = create_access_token(token_data)
headers = {"Authorization": f"Bearer {token}"}

# Test /only endpoint (should fail - relation in use)
print("\n=== DELETE /api/relations/types/friend/only ===")
response = client.delete("/api/relations/types/friend/only", headers=headers)
print(f"Status: {response.status_code}")
print(f"Body: {response.json()}")

# Test cascade endpoint (should succeed)
print("\n=== DELETE /api/relations/types/friend (cascade) ===")
response = client.delete("/api/relations/types/friend", headers=headers)
print(f"Status: {response.status_code}")
print(f"Body: {response.json()}")

# Verify
remaining_rels = db.query(Relation).count()
remaining_types = db.query(RelationType).count()
print(f"\nAfter delete - Relations: {remaining_rels}, Types: {remaining_types}")
