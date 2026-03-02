#!/usr/bin/env python3
"""Quick database state checker"""
from db import get_db
from models import Relation, RelationType, User

db = next(get_db())

# すべてのユーザーを取得
users = db.query(User).all()
print("=== Users ===")
for u in users:
    print(f"  id={u.id}, username={u.username}")

# すべてのリレーションを取得
print("\n=== All Relations ===")
relations = db.query(Relation).all()
for r in relations:
    print(f"  id={r.id}, user_id={r.user_id}, relation_type={repr(r.relation_type)}")
print(f"Total relations: {len(relations)}")

# RelationTypeを取得
print("\n=== All RelationTypes ===")
rel_types = db.query(RelationType).all()
for rt in rel_types:
    print(f"  id={rt.id}, user_id={rt.user_id}, name={repr(rt.name)}")
print(f"Total relation types: {len(rel_types)}")

# Query by friend type for each user
print("\n=== Query relations by type 'friend' ===")
for u in users:
    count = db.query(Relation).filter(
        Relation.relation_type == 'friend',
        Relation.user_id == u.id
    ).count()
    print(f"  User {u.username} (id={u.id}): {count} relations with type 'friend'")
