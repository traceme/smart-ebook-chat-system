from fastapi import FastAPI
from app.core.config import settings
from app.routers import users, auth, documents, vector_search, subscription, chat, llm_providers
from app.core.llm_startup import initialize_llm_providers

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

@app.on_event("startup")
async def startup_event():
    """Initialize LLM providers on startup."""
    await initialize_llm_providers()

app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(auth.router, prefix="/api/v1", tags=["auth"])
app.include_router(documents.router, prefix="/api/v1/documents", tags=["documents"])
app.include_router(vector_search.router, prefix="/api/v1/vector", tags=["vector-search"])
app.include_router(subscription.router, tags=["subscription"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["chat"])
app.include_router(llm_providers.router, prefix="/api/v1", tags=["llm-providers"])


@app.get("/")
def read_root():
    return {"message": "Welcome to the Smart eBook Chat System API"}


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "Smart eBook Chat System API"} 