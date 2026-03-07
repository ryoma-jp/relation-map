"""
Migration script to add user_id column to entity_types table
"""
from db import SessionLocal, engine
from sqlalchemy import text

def migrate():
    db = SessionLocal()
    
    try:
        # Check if user_id column already exists
        result = db.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='entity_types' AND column_name='user_id'
        """))
        
        if result.fetchone():
            print("Migration already applied: user_id column exists")
            return
        
        print("Starting migration: Adding user_id to entity_types...")
        
        # Get admin user (assume first user is admin)
        admin_user = db.execute(text("SELECT id FROM users ORDER BY id LIMIT 1")).fetchone()
        if not admin_user:
            print("Error: No users found in database")
            return
        
        admin_id = admin_user[0]
        print(f"Using admin user id: {admin_id}")
        
        # Add user_id column with default value
        db.execute(text(f"ALTER TABLE entity_types ADD COLUMN user_id INTEGER NOT NULL DEFAULT {admin_id}"))
        
        # Add foreign key constraint
        db.execute(text("ALTER TABLE entity_types ADD CONSTRAINT entity_types_user_id_fkey FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE"))
        
        # Drop unique constraint on name if it exists
        db.execute(text("ALTER TABLE entity_types DROP CONSTRAINT IF EXISTS entity_types_name_key"))
        
        db.commit()
        print("Migration completed successfully")
        
    except Exception as e:
        db.rollback()
        print(f"Migration failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
