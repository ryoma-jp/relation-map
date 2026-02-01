from pydantic import BaseModel, ConfigDict
from typing import Optional, List

class EntityBase(BaseModel):
    name: str
    type: str
    description: Optional[str] = None

class EntityCreate(EntityBase):
    pass  # For normal CRUD operations, no ID

class EntityImport(EntityBase):
    id: Optional[int] = None  # For imports only

class Entity(EntityBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class RelationBase(BaseModel):
    source_id: int
    target_id: int
    relation_type: str
    description: Optional[str] = None

class RelationCreate(RelationBase):
    pass  # For normal CRUD operations, no ID

class RelationImport(RelationBase):
    id: Optional[int] = None  # For imports only

class Relation(RelationBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class TypeCreate(BaseModel):
    name: str

class ImportData(BaseModel):
    version: str
    entities: List[EntityImport]
    relations: List[RelationImport]
    entity_types: Optional[List[str]] = None
    relation_types: Optional[List[str]] = None
