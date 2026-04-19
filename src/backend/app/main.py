from fastapi import FastAPI

app = FastAPI(title="Portfolio Backend")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
