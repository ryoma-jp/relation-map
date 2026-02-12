"""Admin-only endpoints for Relation Map API."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
import models
import schemas
from db import get_db
from auth import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])


def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


def log_admin_action(
    database: Session,
    actor_user_id: int,
    action: str,
    target_user_id: int | None = None,
    details: dict | None = None,
) -> None:
    log = models.AuditLog(
        actor_user_id=actor_user_id,
        action=action,
        target_user_id=target_user_id,
        details=details,
    )
    database.add(log)
    database.commit()


@router.get("/users", response_model=schemas.AdminUserList)
def list_users(
    query: str | None = Query(default=None, alias="q"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    database: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    base_query = database.query(models.User)
    if query:
        like = f"%{query.strip()}%"
        base_query = base_query.filter(or_(models.User.username.ilike(like), models.User.email.ilike(like)))

    total = base_query.count()
    items = (
        base_query.order_by(models.User.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return schemas.AdminUserList(total=total, items=[schemas.UserResponse.model_validate(item) for item in items])


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    database: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")

    target = database.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if target.is_admin:
        admin_count = database.query(func.count(models.User.id)).filter(models.User.is_admin.is_(True)).scalar() or 0
        if admin_count <= 1:
            raise HTTPException(status_code=409, detail="Cannot delete the last admin user")

    database.delete(target)
    database.commit()

    log_admin_action(
        database,
        actor_user_id=current_user.id,
        action="admin.user_delete",
        target_user_id=user_id,
        details={"username": target.username},
    )

    return {"ok": True}


@router.get("/audit-logs", response_model=list[schemas.AuditLogResponse])
def list_audit_logs(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    action: str | None = None,
    actor_user_id: int | None = None,
    target_user_id: int | None = None,
    database: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    query = database.query(models.AuditLog)

    if action:
        query = query.filter(models.AuditLog.action == action)
    if actor_user_id:
        query = query.filter(models.AuditLog.actor_user_id == actor_user_id)
    if target_user_id:
        query = query.filter(models.AuditLog.target_user_id == target_user_id)

    logs = (
        query.order_by(models.AuditLog.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    response: list[schemas.AuditLogResponse] = []
    for log in logs:
        response.append(
            schemas.AuditLogResponse(
                id=log.id,
                actor_user_id=log.actor_user_id,
                target_user_id=log.target_user_id,
                actor_username=log.actor.username if log.actor else None,
                target_username=log.target.username if log.target else None,
                action=log.action,
                details=log.details,
                created_at=log.created_at,
            )
        )

    return response
