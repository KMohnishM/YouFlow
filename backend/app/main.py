import os
import sys

# Ensure backend directory is in sys.path so 'app.*' imports always succeed
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.database import init_db
from app.routes import auth, expenses, stocks, mf, fd, dashboard

app = FastAPI(title="YouFlow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    try:
        init_db()
    except Exception as e:
        print(f"Warning: Database initialization deferred or error: {e}")


@app.api_route("/api/health", methods=["GET", "HEAD"])
def health():
    return {"status": "ok", "service": "YouFlow"}


# Serve React frontend in production
candidates = [
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")),
    os.path.abspath(os.path.join(os.getcwd(), "frontend", "dist")),
    os.path.abspath(os.path.join(os.getcwd(), "dist")),
]
frontend_dist = next((p for p in candidates if os.path.exists(p)), candidates[0])

if os.path.exists(frontend_dist):
    assets_path = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

    @app.api_route("/{full_path:path}", methods=["GET", "HEAD"])
    async def serve_spa(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        index = os.path.join(frontend_dist, "index.html")
        return FileResponse(index)
