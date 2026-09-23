const API_BASE_URL = 'http://127.0.0.1:8000';
const STORAGE_KEY = 'mkcl_editor_draft_content';

// DOM Elements
const editorArea = document.getElementById('editorArea');
const lineNumbers = document.getElementById('lineNumbers');
const posTracker = document.getElementById('posTracker');
const wordCounter = document.getElementById('wordCounter');
const charCounter = document.getElementById('charCounter');
const saveStatus = document.getElementById('saveStatus');
const modeBadge = document.getElementById('modeBadge');
const emptyState = document.getElementById('emptyState');
const unsavedDot = document.getElementById('unsavedDot');

// Popover Dropdown DOM Elements (Phase A Transliteration)
const cursorPopover = document.getElementById('cursorPopover');
const popoverList = document.getElementById('popoverList');
const popoverTitle = document.getElementById('popoverTitle');

// Toolbar Actions
const clearBtn = document.getElementById('clearBtn');
const copyBtn = document.getElementById('copyBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const shortcutsBtn = document.getElementById('shortcutsBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const shortcutsModal = document.getElementById('shortcutsModal');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const toastContainer = document.getElementById('toastContainer');
const modelModeSelect = document.getElementById('modelModeSelect');

// State Variables
let currentCandidates = [];
let selectedIndex = 0;
let currentGhostSuggestion = '';
let currentMode = 'transliteration'; // 'transliteration' or 'prediction'
let isServerOnline = false;
let lastCaretPos = 0;

// Undo / Redo Stack
const historyStack = [''];
let historyIndex = 0;
const MAX_HISTORY = 100;

// Helper: Get Clean Editor Text (excluding ghost element)
function getEditorText() {
    if (!editorArea) return '';
    const clone = editorArea.cloneNode(true);
    const ghost = clone.querySelector('.ghost-inline');
    if (ghost) ghost.remove();
    return clone.textContent || '';
}

// Helper: Set Focus and Cursor Position at End
function setFocusAtEnd(el) {
    if (!el) return;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}

// 1. Toast Notification System
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 200);
    }, 2500);
}

// 2. Backend Health Polling
async function checkBackendHealth() {
    try {
        const res = await fetch(`${API_BASE_URL}/health`);
        const data = await res.json();
        if (data.status === 'online') {
            isServerOnline = true;
        }
    } catch (e) {
        isServerOnline = false;
    }
}

// 3. Line Numbers & Editor Stats
function updateEditorStats() {
    const text = getEditorText();
    const lines = text.split('\n');
    const lineCount = lines.length;

    posTracker.textContent = `Ln ${lineCount}, Col ${text.length - text.lastIndexOf('\n')}`;

    let lineHTML = '';
    for (let i = 1; i <= Math.max(lineCount, 1); i++) {
        const isActive = i === lineCount ? 'active' : '';
        lineHTML += `<div class="${isActive}">${i}</div>`;
    }
    lineNumbers.innerHTML = lineHTML;

    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    wordCounter.textContent = `${words} words`;
    charCounter.textContent = `${text.length} chars`;

    if (text.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
    }
}

// 4. Auto-Save to LocalStorage
function autoSaveContent() {
    localStorage.setItem(STORAGE_KEY, getEditorText());
    saveStatus.textContent = 'Auto-saved to local';
    unsavedDot.classList.add('hidden');
}

function markUnsaved() {
    saveStatus.textContent = 'Unsaved changes...';
    unsavedDot.classList.remove('hidden');
}

// 5. History Undo / Redo Manager
function pushHistoryState(val) {
    if (historyStack[historyIndex] === val) return;
    historyStack.splice(historyIndex + 1);
    historyStack.push(val);
    if (historyStack.length > MAX_HISTORY) historyStack.shift();
    historyIndex = historyStack.length - 1;
    updateHistoryButtons();
}

function updateHistoryButtons() {
    undoBtn.disabled = historyIndex <= 0;
    redoBtn.disabled = historyIndex >= historyStack.length - 1;
}

undoBtn.addEventListener('click', () => {
    if (historyIndex > 0) {
        historyIndex--;
        editorArea.textContent = historyStack[historyIndex];
        setFocusAtEnd(editorArea);
        updateEditorStats();
        autoSaveContent();
        updateHistoryButtons();
        clearGhostText();
        if (cursorPopover) cursorPopover.classList.add('hidden');
    }
});

