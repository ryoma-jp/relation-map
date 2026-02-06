from pydantic import BaseModel, ConfigDict, EmailStr, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime

# ===== User & Authentication Schemas =====

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern="^[a-zA-Z0-9_-]+$")
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    
    @validator('username')
    def username_alphanumeric(cls, v):
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username must contain only alphanumeric characters, hyphens, and underscores')
        return v

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime
    is_active: bool
    
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenPayload(BaseModel):
    sub: str  # user_id
    username: str
    exp: datetime

# ===== Existing Schemas =====

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


class VersionSnapshot(BaseModel):
    entities: List[Dict[str, Any]]
    relations: List[Dict[str, Any]]
    entity_types: Optional[List[Dict[str, Any]]] = None
    relation_types: Optional[List[Dict[str, Any]]] = None


class VersionListItem(BaseModel):
    id: int
    version_number: int
    created_at: datetime
    description: Optional[str] = None
    created_by: str
    model_config = ConfigDict(from_attributes=True)


class Version(BaseModel):
    id: int
    version_number: int
    created_at: datetime
    description: Optional[str] = None
    snapshot: VersionSnapshot
    changes: Optional[Dict[str, Any]] = None
    created_by: str
    model_config = ConfigDict(from_attributes=True)

