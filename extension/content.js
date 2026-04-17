console.log("Gmail Spam AI Detector initialized.");

let isAiTraining = false;

// ===== SINGLE SOURCE OF TRUTH FOR BACKEND URL =====
const BACKEND_URL = "http://127.0.0.1:5000";

// ===== RISKY ATTACHMENT DETECTION =====
const RISKY_EXTENSIONS = [
    '.exe', '.bat', '.cmd', '.msi', '.scr', '.pif', '.com', '.vbs', '.js',
    '.wsf', '.wsh', '.ps1', '.reg', '.hta', '.cpl', '.inf',
    '.docm', '.xlsm', '.pptm',   // macro-enabled Office
    '.jar', '.apk', '.iso', '.img'
];

const SUSPICIOUS_PATTERNS = [
    /password/i, /invoice/i, /urgent/i, /verify.*account/i
];

function checkAttachments() {
    const attachmentEls = document.querySelectorAll(
        '.aZo, .aQy, [download_url], .aV3, .aQw'
    );

    const attachmentNames = [];
    attachmentEls.forEach(el => {
        const name = el.getAttribute('aria-label') || el.getAttribute('download_url') || el.innerText || '';
        if (name.trim()) attachmentNames.push(name.trim());
    });

    document.querySelectorAll('.aV3 .aQA span, .aZo .aQA span, [aria-label*="."]').forEach(el => {
        const text = el.innerText || el.getAttribute('aria-label') || '';
        if (text.includes('.')) attachmentNames.push(text.trim());
    });

    if (attachmentNames.length === 0) return null;

    const riskyFound = [];
    for (const name of attachmentNames) {
        const lower = name.toLowerCase();
        for (const ext of RISKY_EXTENSIONS) {
            if (lower.endsWith(ext) || lower.includes(ext + '"') || lower.includes(ext + ':')) {
                riskyFound.push({ name: name.substring(0, 60), ext: ext });
                break;
            }
        }
        if (/\.(zip|rar|7z)/i.test(lower) && SUSPICIOUS_PATTERNS.some(p => p.test(lower))) {
            riskyFound.push({ name: name.substring(0, 60), ext: '.zip (suspicious)' });
        }
    }

    return riskyFound.length > 0 ? riskyFound : null;
}

function showAttachmentWarning(riskyFiles) {
    const existing = document.getElementById('ai-attachment-warning');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'ai-attachment-warning';
    Object.assign(banner.style, {
        position: 'relative',
        margin: '8px 0',
        padding: '12px 16px',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderLeft: '4px solid #ef4444',
        borderRadius: '8px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '13px',
        color: '#991b1b',
        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.15)',
        zIndex: '100',
        animation: 'slideDown 0.3s ease-out'
    });

    if (!document.getElementById('attachment-warn-css')) {
        const s = document.createElement('style');
        s.id = 'attachment-warn-css';
        s.textContent = '@keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }';
        document.head.appendChild(s);
    }

    const title = document.createElement('div');
    title.innerHTML = '⚠️ <strong>Risky Attachment Detected</strong>';
    title.style.marginBottom = '6px';
    title.style.fontSize = '14px';

    const list = document.createElement('div');
    list.style.paddingLeft = '8px';
    riskyFiles.forEach(f => {
        const item = document.createElement('div');
        item.innerHTML = `• <strong>${f.name}</strong> <span style="opacity:0.7">(${f.ext})</span>`;
        item.style.padding = '2px 0';
        list.appendChild(item);
    });

    const tip = document.createElement('div');
    tip.innerHTML = '🛡️ <em>Do NOT open these files unless you trust the sender completely.</em>';
    tip.style.marginTop = '8px';
    tip.style.opacity = '0.8';
    tip.style.fontSize = '12px';

    banner.appendChild(title);
    banner.appendChild(list);
    banner.appendChild(tip);

    const emailBody = document.querySelector('.a3s.aiL');
    if (emailBody && emailBody.parentElement) {
        emailBody.parentElement.insertBefore(banner, emailBody);
    } else {
        const headerEl = document.querySelector('.ha');
        if (headerEl) headerEl.parentElement.insertBefore(banner, headerEl.nextSibling);
    }
}

// ===== EMAIL CONTENT EXTRACTION =====
function extractEmailContent() {
    const emailBodyEl = document.querySelector(".a3s.aiL");
    if (!emailBodyEl) return null;

    const emailText = emailBodyEl.innerText.trim();
    if (!emailText) return null;

    const headerEl = document.querySelector(".ha");
    return { text: emailText, headerEl: headerEl, rawEl: emailBodyEl };
}

