from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine
from app.models import Base
from app.routers.health import router as health_router
from app.routers.leads import router as leads_router
from app.routers.ocr import router as ocr_router
from app.routers.salesforce import router as salesforce_router


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="LeadFlow API",
    description="Platform-agnostic lead capture and contact context API",
    version="0.1.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://leadflow-six-theta.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(health_router)
app.include_router(leads_router)
app.include_router(ocr_router)
app.include_router(salesforce_router)