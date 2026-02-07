from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

import models
import db
import api
from auth_api import router as auth_router
from auth import get_current_user
import time
from sqlalchemy.exc import OperationalError

load_dotenv()

app = FastAPI(title="Relation Map API", version="1.2.0")

# Register routers
app.include_router(auth_router, prefix="/api")
app.include_router(auth_router)
app.include_router(api.router, prefix="/api")

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


@app.get("/")
def read_root():
    return {"message": "Relation Map API is running.", "version": "1.2.0"}

@app.get("/health")
def health():
    return {"status": "healthy"}
