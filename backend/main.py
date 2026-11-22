import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, HttpUrl
from analyzer import scan_page_with_playwright

app = FastAPI(title="CartGuard Backend", version="1.0.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    url: str

# Mount mock-site directory for easy local testing
mock_site_dir = Path(__file__).resolve().parent.parent / "mock-site"
if mock_site_dir.exists():
    app.mount("/mock", StaticFiles(directory=str(mock_site_dir), html=True), name="mock")

@app.get("/")
def health_check():
    return {
        "status": "online",
        "service": "CartGuard",
        "mock_site_url": "/mock/index.html"
    }

@app.post("/analyze")
async def analyze_url(req: AnalyzeRequest):
    raw_url = req.url.strip()
    if not (raw_url.startswith("http://") or raw_url.startswith("https://")):
        raise HTTPException(
            status_code=400,
            detail="Invalid URL scheme. The URL must begin with http:// or https://"
        )

    try:
        findings = await scan_page_with_playwright(raw_url)
        return {
            "url": raw_url,
            "status": "success",
            "findings": findings
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        error_msg = str(e) or repr(e)
        raise HTTPException(
            status_code=400,
            detail=f"Unable to load or scan URL: {error_msg}"
        )

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8008))
    uvicorn.run("main:app", host="127.0.0.1", port=port, reload=True)
