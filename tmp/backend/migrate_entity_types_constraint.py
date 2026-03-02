"""
Migration script to add unique constraint on entity_types (user_id, name)
"""
from db import SessionLocal
from sqlalchemy import text

def migrate():
    db = SessionLocal()
    
    try:
        # Check if constraint already exists
        result = db.execute(text("""
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name='entity_types' AND constraint_name='uq_entity_type_user_name'
        """))
        
        if result.fetchone():
            print("Migration already applied: unique constraint exists")
            return
        
        print("Starting migration: Adding unique constraint to entity_types...")
        
        # Add unique constraint
        db.execute(text("ALTER TABLE entity_types ADD CONSTRAINT uq_entity_type_user_name UNIQUE (user_id, name)"))
        
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
