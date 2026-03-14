from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.api.insurers import router as insurers_router
from app.api.buildings import router as buildings_router
from app.api.reviews import router as reviews_router
from app.api.pipeline import router as pipeline_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Lumen", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(insurers_router)
app.include_router(buildings_router)
app.include_router(reviews_router)
app.include_router(pipeline_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
