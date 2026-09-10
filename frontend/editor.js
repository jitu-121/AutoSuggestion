const API_BASE_URL = 'http://127.0.0.1:8000';
const STORAGE_KEY = 'mkcl_editor_draft_content';

// DOM Elements
const editorArea = document.getElementById('editorArea');
const lineNumbers = document.getElementById('lineNumbers');
const posTracker = document.getElementById('posTracker');
const wordCounter = document.getElementById('wordCounter');
const charCounter = document.getElementById('charCounter');
const saveStatus = document.getElementById('saveStatus');
const cursorPopover = document.getElementById('cursorPopover');
const popoverList = document.getElementById('popoverList');
const popoverTitle = document.getElementById('popoverTitle');
const modeBadge = document.getElementById('modeBadge');
const emptyState = document.getElementById('emptyState');
const unsavedDot = document.getElementById('unsavedDot');

// Actions
const clearBtn = document.getElementById('clearBtn');
const copyBtn = document.getElementById('copyBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const shortcutsBtn = document.getElementById('shortcutsBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const shortcutsModal = document.getElementById('shortcutsModal');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const toastContainer = document.getElementById('toastContainer');

// State Variables
let currentCandidates = [];
let selectedIndex = 0;
let isServerOnline = false;
let currentMode = 'transliteration'; // 'transliteration' or 'prediction'

// Undo / Redo Stack
const historyStack = [''];
let historyIndex = 0;
const MAX_HISTORY = 100;

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

// 3. Line Numbers & Active Line Highlight
function updateEditorStats() {
    const text = editorArea.value;
    const lines = text.split('\n');
    const lineCount = lines.length;

    const selStart = editorArea.selectionStart;
    const textBeforeCursor = text.substring(0, selStart);
    const currentLineIndex = textBeforeCursor.split('\n').length;
    const colNum = selStart - textBeforeCursor.lastIndexOf('\n');

    // Update Line Gutter
    let lineHTML = '';
    for (let i = 1; i <= Math.max(lineCount, 1); i++) {
        const isActive = i === currentLineIndex ? 'active' : '';
        lineHTML += `<div class="${isActive}">${i}</div>`;
    }
    lineNumbers.innerHTML = lineHTML;

    // Track Cursor & Counters
    posTracker.textContent = `Ln ${currentLineIndex}, Col ${colNum}`;

    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    wordCounter.textContent = `${words} words`;
    charCounter.textContent = `${text.length} chars`;

    // Toggle Empty State Banner
    if (text.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
    }
}

// 4. Auto-Save to LocalStorage
function autoSaveContent() {
    localStorage.setItem(STORAGE_KEY, editorArea.value);
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
        editorArea.value = historyStack[historyIndex];
        updateEditorStats();
        autoSaveContent();
        updateHistoryButtons();
    }
});

redoBtn.addEventListener('click', () => {
    if (historyIndex < historyStack.length - 1) {
        historyIndex++;
        editorArea.value = historyStack[historyIndex];
        updateEditorStats();
        autoSaveContent();
        updateHistoryButtons();
    }
});

// 6. Caret Coordinates Calculation for Floating Dropdown
function getCaretCoordinates() {
    const text = editorArea.value;
    const selStart = editorArea.selectionStart;
    const textBefore = text.substring(0, selStart);
    
    const lines = textBefore.split('\n');
    const currentLineIndex = lines.length - 1;
    const currentLineText = lines[currentLineIndex];

    const lineHeight = 31.35; // 19px * 1.65
    const charWidth = 11.5;   // Monospace char width
    
    const top = 20 + (currentLineIndex * lineHeight) + lineHeight - editorArea.scrollTop;
    const left = Math.min(24 + (currentLineText.length * charWidth), editorArea.clientWidth - 290);

    return { top: Math.max(top, 35), left: Math.max(left, 12) };
}

// 7. Render Floating Popover Items
function updatePopoverPosition() {
    if (currentCandidates.length === 0) {
        cursorPopover.classList.add('hidden');
        return;
    }

    const { top, left } = getCaretCoordinates();
    cursorPopover.style.top = `${top}px`;
    cursorPopover.style.left = `${left}px`;
    cursorPopover.classList.remove('hidden');

    renderPopoverItems();
}

