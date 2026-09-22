import os
import sys
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
import uvicorn

# Ensure backend directory is in python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    from backend.transliterate import (
        transliterate_text, 
        natural_marathi_transliterate, 
        get_transliteration_candidates
    )
    from backend.model_engine import model_engine
except ModuleNotFoundError:
    from transliterate import (
        transliterate_text, 
        natural_marathi_transliterate, 
        get_transliteration_candidates
    )
    from model_engine import model_engine

app = FastAPI(
    title="Mkcl Marathi Studio API",
    description="Offline English-to-Marathi Transliteration & Top-5 Next Word Prediction API"
)

from fastapi.staticfiles import StaticFiles

# Enable CORS for web GUI frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SuggestionRequest(BaseModel):
    text: str
    current_word: Optional[str] = ""
    cursor_position: Optional[int] = None
    has_space_at_end: Optional[bool] = False
    model_mode: Optional[str] = "fine_tuned"  # "base" or "fine_tuned"

class SuggestionItem(BaseModel):
    word: str
    score: float

class SuggestionResponse(BaseModel):
    mode: str  # "transliteration" or "prediction"
    original_input: str
    transliterated_word: str
    transliterated_full_text: str
    top_5_suggestions: List[SuggestionItem]

@app.get("/health")
def health_check():
    return {
        "status": "online",
        "engine": "Mkcl Marathi Engine",
        "model_loaded": model_engine.is_loaded
    }

@app.post("/api/suggest", response_model=SuggestionResponse)
def get_suggestions(req: SuggestionRequest):
    raw_word = (req.current_word or "").strip()
    raw_text = req.text or ""
    has_space = req.has_space_at_end or raw_text.endswith(" ") or raw_text.endswith("\n")
    m_mode = req.model_mode or "fine_tuned"

    # Mode 1: Phase A - Typing a word (No trailing space)
    # Return Top 5 Transliteration Candidates for the active word (e.g. 'jiten' -> ['जितेन', 'जितेंद्र', ...])
    if not has_space and raw_word:
        cands = get_transliteration_candidates(raw_word, k=5)
        top_items = [
            SuggestionItem(word=c, score=round(1.0 - (idx * 0.15), 2))
            for idx, c in enumerate(cands)
        ]
        primary_translit = cands[0] if cands else natural_marathi_transliterate(raw_word)
        full_translit = transliterate_text(raw_text)

        return SuggestionResponse(
            mode="transliteration",
            original_input=raw_word,
            transliterated_word=primary_translit,
            transliterated_full_text=full_translit,
            top_5_suggestions=top_items
        )

    # Mode 2: Phase B - Word completed / Space pressed
    # Return Top 5 L3Cube Next-Word Predictions (e.g. 'जितेंद्र ' -> ['आहे', 'म्हणाला', ...])
    transliterated_word = natural_marathi_transliterate(raw_word) if raw_word else ""
    transliterated_full_text = transliterate_text(raw_text)

    top_suggestions = model_engine.predict_top_5(
        text_prefix=transliterated_full_text,
        active_word=transliterated_word,
        model_mode=m_mode
    )
    
    suggestion_items = [
        SuggestionItem(word=item["word"], score=item["score"])
        for item in top_suggestions
    ]

    return SuggestionResponse(
        mode="prediction",
        original_input=raw_word,
        transliterated_word=transliterated_word,
        transliterated_full_text=transliterated_full_text,
        top_5_suggestions=suggestion_items
    )

# Serve frontend Web Text Editor GUI static files at root
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend_root")

if __name__ == "__main__":
    if os.path.basename(os.getcwd()) == "backend":
        uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
    else:
        uvicorn.run("backend.app:app", host="0.0.0.0", port=8000, reload=True)
