from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

import models
import db
import api
from auth_api import router as auth_router
from admin_api import router as admin_router
from auth import get_current_user, hash_password
import time
from sqlalchemy.exc import OperationalError

load_dotenv()

app = FastAPI(title="Relation Map API", version="1.2.0")

# Register routers
app.include_router(auth_router, prefix="/api")
app.include_router(auth_router)
app.include_router(api.router, prefix="/api")
app.include_router(admin_router, prefix="/api")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database initialization
@app.on_event("startup")
def on_startup():
    # Wait for database to be ready (Postgres may still be starting)
    retries = 12
    delay = 1
    for _ in range(retries):
        try:
            with db.engine.connect():
                break
        except OperationalError:
            time.sleep(delay)
    else:
        raise RuntimeError("Database unavailable after retries")

    models.Base.metadata.create_all(bind=db.engine)

    # Auto-create default admin when DB is empty
    database = db.SessionLocal()
    try:
        has_users = database.query(models.User).first() is not None
        if not has_users:
            admin_username = os.getenv("ADMIN_USERNAME", "admin")
            admin_email = os.getenv("ADMIN_EMAIL", "admin@localhost")
            admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
            admin_user = models.User(
                username=admin_username,
                email=admin_email,
                password_hash=hash_password(admin_password),
                is_active=True,
                is_admin=True,
            )
            database.add(admin_user)
            database.commit()
    finally:
        database.close()


@app.get("/")
def read_root():
    return {"message": "Relation Map API is running.", "version": "1.2.0"}

@app.get("/health")
def health():
    return {"status": "healthy"}