redoBtn.addEventListener('click', () => {
    if (historyIndex < historyStack.length - 1) {
        historyIndex++;
        editorArea.textContent = historyStack[historyIndex];
        setFocusAtEnd(editorArea);
        updateEditorStats();
        autoSaveContent();
        updateHistoryButtons();
        clearGhostText();
        if (cursorPopover) cursorPopover.classList.add('hidden');
    }
});

// 6. Caret Coordinates Calculation for Floating Dropdown (Phase A Transliteration)
function getCaretCoordinates() {
    const text = getEditorText();
    const lines = text.split('\n');
    const currentLineIndex = lines.length - 1;
    const currentLineText = lines[currentLineIndex];

    const lineHeight = 31.35; // 19px * 1.65
    const charWidth = 11.5;   // Monospace char width
    
    const top = 20 + (currentLineIndex * lineHeight) + lineHeight - editorArea.scrollTop;
    const left = Math.min(24 + (currentLineText.length * charWidth), editorArea.clientWidth - 290);

    return { top: Math.max(top, 35), left: Math.max(left, 12) };
}

function updatePopoverPosition() {
    if (currentCandidates.length === 0 || currentMode !== 'transliteration') {
        if (cursorPopover) cursorPopover.classList.add('hidden');
        return;
    }

    const { top, left } = getCaretCoordinates();
    cursorPopover.style.top = `${top}px`;
    cursorPopover.style.left = `${left}px`;
    cursorPopover.classList.remove('hidden');

    renderPopoverItems();
}

function renderPopoverItems() {
    if (!currentCandidates || currentCandidates.length === 0 || currentMode !== 'transliteration') {
        if (cursorPopover) cursorPopover.classList.add('hidden');
        return;
    }

    popoverTitle.textContent = 'TRANSLITERATION CANDIDATES (1-5)';

    let html = '';
    currentCandidates.forEach((item, index) => {
        const isActive = index === selectedIndex ? 'active' : '';
        html += `
            <div class="popover-item ${isActive}" data-index="${index}">
                <span>${item.word}</span>
                <span class="item-tag">${index === 0 ? 'Space' : '#' + (index + 1)}</span>
            </div>
        `;
    });

    popoverList.innerHTML = html;

    document.querySelectorAll('.popover-item').forEach(el => {
        el.addEventListener('click', () => {
            const idx = parseInt(el.getAttribute('data-index'), 10);
            selectTransliterationCandidate(idx);
        });
    });
}

// 7. Native Inline Faint White Ghost Text Rendering (Phase B Prediction)
function renderGhostText(suggestion) {
    clearGhostText();
    if (!suggestion || !getEditorText().trim() || currentMode !== 'prediction') {
        return;
    }

    currentGhostSuggestion = suggestion;

    const ghostSpan = document.createElement('span');
    ghostSpan.id = 'ghostInline';
    ghostSpan.className = 'ghost-inline';
    ghostSpan.setAttribute('contenteditable', 'false');
    ghostSpan.textContent = suggestion;

    editorArea.appendChild(ghostSpan);
}

function clearGhostText() {
    const existing = editorArea.querySelector('.ghost-inline');
    if (existing) existing.remove();
    currentGhostSuggestion = '';
}

// 8. Fetch Suggestions from Backend API
if (modelModeSelect) {
    modelModeSelect.addEventListener('change', () => {
        showToast(`Switched model to: ${modelModeSelect.options[modelModeSelect.selectedIndex].text}`, 'info');
        fetchSuggestions();
    });
}

