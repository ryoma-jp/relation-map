"""Version management service for handling version history and snapshots."""

from sqlalchemy.orm import Session
from models import Version, Entity, Relation, RelationType, EntityType
from schemas import VersionSnapshot
from datetime import datetime
from typing import Dict, Any, List, Optional
import json


class VersionService:
    """Service for managing version history and snapshots."""

    @staticmethod
    def get_current_snapshot(db: Session, user_id: int) -> VersionSnapshot:
        """Get current state of the graph as a snapshot for a specific user."""
        entities = db.query(Entity).filter(Entity.user_id == user_id).all()
        relations = db.query(Relation).filter(Relation.user_id == user_id).all()
        entity_types_records = db.query(EntityType).filter(EntityType.user_id == user_id).all()
        relation_types = db.query(RelationType).filter(RelationType.user_id == user_id).all()
        
        # Get entity types from records and existing entities
        entity_types_set = {et.name for et in entity_types_records}
        entity_types_set.update([e.type for e in entities])
        entity_types = sorted(entity_types_set)

        return VersionSnapshot(
            entities=[
                {
                    "id": e.id,
                    "name": e.name,
                    "type": e.type,
                    "description": e.description,
                }
                for e in entities
            ],
            relations=[
                {
                    "id": r.id,
                    "source_id": r.source_id,
                    "target_id": r.target_id,
                    "relation_type": r.relation_type,
                    "description": r.description,
                }
                for r in relations
            ],
            entity_types=[{"name": et} for et in entity_types],
            relation_types=[
                {
                    "id": rt.id,
                    "name": rt.name,
                }
                for rt in relation_types
            ],
        )

    @staticmethod
    def create_version(
        db: Session,
        description: Optional[str] = None,
        created_by: str = "system",
        current_user = None,
    ) -> Version:
        """Create a new version with current snapshot for a specific user."""
        user_id = current_user.id if current_user else None
        snapshot = VersionService.get_current_snapshot(db, user_id)

        # Get next version number for this user
        latest_version = (
            db.query(Version)
            .filter(Version.user_id == user_id)
            .order_by(Version.version_number.desc())
            .first()
        )
        next_version_number = (
            latest_version.version_number + 1 if latest_version else 1
        )

        version = Version(
            version_number=next_version_number,
            description=description or f"Version {next_version_number}",
            snapshot=snapshot.model_dump(),
            created_by=created_by,
            user_id=user_id,
        )
        db.add(version)
        db.commit()
        db.refresh(version)
        return version

    @staticmethod
    def get_all_versions(db: Session, user_id: int) -> List[Version]:
        """Get all versions for a specific user in reverse chronological order."""
        return (
            db.query(Version)
            .filter(Version.user_id == user_id)
            .order_by(Version.version_number.desc())
            .all()
        )

    @staticmethod
    def get_version(db: Session, version_id: int, user_id: int) -> Optional[Version]:
        """Get a specific version by ID for a specific user."""
        return db.query(Version).filter(
            (Version.id == version_id) & (Version.user_id == user_id)
        ).first()

    @staticmethod
    def restore_version(
        db: Session,
        version_id: int,
        create_backup: bool = True,
        user_id: int = None,
    ) -> Version:
        """Restore graph to a specific version for a specific user."""
        # Create backup of current state if requested
        if create_backup:
            VersionService.create_version(
                db,
                description="Backup before restore",
                created_by="system",
                current_user=type('obj', (object,), {'id': user_id})()
            )

        # Get target version
        target_version = VersionService.get_version(db, version_id, user_id)
        if not target_version:
            raise ValueError(f"Version {version_id} not found")

        snapshot = target_version.snapshot

        # Delete existing data for this user only
        db.query(Relation).filter(Relation.user_id == user_id).delete()
        db.query(Entity).filter(Entity.user_id == user_id).delete()
        db.query(EntityType).filter(EntityType.user_id == user_id).delete()
        db.query(RelationType).filter(RelationType.user_id == user_id).delete()
        db.commit()

        # Restore entity types
        for entity_type_data in snapshot.get("entity_types", []):
            entity_type = EntityType(name=entity_type_data["name"], user_id=user_id)
            db.add(entity_type)

        # Restore relation types
        for relation_type_data in snapshot.get("relation_types", []):
            relation_type = RelationType(name=relation_type_data["name"], user_id=user_id)
            db.add(relation_type)

        db.commit()

        # Restore entities
        for entity_data in snapshot.get("entities", []):
            entity = Entity(
                name=entity_data["name"],
                type=entity_data["type"],
                description=entity_data.get("description"),
                user_id=user_id,
            )
            db.add(entity)

        db.commit()

        # Restore relations
        for relation_data in snapshot.get("relations", []):
            relation = Relation(
                source_id=relation_data["source_id"],
                target_id=relation_data["target_id"],
                relation_type=relation_data["relation_type"],
                description=relation_data.get("description"),
                user_id=user_id,
            )
            db.add(relation)

        db.commit()

        # Create new version after restore
        restored_version = VersionService.create_version(
            db,
            description=f"Restored from version {target_version.version_number}",
            created_by="system",
            current_user=type('obj', (object,), {'id': user_id})()
        )

        return restored_version