// ===== BADGE DISPLAY =====
function showBadge(status, confidence, content) {
    let headerEl = content ? content.headerEl : null;
    let textBody = content ? content.text : "";

    // Remove old elements
    const oldBadge = document.getElementById("ai-spam-badge");
    if (oldBadge) oldBadge.remove();
    const oldToolbar = document.getElementById("ai-email-toolbar");
    if (oldToolbar) oldToolbar.remove();

    // Single unified bar
    const bar = document.createElement("div");
    bar.id = "ai-spam-badge";
    Object.assign(bar.style, {
        display: "inline-flex", alignItems: "center", gap: "6px",
        padding: "5px 14px", borderRadius: "20px", fontWeight: "600",
        fontSize: "13px", marginLeft: "12px", zIndex: "100",
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", transition: "all 0.3s ease",
        flexWrap: "wrap", verticalAlign: "middle",
        fontFamily: "system-ui, -apple-system, sans-serif"
    });

    if (status === "Spam") {
        bar.style.backgroundColor = "#fee2e2"; bar.style.color = "#ef4444"; bar.style.border = "1px solid #fecaca";
    } else if (status === "Safe") {
        bar.style.backgroundColor = "#dcfce7"; bar.style.color = "#22c55e"; bar.style.border = "1px solid #bbf7d0";
    } else {
        bar.style.backgroundColor = "#f3f4f6"; bar.style.color = "#6b7280"; bar.style.border = "1px solid #e5e7eb";
    }

    // Status text — FIX #2: don't show NaN% during scanning
    const statusSpan = document.createElement("span");
    const confDisplay = (status === "Scanning..." || isNaN(parseFloat(confidence)))
        ? "" : ` <span style="font-size:0.85em;opacity:0.7">(${confidence}%)</span>`;
    statusSpan.innerHTML = `<strong>AI:</strong> ${status}${confDisplay}`;
    bar.appendChild(statusSpan);

    // Helper: thin divider
    const addDivider = () => {
        const d = document.createElement("div");
        Object.assign(d.style, { width: "1px", height: "14px", backgroundColor: "rgba(0,0,0,0.15)" });
        bar.appendChild(d);
    };

    // Helper: inline button
    const makeBtn = (text, title) => {
        const btn = document.createElement("button");
        btn.innerText = text; btn.title = title;
        Object.assign(btn.style, {
            cursor: "pointer", background: "none", border: "none",
            color: "inherit", opacity: "0.8", fontSize: "12px",
            fontWeight: "600", padding: "1px 4px", whiteSpace: "nowrap"
        });
        btn.onmouseover = () => btn.style.opacity = "1";
        btn.onmouseout = () => btn.style.opacity = "0.8";
        return btn;
    };

    // Only show action buttons when we have text and a resolved status
    if (textBody && (status === "Spam" || status === "Safe")) {
        addDivider();
        const reportSpan = document.createElement("span");
        reportSpan.innerText = "Wrong?";
        Object.assign(reportSpan.style, { opacity: "0.6", fontSize: "11px" });
        bar.appendChild(reportSpan);

        const btnFeedback = makeBtn(
            status === "Spam" ? "👍 Safe" : "👎 Spam",
            status === "Spam" ? "Train AI: Safe" : "Train AI: Spam"
        );
        btnFeedback.onclick = (e) => {
            e.stopPropagation();
            if (isAiTraining) return;
            isAiTraining = true;
            reportSpan.innerText = "Training...";
            btnFeedback.disabled = true;

            fetch(`${BACKEND_URL}/report`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: textBody, label: status === "Spam" ? "ham" : "spam" })
            })
            .then(r => r.json())
            .then(d => {
                // FIX #3: reset isAiTraining immediately on success
                isAiTraining = false;
                if (d.success) {
                    reportSpan.innerText = "✅ Learned!";
                    btnFeedback.remove();
                    setTimeout(() => {
                        if (content.rawEl) content.rawEl.dataset.scanned = "false";
                        scanEmail();
                    }, 2000);
                } else {
                    reportSpan.innerText = "❌ Failed";
                    btnFeedback.disabled = false;
                    setTimeout(() => { reportSpan.innerText = "Wrong?"; }, 3000);
                }
            })
            .catch(() => {
                isAiTraining = false; // FIX: always reset on error
                reportSpan.innerText = "❌ Error";
                btnFeedback.disabled = false;
                setTimeout(() => { reportSpan.innerText = "Wrong?"; }, 3000);
            });
        };
        bar.appendChild(btnFeedback);
    }

    // Summarize + Sticky always show when we have text (not during scanning)
    if (textBody && status !== "Scanning...") {
        addDivider();

        // Summarize
        const btnSum = makeBtn("📝 Summarize", "AI-summarize this email into a sticky note");
        let sumRetries = 0;
        btnSum.onclick = (e) => {
            e.stopPropagation();
            if (btnSum.disabled) return;
            btnSum.innerText = "⏳ Summarizing...";
            btnSum.disabled = true;

            fetch(`${BACKEND_URL}/summarize`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: textBody })
            })
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then(d => {
                if (d.error) {
                    btnSum.innerText = "❌ Error";
                    console.error("Summarize API error:", d.error);
                } else if (d.summary) {
                    btnSum.innerText = "✅ Done!";
                    sumRetries = 0;
                    window.dispatchEvent(new CustomEvent('CREATE_NEW_STICKY', {
                        detail: { text: "📧 Email Summary:\n" + d.summary }
                    }));
                } else {
                    btnSum.innerText = "❌ No Summary";
                }
                setTimeout(() => { btnSum.innerText = "📝 Summarize"; btnSum.disabled = false; }, 2500);
            })
            .catch((err) => {
                console.error("Summarize fetch error:", err);
                sumRetries++;
                if (sumRetries <= 2) {
                    btnSum.innerText = "🔄 Retrying...";
                    setTimeout(() => { btnSum.disabled = false; btnSum.click(); }, 1500);
                } else {
                    btnSum.innerText = "❌ Backend Offline";
                    sumRetries = 0;
                    setTimeout(() => { btnSum.innerText = "📝 Summarize"; btnSum.disabled = false; }, 3000);
                }
            });
        };
        bar.appendChild(btnSum);

        addDivider();

        // Sticky
        const btnSticky = makeBtn("📌 Add Sticky", "Add this email as a sticky note");
        btnSticky.onclick = (e) => {
            e.stopPropagation();
            btnSticky.innerText = "✅ Added!";
            setTimeout(() => { btnSticky.innerText = "📌 Add Sticky"; }, 2000);
            window.dispatchEvent(new CustomEvent('CREATE_NEW_STICKY', {
                detail: { text: "📧 Email:\n" + textBody.substring(0, 500) + (textBody.length > 500 ? "\n..." : "") }
            }));
        };
        bar.appendChild(btnSticky);
    }

    // Append to DOM
    if (headerEl) {
        const subjectLine = headerEl.querySelector("h2");
        if (subjectLine) subjectLine.appendChild(bar);
        else headerEl.appendChild(bar);
    } else {
        bar.style.position = "fixed";
        bar.style.top = "80px";
        bar.style.right = "20px";
        document.body.appendChild(bar);
    }
}

