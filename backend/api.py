from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
import models
import schemas
import db

router = APIRouter()

# Dependency

def get_db():
    database = db.SessionLocal()
    try:
        yield database
    finally:
        database.close()

def ensure_entity_type(database: Session, type_name: str):
    if not type_name:
        return
    exists = database.query(models.EntityType).filter(models.EntityType.name == type_name).first()
    if not exists:
        database.add(models.EntityType(name=type_name))

def ensure_relation_type(database: Session, type_name: str):
    if not type_name:
        return
    exists = database.query(models.RelationType).filter(models.RelationType.name == type_name).first()
    if not exists:
        database.add(models.RelationType(name=type_name))

# Type management (before entity/relation/{id} endpoints to avoid path conflicts)
@router.get("/entities/types")
def list_entity_types(database: Session = Depends(get_db)):
    types = database.query(models.EntityType).order_by(models.EntityType.name).all()
    if len(types) == 0:
        derived = {e.type for e in database.query(models.Entity).all()}
        for type_name in derived:
            ensure_entity_type(database, type_name)
        database.commit()
        types = database.query(models.EntityType).order_by(models.EntityType.name).all()
    return [t.name for t in types]

@router.post("/entities/types")
def create_entity_type(payload: schemas.TypeCreate, database: Session = Depends(get_db)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Type name is required")
    exists = database.query(models.EntityType).filter(models.EntityType.name == name).first()
    if exists:
        raise HTTPException(status_code=409, detail="Type already exists")
    database.add(models.EntityType(name=name))
    database.commit()
    return {"ok": True, "name": name}

@router.delete("/entities/types/{type_name}/only")
def delete_entity_type_only(type_name: str, database: Session = Depends(get_db)):
    in_use = database.query(models.Entity).filter(models.Entity.type == type_name).count()
    if in_use > 0:
        raise HTTPException(status_code=409, detail="Type is in use")
    deleted = database.query(models.EntityType).filter(models.EntityType.name == type_name).delete(synchronize_session=False)
    if deleted == 0:
        raise HTTPException(status_code=404, detail=f"Type '{type_name}' not found")
    database.commit()
    return {"ok": True}

@router.get("/relations/types")
def list_relation_types(database: Session = Depends(get_db)):
    types = database.query(models.RelationType).order_by(models.RelationType.name).all()
    if len(types) == 0:
        derived = {r.relation_type for r in database.query(models.Relation).all()}
        for type_name in derived:
            ensure_relation_type(database, type_name)
        database.commit()
        types = database.query(models.RelationType).order_by(models.RelationType.name).all()
    return [t.name for t in types]

@router.post("/relations/types")
def create_relation_type(payload: schemas.TypeCreate, database: Session = Depends(get_db)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Type name is required")
    exists = database.query(models.RelationType).filter(models.RelationType.name == name).first()
    if exists:
        raise HTTPException(status_code=409, detail="Type already exists")
    database.add(models.RelationType(name=name))
    database.commit()
    return {"ok": True, "name": name}

@router.delete("/relations/types/{type_name}/only")
def delete_relation_type_only(type_name: str, database: Session = Depends(get_db)):
    in_use = database.query(models.Relation).filter(models.Relation.relation_type == type_name).count()
    if in_use > 0:
        raise HTTPException(status_code=409, detail="Type is in use")
    deleted = database.query(models.RelationType).filter(models.RelationType.name == type_name).delete(synchronize_session=False)
    if deleted == 0:
        raise HTTPException(status_code=404, detail=f"Type '{type_name}' not found")
    database.commit()
    return {"ok": True}

# Entity CRUD
@router.post("/entities/", response_model=schemas.Entity)
def create_entity(entity: schemas.EntityCreate, database: Session = Depends(get_db)):
    ensure_entity_type(database, entity.type)
    db_entity = models.Entity(**entity.model_dump())
    database.add(db_entity)
    database.commit()
    database.refresh(db_entity)
    return db_entity

@router.get("/entities/", response_model=list[schemas.Entity])
def read_entities(skip: int = 0, limit: int = 100, database: Session = Depends(get_db)):
    return database.query(models.Entity).offset(skip).limit(limit).all()

@router.get("/entities/{entity_id}", response_model=schemas.Entity)
def read_entity(entity_id: int, database: Session = Depends(get_db)):
    entity = database.query(models.Entity).filter(models.Entity.id == entity_id).first()
    if entity is None:
        raise HTTPException(status_code=404, detail="Entity not found")
    return entity

@router.put("/entities/{entity_id}", response_model=schemas.Entity)
def update_entity(entity_id: int, entity: schemas.EntityCreate, database: Session = Depends(get_db)):
    db_entity = database.query(models.Entity).filter(models.Entity.id == entity_id).first()
    if db_entity is None:
        raise HTTPException(status_code=404, detail="Entity not found")
    ensure_entity_type(database, entity.type)
    for key, value in entity.model_dump().items():
        setattr(db_entity, key, value)
    database.commit()
    database.refresh(db_entity)
    return db_entity

@router.delete("/entities/{entity_id}")
def delete_entity(entity_id: int, database: Session = Depends(get_db)):
    entity = database.query(models.Entity).filter(models.Entity.id == entity_id).first()
    if entity is None:
        raise HTTPException(status_code=404, detail="Entity not found")
    database.delete(entity)
    database.commit()
    return {"ok": True}

# Relation CRUD
@router.post("/relations/", response_model=schemas.Relation)
def create_relation(relation: schemas.RelationCreate, database: Session = Depends(get_db)):
    ensure_relation_type(database, relation.relation_type)
    db_relation = models.Relation(**relation.model_dump())
    database.add(db_relation)
    database.commit()
    database.refresh(db_relation)
    return db_relation

@router.get("/relations/", response_model=list[schemas.Relation])
def read_relations(skip: int = 0, limit: int = 100, database: Session = Depends(get_db)):
    return database.query(models.Relation).offset(skip).limit(limit).all()

@router.get("/relations/{relation_id}", response_model=schemas.Relation)
def read_relation(relation_id: int, database: Session = Depends(get_db)):
    relation = database.query(models.Relation).filter(models.Relation.id == relation_id).first()
    if relation is None:
        raise HTTPException(status_code=404, detail="Relation not found")
    return relation

@router.put("/relations/{relation_id}", response_model=schemas.Relation)
def update_relation(relation_id: int, relation: schemas.RelationCreate, database: Session = Depends(get_db)):
    db_relation = database.query(models.Relation).filter(models.Relation.id == relation_id).first()
    if db_relation is None:
        raise HTTPException(status_code=404, detail="Relation not found")
    ensure_relation_type(database, relation.relation_type)
    for key, value in relation.model_dump().items():
        setattr(db_relation, key, value)
    database.commit()
    database.refresh(db_relation)
    return db_relation

@router.delete("/relations/{relation_id}")
def delete_relation(relation_id: int, database: Session = Depends(get_db)):
    relation = database.query(models.Relation).filter(models.Relation.id == relation_id).first()
    if relation is None:
        raise HTTPException(status_code=404, detail="Relation not found")
    database.delete(relation)
    database.commit()
    return {"ok": True}

# Data management
@router.post("/reset")
def reset_data(database: Session = Depends(get_db)):
    """Reset all data: delete all relations and entities"""
    try:
        database.query(models.Relation).delete()
        database.query(models.Entity).delete()
        database.query(models.RelationType).delete()
        database.query(models.EntityType).delete()
        database.commit()
        return {"ok": True, "message": "All data has been reset"}
    except Exception as e:
        database.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to reset data: {str(e)}")

@router.get("/export")
def export_data(database: Session = Depends(get_db)):
    """Export all data as JSON"""
    try:
        entities = database.query(models.Entity).all()
        relations = database.query(models.Relation).all()
        entity_type_records = database.query(models.EntityType).all()
        relation_type_records = database.query(models.RelationType).all()

        entity_types = {t.name for t in entity_type_records}
        relation_types = {t.name for t in relation_type_records}
        entity_types.update([e.type for e in entities])
        relation_types.update([r.relation_type for r in relations])
        
        data = {
            "version": "1.0",
            "exported_at": datetime.utcnow().isoformat() + "Z",
            "entities": [schemas.Entity.model_validate(e).model_dump() for e in entities],
            "relations": [schemas.Relation.model_validate(r).model_dump() for r in relations],
            "entity_types": sorted(entity_types),
            "relation_types": sorted(relation_types)
        }
        
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@router.post("/import")
def import_data(
    data: schemas.ImportData,
    mode: str = Query(default="merge", pattern="^(merge|replace)$"),
    database: Session = Depends(get_db)
):
    """Import data from JSON"""
    try:
        if mode == "replace":
            # Delete existing data
            database.query(models.Relation).delete()
            database.query(models.Entity).delete()
            database.query(models.RelationType).delete()
            database.query(models.EntityType).delete()
            database.commit()
        
        # Import entities
        entity_id_map = {}  # old_id -> new_id mapping
        
        for entity_data in data.entities:
            entity_dict = entity_data.model_dump()
            old_id = entity_dict.pop("id", None)
            
            new_entity = models.Entity(**entity_dict)
            database.add(new_entity)
            database.flush()
            
            if old_id is not None:
                entity_id_map[old_id] = new_entity.id
        
        # Import relations
        for relation_data in data.relations:
            relation_dict = relation_data.model_dump()
            relation_dict.pop("id", None)
            
            # Apply ID mapping
            if relation_dict["source_id"] in entity_id_map:
                relation_dict["source_id"] = entity_id_map[relation_dict["source_id"]]
            if relation_dict["target_id"] in entity_id_map:
                relation_dict["target_id"] = entity_id_map[relation_dict["target_id"]]
            
            new_relation = models.Relation(**relation_dict)
            database.add(new_relation)

        # Import types (from payload or derived from entities/relations)
        entity_types = set(data.entity_types or [])
        relation_types = set(data.relation_types or [])
        entity_types.update([e.type for e in data.entities])
        relation_types.update([r.relation_type for r in data.relations])

        for type_name in entity_types:
            ensure_entity_type(database, type_name)
        for type_name in relation_types:
            ensure_relation_type(database, type_name)
        
        database.commit()
        
        return {
            "ok": True,
            "imported_entities": len(data.entities),
            "imported_relations": len(data.relations),
            "skipped": 0
        }
    except Exception as e:
        database.rollback()
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

@router.put("/entities/types/{old_type}")
def rename_entity_type(old_type: str, new_type: str = Query(...), database: Session = Depends(get_db)):
    """Rename entity type (bulk update all entities with this type)"""
    try:
        entities = database.query(models.Entity).filter(models.Entity.type == old_type).all()
        count = len(entities)
        
        if count == 0:
            raise HTTPException(status_code=404, detail=f"No entities found with type '{old_type}'")

        if database.query(models.EntityType).filter(models.EntityType.name == new_type).first():
            raise HTTPException(status_code=409, detail=f"Type '{new_type}' already exists")
        
        for entity in entities:
            entity.type = new_type

        existing_type = database.query(models.EntityType).filter(models.EntityType.name == old_type).first()
        if existing_type:
            existing_type.name = new_type
        else:
            ensure_entity_type(database, new_type)
        
        database.commit()
        return {"ok": True, "updated_count": count, "old_type": old_type, "new_type": new_type}
    except HTTPException:
        raise
    except Exception as e:
        database.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to rename type: {str(e)}")

@router.delete("/entities/types/{type_name}")
def delete_entity_type(type_name: str, database: Session = Depends(get_db)):
    """Delete all entities with specified type (and their relations)"""
    try:
        entities = database.query(models.Entity).filter(models.Entity.type == type_name).all()
        entity_ids = [e.id for e in entities]
        
        if not entity_ids:
            raise HTTPException(status_code=404, detail=f"No entities found with type '{type_name}'")
        
        # Delete related relations first
        relations_deleted = database.query(models.Relation).filter(
            (models.Relation.source_id.in_(entity_ids)) | (models.Relation.target_id.in_(entity_ids))
        ).delete(synchronize_session=False)
        
        # Delete entities
        entities_deleted = database.query(models.Entity).filter(models.Entity.type == type_name).delete(synchronize_session=False)

        # Delete entity type record
        database.query(models.EntityType).filter(models.EntityType.name == type_name).delete(synchronize_session=False)
        
        database.commit()
        return {"ok": True, "deleted_entities": entities_deleted, "deleted_relations": relations_deleted}
    except HTTPException:
        raise
    except Exception as e:
        database.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete type: {str(e)}")

@router.put("/relations/types/{old_type}")
def rename_relation_type(old_type: str, new_type: str = Query(...), database: Session = Depends(get_db)):
    """Rename relation type (bulk update all relations with this type)"""
    try:
        relations = database.query(models.Relation).filter(models.Relation.relation_type == old_type).all()
        count = len(relations)
        
        if count == 0:
            raise HTTPException(status_code=404, detail=f"No relations found with type '{old_type}'")

        if database.query(models.RelationType).filter(models.RelationType.name == new_type).first():
            raise HTTPException(status_code=409, detail=f"Type '{new_type}' already exists")
        
        for relation in relations:
            relation.relation_type = new_type

        existing_type = database.query(models.RelationType).filter(models.RelationType.name == old_type).first()
        if existing_type:
            existing_type.name = new_type
        else:
            ensure_relation_type(database, new_type)
        
        database.commit()
        return {"ok": True, "updated_count": count, "old_type": old_type, "new_type": new_type}
    except HTTPException:
        raise
    except Exception as e:
        database.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to rename type: {str(e)}")

@router.delete("/relations/types/{type_name}")
def delete_relation_type(type_name: str, database: Session = Depends(get_db)):
    """Delete all relations with specified type"""
    try:
        count = database.query(models.Relation).filter(models.Relation.relation_type == type_name).delete(synchronize_session=False)
        
        if count == 0:
            raise HTTPException(status_code=404, detail=f"No relations found with type '{type_name}'")

        database.query(models.RelationType).filter(models.RelationType.name == type_name).delete(synchronize_session=False)
        
        database.commit()
        return {"ok": True, "deleted_count": count}
    except HTTPException:
        raise
    except Exception as e:
        database.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete type: {str(e)}")
