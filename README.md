# Mkcl Marathi Studio - AI Auto-Suggestion & Transliteration Platform

An AI-powered local Marathi text editor and auto-suggestion platform built with **PyTorch**, **FastAPI**, and **`l3cube-pune/marathi-gpt`**.

---

## Project Architecture & Directory Structure

```text
autosuggestion/
├── backend/
│   ├── app.py                 # FastAPI server (serves REST API & Web GUI)
│   ├── transliterate.py       # Universal phonetic English-to-Marathi engine
│   └── model_engine.py        # Local L3Cube Marathi PyTorch model predictor
│
├── frontend/
│   ├── index.html             # VS Code / Linear style web editor GUI
│   ├── styles.css             # Executive dark theme design system
│   └── editor.js              # Two-phase autocompletion & keyboard handlers
│
├── scripts/                   # Fine-Tuning & Data Pipeline (In Progress)
│   ├── script.py              # Load & fine-tune l3cube-pune/marathi-gpt
│   ├── evaluate.py            # Model perplexity & prediction evaluation
│   └── scraper_script/
│       └── web_scraper.py     # Web scraper for clean Marathi sentences
│
├── dataset/                   # Dataset Directory
│   ├── categories/            # Raw categorized datasets (JSONL / CSV)
│   └── split_dataset/
│       ├── train/             # Training split
│       └── validate/          # Validation split
│

└── README.md                  # Project documentation
```

---

## 🚀 Implemented Features (Completed)

### 1. Universal Phonetic Transliteration Engine
- **Dictionary-Free**: Dynamically converts ANY Roman English Marathi input (e.g. `jiten` $\rightarrow$ `जितेन`, `vidyarthi` $\rightarrow$ `विद्यार्थी`, `shikshak` $\rightarrow$ `शिक्षक`, `mayur` $\rightarrow$ `मयुर`) into Devanagari script.
- **Natural Halant Stripping**: Automatically removes word-ending viramas (`्`) for spoken Marathi phonetics (`mayur` $\rightarrow$ **`मयुर`** instead of `मयुर्`).
- **Phonetic Outliers**: Outlier handling for spellings like `omkar` $\rightarrow$ **`ओंकार`**.

### 2. Local L3Cube Neural Engine
- Integrates **`l3cube-pune/marathi-gpt`** (MahaGPT 125M parameter model) running 100% locally on PyTorch without external cloud APIs.
- Predicts Top 5 Marathi candidate words with probability rankings.

### 3. Production-Grade Web Text Editor GUI (`Mkcl Marathi Studio`)
- **VS Code / Linear / Raycast Theme**: Layered obsidian dark palette, typography (`Inter`, `Plus Jakarta Sans`, `JetBrains Mono`, `Noto Sans Devanagari`).
- **Two-Phase Interactive Autocompletion**:
  - **Phase A (While Typing, Space NOT Pressed)**: Floating cursor popover displays **Top 5 Transliteration Candidates** (e.g. typing `jiten` $\rightarrow$ `1. जितेन`, `2. तू` / `जितेंद्र`, `3. जितेन्द्र`, `4. जितेश`, `5. जितेन्द्रिय`).
  - **Phase B (After Space Pressed)**: Displays L3Cube **Top 5 Next-Word Predictions** (e.g. `jitendra ` $\rightarrow$ `1. आव्हाड`, `2. शिंदे`, `3. जोशी`, `4. सिंग`, `5. पवार`).
- **Full Keyboard Navigation**:
  - `Tab` / `Enter`: Inserts selected candidate instantly.
  - `Up` / `Down` Arrow keys: Navigates candidates 1 to 5 in popover.
  - `Esc`: Dismisses popover.
  - `Mouse Click`: Direct selection of any candidate item.
- **SaaS Micro-Interactions**:
  - Active line number gutter highlight.
  - Auto-save draft content to `localStorage`.
  - Undo (`Ctrl+Z`) and Redo (`Ctrl+Y`) history manager.
  - Animated Copy-to-Clipboard toast notifications (`Text copied to clipboard!`).
  - Shortcuts help modal overlay (`?` or header button).
  - Fullscreen toggle mode.

---

## ⏳ Remaining Tasks & Roadmap

The following components are scheduled for the next phase of development:

### 1. Web Scraping Engine (`scripts/scraper_script/web_scraper.py`)
- **Target**: Scrape **6,000 clean, grammatically correct Marathi sentences**.
- **Sentence Constraints**: Short (5 to 15 words max), prioritizing **1st & 2nd person** (`मी`, `आम्ही`, `तू`, `तुम्ही`).
- **5 Category Splits**:
  1. Workplace & Email (~30% / 1,800 sentences)
  2. Casual Chat & Messaging (~30% / 1,800 sentences)
  3. Inquiries & Questions (~20% / 1,200 sentences)
  4. Opinions & Reviews (~10% / 600 sentences)
  5. Starters & Connectors (~10% / 600 sentences)

### 2. Dataset Curation & Cleanup (`dataset/`)
- Clean scraped raw data (+cleanup script).
- Structure into `dataset/categories/` and create train/validate splits in `dataset/split_dataset/` (`train/`, `validate/`).

### 3. Model Fine-Tuning (`scripts/script.py`)
- Fine-tune `l3cube-pune/marathi-gpt` on the 6,000 sentence dataset for 1-to-2 word max auto-suggestions using PyTorch / Hugging Face `Trainer`.

### 4. Model Evaluation (`scripts/evaluate.py`)
- Evaluate model perplexity, top-1 accuracy, and top-2 word prediction accuracy on held-out validation data.

---

## 💻 Quick Start Guide

### 1. Run the Local Backend & Web GUI
```bash
python3 -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```
Open your browser to: **`http://127.0.0.1:8000`**

### 2. Run Test Suites
```bash
# Test Backend API & Transliteration
python3 test_step1.py

# Test Web GUI Static Assets & API
python3 test_step2.py

# Test Two-Phase Autocompletion & Outliers
python3 test_step3.py
```

---

## 🌿 Git Branching Rule

Always create a branch named after your name before pushing changes:
```bash
git checkout -b jitendra_baravkar
```
*Note: Do not push directly to the `main` branch.*
