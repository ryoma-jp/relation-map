"""
Database migration script for Phase 2a: User Authentication
Migrates existing data to support user-based data management
"""

import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from backend.db import engine, SessionLocal
from backend.models import Base, User
from backend.auth import hash_password

def migrate_to_auth():
    """Execute Phase 2a migration"""
    db = SessionLocal()
    
    try:
        print("🔄 Starting Phase 2a authentication migration...")
        
        # Step 1: Create new tables
        print("📦 Creating new tables (User model)...")
        Base.metadata.create_all(bind=engine)
        print("✅ Tables created")
        
        # Step 2: Create default user
        print("👤 Creating default user...")
        existing_admin = db.query(User).filter(User.username == "admin").first()
        if existing_admin:
            print("⚠️  Default user already exists (admin)")
            if not existing_admin.is_admin:
                existing_admin.is_admin = True
                db.commit()
                print("✅ Existing admin upgraded with is_admin flag")
        else:
            default_user = User(
                username="admin",
                email="admin@localhost",
                password_hash=hash_password("admin123"),
                is_active=True,
                is_admin=True,
            )
            db.add(default_user)
            db.commit()
            db.refresh(default_user)
            print(f"✅ Default user created: id={default_user.id}, username={default_user.username}")
        
        # Step 3: Migrate existing data to default user
        print("🔗 Assigning existing data to default user...")
        admin_user = db.query(User).filter(User.username == "admin").first()
        
        from backend.models import Entity, Relation, RelationType, Version
        
        updated_entities = db.query(Entity).filter(Entity.user_id.is_(None)).count()
        if updated_entities > 0:
            db.query(Entity).filter(Entity.user_id.is_(None)).update({Entity.user_id: admin_user.id})
            print(f"✅ Migrated {updated_entities} entities")
        
        updated_relations = db.query(Relation).filter(Relation.user_id.is_(None)).count()
        if updated_relations > 0:
            db.query(Relation).filter(Relation.user_id.is_(None)).update({Relation.user_id: admin_user.id})
            print(f"✅ Migrated {updated_relations} relations")
        
        updated_types = db.query(RelationType).filter(RelationType.user_id.is_(None)).count()
        if updated_types > 0:
            db.query(RelationType).filter(RelationType.user_id.is_(None)).update({RelationType.user_id: admin_user.id})
            print(f"✅ Migrated {updated_types} relation types")
        
        updated_versions = db.query(Version).filter(Version.user_id.is_(None)).count()
        if updated_versions > 0:
            db.query(Version).filter(Version.user_id.is_(None)).update({Version.user_id: admin_user.id})
            print(f"✅ Migrated {updated_versions} versions")
        
        db.commit()
        
        print("\n" + "="*60)
        print("✨ Migration completed successfully!")
        print("="*60)
        print("\n📝 Default login credentials:")
        print("   Username: admin")
        print("   Password: admin123")
        print("\n⚠️  Please change the default password after your first login!")
        print("\nTo start using the application:")
        print("  1. Start the backend: docker-compose up backend")
        print("  2. Navigate to http://localhost:3000")
        print("  3. Login with the default credentials above")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    migrate_to_auth()
