from fastapi.testclient import TestClient
from main import app
from db import get_db
from models import User, RelationType
from auth import create_access_token

db = next(get_db())
admin = db.query(User).filter(User.username == 'admin').first()

print(f"Admin user: {admin.username}")

# Check current state
rel_types = db.query(RelationType).filter(RelationType.user_id == admin.id).all()
print(f"Current RelationTypes: {[(rt.name) for rt in rel_types]}")

# Create test client
client = TestClient(app)
token_data = {"sub": str(admin.id), "username": admin.username}
token = create_access_token(token_data)
headers = {"Authorization": f"Bearer {token}"}

# Try to delete 'friend' type
print("\nTrying to DELETE /api/relations/types/friend...")
response = client.delete("/api/relations/types/friend", headers=headers)
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")

# Check state after delete
rel_types_after = db.query(RelationType).filter(RelationType.user_id == admin.id).all()
print(f"RelationTypes after delete: {[(rt.name) for rt in rel_types_after]}")
