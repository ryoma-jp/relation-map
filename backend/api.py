from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
import models
import schemas
from db import get_db
from version_service import VersionService
from auth import get_current_user

router = APIRouter()

# Helper functions

def ensure_entity_type(database: Session, type_name: str, user_id: int = None):
    if not type_name:
        return
    exists = database.query(models.EntityType).filter(models.EntityType.name == type_name).first()
    if not exists:
        database.add(models.EntityType(name=type_name))

def ensure_relation_type(database: Session, type_name: str, user_id: int):
    if not type_name:
        return
    exists = database.query(models.RelationType).filter(
        models.RelationType.name == type_name,
        models.RelationType.user_id == user_id
    ).first()
    if not exists:
        database.add(models.RelationType(name=type_name, user_id=user_id))

# Type management (before entity/relation/{id} endpoints to avoid path conflicts)
@router.get("/entities/types")
def list_entity_types(
    database: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    types = database.query(models.EntityType).order_by(models.EntityType.name).all()
    if len(types) == 0:
        derived = {e.type for e in database.query(models.Entity).filter(models.Entity.user_id == current_user.id).all()}
        for type_name in derived:
            ensure_entity_type(database, type_name)
        database.commit()
        types = database.query(models.EntityType).order_by(models.EntityType.name).all()
    return [t.name for t in types]

@router.post("/entities/types")
def create_entity_type(
    payload: schemas.TypeCreate,
    database: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
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
def delete_entity_type_only(
    type_name: str,
    database: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    in_use = database.query(models.Entity).filter(
        models.Entity.type == type_name,
        models.Entity.user_id == current_user.id
    ).count()
    if in_use > 0:
        raise HTTPException(status_code=409, detail="Type is in use")
    deleted = database.query(models.EntityType).filter(models.EntityType.name == type_name).delete(synchronize_session=False)
    if deleted == 0:
        raise HTTPException(status_code=404, detail=f"Type '{type_name}' not found")
    database.commit()
    return {"ok": True}

@router.get("/relations/types")
def list_relation_types(
    database: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    types = database.query(models.RelationType).filter(models.RelationType.user_id == current_user.id).order_by(models.RelationType.name).all()
    if len(types) == 0:
        derived = {r.relation_type for r in database.query(models.Relation).filter(models.Relation.user_id == current_user.id).all()}
        for type_name in derived:
            ensure_relation_type(database, type_name)
        database.commit()
        types = database.query(models.RelationType).filter(models.RelationType.user_id == current_user.id).order_by(models.RelationType.name).all()
    return [t.name for t in types]

@router.post("/relations/types")
def create_relation_type(
    payload: schemas.TypeCreate,
    database: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Type name is required")
    exists = database.query(models.RelationType).filter(
        models.RelationType.name == name,
        models.RelationType.user_id == current_user.id
    ).first()
    if exists:
        raise HTTPException(status_code=409, detail="Type already exists")
    database.add(models.RelationType(name=name, user_id=current_user.id))
    database.commit()
    return {"ok": True, "name": name}

@router.delete("/relations/types/{type_name}/only")
def delete_relation_type_only(
    type_name: str,
    database: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    in_use = database.query(models.Relation).filter(
        models.Relation.relation_type == type_name,
        models.Relation.user_id == current_user.id
    ).count()
    if in_use > 0:
        raise HTTPException(status_code=409, detail="Type is in use")
    deleted = database.query(models.RelationType).filter(
        models.RelationType.name == type_name,
        models.RelationType.user_id == current_user.id
    ).delete(synchronize_session=False)
    if deleted == 0:
        raise HTTPException(status_code=404, detail=f"Type '{type_name}' not found")
    database.commit()
    return {"ok": True}

# Entity CRUD
@router.post("/entities/", response_model=schemas.Entity)
def create_entity(
    entity: schemas.EntityCreate,
    database: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    ensure_entity_type(database, entity.type)
    db_entity = models.Entity(
        **entity.model_dump(),
        user_id=current_user.id
    )
    database.add(db_entity)
    database.commit()
    database.refresh(db_entity)
    # Auto-create version
    VersionService.create_version(database, f"Added entity: {entity.name}", "system", current_user)
    return db_entity

@router.get("/entities/", response_model=list[schemas.Entity])
def read_entities(
    skip: int = 0,
    limit: int = 100,
    database: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return database.query(models.Entity).filter(models.Entity.user_id == current_user.id).offset(skip).limit(limit).all()

@router.get("/entities/{entity_id}", response_model=schemas.Entity)
def read_entity(
    entity_id: int,
    database: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    entity = database.query(models.Entity).filter(
        (models.Entity.id == entity_id) & (models.Entity.user_id == current_user.id)
    ).first()
    if entity is None:
        raise HTTPException(status_code=404, detail="Entity not found")
    return entity

@router.put("/entities/{entity_id}", response_model=schemas.Entity)
def update_entity(
    entity_id: int,
    entity: schemas.EntityCreate,
    database: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_entity = database.query(models.Entity).filter(
        (models.Entity.id == entity_id) & (models.Entity.user_id == current_user.id)
    ).first()
    if db_entity is None:
        raise HTTPException(status_code=404, detail="Entity not found")
    ensure_entity_type(database, entity.type)
    for key, value in entity.model_dump().items():
        setattr(db_entity, key, value)
    database.commit()
    database.refresh(db_entity)
    # Auto-create version
    VersionService.create_version(database, f"Updated entity: {entity.name}", "system", current_user)
    return db_entity

@router.delete("/entities/{entity_id}")
def delete_entity(
    entity_id: int,
    database: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    entity = database.query(models.Entity).filter(
        (models.Entity.id == entity_id) & (models.Entity.user_id == current_user.id)
    ).first()
    if entity is None:
        raise HTTPException(status_code=404, detail="Entity not found")
    database.delete(entity)
    database.commit()
    # Auto-create version
    VersionService.create_version(database, f"Deleted entity: {entity.name}", "system", current_user)
    return {"ok": True}

# Relation CRUD
@router.post("/relations/", response_model=schemas.Relation)
def create_relation(
    relation: schemas.RelationCreate,
    database: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    ensure_relation_type(database, relation.relation_type, current_user.id)
    db_relation = models.Relation(
        **relation.model_dump(),
        user_id=current_user.id
    )
    database.add(db_relation)
    database.commit()
    database.refresh(db_relation)
    # Auto-create version
    VersionService.create_version(database, f"Added relation: {relation.relation_type}", "system", current_user)
    return db_relation

@router.get("/relations/", response_model=list[schemas.Relation])
def read_relations(
    skip: int = 0,
    limit: int = 100,
    database: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return database.query(models.Relation).filter(models.Relation.user_id == current_user.id).offset(skip).limit(limit).all()

@router.get("/relations/{relation_id}", response_model=schemas.Relation)
def read_relation(
    relation_id: int,
    database: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    relation = database.query(models.Relation).filter(
        (models.Relation.id == relation_id) & (models.Relation.user_id == current_user.id)
    ).first()
    if relation is None:
        raise HTTPException(status_code=404, detail="Relation not found")
    return relation

@router.put("/relations/{relation_id}", response_model=schemas.Relation)
def update_relation(
    relation_id: int,
    relation: schemas.RelationCreate,
    database: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_relation = database.query(models.Relation).filter(
        (models.Relation.id == relation_id) & (models.Relation.user_id == current_user.id)
    ).first()
    if db_relation is None:
        raise HTTPException(status_code=404, detail="Relation not found")
    ensure_relation_type(database, relation.relation_type, current_user.id)
    for key, value in relation.model_dump().items():
        setattr(db_relation, key, value)
    database.commit()
    database.refresh(db_relation)
    # Auto-create version
    VersionService.create_version(database, f"Updated relation: {relation.relation_type}", "system", current_user)
    return db_relation

@router.delete("/relations/{relation_id}")
def delete_relation(
    relation_id: int,
    database: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    relation = database.query(models.Relation).filter(
        (models.Relation.id == relation_id) & (models.Relation.user_id == current_user.id)
    ).first()
    if relation is None:
        raise HTTPException(status_code=404, detail="Relation not found")
    database.delete(relation)
    database.commit()
    # Auto-create version
    VersionService.create_version(database, f"Deleted relation: {relation.relation_type}", "system", current_user)
    return {"ok": True}

# Data management
@router.post("/reset")
def reset_data(
    database: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Reset all data for current user: delete all relations and entities"""
    try:
        database.query(models.Relation).filter(models.Relation.user_id == current_user.id).delete()
        database.query(models.Entity).filter(models.Entity.user_id == current_user.id).delete()
        database.commit()
        # Auto-create version
        VersionService.create_version(database, "Data reset", "system", current_user)
        return {"ok": True, "message": "All data has been reset"}
    except Exception as e:
        database.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to reset data: {str(e)}")

@router.get("/export")
def export_data(
    database: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Export all data for current user as JSON"""
    try:
        entities = database.query(models.Entity).filter(models.Entity.user_id == current_user.id).all()
        relations = database.query(models.Relation).filter(models.Relation.user_id == current_user.id).all()
        relation_type_records = database.query(models.RelationType).filter(models.RelationType.user_id == current_user.id).all()

        # Get entity types from existing entities
        entity_types = sorted(set(e.type for e in entities))
        
        relation_types = {t.name for t in relation_type_records}
        relation_types.update([r.relation_type for r in relations])
        
        data = {
            "version": "1.0",
            "exported_at": datetime.utcnow().isoformat() + "Z",
            "entities": [schemas.Entity.model_validate(e).model_dump() for e in entities],
            "relations": [schemas.Relation.model_validate(r).model_dump() for r in relations],
            "entity_types": entity_types,
            "relation_types": sorted(relation_types)
        }
        
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@router.post("/import")
def import_data(
    data: schemas.ImportData,
    mode: str = Query(default="merge", pattern="^(merge|replace)$"),
    database: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Import data from JSON for current user"""
    try:
        if mode == "replace":
            # Delete existing data for current user only
            database.query(models.Relation).filter(models.Relation.user_id == current_user.id).delete()
            database.query(models.Entity).filter(models.Entity.user_id == current_user.id).delete()
            database.commit()
        
        # Import entities
        entity_id_map = {}  # old_id -> new_id mapping
        
        for entity_data in data.entities:
            entity_dict = entity_data.model_dump()
            old_id = entity_dict.pop("id", None)
            
            new_entity = models.Entity(**entity_dict, user_id=current_user.id)
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
            
            new_relation = models.Relation(**relation_dict, user_id=current_user.id)
            database.add(new_relation)

        # Import types
        relation_types = set(data.relation_types or [])
        relation_types.update([r.relation_type for r in data.relations])

        for type_name in relation_types:
            existing = database.query(models.RelationType).filter(
                (models.RelationType.name == type_name) & (models.RelationType.user_id == current_user.id)
            ).first()
            if not existing:
                database.add(models.RelationType(name=type_name, user_id=current_user.id))
        
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
def rename_relation_type(
    old_type: str,
    new_type: str = Query(...),
    database: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Rename relation type (bulk update all relations with this type)"""
    try:
        relations = database.query(models.Relation).filter(
            (models.Relation.relation_type == old_type) & (models.Relation.user_id == current_user.id)
        ).all()
        count = len(relations)
        
        if count == 0:
            raise HTTPException(status_code=404, detail=f"No relations found with type '{old_type}'")

        if database.query(models.RelationType).filter(
            (models.RelationType.name == new_type) & (models.RelationType.user_id == current_user.id)
        ).first():
            raise HTTPException(status_code=409, detail=f"Type '{new_type}' already exists")
        
        for relation in relations:
            relation.relation_type = new_type

        existing_type = database.query(models.RelationType).filter(
            (models.RelationType.name == old_type) & (models.RelationType.user_id == current_user.id)
        ).first()
        if existing_type:
            existing_type.name = new_type
        else:
            ensure_relation_type(database, new_type, current_user.id)
        
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


# Version management
@router.get("/versions", response_model=list[schemas.VersionListItem])
def list_versions(
    database: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all versions for current user in reverse chronological order."""
    versions = VersionService.get_all_versions(database, current_user.id)
    return versions


@router.get("/versions/{version_id}", response_model=schemas.Version)
def get_version(
    version_id: int,
    database: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get a specific version for current user."""
    version = VersionService.get_version(database, version_id, current_user.id)
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    return version


@router.post("/versions/create-checkpoint", response_model=schemas.VersionListItem)
def create_checkpoint(
    description: str = Query(None),
    database: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create a checkpoint of the current state for current user."""
    version = VersionService.create_version(database, description, "user", current_user)
    return version


@router.post("/versions/{version_id}/restore")
def restore_version(
    version_id: int,
    create_backup: bool = Query(True),
    database: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Restore to a specific version for current user."""
    try:
        restored_version = VersionService.restore_version(database, version_id, create_backup, current_user.id)
        return {
            "ok": True,
            "message": f"Restored to version {restored_version.version_number}",
            "new_version_id": restored_version.id,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

