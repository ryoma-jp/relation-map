from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
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

# Entity CRUD
@router.post("/entities/", response_model=schemas.Entity)
def create_entity(entity: schemas.EntityCreate, database: Session = Depends(get_db)):
    db_entity = models.Entity(**entity.dict())
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
    for key, value in entity.dict().items():
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
    db_relation = models.Relation(**relation.dict())
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
    for key, value in relation.dict().items():
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