async function fetchSuggestions() {
    const textBefore = getEditorText();

    if (!textBefore.trim()) {
        if (cursorPopover) cursorPopover.classList.add('hidden');
        currentCandidates = [];
        clearGhostText();
        return;
    }

    const words = textBefore.split(/\s+/);
    const lastWord = words[words.length - 1] || '';
    const hasSpaceAtEnd = textBefore.endsWith(' ') || textBefore.endsWith('\n');
    const selectedModelMode = modelModeSelect ? modelModeSelect.value : 'fine_tuned';

    try {
        const response = await fetch(`${API_BASE_URL}/api/suggest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: textBefore,
                current_word: lastWord,
                cursor_position: textBefore.length,
                has_space_at_end: hasSpaceAtEnd,
                model_mode: selectedModelMode
            })
        });

        if (!response.ok) return;

        const data = await response.json();
        currentMode = data.mode;

        if (currentMode === 'transliteration') {
            // Phase A: Typing English -> Show 5 Transliteration Candidates in Dropdown, Hide Ghost Text
            clearGhostText();
            currentCandidates = data.top_5_suggestions || [];
            selectedIndex = 0;
            updatePopoverPosition();
        } else {
            // Phase B: Space Pressed / Marathi Word Completed -> Update editor text to Devanagari & Show 1 Faint White Ghost Text Inline
            if (data.transliterated_full_text && getEditorText() !== data.transliterated_full_text) {
                editorArea.textContent = data.transliterated_full_text;
                setFocusAtEnd(editorArea);
                updateEditorStats();
            }

            if (cursorPopover) cursorPopover.classList.add('hidden');
            currentCandidates = [];
            if (data.ghost_suggestion) {
                renderGhostText(data.ghost_suggestion);
            } else {
                clearGhostText();
            }
        }

        if (modeBadge) {
            modeBadge.textContent = currentMode === 'transliteration'
                ? 'Mode: Transliteration'
                : 'Mode:  Prediction';
        }

    } catch (err) {
        console.error("Fetch suggestions error:", err);
        if (cursorPopover) cursorPopover.classList.add('hidden');
        clearGhostText();
    }
}

// 9. Candidate Selection Functions
function selectTransliterationCandidate(index) {
    if (!currentCandidates || currentCandidates.length === 0) return;
    const targetCandidate = currentCandidates[index];
    if (!targetCandidate) return;

    const chosenWord = targetCandidate.word;
    const textBefore = getEditorText();

    const words = textBefore.split(/(\s+)/);
    let lastWordIdx = -1;
    for (let i = words.length - 1; i >= 0; i--) {
        if (words[i].trim().length > 0) {
            lastWordIdx = i;
            break;
        }
    }
    if (lastWordIdx !== -1) {
        words[lastWordIdx] = chosenWord;
    }
    const newText = words.join('') + ' ';

    editorArea.textContent = newText;
    setFocusAtEnd(editorArea);

    updateEditorStats();
    pushHistoryState(getEditorText());
    autoSaveContent();

    if (cursorPopover) cursorPopover.classList.add('hidden');
    currentCandidates = [];

    setTimeout(fetchSuggestions, 50);
}

function acceptGhostSuggestion() {
    if (!currentGhostSuggestion || currentMode !== 'prediction') return;

    const suggestionToInsert = currentGhostSuggestion;
    clearGhostText();

    const textBefore = getEditorText();
    const needsSpace = !textBefore.endsWith(' ') && !textBefore.endsWith('\n');
    const insertion = (needsSpace ? ' ' : '') + suggestionToInsert + ' ';
    const newText = textBefore + insertion;

    editorArea.textContent = newText;
    setFocusAtEnd(editorArea);

    updateEditorStats();
    pushHistoryState(getEditorText());
    autoSaveContent();

    setTimeout(fetchSuggestions, 50);
}

// 10. Keyboard Event Handler
editorArea.addEventListener('keydown', (e) => {
    const isPopoverVisible = cursorPopover && !cursorPopover.classList.contains('hidden') && currentCandidates.length > 0;

    // Shortcuts Key (Ctrl+Z / Ctrl+Y)
    if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undoBtn.click();
        return;
    }
    if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        redoBtn.click();
        return;
    }

    // Handle Phase A Transliteration Popover Dropdown
    if (isPopoverVisible && currentMode === 'transliteration') {
        if (e.key === 'Tab' || e.key === 'Enter') {
            e.preventDefault();
            selectTransliterationCandidate(selectedIndex);
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = (selectedIndex + 1) % currentCandidates.length;
            renderPopoverItems();
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = (selectedIndex - 1 + currentCandidates.length) % currentCandidates.length;
            renderPopoverItems();
            return;
        }
        if (e.key >= '1' && e.key <= '5') {
            const idx = parseInt(e.key, 10) - 1;
            if (idx < currentCandidates.length) {
                e.preventDefault();
                selectTransliterationCandidate(idx);
                return;
            }
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            cursorPopover.classList.add('hidden');
            return;
        }
    }

    // Handle Phase B Next-Word Ghost Prediction (Accept via Tab)
    if (currentGhostSuggestion && currentMode === 'prediction') {
        if (e.key === 'Tab' || e.key === 'ArrowRight') {
            e.preventDefault();
            acceptGhostSuggestion();
            return;
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            clearGhostText();
            return;
        }
    }

    // Space Key Logic: Transliterate active English word to Marathi and trigger inline ghost text prediction
    if (e.key === ' ') {
        const text = getEditorText();
        const words = text.trim().split(/\s+/);
        const lastWord = words[words.length - 1] || '';

        if (lastWord && /[a-zA-Z]/.test(lastWord)) {
            e.preventDefault();
            clearGhostText();

            if (isPopoverVisible && currentCandidates.length > 0) {
                selectTransliterationCandidate(selectedIndex);
                return;
            }

            fetch(`${API_BASE_URL}/api/suggest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    current_word: lastWord,
                    cursor_position: text.length,
                    has_space_at_end: false,
                    model_mode: modelModeSelect ? modelModeSelect.value : 'fine_tuned'
                })
            }).then(res => res.json()).then(data => {
                const marathiWord = data.transliterated_word || lastWord;
                words[words.length - 1] = marathiWord;
                const newText = words.join(' ') + ' ';

                editorArea.textContent = newText;
                setFocusAtEnd(editorArea);

                updateEditorStats();
                pushHistoryState(getEditorText());
                autoSaveContent();

                if (cursorPopover) cursorPopover.classList.add('hidden');
                currentCandidates = [];
                currentMode = 'prediction';

                fetchSuggestions();
            }).catch(err => {
                console.error("Transliteration on space error:", err);
                editorArea.textContent = text + ' ';
                setFocusAtEnd(editorArea);
                fetchSuggestions();
            });
            return;
        }
    }
});