function renderPopoverItems() {
    if (!currentCandidates || currentCandidates.length === 0) {
        cursorPopover.classList.add('hidden');
        return;
    }

    popoverTitle.textContent = currentMode === 'transliteration' ? 'TYPING CANDIDATES' : 'NEXT WORD PREDICTIONS';
    modeBadge.textContent = `Mode: ${currentMode === 'transliteration' ? 'Transliteration' : 'Next-Word Prediction'}`;

    let html = '';
    currentCandidates.forEach((item, index) => {
        const isActive = index === selectedIndex ? 'active' : '';
        html += `
            <div class="popover-item ${isActive}" data-index="${index}">
                <span>${item.word}</span>
                <span class="item-tag">${index === 0 ? 'Tab' : '#' + (index + 1)}</span>
            </div>
        `;
    });

    popoverList.innerHTML = html;

    document.querySelectorAll('.popover-item').forEach(el => {
        el.addEventListener('click', () => {
            const idx = parseInt(el.getAttribute('data-index'), 10);
            selectCandidate(idx);
        });
    });
}

// 8. Fetch Suggestions from Backend API
async function fetchSuggestions() {
    const text = editorArea.value;
    const cursor = editorArea.selectionStart;
    const textBefore = text.substring(0, cursor);
    
    if (!textBefore.trim()) {
        cursorPopover.classList.add('hidden');
        currentCandidates = [];
        return;
    }

    const words = textBefore.split(/\s+/);
    const lastWord = words[words.length - 1] || '';
    const hasSpaceAtEnd = textBefore.endsWith(' ') || textBefore.endsWith('\n');

    try {
        const response = await fetch(`${API_BASE_URL}/api/suggest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: textBefore,
                current_word: lastWord,
                cursor_position: cursor,
                has_space_at_end: hasSpaceAtEnd
            })
        });

        if (!response.ok) return;

        const data = await response.json();
        currentMode = data.mode;
        currentCandidates = data.top_5_suggestions || [];
        selectedIndex = 0;

        updatePopoverPosition();

    } catch (err) {
        console.error("Fetch suggestions error:", err);
    }
}

// 9. Select Candidate
function selectCandidate(index) {
    if (!currentCandidates || currentCandidates.length === 0) return;
    const targetCandidate = currentCandidates[index];
    if (!targetCandidate) return;

    const chosenWord = targetCandidate.word;
    const text = editorArea.value;
    const cursor = editorArea.selectionStart;
    const textBefore = text.substring(0, cursor);
    const textAfter = text.substring(cursor);

    if (currentMode === 'transliteration') {
        const words = textBefore.split(/\s+/);
        words[words.length - 1] = chosenWord;
        const newBefore = words.join(' ') + ' ';
        
        editorArea.value = newBefore + textAfter;
        editorArea.selectionStart = editorArea.selectionEnd = newBefore.length;
    } else {
        const needsSpace = !textBefore.endsWith(' ');
        const insertion = (needsSpace ? ' ' : '') + chosenWord + ' ';
        
        editorArea.value = textBefore + insertion + textAfter;
        editorArea.selectionStart = editorArea.selectionEnd = textBefore.length + insertion.length;
    }

    updateEditorStats();
    pushHistoryState(editorArea.value);
    autoSaveContent();

    cursorPopover.classList.add('hidden');
    currentCandidates = [];
    
    setTimeout(fetchSuggestions, 50);
}

// 10. Keyboard Event Handler
editorArea.addEventListener('keydown', (e) => {
    const popoverVisible = !cursorPopover.classList.contains('hidden') && currentCandidates.length > 0;

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

    if (popoverVisible) {
        if (e.key === 'Tab' || e.key === 'Enter') {
            e.preventDefault();
            selectCandidate(selectedIndex);
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

        if (e.key === 'Escape') {
            e.preventDefault();
            cursorPopover.classList.add('hidden');
            return;
        }
    }
});

// 11. Input Typing Event
let debounceTimer;
editorArea.addEventListener('input', () => {
    updateEditorStats();
    markUnsaved();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        pushHistoryState(editorArea.value);
        autoSaveContent();
        fetchSuggestions();
    }, 100);
});

// Sync scroll
editorArea.addEventListener('scroll', () => {
    lineNumbers.scrollTop = editorArea.scrollTop;
    if (!cursorPopover.classList.contains('hidden')) {
        updatePopoverPosition();
    }
});

// 12. Actions (Clear, Copy, Shortcuts Modal, Fullscreen)
clearBtn.addEventListener('click', () => {
    if (editorArea.value.trim().length > 0) {
        if (!confirm("Are you sure you want to clear all text in the document?")) {
            return;
        }
    }
    editorArea.value = '';
    updateEditorStats();
    pushHistoryState('');
    autoSaveContent();
    cursorPopover.classList.add('hidden');
    currentCandidates = [];
    showToast('Document cleared', 'info');
});

copyBtn.addEventListener('click', () => {
    if (!editorArea.value.trim()) {
        showToast('Nothing to copy', 'info');
        return;
    }
    navigator.clipboard.writeText(editorArea.value);
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
    editorArea.value = savedContent;
    historyStack[0] = savedContent;
}

// Initialize
checkBackendHealth();
setInterval(checkBackendHealth, 4000);
updateEditorStats();
