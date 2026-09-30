from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import auth_router, timetable_router, od_router, club_router, event_router, badge_router, certificate_router, notification_router, analytics_router, messaging_router
from app.seed import seed_database

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CampusFlow API",
    description="Campus Club Management Platform Backend",
    version="1.0.0"
)

# CORS Middleware
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(auth_router.router)
app.include_router(timetable_router.router)
app.include_router(od_router.router)
app.include_router(club_router.router)
app.include_router(event_router.router)
app.include_router(badge_router.router)
app.include_router(certificate_router.router)
app.include_router(notification_router.router)
app.include_router(analytics_router.router)
app.include_router(messaging_router.router)






@app.on_event("startup")
def on_startup():
    # Automatically seed default database data if empty
    seed_database()

@app.get("/")
def root():
    return {"message": "CampusFlow API is running smoothly.", "version": "1.0.0"}
