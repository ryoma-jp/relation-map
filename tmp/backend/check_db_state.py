#!/usr/bin/env python3
from db import get_db
from models import Relation, RelationType, User

db = next(get_db())

print("=== Current Database State ===")

# All users
users = db.query(User).all()
print(f"Users: {[(u.id, u.username) for u in users]}")

# All relations  
relations = db.query(Relation).all()
print(f"\nRelations ({len(relations)}):")
for r in relations:
    print(f"  id={r.id}, user_id={r.user_id}, type={repr(r.relation_type)}")

# All relation types
rel_types = db.query(RelationType).all()
print(f"\nRelation Types ({len(rel_types)}):")
for rt in rel_types:
    print(f"  id={rt.id}, user_id={rt.user_id}, name={repr(rt.name)}")

# Try the delete query for admin user
if users:
    admin = [u for u in users if u.username == 'admin'][0]
    print(f"\n=== Testing delete query for user {admin.username} (id={admin.id}) ===")
    
    count = db.query(Relation).filter(
        Relation.relation_type == 'friend',
        Relation.user_id == admin.id
    ).count()
    print(f"Friends count: {count}")
