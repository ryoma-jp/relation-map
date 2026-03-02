#!/usr/bin/env python3
"""Create test data to reproduce the issue"""
from db import get_db
from models import User, Entity, Relation, RelationType

db = next(get_db())

# 最初のユーザーを取得
users = db.query(User).all()
if not users:
    print("No users found")
    exit(1)

user = users[0]
print(f"Using user: {user.username} (id={user.id})")

# エンティティを作成
entity1 = Entity(user_id=user.id, name="Alice", type="person")
entity2 = Entity(user_id=user.id, name="Bob", type="person")
db.add(entity1)
db.add(entity2)
db.flush()

print(f"Created entities: {entity1.id}, {entity2.id}")

# リレーションタイプを作成
rel_type = RelationType(user_id=user.id, name="friend")
db.add(rel_type)
db.flush()

print(f"Created relation type 'friend'")

# リレーションを作成
relation = Relation(
    user_id=user.id,
    source_id=entity1.id,
    target_id=entity2.id,
    relation_type="friend"
)
db.add(relation)
db.commit()

print(f"Created relation (friend)")

# 検証
relations_count = db.query(Relation).filter(
    Relation.relation_type == "friend",
    Relation.user_id == user.id
).count()
print(f"Verified: friend relations count = {relations_count}")
