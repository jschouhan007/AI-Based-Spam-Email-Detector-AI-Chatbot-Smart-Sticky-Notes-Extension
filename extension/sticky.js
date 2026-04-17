(function() {
    if (window.aiStickySystemInitialized) return;
    window.aiStickySystemInitialized = true;

    // ===== PREMIUM THEME SYSTEM =====
    // Each theme: gradient for header, glow color, glass bg, border color, text color, accent
    const STICKY_THEMES = {
        violet: {
            grad:   'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
            glow:   'rgba(124,58,237,0.55)',
            bg:     'rgba(30,27,75,0.92)',
            border: 'rgba(139,92,246,0.6)',
            text:   '#e0e7ff',
            sub:    'rgba(224,231,255,0.6)',
            accent: '#a78bfa',
            dot:    '#7c3aed'
        },
        rose: {
            grad:   'linear-gradient(135deg, #e11d48 0%, #be185d 100%)',
            glow:   'rgba(225,29,72,0.5)',
            bg:     'rgba(76,5,25,0.92)',
            border: 'rgba(251,113,133,0.55)',
            text:   '#ffe4e6',
            sub:    'rgba(255,228,230,0.6)',
            accent: '#fb7185',
            dot:    '#e11d48'
        },
        ocean: {
            grad:   'linear-gradient(135deg, #0284c7 0%, #0f766e 100%)',
            glow:   'rgba(2,132,199,0.5)',
            bg:     'rgba(7,24,55,0.93)',
            border: 'rgba(56,189,248,0.5)',
            text:   '#e0f2fe',
            sub:    'rgba(224,242,254,0.6)',
            accent: '#38bdf8',
            dot:    '#0284c7'
        },
        forest: {
            grad:   'linear-gradient(135deg, #059669 0%, #15803d 100%)',
            glow:   'rgba(5,150,105,0.5)',
            bg:     'rgba(6,30,20,0.93)',
            border: 'rgba(52,211,153,0.5)',
            text:   '#d1fae5',
            sub:    'rgba(209,250,229,0.6)',
            accent: '#34d399',
            dot:    '#059669'
        }
    };
    // Legacy alias so any remaining references to STICKY_COLORS still resolve
    const STICKY_COLORS = STICKY_THEMES;

    const MOTIVATIONAL_QUOTES = [
        "Solve one DSA question today.",
        "A small step every day leads to big success.",
        "Consistency is more important than perfection.",
        "Your future self will thank you for today's effort.",
        "Focus on the process, not just the outcome."
    ];

    let aiStickyNotes = [];
    const domElements = {};
    const activeTimers = {};       // reminder timeouts
    const pomodoroIntervals = {};  // FIX #11: track running pomodoro intervals by note id
    // FIX #10: track minimized-dot mouse listeners so we can remove on delete
    const minDotListeners = {};    // noteId -> { onMouseMove, onMouseUp }

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    const saveState = debounce(() => {
        chrome.storage.local.set({ aiStickyNotes: aiStickyNotes });
    }, 500);

    // ===== INJECT GLOBAL STYLES =====
    const styleEl = document.createElement('style');
    styleEl.id = 'sticky-note-styles';
    styleEl.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        @keyframes stickyFadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes stickyPopIn {
            0%   { opacity:0; transform: scale(0.4) translateY(20px); }
            70%  { transform: scale(1.04); }
            100% { opacity:1; transform: scale(1) translateY(0); }
        }
        @keyframes stickyShake {
            0%,100% { transform:translateX(0); }
            15%,45%,75% { transform:translateX(-6px); }
            30%,60%,90% { transform:translateX(6px); }
        }
        @keyframes stickyBounce {
            0%,100% { transform:translateY(0); }
            50%      { transform:translateY(-8px); }
        }
        @keyframes confettiFall {
            0%   { transform:translateY(-10px) rotate(0deg); opacity:1; }
            100% { transform:translateY(380px) rotate(720deg); opacity:0; }
        }
        @keyframes noteAppear {
            0%   { opacity:0; transform: translateY(-12px) scale(0.92); }
            100% { opacity:1; transform: translateY(0) scale(1); }
        }
        @keyframes fabPulse {
            0%,100% { box-shadow: 0 0 0 0 rgba(124,58,237,0.5); }
            50%      { box-shadow: 0 0 0 10px rgba(124,58,237,0); }
        }
        @keyframes fabDialIn {
            from { opacity:0; transform: translateY(12px) scale(0.88); }
            to   { opacity:1; transform: translateY(0)    scale(1); }
        }
        @keyframes fabDialOut {
            from { opacity:1; transform: translateY(0)    scale(1); }
            to   { opacity:0; transform: translateY(10px) scale(0.88); }
        }
        @keyframes chatSlideIn {
            from { opacity:0; transform: translateX(40px) scale(0.96); }
            to   { opacity:1; transform: translateX(0)    scale(1); }
        }
        @keyframes chatSlideOut {
            from { opacity:1; transform: translateX(0)    scale(1); }
            to   { opacity:0; transform: translateX(40px) scale(0.96); }
        }
        @keyframes typingDot {
            0%,80%,100% { transform:scale(0.6); opacity:0.3; }
            40%          { transform:scale(1);   opacity:1; }
        }
        @keyframes msgIn {
            from { opacity:0; transform:translateY(8px); }
            to   { opacity:1; transform:translateY(0); }
        }
        @keyframes pomodoroGlow {
            0%,100% { box-shadow: 0 0 0 2px rgba(239,68,68,0.3), 0 20px 40px rgba(0,0,0,0.5); }
            50%      { box-shadow: 0 0 0 4px rgba(239,68,68,0.7), 0 20px 40px rgba(239,68,68,0.25); }
        }
        @keyframes reminderRipple {
            0%   { transform:scale(0.3); opacity:0.9; }
            100% { transform:scale(6);  opacity:0; }
        }
        @keyframes reminderRing {
            0%,100% { transform:scale(1);    opacity:0.8; }
            50%      { transform:scale(1.25); opacity:0.5; }
        }
        @keyframes reminderBellRing {
            0%,100% { transform:rotate(0deg) scale(1); }
            10%,30% { transform:rotate(-18deg) scale(1.1); }
            20%,40% { transform:rotate(18deg) scale(1.1); }
            50%      { transform:rotate(0deg) scale(1.15); }
        }
        @keyframes reminderSlideUp {
            from { transform:translateY(60px); opacity:0; }
            to   { transform:translateY(0);   opacity:1; }
        }
        @keyframes screenFlash {
            0%   { opacity:0; }
            20%  { opacity:0.35; }
            100% { opacity:0; }
        }

        /* ── Sticky Widget Base ── */
        .ai-sticky-widget {
            font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
            backdrop-filter: blur(16px) saturate(180%) !important;
            -webkit-backdrop-filter: blur(16px) saturate(180%) !important;
        }
        .ai-sticky-widget * {
            font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
            box-sizing: border-box !important;
        }
        /* Scrollbar inside notes */
        .ai-sticky-widget textarea::-webkit-scrollbar { width:4px; }
        .ai-sticky-widget textarea::-webkit-scrollbar-track { background:transparent; }
        .ai-sticky-widget textarea::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.2); border-radius:999px;
        }
        /* Checklist scrollbar */
        .sticky-checklist-list::-webkit-scrollbar { width:4px; }
        .sticky-checklist-list::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.15); border-radius:999px;
        }
        /* Resize handle custom */
        .ai-sticky-widget::-webkit-resizer {
            background: transparent;
        }
        /* Tool button tooltip */
        .sticky-tool-btn { position: relative !important; }
        .sticky-tool-btn::after {
            content: attr(data-tip);
            position: absolute;
            bottom: calc(100% + 6px);
            left: 50%;
            transform: translateX(-50%) scale(0.85);
            background: rgba(0,0,0,0.85);
            color: #fff;
            font-size: 10px;
            font-weight: 600;
            white-space: nowrap;
            padding: 3px 8px;
            border-radius: 6px;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.15s, transform 0.15s;
        }
        .sticky-tool-btn:hover::after {
            opacity: 1;
            transform: translateX(-50%) scale(1);
        }
        textarea.content-text::placeholder {
            color: rgba(255,255,255,0.3) !important;
            font-style: italic !important;
        }
    `;
    document.head.appendChild(styleEl);

    // ===== LOAD STATE =====
    chrome.storage.local.get(['aiStickyNotes'], (result) => {
        if (result.aiStickyNotes && Array.isArray(result.aiStickyNotes)) {
            aiStickyNotes = result.aiStickyNotes;
            aiStickyNotes.forEach(note => renderNote(note));
            checkPendingReminders();
        } else {
            aiStickyNotes = [];
            // FIX #14: center the welcome note instead of hardcoded top-left
            const cx = Math.max(50, window.innerWidth / 2 - 130);
            const cy = Math.max(50, window.innerHeight / 2 - 130);
            createNewNote({ x: cx, y: cy, text: "👋 Welcome to AI Productivity Suite!\n\nUse the '+' button to create sticky notes on any page." });
        }
    });

    // ===== CROSS-TAB SYNC =====
    /**
     * handleStorageSync — single source of truth for applying a new notes array to this tab's DOM.
     * Called by both chrome.storage.onChanged (passive) AND the SYNC_NOTES message from background
     * (active push). De-duplication is safe because renderNote() checks domElements[id].
     */
    function handleStorageSync(newNotes) {
        if (!Array.isArray(newNotes)) return;
        const newIds = newNotes.map(n => n.id);

        // Remove notes deleted on other tabs
        aiStickyNotes.forEach(oldNote => {
            if (!newIds.includes(oldNote.id)) {
                if (domElements[oldNote.id]) {
                    domElements[oldNote.id].remove();
                    delete domElements[oldNote.id];
                }
                const minDot = document.querySelector(`div[data-min-id="${oldNote.id}"]`);
                if (minDot) minDot.remove();
            }
        });

        // Add new notes or refresh existing ones
        newNotes.forEach(newNote => {
            const existing = aiStickyNotes.find(n => n.id === newNote.id);
            if (!existing) renderNote(newNote);
            else           updateDOM(newNote);
        });

        aiStickyNotes = JSON.parse(JSON.stringify(newNotes));
        checkPendingReminders();
    }

    // Passive listener: fires when THIS tab's own saves change storage
    // (also fires when other tabs change storage, but SYNC_NOTES from background arrives first)
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.aiStickyNotes) {
            handleStorageSync(changes.aiStickyNotes.newValue || []);
        }
    });

    // ===== REMINDER SYSTEM =====
    // Two-layer system:
    //   Layer 1: setTimeout inside the content script  (fires if tab stays open, works for <1 min)
    //   Layer 2: chrome.alarm via background.js        (fires even after tab is closed/refreshed)
    // Both layers check reminderFired before showing the alert to prevent double-popup.
    const REMINDER_GRACE_MS = 5 * 60 * 1000; // 5-minute grace window for past-due reminders

    /** Send a durable alarm to the background service worker. */
    function sendAlarmToBackground(noteId, when) {
        chrome.runtime.sendMessage({ action: 'SET_ALARM', noteId, when })
            .catch(() => {
                // Background may have been inactive; the setTimeout path will still work
                console.warn('[Sticky] Could not reach background to set alarm — setTimeout is the fallback.');
            });
    }

    function checkPendingReminders() {
        let needsSave = false;
        aiStickyNotes.forEach(note => {
            if (note.reminder && !note.reminderFired) {
                const delay = note.reminder - Date.now();
                if (delay <= 0) {
                    // Past due — fire only if within grace window
                    if (Math.abs(delay) <= REMINDER_GRACE_MS) {
                        fireReminder(note.id);
                    } else {
                        // Too old — silently discard
                        note.reminderFired = true;
                        note.reminder = null;
                        needsSave = true;
                    }
                } else if (!activeTimers[note.id]) {
                    // Future reminder — set both a local setTimeout AND a background alarm
                    const capturedId = note.id;
                    activeTimers[capturedId] = setTimeout(() => {
                        fireReminder(capturedId);
                        delete activeTimers[capturedId];
                    }, delay);
                    // Background alarm as the persistent fallback
                    sendAlarmToBackground(capturedId, note.reminder);
                }
            }
        });
        if (needsSave) {
            chrome.storage.local.set({ aiStickyNotes });
        }
    }

    /**
     * fireReminder — always resolves the note freshly from aiStickyNotes
     * to avoid acting on a stale closure reference after cross-tab sync.
     * Guards against double-firing with reminderFired flag.
     */
    function fireReminder(noteId) {
        const note = getNoteRef(noteId);
        if (!note) return;
        if (note.reminderFired) return;
        if (!note.reminder) return;

        // Priority: custom label > note text > checklist > fallback
        let message = note.reminderLabel && note.reminderLabel.trim()
            ? note.reminderLabel.trim()
            : 'Your task reminder is due!';

        if (!note.reminderLabel || !note.reminderLabel.trim()) {
            if (note.type === 'text' && note.text) {
                message = note.text.substring(0, 200);
            } else if (note.type === 'checklist') {
                const pending = (note.checklist || []).filter(i => !i.done);
                if (pending.length > 0) message = 'Pending: ' + pending.map(p => p.text).join(', ');
            }
        }

        note.reminderFired = true;
        note.reminder = null;
        chrome.storage.local.set({ aiStickyNotes });

        showReminderAlert(message);
    }

    function getQuote() {
        return MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    }

    function createNewNote(override = {}) {
        const id = 'note_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        const newNote = {
            id,
            x: override.x !== undefined ? override.x : (window.innerWidth  / 2 - 130) + (Math.random() * 40 - 20),
            y: override.y !== undefined ? override.y : Math.max(80, window.innerHeight / 4) + (Math.random() * 40 - 20),
            width: 260, height: 260,
            color: override.color || 'violet',
            type: override.type || 'text',
            text: override.text !== undefined ? override.text : '',
            checklist: [],
            reminder: null,
            reminderLabel: '',   // custom label shown in the reminder alert
            reminderFired: false
        };
        aiStickyNotes.push(newNote);
        renderNote(newNote);
        saveState();
    }

    function getNoteRef(id) { return aiStickyNotes.find(n => n.id === id); }

    function updateDOM(noteData) {
        const el = domElements[noteData.id];
        if (!el) return;
        const activeEl = document.activeElement;
        const isEditing = activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT')
            && activeEl.closest(`[data-id="${noteData.id}"]`);

        if (!el.dataset.dragging) {
            el.style.left   = noteData.x + 'px';
            el.style.top    = noteData.y + 'px';
            el.style.width  = noteData.width  + 'px';
            el.style.height = noteData.height + 'px';
        }

        // Update theme
        const theme = STICKY_THEMES[noteData.color] || STICKY_THEMES.violet;
        el.style.background  = theme.bg;
        el.style.border      = '1px solid ' + theme.border;
        el.style.boxShadow   = `0 0 0 1px ${theme.border}, 0 20px 60px rgba(0,0,0,0.55), 0 0 40px ${theme.glow}`;
        el.onmouseenter = () => el.style.boxShadow =
            `0 0 0 1px ${theme.border}, 0 28px 70px rgba(0,0,0,0.65), 0 0 60px ${theme.glow}`;
        el.onmouseleave = () => el.style.boxShadow =
            `0 0 0 1px ${theme.border}, 0 20px 60px rgba(0,0,0,0.55), 0 0 40px ${theme.glow}`;
        const headerEl = el.querySelector('.sticky-header');
        if (headerEl) headerEl.style.background = theme.grad;

        if (noteData.type === 'text' && !isEditing) {
            const ta = el.querySelector('textarea.content-text');
            if (ta && ta.value !== noteData.text) ta.value = noteData.text;
        } else if (noteData.type === 'checklist' && !isEditing) {
            renderChecklist(el, noteData);
        }
    }

    // ===== MAIN NOTE RENDERER =====
    function renderNote(note) {
        if (domElements[note.id]) return;

        const widget = document.createElement('div');
        widget.dataset.id = note.id;
        widget.className = 'ai-sticky-widget';
        const theme = STICKY_THEMES[note.color] || STICKY_THEMES.violet;
        Object.assign(widget.style, {
            position: 'fixed',
            left: note.x + 'px', top: note.y + 'px',
            width: note.width + 'px', height: note.height + 'px',
            minWidth: '220px', minHeight: '200px',
            borderRadius: '18px',
            background: theme.bg,
            border: '1px solid ' + theme.border,
            boxShadow: `0 0 0 1px ${theme.border}, 0 20px 60px rgba(0,0,0,0.55), 0 0 40px ${theme.glow}`,
            zIndex: '2147483645',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: "'Inter', system-ui, sans-serif",
            resize: 'both',
            animation: 'noteAppear 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards',
            transition: 'box-shadow 0.3s'
        });
        widget.onmouseenter = () => widget.style.boxShadow =
            `0 0 0 1px ${theme.border}, 0 28px 70px rgba(0,0,0,0.65), 0 0 60px ${theme.glow}`;
        widget.onmouseleave = () => widget.style.boxShadow =
            `0 0 0 1px ${theme.border}, 0 20px 60px rgba(0,0,0,0.55), 0 0 40px ${theme.glow}`;

        // Header
        const header = document.createElement('div');
        header.className = 'sticky-header';
        Object.assign(header.style, {
            background: theme.grad,
            minHeight: '38px', height: '38px',
            cursor: 'grab',
            display: 'flex', alignItems: 'center',
            padding: '0 10px 0 12px',
            userSelect: 'none', flexShrink: '0',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            position: 'relative'
        });

        const titleSpan = document.createElement('span');
        titleSpan.innerHTML = '📌&nbsp;<span style="font-size:13px;font-weight:700;letter-spacing:0.3px;color:#fff;opacity:0.95">Note</span>';

        const toolsDiv = document.createElement('div');
        toolsDiv.style.display = 'flex';
        toolsDiv.style.gap = '4px';

        const addTool = (symbol, tipText, onClick) => {
            const btn = document.createElement('button');
            btn.innerHTML = symbol;
            btn.className = 'sticky-tool-btn';
            btn.setAttribute('data-tip', tipText);
            Object.assign(btn.style, {
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.25)',
                width: '26px', height: '26px', borderRadius: '8px',
                cursor: 'pointer', fontSize: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff',
                transition: 'all 0.18s cubic-bezier(0.34,1.56,0.64,1)',
                padding: '0', flexShrink: '0'
            });
            btn.onmouseenter = () => {
                btn.style.background = 'rgba(255,255,255,0.3)';
                btn.style.transform = 'scale(1.2) translateY(-1px)';
                btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
            };
            btn.onmouseleave = () => {
                btn.style.background = 'rgba(255,255,255,0.15)';
                btn.style.transform = 'scale(1) translateY(0)';
                btn.style.boxShadow = 'none';
            };
            btn.onclick = onClick;
            toolsDiv.appendChild(btn);
            return btn;
        };

        // -- Header Buttons --

        addTool('📋', 'Checklist', (e) => {
            e.stopPropagation();
            const n = getNoteRef(note.id);
            n.type = n.type === 'checklist' ? 'text' : 'checklist';
            saveState();
            switchContentType(widget, n);
        });

        addTool('🍅', 'Pomodoro', (e) => {
            e.stopPropagation();
            const n = getNoteRef(note.id);
            n.type = n.type === 'pomodoro' ? 'text' : 'pomodoro';
            saveState();
            switchContentType(widget, n);
        });

        addTool('⏰', 'Reminder', (e) => {
            e.stopPropagation();
            showReminderDialog(note.id);
        });

        addTool('⬇', 'Download as .txt', (e) => {
            e.stopPropagation();
            const n = getNoteRef(note.id);
            if (!n) return;

            let lines = [];
            const ts = new Date().toLocaleString();
            lines.push('============================');
            lines.push('  AI Sticky Note Export');
            lines.push(`  Exported: ${ts}`);
            lines.push('============================');
            lines.push('');

            if (n.type === 'text') {
                const content = (n.text || '').trim();
                lines.push(content || '(empty note)');

            } else if (n.type === 'checklist') {
                lines.push('CHECKLIST');
                lines.push('─────────');
                (n.checklist || []).forEach(item => {
                    lines.push(`${item.done ? '✅' : '☐'}  ${item.text}`);
                });
                const done  = (n.checklist || []).filter(i => i.done).length;
                const total = (n.checklist || []).length;
                lines.push('');
                lines.push(`Progress: ${done}/${total} completed`);

            } else if (n.type === 'pomodoro') {
                lines.push('POMODORO TIMER NOTE');
                lines.push('This note contains a Pomodoro timer.');
                lines.push('Use the extension to interact with it.');
            }

            if (n.reminderLabel) {
                lines.push('');
                lines.push(`⏰ Reminder Label: ${n.reminderLabel}`);
            }

            lines.push('');
            lines.push('============================');
            lines.push('  AI Gmail Productivity Suite');
            lines.push('============================');

            const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
            const url  = URL.createObjectURL(blob);

            // Build a safe filename from first line of note content
            const rawName = (n.type === 'text'
                ? (n.text || '').split('\n')[0].trim().substring(0, 40)
                : n.type === 'checklist'
                    ? ((n.checklist || [])[0]?.text || 'checklist').substring(0, 40)
                    : 'pomodoro') || 'note';
            const safeName = rawName.replace(/[^a-z0-9\s_-]/gi, '').trim().replace(/\s+/g, '_') || 'sticky_note';
            const dateStr  = new Date().toISOString().slice(0, 10);
            const filename = `${safeName}_${dateStr}.txt`;

            const a = document.createElement('a');
            a.href = url; a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
        });

        addTool('🎨', 'Theme', (e) => {
            e.stopPropagation();
            const themes = Object.keys(STICKY_THEMES);
            const n = getNoteRef(note.id);
            n.color = themes[(themes.indexOf(n.color) + 1) % themes.length];
            saveState();
            updateDOM(n);
        });

        addTool('—', 'Minimize', (e) => {
            e.stopPropagation();
            minimizeNote(note.id, widget);
        });

        addTool('✕', 'Delete', (e) => {
            e.stopPropagation();
            // FIX #11: clear any running pomodoro interval for this note
            if (pomodoroIntervals[note.id]) {
                clearInterval(pomodoroIntervals[note.id]);
                delete pomodoroIntervals[note.id];
            }
            if (activeTimers[note.id]) clearTimeout(activeTimers[note.id]);
            // FIX #10: clean up any lingering minimized-dot mouse listeners
            if (minDotListeners[note.id]) {
                document.removeEventListener('mousemove', minDotListeners[note.id].onMouseMove);
                document.removeEventListener('mouseup',  minDotListeners[note.id].onMouseUp);
                delete minDotListeners[note.id];
            }
            // Remove the minimized dot if present
            const minDot = document.querySelector(`div[data-min-id="${note.id}"]`);
            if (minDot) minDot.remove();
            aiStickyNotes = aiStickyNotes.filter(n => n.id !== note.id);
            saveState();
            widget.remove();
            delete domElements[note.id];
        });

        header.appendChild(titleSpan);
        header.appendChild(toolsDiv);

        const contentContainer = document.createElement('div');
        contentContainer.className = 'content-container';
        Object.assign(contentContainer.style, {
            flex: '1', width: '100%', display: 'flex', flexDirection: 'column',
            overflow: 'hidden'
        });

        widget.appendChild(header);
        widget.appendChild(contentContainer);
        document.body.appendChild(widget);
        domElements[note.id] = widget;

        updateDOM(note);
        switchContentType(widget, note);

        // Dragging
        let isDragging = false, startX, startY, startLeft, startTop;
        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            widget.dataset.dragging = "true";
            header.style.cursor = 'grabbing';
            startX = e.clientX; startY = e.clientY;
            const rect = widget.getBoundingClientRect();
            // For position:fixed, left/top are already viewport coords — no scrollX/Y offset
            startLeft = rect.left;
            startTop  = rect.top;
            e.preventDefault();
            Object.values(domElements).forEach(el => el.style.zIndex = '2147483645');
            widget.style.zIndex = '2147483646';
        });
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            widget.style.left = (startLeft + e.clientX - startX) + 'px';
            widget.style.top = (startTop + e.clientY - startY) + 'px';
            const n = getNoteRef(note.id);
            n.x = startLeft + e.clientX - startX;
            n.y = startTop + e.clientY - startY;
            saveState();
        });
        document.addEventListener('mouseup', () => {
            if (isDragging) { isDragging = false; delete widget.dataset.dragging; header.style.cursor = 'grab'; }
        });

        // Resize observer
        const ro = new ResizeObserver(() => {
            if (widget.style.display === 'none') return;
            const rect = widget.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;
            const n = getNoteRef(note.id);
            if (n && (Math.abs(n.width - rect.width) > 2 || Math.abs(n.height - rect.height) > 2)) {
                n.width = rect.width; n.height = rect.height;
                saveState();
            }
        });
        setTimeout(() => ro.observe(widget), 1000);
    }

    // ===== CONTENT TYPES =====
    function switchContentType(widget, note) {
        // FIX #11: clear any running pomodoro interval before wiping the container
        if (pomodoroIntervals[note.id]) {
            clearInterval(pomodoroIntervals[note.id]);
            delete pomodoroIntervals[note.id];
        }
        const container = widget.querySelector('.content-container');
        container.innerHTML = '';
        if (note.type === 'text') renderTextarea(container, note);
        else if (note.type === 'checklist') renderChecklist(widget, note);
        else if (note.type === 'pomodoro') renderPomodoro(container, note);
    }

    function renderTextarea(container, note) {
        const theme = STICKY_THEMES[note.color] || STICKY_THEMES.violet;
        const ta = document.createElement('textarea');
        ta.className = 'content-text';
        Object.assign(ta.style, {
            flex: '1', width: '100%',
            backgroundColor: 'transparent',
            border: 'none', outline: 'none',
            padding: '14px',
            resize: 'none', fontSize: '14px', lineHeight: '1.6',
            boxSizing: 'border-box',
            color: theme.text,
            fontFamily: "'Inter', system-ui, sans-serif"
        });
        ta.placeholder = '📌 ' + getQuote();
        ta.value = note.text;
        ta.addEventListener('input', () => { getNoteRef(note.id).text = ta.value; saveState(); });
        container.appendChild(ta);
    }

    function renderChecklist(widget, note) {
        const container = widget.querySelector ? widget.querySelector('.content-container') : widget;
        if (widget.querySelector) container.innerHTML = '';
        if (!note.checklist) note.checklist = [];
        const theme = STICKY_THEMES[note.color] || STICKY_THEMES.violet;

        const listDiv = document.createElement('div');
        listDiv.className = 'sticky-checklist-list';
        Object.assign(listDiv.style, {
            flex: '1', padding: '10px 12px', overflowY: 'auto',
            display: 'flex', flexDirection: 'column', gap: '6px'
        });

        const buildItems = () => {
            listDiv.innerHTML = '';
            note.checklist.forEach((item, idx) => {
                const row = document.createElement('div');
                Object.assign(row.style, {
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '5px 8px', borderRadius: '8px',
                    background: item.done ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.07)',
                    transition: 'background 0.2s'
                });

                const cb = document.createElement('input');
                cb.type = 'checkbox'; cb.checked = item.done;
                Object.assign(cb.style, { accentColor: theme.accent, width: '15px', height: '15px', flexShrink: '0' });
                cb.onchange = () => { item.done = cb.checked; saveState(); buildItems(); };

                const inp = document.createElement('input');
                inp.type = 'text'; inp.value = item.text;
                Object.assign(inp.style, {
                    flex: '1', border: 'none', background: 'transparent', outline: 'none',
                    textDecoration: item.done ? 'line-through' : 'none',
                    opacity: item.done ? '0.4' : '1',
                    fontSize: '13px', color: theme.text,
                    fontFamily: "'Inter', system-ui, sans-serif"
                });
                inp.oninput = () => { item.text = inp.value; saveState(); };

                const del = document.createElement('button');
                del.innerHTML = '✕';
                Object.assign(del.style, {
                    background: 'none', border: 'none', cursor: 'pointer',
                    opacity: '0.35', fontSize: '10px', color: theme.text, flexShrink: '0',
                    transition: 'opacity 0.15s'
                });
                del.onmouseenter = () => del.style.opacity = '0.8';
                del.onmouseleave = () => del.style.opacity = '0.35';
                del.onclick = () => { note.checklist.splice(idx, 1); saveState(); buildItems(); };

                row.appendChild(cb); row.appendChild(inp); row.appendChild(del);
                listDiv.appendChild(row);
            });

            const addBtn = document.createElement('button');
            addBtn.innerText = '+ Add item';
            Object.assign(addBtn.style, {
                background: 'rgba(255,255,255,0.08)',
                border: '1px dashed rgba(255,255,255,0.2)',
                padding: '6px 10px', borderRadius: '8px',
                cursor: 'pointer', marginTop: '4px', fontSize: '12px',
                color: theme.sub, transition: 'all 0.2s', width: '100%'
            });
            addBtn.onmouseenter = () => addBtn.style.background = 'rgba(255,255,255,0.14)';
            addBtn.onmouseleave = () => addBtn.style.background = 'rgba(255,255,255,0.08)';
            addBtn.onclick = () => { note.checklist.push({ text: '', done: false }); saveState(); buildItems(); };
            listDiv.appendChild(addBtn);
        };
        buildItems();
        container.appendChild(listDiv);
    }

    function renderPomodoro(container, note) {
        const c = STICKY_COLORS[note.color] || STICKY_COLORS.yellow;

        // ── State ──────────────────────────────────────────────
        let mode      = 'work';   // 'work' | 'break'
        let running   = false;
        let timerInt  = null;
        let timeLeft  = 25 * 60;
        let sessions  = 0;        // completed work sessions

        const WORK_TIME  = 25 * 60;
        const BREAK_TIME =  5 * 60;

        // ── Helpers ────────────────────────────────────────────
        const fmt = (s) =>
            `${Math.floor(s / 60).toString().padStart(2,'0')}:${(s % 60).toString().padStart(2,'0')}`;

        function stopInterval() {
            if (timerInt) { clearInterval(timerInt); timerInt = null; }
            if (pomodoroIntervals[note.id]) {
                clearInterval(pomodoroIntervals[note.id]);
                delete pomodoroIntervals[note.id];
            }
        }

        function updateUI() {
            // time display
            timeDisplay.innerText = fmt(timeLeft);

            // progress bar (0–100%)
            const total = mode === 'work' ? WORK_TIME : BREAK_TIME;
            const pct   = Math.max(0, Math.min(100, ((total - timeLeft) / total) * 100));
            progressFill.style.width = pct + '%';
            progressFill.style.backgroundColor = mode === 'work' ? '#ef4444' : '#22c55e';

            // mode label
            modeLabel.innerText = mode === 'work' ? '🍅 Focus' : '☕ Break';
            modeLabel.style.color = mode === 'work' ? '#ef4444' : '#059669';

            // session badge
            sessionBadge.innerText = `Sessions: ${sessions}`;

            // buttons
            pauseBtn.innerText  = running ? '⏸ Pause' : '▶ Resume';
            workBtn.disabled    = (mode === 'work'  && !running);
            breakBtn.disabled   = (mode === 'break' && !running);
            workBtn.style.opacity  = workBtn.disabled  ? '0.4' : '1';
            breakBtn.style.opacity = breakBtn.disabled ? '0.4' : '1';

            // glow wrapper
            wrapper.style.animation = (running && mode === 'work') ? 'pomodoroGlow 2s infinite' : '';
        }

        function switchMode(newMode) {
            stopInterval();
            running  = false;
            mode     = newMode;
            timeLeft = newMode === 'work' ? WORK_TIME : BREAK_TIME;
            updateUI();
        }

        function startTimer() {
            timerInt = setInterval(() => {
                if (timeLeft > 0) {
                    timeLeft--;
                    updateUI();
                } else {
                    stopInterval();
                    running = false;
                    if (mode === 'work') {
                        sessions++;
                        showPomodoroComplete();
                        // Auto-start break prompt
                        mode     = 'break';
                        timeLeft = BREAK_TIME;
                    } else {
                        // Break over → go back to work, paused
                        mode     = 'work';
                        timeLeft = WORK_TIME;
                    }
                    updateUI();
                }
            }, 1000);
            pomodoroIntervals[note.id] = timerInt;
        }

        // ── DOM ────────────────────────────────────────────────
        const wrapper = document.createElement('div');
        Object.assign(wrapper.style, {
            flex: '1', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: c.text, padding: '8px 10px', gap: '6px'
        });

        // Mode label + session counter row
        const topRow = document.createElement('div');
        Object.assign(topRow.style, {
            display: 'flex', justifyContent: 'space-between',
            width: '100%', alignItems: 'center', marginBottom: '2px'
        });

        const modeLabel = document.createElement('span');
        Object.assign(modeLabel.style, { fontSize: '13px', fontWeight: '700' });

        const sessionBadge = document.createElement('span');
        Object.assign(sessionBadge.style, {
            fontSize: '11px', opacity: '0.6', fontWeight: '600',
            background: 'rgba(0,0,0,0.08)', borderRadius: '99px', padding: '2px 8px'
        });

        topRow.appendChild(modeLabel);
        topRow.appendChild(sessionBadge);

        // Time display
        const timeDisplay = document.createElement('div');
        Object.assign(timeDisplay.style, {
            fontSize: '46px', fontWeight: '800', fontFamily: 'monospace',
            letterSpacing: '2px', lineHeight: '1'
        });

        // Progress bar
        const progressTrack = document.createElement('div');
        Object.assign(progressTrack.style, {
            width: '100%', height: '5px', borderRadius: '99px',
            backgroundColor: 'rgba(0,0,0,0.1)', overflow: 'hidden', margin: '4px 0'
        });
        const progressFill = document.createElement('div');
        Object.assign(progressFill.style, {
            height: '100%', width: '0%', borderRadius: '99px',
            transition: 'width 0.9s linear, background-color 0.3s'
        });
        progressTrack.appendChild(progressFill);

        // ── Button factory ──
        const makeBtn = (label, bg) => {
            const b = document.createElement('button');
            b.innerText = label;
            Object.assign(b.style, {
                padding: '7px 12px', border: 'none', borderRadius: '8px',
                cursor: 'pointer', fontWeight: '700', fontSize: '12px',
                transition: 'all 0.2s', backgroundColor: bg || 'rgba(0,0,0,0.1)',
                color: c.text, flex: '1'
            });
            b.onmouseover = () => b.style.filter = 'brightness(1.15)';
            b.onmouseout  = () => b.style.filter = '';
            return b;
        };

        // Row 1: Pause/Resume | Reset
        const row1 = document.createElement('div');
        Object.assign(row1.style, { display: 'flex', gap: '6px', width: '100%' });

        const pauseBtn = makeBtn('▶ Resume', 'rgba(99,102,241,0.2)');
        pauseBtn.onclick = () => {
            if (running) {
                // Pause
                stopInterval();
                running = false;
            } else {
                // Resume / Start
                running = true;
                startTimer();
            }
            updateUI();
        };

        const resetBtn = makeBtn('↺ Reset', 'rgba(0,0,0,0.08)');
        resetBtn.onclick = () => {
            stopInterval();
            running  = false;
            timeLeft = mode === 'work' ? WORK_TIME : BREAK_TIME;
            updateUI();
        };

        row1.appendChild(pauseBtn);
        row1.appendChild(resetBtn);

        // Row 2: Switch to Work | Switch to Break
        const row2 = document.createElement('div');
        Object.assign(row2.style, { display: 'flex', gap: '6px', width: '100%' });

        const workBtn = makeBtn('🍅 25m Work', 'rgba(239,68,68,0.15)');
        workBtn.title = 'Switch to Work session (stops current timer)';
        workBtn.onclick = () => switchMode('work');

        const breakBtn = makeBtn('☕ 5m Break', 'rgba(34,197,94,0.15)');
        breakBtn.title = 'Switch to Break (stops current timer)';
        breakBtn.onclick = () => switchMode('break');

        row2.appendChild(workBtn);
        row2.appendChild(breakBtn);

        wrapper.appendChild(topRow);
        wrapper.appendChild(timeDisplay);
        wrapper.appendChild(progressTrack);
        wrapper.appendChild(row1);
        wrapper.appendChild(row2);
        container.appendChild(wrapper);

        // Initial render
        updateUI();
    }


    // ===== MINIMIZE =====
    function minimizeNote(noteId, widget) {
        const note = getNoteRef(noteId);
        if (!note) return;
        const colors = STICKY_COLORS[note.color] || STICKY_COLORS.yellow;
        widget.style.display = 'none';

        const dot = document.createElement('div');
        dot.dataset.minId = noteId;
        Object.assign(dot.style, {
            position: 'fixed', left: note.x + 'px', top: note.y + 'px',
            width: '56px', height: '56px', borderRadius: '50%',
            backgroundColor: colors.header, border: '3px solid ' + colors.border,
            color: colors.text,
            cursor: 'pointer', zIndex: '2147483646',
            boxShadow: '0 6px 16px rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px', transition: 'box-shadow 0.2s', userSelect: 'none',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        });
        dot.innerHTML = '📌';
        dot.title = 'Drag to move, Click to restore';
        
        let isHover = false;
        dot.onmouseover = () => { isHover = true; dot.style.boxShadow = '0 8px 20px rgba(0,0,0,0.4)'; };
        dot.onmouseout = () => { isHover = false; dot.style.boxShadow = '0 6px 16px rgba(0,0,0,0.3)'; };
        
        // Drag logic for minimized dot
        let isDragging = false;
        let hasDragged = false;
        let startX, startY, startLeft, startTop;

        const onMouseDown = (e) => {
            isDragging = true;
            hasDragged = false;
            dot.style.cursor = 'grabbing';
            startX = e.clientX; startY = e.clientY;
            startLeft = parseFloat(dot.style.left);
            startTop = parseFloat(dot.style.top);
            e.preventDefault();
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasDragged = true;

            const newX = startLeft + dx;
            const newY = startTop + dy;
            dot.style.left = newX + 'px';
            dot.style.top = newY + 'px';

            note.x = newX;
            note.y = newY;
            saveState();
        };

        const onMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                dot.style.cursor = 'pointer';
            }
        };

        // FIX #10: register listeners in registry so delete can clean them up
        minDotListeners[note.id] = { onMouseMove, onMouseUp };

        dot.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        dot.onclick = () => {
            if (hasDragged) return;
            widget.style.display = 'flex';
            widget.style.left = note.x + 'px';
            widget.style.top = note.y + 'px';
            dot.remove();
            // FIX #10: clean up listeners on restore
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            delete minDotListeners[note.id];
        };
        
        document.body.appendChild(dot);
    }

    // ===== ALERT DIALOGS =====

    function showCustomAlert(title, message) {
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: '2147483647',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(3px)', animation: 'stickyFadeIn 0.3s',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        });
        const dialog = document.createElement('div');
        Object.assign(dialog.style, {
            background: 'linear-gradient(135deg, #fff 0%, #f0f4ff 100%)',
            padding: '30px', borderRadius: '20px', textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)', maxWidth: '380px', width: '85%',
            animation: 'stickyPopIn 0.5s forwards cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        });
        const t = document.createElement('h2');
        t.innerText = title;
        Object.assign(t.style, { margin: '0 0 12px', fontSize: '22px', fontWeight: '800', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' });
        const m = document.createElement('p');
        m.innerText = message;
        Object.assign(m.style, { margin: '0 0 20px', color: '#4b5563', fontSize: '15px', lineHeight: '1.5' });
        const b = document.createElement('button');
        b.innerText = 'Got it!';
        Object.assign(b.style, { background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff', border: 'none', padding: '10px 28px', borderRadius: '9999px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(99,102,241,0.4)', transition: 'all 0.2s' });
        b.onmouseover = () => { b.style.transform = 'translateY(-2px)'; };
        b.onmouseout = () => { b.style.transform = 'translateY(0)'; };
        b.onclick = () => overlay.remove();
        dialog.appendChild(t); dialog.appendChild(m); dialog.appendChild(b);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
    }

    // ===== REMINDER DIALOG (replaces browser prompt) =====
    function showReminderDialog(noteId) {
        const existing = document.getElementById('ai-reminder-dialog-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'ai-reminder-dialog-overlay';
        Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.55)', zIndex: '2147483647',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(6px)', animation: 'stickyFadeIn 0.25s',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        });

        const dialog = document.createElement('div');
        Object.assign(dialog.style, {
            background: 'linear-gradient(145deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
            padding: '32px 28px', borderRadius: '24px', width: '340px', maxWidth: '90vw',
            boxShadow: '0 0 0 1px rgba(139,92,246,0.4), 0 25px 60px rgba(0,0,0,0.6)',
            animation: 'stickyPopIn 0.4s forwards cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            color: '#e0e7ff'
        });

        // Header
        const hdr = document.createElement('div');
        Object.assign(hdr.style, { textAlign: 'center', marginBottom: '22px' });
        const icon = document.createElement('div');
        icon.innerText = '⏰';
        Object.assign(icon.style, { fontSize: '44px', display: 'block', marginBottom: '6px', animation: 'reminderRing 2s infinite' });
        const hTitle = document.createElement('h2');
        hTitle.innerText = 'Set a Reminder';
        Object.assign(hTitle.style, {
            margin: '0', fontSize: '20px', fontWeight: '800',
            background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
        });
        hdr.appendChild(icon); hdr.appendChild(hTitle);

        // Label field
        const labelWrap = document.createElement('div');
        labelWrap.style.marginBottom = '14px';
        const labelLbl = document.createElement('label');
        labelLbl.innerText = '📌 What to remind you about?';
        Object.assign(labelLbl.style, { display: 'block', fontSize: '12px', fontWeight: '600',
            color: '#a5b4fc', marginBottom: '6px', letterSpacing: '0.5px' });
        const labelInp = document.createElement('input');
        labelInp.type = 'text';
        labelInp.placeholder = 'e.g. Submit assignment, Call mom...';
        Object.assign(labelInp.style, {
            width: '100%', boxSizing: 'border-box', padding: '10px 14px',
            borderRadius: '10px', border: '1px solid rgba(139,92,246,0.4)',
            background: 'rgba(255,255,255,0.07)', color: '#e0e7ff',
            fontSize: '14px', outline: 'none', transition: 'border-color 0.2s'
        });
        labelInp.onfocus = () => labelInp.style.borderColor = '#a78bfa';
        labelInp.onblur  = () => labelInp.style.borderColor = 'rgba(139,92,246,0.4)';
        labelWrap.appendChild(labelLbl); labelWrap.appendChild(labelInp);

        // Time field
        const timeWrap = document.createElement('div');
        timeWrap.style.marginBottom = '22px';
        const timeLbl = document.createElement('label');
        timeLbl.innerText = '⏳ In how many minutes?';
        Object.assign(timeLbl.style, { display: 'block', fontSize: '12px', fontWeight: '600',
            color: '#a5b4fc', marginBottom: '6px', letterSpacing: '0.5px' });
        const timeInp = document.createElement('input');
        timeInp.type = 'number'; timeInp.min = '0.1'; timeInp.step = '0.5'; timeInp.value = '5';
        Object.assign(timeInp.style, {
            width: '100%', boxSizing: 'border-box', padding: '10px 14px',
            borderRadius: '10px', border: '1px solid rgba(139,92,246,0.4)',
            background: 'rgba(255,255,255,0.07)', color: '#e0e7ff',
            fontSize: '18px', fontWeight: 'bold', outline: 'none', transition: 'border-color 0.2s'
        });
        timeInp.onfocus = () => timeInp.style.borderColor = '#a78bfa';
        timeInp.onblur  = () => timeInp.style.borderColor = 'rgba(139,92,246,0.4)';
        timeWrap.appendChild(timeLbl); timeWrap.appendChild(timeInp);

        // Buttons
        const btnRow = document.createElement('div');
        Object.assign(btnRow.style, { display: 'flex', gap: '10px' });

        const cancelBtn = document.createElement('button');
        cancelBtn.innerText = 'Cancel';
        Object.assign(cancelBtn.style, {
            flex: '1', padding: '11px', borderRadius: '10px', border: '1px solid rgba(139,92,246,0.3)',
            background: 'rgba(255,255,255,0.05)', color: '#a5b4fc', fontSize: '14px',
            fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
        });
        cancelBtn.onmouseover = () => cancelBtn.style.background = 'rgba(255,255,255,0.1)';
        cancelBtn.onmouseout  = () => cancelBtn.style.background = 'rgba(255,255,255,0.05)';
        cancelBtn.onclick = () => overlay.remove();

        const setBtn = document.createElement('button');
        setBtn.innerText = '⏰ Set Reminder';
        Object.assign(setBtn.style, {
            flex: '2', padding: '11px', borderRadius: '10px', border: 'none',
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: '#fff',
            fontSize: '14px', fontWeight: '700', cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(124,58,237,0.5)', transition: 'all 0.2s'
        });
        setBtn.onmouseover = () => { setBtn.style.transform = 'translateY(-2px)'; setBtn.style.boxShadow = '0 6px 20px rgba(124,58,237,0.7)'; };
        setBtn.onmouseout  = () => { setBtn.style.transform = 'translateY(0)';    setBtn.style.boxShadow = '0 4px 15px rgba(124,58,237,0.5)'; };

        setBtn.onclick = () => {
            const mins = parseFloat(timeInp.value);
            if (!mins || mins <= 0 || isNaN(mins)) {
                timeInp.style.borderColor = '#f87171';
                timeInp.focus();
                return;
            }
            const customLabel = labelInp.value.trim();
            const when = Date.now() + mins * 60000;
            const n = getNoteRef(noteId);
            if (!n) { overlay.remove(); return; }

            n.reminder = when;
            n.reminderLabel = customLabel;
            n.reminderFired = false;
            chrome.storage.local.set({ aiStickyNotes });

            if (activeTimers[noteId]) clearTimeout(activeTimers[noteId]);
            activeTimers[noteId] = setTimeout(() => {
                fireReminder(noteId);
                delete activeTimers[noteId];
            }, mins * 60000);
            sendAlarmToBackground(noteId, when);

            overlay.remove();
            const dispTime = mins < 1 ? `${Math.round(mins * 60)} seconds` : `${mins} minute(s)`;
            showCustomAlert('⏰ Reminder set!',
                `${customLabel ? '"' + customLabel + '"' : 'Your reminder'} will fire in ${dispTime}.`);
        };

        // Allow pressing Enter to submit
        [labelInp, timeInp].forEach(inp => {
            inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') setBtn.click(); });
        });
        // Click outside overlay to close
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

        btnRow.appendChild(cancelBtn); btnRow.appendChild(setBtn);
        dialog.appendChild(hdr); dialog.appendChild(labelWrap);
        dialog.appendChild(timeWrap); dialog.appendChild(btnRow);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        setTimeout(() => labelInp.focus(), 100);
    }

    function showReminderAlert(message) {
        // ── Full-screen ripple/flash layer ──
        const flashEl = document.createElement('div');
        Object.assign(flashEl.style, {
            position: 'fixed', inset: '0', zIndex: '2147483646', pointerEvents: 'none',
            background: 'radial-gradient(circle at 50% 50%, rgba(251,191,36,0.55) 0%, rgba(251,191,36,0) 70%)',
            animation: 'screenFlash 1.2s ease-out forwards'
        });
        document.body.appendChild(flashEl);
        setTimeout(() => flashEl.remove(), 1300);

        // ── Pulsing concentric rings ──
        const RING_COLORS = ['rgba(251,191,36,0.6)', 'rgba(245,158,11,0.45)', 'rgba(217,119,6,0.3)'];
        RING_COLORS.forEach((color, i) => {
            const ring = document.createElement('div');
            const size = 160 + i * 80;
            Object.assign(ring.style, {
                position: 'fixed',
                top:  `calc(50% - ${size / 2}px)`,
                left: `calc(50% - ${size / 2}px)`,
                width: size + 'px', height: size + 'px',
                borderRadius: '50%',
                border: '3px solid ' + color,
                zIndex: '2147483646', pointerEvents: 'none',
                animation: `reminderRipple ${1.6 + i * 0.4}s ease-out ${i * 0.2}s forwards`
            });
            document.body.appendChild(ring);
            setTimeout(() => ring.remove(), (1.6 + i * 0.4 + i * 0.2) * 1000 + 100);
        });

        // ── Main overlay ──
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.65)', zIndex: '2147483647',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(8px)', animation: 'stickyFadeIn 0.3s',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        });

        // Confetti burst
        const confettiColors = ['#f43f5e','#fbbf24','#34d399','#60a5fa','#a78bfa','#f472b6','#fb923c'];
        for (let i = 0; i < 70; i++) {
            const c = document.createElement('div');
            Object.assign(c.style, {
                position: 'fixed', top: '-12px',
                left: (Math.random() * 100) + '%',
                width:  (Math.random() * 12 + 4) + 'px',
                height: (Math.random() * 12 + 4) + 'px',
                backgroundColor: confettiColors[Math.floor(Math.random() * confettiColors.length)],
                borderRadius: Math.random() > 0.4 ? '50%' : '3px',
                animation: `confettiFall ${Math.random() * 2.5 + 1.5}s linear ${Math.random() * 0.6}s forwards`,
                zIndex: '2147483647'
            });
            overlay.appendChild(c);
        }

        // ── Card ──
        const dialog = document.createElement('div');
        Object.assign(dialog.style, {
            background: 'linear-gradient(145deg, #1c1917 0%, #292524 60%, #1c1917 100%)',
            padding: '40px 32px', borderRadius: '28px', textAlign: 'center',
            boxShadow: '0 0 0 2px rgba(251,191,36,0.5), 0 30px 80px rgba(0,0,0,0.7), 0 0 60px rgba(251,191,36,0.2)',
            maxWidth: '440px', width: '88%', position: 'relative',
            animation: 'reminderSlideUp 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards'
        });

        // Glowing ring behind bell
        const glowRing = document.createElement('div');
        Object.assign(glowRing.style, {
            width: '90px', height: '90px', borderRadius: '50%', margin: '0 auto 4px',
            background: 'radial-gradient(circle, rgba(251,191,36,0.3) 0%, rgba(251,191,36,0) 70%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'reminderRing 1.5s ease-in-out infinite'
        });
        const bell = document.createElement('div');
        bell.innerText = '🔔';
        Object.assign(bell.style, {
            fontSize: '58px', lineHeight: '1',
            animation: 'reminderBellRing 0.7s ease-in-out 0.2s 3'
        });
        glowRing.appendChild(bell);

        const title = document.createElement('h2');
        title.innerText = "⏰ Time's Up!";
        Object.assign(title.style, {
            margin: '12px 0 8px', fontSize: '28px', fontWeight: '900',
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
        });

        const msg = document.createElement('p');
        msg.innerText = message;
        Object.assign(msg.style, {
            margin: '0 0 26px', color: '#fef3c7', fontSize: '17px',
            lineHeight: '1.6', fontWeight: '600',
            padding: '14px 18px',
            background: 'rgba(251,191,36,0.12)',
            border: '1px solid rgba(251,191,36,0.25)',
            borderRadius: '14px'
        });

        const btn = document.createElement('button');
        btn.innerText = '✅ Got it!';
        Object.assign(btn.style, {
            background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff',
            border: 'none', padding: '13px 36px', borderRadius: '9999px',
            fontSize: '16px', fontWeight: '800', cursor: 'pointer', letterSpacing: '0.5px',
            boxShadow: '0 4px 20px rgba(245,158,11,0.6)', transition: 'all 0.25s',
            animation: 'stickyBounce 1s ease-in-out infinite 1.5s'
        });
        btn.onmouseover = () => { btn.style.transform = 'scale(1.07) translateY(-2px)'; btn.style.animation = 'none'; btn.style.boxShadow = '0 8px 28px rgba(245,158,11,0.8)'; };
        btn.onmouseout  = () => { btn.style.transform = ''; };
        btn.onclick = () => overlay.remove();

        dialog.appendChild(glowRing);
        dialog.appendChild(title);
        dialog.appendChild(msg);
        dialog.appendChild(btn);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
    }

    function showPomodoroComplete() {
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.6)', zIndex: '2147483647',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(5px)', animation: 'stickyFadeIn 0.3s',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        });

        // Confetti
        const confettiColors = ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];
        for (let i = 0; i < 60; i++) {
            const c = document.createElement('div');
            Object.assign(c.style, {
                position: 'fixed', top: '-10px',
                left: (Math.random() * 100) + '%',
                width: (Math.random() * 10 + 4) + 'px',
                height: (Math.random() * 10 + 4) + 'px',
                backgroundColor: confettiColors[Math.floor(Math.random() * confettiColors.length)],
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                animation: `confettiFall ${Math.random() * 2.5 + 1.5}s linear ${Math.random() * 0.8}s forwards`,
                zIndex: '2147483647'
            });
            overlay.appendChild(c);
        }

        const dialog = document.createElement('div');
        Object.assign(dialog.style, {
            background: 'linear-gradient(135deg, #dcfce7 0%, #86efac 40%, #22c55e 100%)',
            padding: '35px 30px', borderRadius: '24px', textAlign: 'center',
            boxShadow: '0 25px 60px rgba(34,197,94,0.4), 0 0 0 4px rgba(255,255,255,0.6)',
            maxWidth: '420px', width: '85%',
            animation: 'stickyPopIn 0.5s forwards cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            position: 'relative'
        });

        const emoji = document.createElement('div');
        emoji.innerText = '🍅🎉';
        Object.assign(emoji.style, { fontSize: '52px', marginBottom: '8px', animation: 'stickyShake 0.8s ease-in-out 0.3s', display: 'inline-block' });

        const title = document.createElement('h2');
        title.innerText = 'Pomodoro Complete!';
        Object.assign(title.style, { margin: '0 0 10px', fontSize: '26px', fontWeight: '900', color: '#166534' });

        const msg = document.createElement('p');
        msg.innerText = 'Amazing focus session! 🎯\nYou earned a 5-minute break. Stretch, hydrate, and recharge!';
        Object.assign(msg.style, { margin: '0 0 22px', color: '#15803d', fontSize: '15px', lineHeight: '1.6', fontWeight: '600', padding: '10px 15px', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: '12px', whiteSpace: 'pre-line' });

        const btn = document.createElement('button');
        btn.innerText = '🚀 Let\'s Go!';
        Object.assign(btn.style, {
            background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff',
            border: 'none', padding: '12px 30px', borderRadius: '9999px',
            fontSize: '16px', fontWeight: 'bold', cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(22,163,74,0.5)', transition: 'all 0.2s',
            animation: 'stickyBounce 1s infinite 1s'
        });
        btn.onmouseover = () => { btn.style.transform = 'scale(1.05)'; btn.style.animation = 'none'; };
        btn.onmouseout = () => { btn.style.transform = 'scale(1)'; };
        btn.onclick = () => overlay.remove();

        dialog.appendChild(emoji); dialog.appendChild(title); dialog.appendChild(msg); dialog.appendChild(btn);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
    }

    // ===== NEURODESK AI CHATBOT SIDEBAR =====
    const CHAT_BACKEND = 'http://127.0.0.1:5000/chat';
    let chatHistory  = [];   // [{role,content}]
    let chatOpen     = false;
    let chatThinking = false;

    // ── Sidebar shell ──
    const chatSidebar = document.createElement('div');
    chatSidebar.id = 'nd-chat-sidebar';
    Object.assign(chatSidebar.style, {
        position: 'fixed', top: '0', right: '-400px',
        width: '360px', height: '100vh',
        background: 'rgba(13,10,35,0.97)',
        backdropFilter: 'blur(24px) saturate(200%)',
        borderLeft: '1px solid rgba(139,92,246,0.35)',
        boxShadow: '-8px 0 60px rgba(0,0,0,0.6), -2px 0 0 rgba(124,58,237,0.25)',
        zIndex: '2147483646',
        display: 'flex', flexDirection: 'column',
        fontFamily: "'Inter', system-ui, sans-serif",
        transition: 'right 0.35s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden'
    });

    // ── Header ──
    const chatHeader = document.createElement('div');
    Object.assign(chatHeader.style, {
        background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        flexShrink: '0'
    });
    const chatHeaderLeft = document.createElement('div');
    Object.assign(chatHeaderLeft.style, { display:'flex', alignItems:'center', gap:'10px' });
    const chatAvatar = document.createElement('div');
    chatAvatar.innerText = '🧠';
    Object.assign(chatAvatar.style, {
        width:'36px', height:'36px', borderRadius:'10px',
        background:'rgba(255,255,255,0.15)', display:'flex',
        alignItems:'center', justifyContent:'center', fontSize:'20px'
    });
    const chatTitleWrap = document.createElement('div');
    const chatTitle = document.createElement('div');
    chatTitle.innerText = 'NeuroDesk AI';
    Object.assign(chatTitle.style, { color:'#fff', fontWeight:'800', fontSize:'15px', letterSpacing:'0.3px' });
    const chatStatus = document.createElement('div');
    chatStatus.innerText = '● Online';
    Object.assign(chatStatus.style, { color:'rgba(255,255,255,0.65)', fontSize:'11px', marginTop:'1px' });
    chatTitleWrap.appendChild(chatTitle);
    chatTitleWrap.appendChild(chatStatus);
    chatHeaderLeft.appendChild(chatAvatar);
    chatHeaderLeft.appendChild(chatTitleWrap);

    const chatHeaderRight = document.createElement('div');
    Object.assign(chatHeaderRight.style, { display:'flex', gap:'6px' });

    const makeChatBtn = (label, tip, onClick) => {
        const b = document.createElement('button');
        b.innerText = label; b.title = tip;
        Object.assign(b.style, {
            background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)',
            color:'#fff', width:'30px', height:'30px', borderRadius:'8px',
            cursor:'pointer', fontSize:'13px', display:'flex',
            alignItems:'center', justifyContent:'center', transition:'background 0.15s', padding:'0'
        });
        b.onmouseenter = () => b.style.background = 'rgba(255,255,255,0.25)';
        b.onmouseleave = () => b.style.background = 'rgba(255,255,255,0.12)';
        b.onclick = onClick;
        return b;
    };
    const clearBtn = makeChatBtn('🗑', 'Clear chat', () => {
        chatHistory = [];
        chatMessages.innerHTML = '';
        addWelcomeMessage();
    });
    const closeBtn = makeChatBtn('✕', 'Close', () => toggleChat(false));
    chatHeaderRight.appendChild(clearBtn);
    chatHeaderRight.appendChild(closeBtn);
    chatHeader.appendChild(chatHeaderLeft);
    chatHeader.appendChild(chatHeaderRight);

    // ── Messages area ──
    const chatMessages = document.createElement('div');
    Object.assign(chatMessages.style, {
        flex: '1', overflowY: 'auto', padding: '16px 14px',
        display: 'flex', flexDirection: 'column', gap: '12px',
        scrollbarWidth: 'thin', scrollbarColor: 'rgba(139,92,246,0.3) transparent'
    });

    function renderMarkdown(text) {
        // Minimal markdown: bold, bullet points, code
        return text
            .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
            .replace(/`([^`]+)`/g,'<code style="background:rgba(255,255,255,0.1);padding:1px 5px;border-radius:4px;font-size:12px">$1</code>')
            .replace(/^[•\-\*] (.+)$/gm,'<li style="margin:2px 0;padding-left:4px">$1</li>')
            .replace(/(<li[^>]*>.*<\/li>\n?)+/g, s => `<ul style="margin:6px 0;padding-left:16px">${s}</ul>`)
            .replace(/\n/g,'<br>');
    }

    function addMessage(role, content, animate = true) {
        const isUser = role === 'user';
        const wrap = document.createElement('div');
        Object.assign(wrap.style, {
            display:'flex', flexDirection: isUser ? 'row-reverse' : 'row',
            alignItems:'flex-end', gap:'8px',
            animation: animate ? 'msgIn 0.25s ease forwards' : 'none'
        });

        if (!isUser) {
            const av = document.createElement('div');
            av.innerText = '🧠';
            Object.assign(av.style, {
                width:'28px', height:'28px', borderRadius:'8px',
                background:'linear-gradient(135deg,#7c3aed,#4f46e5)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'14px', flexShrink:'0'
            });
            wrap.appendChild(av);
        }

        const bubble = document.createElement('div');
        bubble.innerHTML = renderMarkdown(content);
        Object.assign(bubble.style, {
            maxWidth: '82%',
            padding: '10px 13px',
            borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
            background: isUser
                ? 'linear-gradient(135deg,#7c3aed,#4f46e5)'
                : 'rgba(255,255,255,0.07)',
            border: isUser ? 'none' : '1px solid rgba(255,255,255,0.1)',
            color: '#e0e7ff',
            fontSize: '13.5px', lineHeight: '1.55',
            wordBreak: 'break-word'
        });

        wrap.appendChild(bubble);
        chatMessages.appendChild(wrap);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return wrap;
    }

    function addTypingIndicator() {
        const wrap = document.createElement('div');
        Object.assign(wrap.style, {
            display:'flex', alignItems:'flex-end', gap:'8px',
            animation:'msgIn 0.25s ease forwards'
        });
        const av = document.createElement('div');
        av.innerText = '🧠';
        Object.assign(av.style, {
            width:'28px', height:'28px', borderRadius:'8px',
            background:'linear-gradient(135deg,#7c3aed,#4f46e5)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'14px', flexShrink:'0'
        });
        const bubble = document.createElement('div');
        Object.assign(bubble.style, {
            padding:'12px 16px',
            borderRadius:'4px 16px 16px 16px',
            background:'rgba(255,255,255,0.07)',
            border:'1px solid rgba(255,255,255,0.1)',
            display:'flex', gap:'5px', alignItems:'center'
        });
        [0,1,2].forEach(i => {
            const d = document.createElement('span');
            Object.assign(d.style, {
                width:'7px', height:'7px', borderRadius:'50%',
                background:'#a78bfa', display:'inline-block',
                animation:`typingDot 1.2s ease-in-out ${i*0.2}s infinite`
            });
            bubble.appendChild(d);
        });
        wrap.appendChild(av); wrap.appendChild(bubble);
        chatMessages.appendChild(wrap);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return wrap;
    }

    function addWelcomeMessage() {
        addMessage('assistant',
            '👋 Hi! I\'m **NeuroDesk AI** — your productivity assistant.\n\n' +
            'I can help you with:\n' +
            '• Email spam & summarization tips\n' +
            '• Note-taking and checklists\n' +
            '• Pomodoro & time management\n' +
            '• Any question you have!\n\n' +
            'What can I help you with today?',
            false
        );
    }

    async function sendChatMessage(text) {
        if (chatThinking || !text.trim()) return;
        chatThinking = true;
        chatInput.disabled = true;
        sendBtn.disabled   = true;
        sendBtn.style.opacity = '0.5';

        chatHistory.push({ role: 'user', content: text });
        addMessage('user', text);
        chatInput.value = '';
        chatInput.style.height = 'auto';

        const typingEl = addTypingIndicator();

        try {
            // Route through background.js — service workers are exempt from CORS
            // restrictions for URLs in host_permissions, content scripts are not.
            const resp = await chrome.runtime.sendMessage({
                action:   'CHAT_REQUEST',
                messages: chatHistory
            });
            const reply = (resp && resp.reply) ? resp.reply : '⚠️ No response received.';
            typingEl.remove();
            chatHistory.push({ role: 'assistant', content: reply });
            addMessage('assistant', reply);
        } catch (err) {
            typingEl.remove();
            addMessage('assistant', '⚠️ Cannot reach NeuroDesk backend.\n\nPlease double-click **start.bat** in the backend folder to start the Flask server, then try again.');
        } finally {
            chatThinking = false;
            chatInput.disabled = false;
            sendBtn.disabled   = false;
            sendBtn.style.opacity = '1';
            chatInput.focus();
        }
    }

    // ── Input area ──
    const chatInputArea = document.createElement('div');
    Object.assign(chatInputArea.style, {
        padding: '12px 14px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        flexShrink: '0',
        background: 'rgba(255,255,255,0.03)'
    });

    const inputRow = document.createElement('div');
    Object.assign(inputRow.style, {
        display:'flex', gap:'8px', alignItems:'flex-end'
    });

    const chatInput = document.createElement('textarea');
    chatInput.placeholder = 'Ask NeuroDesk AI anything...';
    chatInput.rows = 1;
    Object.assign(chatInput.style, {
        flex:'1', resize:'none', border:'1px solid rgba(139,92,246,0.35)',
        borderRadius:'12px', padding:'10px 13px',
        background:'rgba(255,255,255,0.06)', color:'#e0e7ff',
        fontSize:'13.5px', outline:'none', lineHeight:'1.5',
        fontFamily:"'Inter', system-ui", transition:'border-color 0.2s',
        maxHeight:'120px', overflowY:'auto'
    });
    chatInput.onfocus = () => chatInput.style.borderColor = '#7c3aed';
    chatInput.onblur  = () => chatInput.style.borderColor = 'rgba(139,92,246,0.35)';
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    });
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage(chatInput.value.trim());
        }
    });

    const sendBtn = document.createElement('button');
    sendBtn.innerHTML = '&#9658;';
    sendBtn.title = 'Send (Enter)';
    Object.assign(sendBtn.style, {
        width:'40px', height:'40px', borderRadius:'12px', flexShrink:'0',
        background:'linear-gradient(135deg,#7c3aed,#4f46e5)',
        border:'none', color:'#fff', fontSize:'16px',
        cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:'0 3px 12px rgba(124,58,237,0.5)', transition:'all 0.2s'
    });
    sendBtn.onmouseenter = () => { sendBtn.style.transform='scale(1.08)'; sendBtn.style.boxShadow='0 5px 18px rgba(124,58,237,0.7)'; };
    sendBtn.onmouseleave = () => { sendBtn.style.transform=''; sendBtn.style.boxShadow='0 3px 12px rgba(124,58,237,0.5)'; };
    sendBtn.onclick = () => sendChatMessage(chatInput.value.trim());

    const chatHint = document.createElement('div');
    chatHint.innerText = 'Shift+Enter for new line  •  Powered by Groq llama-3.3-70b';
    Object.assign(chatHint.style, {
        fontSize:'10px', color:'rgba(255,255,255,0.25)', marginTop:'6px', textAlign:'center'
    });

    inputRow.appendChild(chatInput);
    inputRow.appendChild(sendBtn);
    chatInputArea.appendChild(inputRow);
    chatInputArea.appendChild(chatHint);

    chatSidebar.appendChild(chatHeader);
    chatSidebar.appendChild(chatMessages);
    chatSidebar.appendChild(chatInputArea);
    document.body.appendChild(chatSidebar);

    function toggleChat(forceOpen) {
        chatOpen = forceOpen !== undefined ? forceOpen : !chatOpen;
        chatSidebar.style.right = chatOpen ? '0px' : '-400px';
        if (chatOpen) {
            if (chatMessages.children.length === 0) addWelcomeMessage();
            setTimeout(() => chatInput.focus(), 350);
        }
    }

    // ── FAB Dial option 3: AI Chat ──
    const dialChat = makeDial('🧠', 'NeuroDesk AI Chat', () => toggleChat(true));

    // ===== FAB SPEED-DIAL =====
    let fabOpen = false;

    // Wrapper keeps FAB + dial options stacked correctly
    const fabWrap = document.createElement('div');
    Object.assign(fabWrap.style, {
        position: 'fixed', bottom: '28px', right: '28px',
        zIndex: '2147483647',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px',
        fontFamily: "'Inter', system-ui, sans-serif"
    });

    // ── Dial options (rendered above FAB) ──────────────────────
    const dialContainer = document.createElement('div');
    Object.assign(dialContainer.style, {
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
        gap: '8px', pointerEvents: 'none', opacity: '0'
    });

    function makeDial(emoji, label, onClick) {
        const row = document.createElement('div');
        Object.assign(row.style, {
            display: 'flex', alignItems: 'center', gap: '10px',
            cursor: 'pointer'
        });

        const pill = document.createElement('span');
        pill.innerText = label;
        Object.assign(pill.style, {
            background: 'rgba(20,16,50,0.92)',
            border: '1px solid rgba(139,92,246,0.4)',
            color: '#e0e7ff', fontSize: '13px', fontWeight: '600',
            padding: '6px 14px', borderRadius: '99px',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            whiteSpace: 'nowrap', letterSpacing: '0.2px',
            transition: 'background 0.18s, transform 0.18s'
        });

        const icon = document.createElement('div');
        icon.innerText = emoji;
        Object.assign(icon.style, {
            width: '42px', height: '42px', borderRadius: '13px',
            background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', flexShrink: '0',
            boxShadow: '0 4px 14px rgba(124,58,237,0.55)',
            transition: 'transform 0.18s'
        });

        row.onmouseenter = () => {
            pill.style.background = 'rgba(124,58,237,0.18)';
            icon.style.transform  = 'scale(1.1)';
            pill.style.transform  = 'translateX(-2px)';
        };
        row.onmouseleave = () => {
            pill.style.background = 'rgba(20,16,50,0.92)';
            icon.style.transform  = '';
            pill.style.transform  = '';
        };
        row.onclick = (e) => {
            e.stopPropagation();
            closeDial();
            onClick();
        };

        row.appendChild(pill);
        row.appendChild(icon);
        return row;
    }

    // ── Option 1: New Note ──
    const dialNew = makeDial('✏️', 'New Sticky Note', () => createNewNote());

    // ── Option 2: Recent / Restore Note ──
    const dialRecent = makeDial('📋', 'Recent Note', () => {
        // Find the most recently modified note (highest id timestamp)
        if (!aiStickyNotes.length) {
            showCustomAlert('📋 No Notes', 'You have no sticky notes yet. Create one first!');
            return;
        }

        // Sort by id (note_<timestamp>_<rand>) — highest timestamp = most recent
        const sorted = [...aiStickyNotes].sort((a, b) => {
            const ta = parseInt(a.id.split('_')[1]) || 0;
            const tb = parseInt(b.id.split('_')[1]) || 0;
            return tb - ta;
        });
        const recentNote = sorted[0];

        // If the note is minimized as a dot, restore it
        const minDot = document.querySelector(`div[data-min-id="${recentNote.id}"]`);
        if (minDot) { minDot.click(); return; }

        // If the note widget exists but is hidden, show it
        const el = domElements[recentNote.id];
        if (el) {
            el.style.display = 'flex';
            el.style.animation = 'noteAppear 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards';
            // Lift it to the top z-order
            Object.values(domElements).forEach(d => d.style.zIndex = '2147483645');
            el.style.zIndex = '2147483646';
            return;
        }

        // Note exists in storage but not rendered on this tab yet — render it
        renderNote(recentNote);
    });

    dialContainer.appendChild(dialNew);
    dialContainer.appendChild(dialRecent);
    dialContainer.appendChild(dialChat);

    // ── Open / Close logic ─────────────────────────────────────
    function openDial() {
        fabOpen = true;
        dialContainer.style.pointerEvents = 'auto';
        [dialNew, dialRecent, dialChat].forEach((row, i) => {
            row.style.animation = 'none';
            row.style.opacity   = '0';
            setTimeout(() => {
                row.style.animation = `fabDialIn 0.26s cubic-bezier(0.34,1.56,0.64,1) ${i * 55}ms forwards`;
            }, 10);
        });
        dialContainer.style.opacity = '1';
        fab.style.transform = 'rotate(45deg) scale(1.08)';
        fab.style.boxShadow = '0 8px 30px rgba(124,58,237,0.8)';
        fab.style.animation = 'none';
    }

    function closeDial() {
        if (!fabOpen) return;
        fabOpen = false;
        dialContainer.style.pointerEvents = 'none';
        [dialNew, dialRecent, dialChat].forEach((row, i) => {
            row.style.animation = `fabDialOut 0.2s ease-in ${i * 30}ms forwards`;
        });
        setTimeout(() => { dialContainer.style.opacity = '0'; }, 280);
        fab.style.transform = '';
        fab.style.boxShadow = '0 4px 20px rgba(124,58,237,0.6)';
        fab.style.animation = 'fabPulse 2.5s ease-in-out infinite';
    }

    // ── Main FAB button ────────────────────────────────────────
    const fab = document.createElement('button');
    fab.id    = 'ai-sticky-fab';
    fab.innerHTML = '<span style="line-height:1;font-size:24px">✦</span>';
    fab.title = 'Sticky Notes Menu';
    Object.assign(fab.style, {
        width: '54px', height: '54px', borderRadius: '16px',
        background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
        color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
        boxShadow: '0 4px 20px rgba(124,58,237,0.6)',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        flexShrink: '0',
        animation: 'fabPulse 2.5s ease-in-out infinite'
    });
    fab.onmouseenter = () => {
        if (!fabOpen) {
            fab.style.transform = 'scale(1.1) translateY(-2px)';
            fab.style.boxShadow = '0 8px 24px rgba(124,58,237,0.75)';
            fab.style.animation = 'none';
        }
    };
    fab.onmouseleave = () => {
        if (!fabOpen) {
            fab.style.transform = '';
            fab.style.boxShadow = '0 4px 20px rgba(124,58,237,0.6)';
            fab.style.animation = 'fabPulse 2.5s ease-in-out infinite';
        }
    };
    fab.onclick = (e) => {
        e.stopPropagation();
        fabOpen ? closeDial() : openDial();
    };

    // Click outside → close dial
    document.addEventListener('click', () => { if (fabOpen) closeDial(); });

    fabWrap.appendChild(dialContainer);
    fabWrap.appendChild(fab);
    document.body.appendChild(fabWrap);

    // ===== MESSAGE HANDLERS =====
    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.action === "ADD_SELECTED_NOTE") {
            createNewNote({ text: 'Selection:\n' + msg.text, color: 'violet' });
        } else if (msg.action === "CREATE_NEW_NOTE") {
            createNewNote();
        } else if (msg.action === "SHOW_REMINDER_ALERT") {
            showReminderAlert(msg.message);
        } else if (msg.action === "SYNC_NOTES") {
            // Background-pushed instant sync — fired by background's storage.onChanged
            // Arrives BEFORE the tab's own chrome.storage.onChanged fires,
            // ensuring zero-delay note appearance on tab switch or first visit.
            handleStorageSync(msg.notes || []);
        }
    });

    window.addEventListener('CREATE_NEW_STICKY', (e) => {
        createNewNote({ text: e.detail?.text || '', color: 'red' });
    });

})();
