import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.database import init_db
from app.routes import auth, expenses, stocks, mf, fd, dashboard

app = FastAPI(title="YouFlow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(expenses.router, prefix="/api/expenses", tags=["expenses"])
app.include_router(stocks.router, prefix="/api/stocks", tags=["stocks"])
app.include_router(mf.router, prefix="/api/mf", tags=["mutual-funds"])
app.include_router(fd.router, prefix="/api/fd", tags=["fds"])
app.include_router(dashboard.router, prefix="/api", tags=["dashboard"])


@app.on_event("startup")
async def startup():
    init_db()


# Serve React frontend in production
candidates = [
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")),
    os.path.abspath(os.path.join(os.getcwd(), "frontend", "dist"))
]
frontend_dist = next((p for p in candidates if os.path.exists(p)), candidates[0])

if os.path.exists(frontend_dist):
    assets_path = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        index = os.path.join(frontend_dist, "index.html")
        return FileResponse(index)
