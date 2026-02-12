from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON, Text, Boolean, UniqueConstraint
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    
    entities = relationship("Entity", back_populates="owner", cascade="all, delete-orphan")
    relations = relationship("Relation", back_populates="owner", cascade="all, delete-orphan")
    relation_types = relationship("RelationType", back_populates="owner", cascade="all, delete-orphan")
    versions = relationship("Version", back_populates="owner", cascade="all, delete-orphan")
    audit_logs_as_actor = relationship("AuditLog", foreign_keys="AuditLog.actor_user_id", back_populates="actor")
    audit_logs_as_target = relationship("AuditLog", foreign_keys="AuditLog.target_user_id", back_populates="target")

class Entity(Base):
    __tablename__ = "entities"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # e.g. 'person', 'organization'
    description = Column(String, nullable=True)
    
    owner = relationship("User", back_populates="entities")
    outgoing_relations = relationship("Relation", back_populates="source", foreign_keys='Relation.source_id', cascade="all, delete-orphan")
    incoming_relations = relationship("Relation", back_populates="target", foreign_keys='Relation.target_id', cascade="all, delete-orphan")

class Relation(Base):
    __tablename__ = "relations"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    source_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    target_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    relation_type = Column(String, nullable=False)  # e.g. 'friend', 'member', etc.
    description = Column(String, nullable=True)

    owner = relationship("User", back_populates="relations")
    source = relationship("Entity", foreign_keys=[source_id], back_populates="outgoing_relations")
    target = relationship("Entity", foreign_keys=[target_id], back_populates="incoming_relations")


class EntityType(Base):
    __tablename__ = "entity_types"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)


class RelationType(Base):
    __tablename__ = "relation_types"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    
    # Composite unique constraint per user
    __table_args__ = (UniqueConstraint('user_id', 'name', name='uq_relation_type_user_name'),)
    
    owner = relationship("User", back_populates="relation_types")


class Version(Base):
    __tablename__ = "versions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    description = Column(String, nullable=True)
    snapshot = Column(JSON, nullable=False)
    changes = Column(JSON, nullable=True)
    created_by = Column(String, default="system")
    
    owner = relationship("User", back_populates="versions")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    actor_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    target_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String, nullable=False)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    actor = relationship("User", foreign_keys=[actor_user_id], back_populates="audit_logs_as_actor")
    target = relationship("User", foreign_keys=[target_user_id], back_populates="audit_logs_as_target")
    

