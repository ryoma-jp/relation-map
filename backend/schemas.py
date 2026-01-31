from pydantic import BaseModel
from typing import Optional

class EntityBase(BaseModel):
    name: str
    type: str
    description: Optional[str] = None

class EntityCreate(EntityBase):
    pass

class Entity(EntityBase):
    id: int
    class Config:
        orm_mode = True

class RelationBase(BaseModel):
    source_id: int
    target_id: int
    relation_type: str
    description: Optional[str] = None

class RelationCreate(RelationBase):
    pass

class Relation(RelationBase):
    id: int
    class Config:
        orm_mode = True