// 11. Input Typing Event
let debounceTimer;
editorArea.addEventListener('input', () => {
    // Clear ghost span if user types manually inside editor
    const ghost = editorArea.querySelector('.ghost-inline');
    if (ghost) ghost.remove();
    currentGhostSuggestion = '';

    updateEditorStats();
    markUnsaved();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        pushHistoryState(getEditorText());
        autoSaveContent();
        fetchSuggestions();
    }, 80);
});

// Sync scroll
editorArea.addEventListener('scroll', () => {
    lineNumbers.scrollTop = editorArea.scrollTop;
    if (cursorPopover && !cursorPopover.classList.contains('hidden')) {
        updatePopoverPosition();
    }
});

// 12. Actions
clearBtn.addEventListener('click', () => {
    if (getEditorText().trim().length > 0) {
        if (!confirm("Are you sure you want to clear all text in the document?")) {
            return;
        }
    }
    editorArea.textContent = '';
    updateEditorStats();
    pushHistoryState('');
    autoSaveContent();
    clearGhostText();
    if (cursorPopover) cursorPopover.classList.add('hidden');
    showToast('Document cleared', 'info');
});

copyBtn.addEventListener('click', () => {
    const text = getEditorText();
    if (!text.trim()) {
        showToast('Nothing to copy', 'info');
        return;
    }
    navigator.clipboard.writeText(text);
    showToast('Text copied to clipboard!', 'success');
});

shortcutsBtn.addEventListener('click', () => {
    shortcutsModal.classList.remove('hidden');
});

closeModalBtn.addEventListener('click', () => {
    shortcutsModal.classList.add('hidden');
});

shortcutsModal.addEventListener('click', (e) => {
    if (e.target === shortcutsModal) {
        shortcutsModal.classList.add('hidden');
    }
});

fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
});

// Load saved content on startup
const savedContent = localStorage.getItem(STORAGE_KEY);
if (savedContent) {
    editorArea.textContent = savedContent;
    historyStack[0] = savedContent;
}

// Initialize
checkBackendHealth();
setInterval(checkBackendHealth, 4000);
updateEditorStats();
