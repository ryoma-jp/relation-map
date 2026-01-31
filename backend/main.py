import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

import models
import db
import api
import time
from sqlalchemy.exc import OperationalError

load_dotenv()

app = FastAPI()
app.include_router(api.router)

# CORS設定（全許可、必要に応じて調整）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# DB初期化
@app.on_event("startup")
def on_startup():
    # wait for the database to be ready (Postgres may still be starting)
    retries = 12
    delay = 1
    for i in range(retries):
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
    return {"message": "Relation Map API is running."}