// ===== MAIN SCANNER =====
function scanEmail() {
    const content = extractEmailContent();
    if (!content) return;

    if (content.rawEl.dataset.scanned === "true" && !isAiTraining) return;
    content.rawEl.dataset.scanned = "true";

    console.log("Scanning email with AI...");
    showBadge("Scanning...", "", content); // FIX #2: pass empty string, not "..."

    // Check attachments in parallel
    const riskyAttachments = checkAttachments();
    if (riskyAttachments) {
        showAttachmentWarning(riskyAttachments);
    } else {
        const oldWarn = document.getElementById('ai-attachment-warning');
        if (oldWarn) oldWarn.remove();
    }

    fetch(`${BACKEND_URL}/predict`, { // FIX #4: use BACKEND_URL constant
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content.text })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            console.error("Spam AI Error:", data.error);
            showBadge("Error", "0", content);
            return;
        }
        showBadge(data.prediction, data.confidence, content);
    })
    .catch(err => {
        console.error("Spam AI Fetch Error:", err);
        showBadge("API Offline", "0", content);
    });
}

// ===== EVENT LISTENERS =====
window.addEventListener("hashchange", () => {
    setTimeout(scanEmail, 1000);
});

setTimeout(scanEmail, 1500);

// FIX #5: Debounced observer to prevent hundreds of scans per second
let observerDebounceTimer = null;
const observer = new MutationObserver(() => {
    const hasNewEmailBody = document.querySelector(".a3s.aiL:not([data-scanned='true'])");
    if (hasNewEmailBody) {
        clearTimeout(observerDebounceTimer);
        observerDebounceTimer = setTimeout(scanEmail, 600);
    }
});

observer.observe(document.body, { childList: true, subtree: true });
