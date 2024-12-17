from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 导入路由
from app.routes import cluster, scan

# 注册路由
app.include_router(cluster.router, prefix="/api")
app.include_router(scan.router, prefix="/api")

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"} 