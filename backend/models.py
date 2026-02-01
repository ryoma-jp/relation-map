from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class Entity(Base):
    __tablename__ = "entities"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # e.g. 'person', 'organization'
    description = Column(String, nullable=True)
    
    outgoing_relations = relationship("Relation", back_populates="source", foreign_keys='Relation.source_id', cascade="all, delete-orphan")
    incoming_relations = relationship("Relation", back_populates="target", foreign_keys='Relation.target_id', cascade="all, delete-orphan")

class Relation(Base):
    __tablename__ = "relations"
    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    target_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    relation_type = Column(String, nullable=False)  # e.g. 'friend', 'member', etc.
    description = Column(String, nullable=True)

    source = relationship("Entity", foreign_keys=[source_id], back_populates="outgoing_relations")
    target = relationship("Entity", foreign_keys=[target_id], back_populates="incoming_relations")


class EntityType(Base):
    __tablename__ = "entity_types"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)


class RelationType(Base):
    __tablename__ = "relation_types"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
