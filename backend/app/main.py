"""
CycloneGuard AI - Backend API Application (Phase 4)

FastAPI entry point for the CycloneGuard AI spatial risk engine.
Includes Phase 3 ML spatial risk + Phase 4 infrastructure vulnerability service.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api.routes import router as risk_router
from backend.app.api.infra_routes import router as infra_router
from backend.app.api.simulation_routes import router as simulation_router

app = FastAPI(
    title="CycloneGuard AI - Spatial Risk & Infrastructure Vulnerability API",
    description="Modular ML-powered spatial cyclone risk, critical infrastructure vulnerability, and scenario simulation service.",
    version="1.0.0",
)

# Enable CORS for React frontend (Vite default: http://localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(risk_router)
app.include_router(infra_router)
app.include_router(simulation_router)


@app.get("/api/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "CycloneGuard AI Risk Engine",
        "phase": 4,
        "modules": ["spatial-risk-ml", "infrastructure-vulnerability", "scenario-simulation"],
        "model": "Random Forest Baseline",
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
