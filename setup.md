# Beginner Setup & User Guide for Mkcl Marathi Studio

Welcome to **Mkcl Marathi Studio**! This beginner-friendly guide will walk you step-by-step through setting up, running, and testing the application on your computer.

---

## 📋 Prerequisites (What You Need Installed)

Before starting, ensure you have:
1. **Python 3.10 or higher** installed on your system.
   - Verify by running in terminal: `python3 --version`
2. **Git** installed on your system.
   - Verify by running in terminal: `git --version`
3. Any modern web browser (Google Chrome, Firefox, Edge, Safari).

---

## 🚀 Step-by-Step Installation Guide

### Step 1: Clone the Repository & Create Your Branch
Open your terminal (or Command Prompt) and run:

```bash
# 1. Clone the repository
git clone <repo link>

# 2. Enter the project folder
cd AutoSuggestion

# 3. Create and switch to your own git branch
git checkout -b jitendra_baravkar
```

---

### Step 2: Create & Activate a Python Virtual Environment (Recommended)

A virtual environment keeps your project dependencies clean and isolated.

**On Linux / macOS:**
```bash
python3 -m venv venv
source venv/bin/activate
```

**On Windows (Command Prompt / PowerShell):**
```cmd
python -m venv venv
venv\Scripts\activate
```

*(You will see `(venv)` appear at the beginning of your terminal prompt).*

---

### Step 3: Install Required Dependencies

Install all necessary packages with a single command:

```bash
pip install -r requirements.txt
```

*(Or install individually)*:
```bash
pip install fastapi uvicorn torch transformers indic-transliteration requests pydantic
```

---

### Step 4: Run the Application (1 Command)

Start the local server by running:

```bash
python3 -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

You will see output similar to this:
```text
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

---

### Step 5: Open the Web Editor in Your Browser

1. Open your web browser.
2. Visit **`http://127.0.0.1:8000`**
3. Start typing in English phonetics!

---

## ⌨️ How to Use the Web Editor

1. **Typing Word Transliteration (Phase A)**:
   - Type English characters (e.g., `jiten`, `omkar`, `mayur`).
   - A floating autocomplete menu appears under your typing cursor with top candidate spellings (e.g. `जितेन`, `जितेंद्र`, `ओंकार`, `मयुर`).
   - Press **`Tab`** or **`Enter`** to insert the top candidate into your document.
   - Use the **Up ⬆️ / Down ⬇️ Arrow Keys** to choose candidates #1 to #5.

2. **AI Next-Word Prediction (Phase B)**:
   - Press **Space** after a word (e.g., `jitendra `).
   - The L3Cube AI Engine predicts the **Top 5 next Marathi words** (e.g., `आव्हाड`, `शिंदे`, `जोशी`).
   - Press **`Tab`** to insert the predicted next word!

3. **Shortcuts & Actions**:
   - **Copy Text**: Click the primary `Copy Text` button or press `Ctrl + C`.
   - **Clear Document**: Click the `Clear` button.
   - **Undo / Redo**: Use `Ctrl + Z` (Undo) and `Ctrl + Y` (Redo).
   - **Shortcuts Modal**: Click `Shortcuts` in the top right to see all hotkeys.

---

## 🧪 Running Automated Test Suites

You can test backend API, GUI assets, and autocompletion routines automatically:

```bash
# Test 1: Transliteration & L3Cube PyTorch Engine
python3 test_step1.py

# Test 2: Web GUI Static Files & REST API
python3 test_step2.py

# Test 3: Two-Phase Autocompletion & Outliers (jiten, omkar)
python3 test_step3.py
```

---

## ❓ Troubleshooting & FAQs

### Q1: `[Errno 98] Address already in use`
**Cause**: The server is already running on port 8000.  
**Fix**: Stop existing uvicorn process:
```bash
# On Linux / macOS:
pkill -f uvicorn

# On Windows:
taskkill /F /IM python.exe
```

### Q2: `ModuleNotFoundError: No module named 'fastapi'` (or `torch`)
**Cause**: Virtual environment is not activated or dependencies weren't installed.  
**Fix**: Make sure `(venv)` is active, then run:
```bash
pip install -r requirements.txt
```

### Q3: How do I stop the server?
Press **`Ctrl + C`** in your terminal window.
