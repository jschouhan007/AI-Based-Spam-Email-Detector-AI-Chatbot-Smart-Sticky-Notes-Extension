// ============================================================
//  AI Sticky Note — Background Service Worker
//  Guarantees sticky.js is running on every HTTP/HTTPS tab,
//  and pushes real-time SYNC_NOTES messages to all tabs the
//  instant chrome.storage changes, so notes appear instantly
//  without requiring any tab refresh.
// ============================================================

// ── Helpers ──────────────────────────────────────────────────
/**
 * Inject sticky.js into a tab (safe to call repeatedly —
 * sticky.js has a 'already initialized' guard at the top).
 */
function ensureStickyInjected(tabId, tabUrl) {
    if (!tabUrl) return;
    if (!tabUrl.startsWith('http://') && !tabUrl.startsWith('https://')) return;
    // Skip chrome:// extension pages, etc.
    chrome.scripting.executeScript({
        target: { tabId },
        files: ['sticky.js']
    }).catch(() => {}); // swallow: restricted pages (chrome://, file://, etc.)
}

/**
 * Broadcast the current notes array to every open HTTP/HTTPS tab.
 * If a tab hasn't loaded sticky.js yet, sendMessage will fail and
 * we fall back to injecting sticky.js (it will load notes on init).
 */
function broadcastSync(newNotes) {
    chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] }, (tabs) => {
        for (const tab of tabs) {
            chrome.tabs.sendMessage(tab.id, {
                action: 'SYNC_NOTES',
                notes: newNotes
            }).catch(() => {
                // Tab doesn't have sticky.js yet → inject it.
                // On load it will pull notes from storage by itself.
                ensureStickyInjected(tab.id, tab.url);
            });
        }
    });
}

// ── Layer 1: Inject into all already-open tabs on install/update ──
chrome.runtime.onInstalled.addListener(() => {
    // Context menus
    chrome.contextMenus.create({
        id: 'add_to_sticky',
        title: 'Add to sticky note',
        contexts: ['selection']
    });
    chrome.contextMenus.create({
        id: 'create_new_sticky',
        title: 'Create new sticky note',
        contexts: ['page', 'selection']
    });

    // Inject into all currently-open http/https tabs
    chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] }, (tabs) => {
        for (const tab of tabs) {
            ensureStickyInjected(tab.id, tab.url);
        }
    });
});

// ── Layer 2: Inject whenever any tab finishes loading a new page ──
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        ensureStickyInjected(tabId, tab.url);
    }
});

// ── Layer 3: Inject the moment a user switches to any tab ─────────
chrome.tabs.onActivated.addListener(({ tabId }) => {
    chrome.tabs.get(tabId, (tab) => {
        if (!chrome.runtime.lastError && tab) {
            ensureStickyInjected(tabId, tab.url);
        }
    });
});

// ── Storage change → instant push to all tabs ─────────────────────
// When notes change on ANY tab, immediately broadcast to every other
// tab so notes appear without a refresh.
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.aiStickyNotes) {
        const newNotes = changes.aiStickyNotes.newValue || [];
        broadcastSync(newNotes);
    }
});

// ── Context menu clicks ───────────────────────────────────────────
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'add_to_sticky') {
        if (info.selectionText && tab.id) {
            chrome.tabs.sendMessage(tab.id, {
                action: 'ADD_SELECTED_NOTE',
                text: info.selectionText
            }).catch(() => {});
        }
    } else if (info.menuItemId === 'create_new_sticky') {
        if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { action: 'CREATE_NEW_NOTE' }).catch(() => {});
        }
    }
});

// ── SET_ALARM + CHAT_REQUEST message handler ─────────────────────
// CHAT_REQUEST is proxied through the background service worker because
// MV3 content scripts are subject to CORS, but service workers are NOT
// (they fetch on behalf of the extension, not a web page origin).
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'SET_ALARM') {
        const delayMs      = msg.when - Date.now();
        // chrome.alarms minimum is ~1 min in MV3; setTimeout handles sub-1-min in the content script
        const delayMinutes = Math.max(delayMs / 60000, 1);
        chrome.alarms.clear('sticky_reminder_' + msg.noteId, () => {
            chrome.alarms.create('sticky_reminder_' + msg.noteId, { delayInMinutes: delayMinutes });
            sendResponse({ success: true });
        });
        return true;
    }

    if (msg.action === 'CHAT_REQUEST') {
        // Proxy the chat fetch — service workers bypass CORS for host_permissions URLs
        fetch('http://127.0.0.1:5000/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: msg.messages })
        })
        .then(r => r.json())
        .then(data => sendResponse({ ok: true,  reply: data.reply || '⚠️ Empty response from server.' }))
        .catch(()  => sendResponse({ ok: false, reply: '⚠️ Cannot reach NeuroDesk backend. Make sure the Flask server is running (double-click start.bat).' }));
        return true; // keep channel open for async sendResponse
    }
});

// ── Alarm fires (reminder due) ────────────────────────────────────
chrome.alarms.onAlarm.addListener((alarm) => {
    if (!alarm.name.startsWith('sticky_reminder_')) return;

    const noteId = alarm.name.replace('sticky_reminder_', '');

    chrome.storage.local.get(['aiStickyNotes'], (result) => {
        const notes = result.aiStickyNotes || [];
        const note  = notes.find(n => n.id === noteId);

        // Double-fire guard — content script setTimeout may have already handled it
        if (!note || note.reminderFired || !note.reminder) return;

        // Build alert message (label takes priority, then note content)
        let message = note.reminderLabel
            ? note.reminderLabel
            : (note.type === 'text'
                ? (note.text || '').substring(0, 150) || 'Your reminder is due!'
                : (() => {
                    const undone = (note.checklist || []).filter(i => !i.done);
                    return undone.length > 0
                        ? 'Pending: ' + undone.map(i => i.text).join(', ')
                        : 'Your reminder is due!';
                })());

        // Mark fired so no other tab or reload shows it again
        note.reminderFired = true;
        note.reminder      = null;
        chrome.storage.local.set({ aiStickyNotes: notes });

        // System notification (works even when no tab is open)
        chrome.notifications.create('reminder_' + noteId, {
            type:             'basic',
            iconUrl:          'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48dGV4dCB5PSIuOWVtIiBmb250LXNpemU9IjkwIj7inq88L3RleHQ+PC9zdmc+',
            title:            '⏰ Note Reminder',
            message:          message,
            priority:         2,
            requireInteraction: true
        });

        // In-page full-screen alert on the active tab (falls back to any http tab)
        chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
            const sendAlert = (tabId) => {
                chrome.tabs.sendMessage(tabId, { action: 'SHOW_REMINDER_ALERT', message }).catch(() => {});
            };
            if (activeTabs.length > 0) {
                sendAlert(activeTabs[0].id);
            } else {
                chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] }, (allTabs) => {
                    if (allTabs.length > 0) sendAlert(allTabs[0].id);
                });
            }
        });
    });
});
