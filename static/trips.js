// VisePanda Trip List
const T = document.getElementById('tripsList');
const E = document.getElementById('emptyMsg');

// Helper to safely call t() or fall back to English
function _t(key) {
    return (typeof t === 'function') ? t(key) : {
        failedLoad: 'Failed to load trips.',
        shareBtn: '🔗 Share',
        renameBtn: '✏️ Rename',
        deleteBtn: '🗑 Delete',
        messages: 'messages',
        shareFailed: 'Failed to share',
        renamePrompt: 'Rename trip:',
        deleteConfirm: 'Delete this trip and all messages?'
    }[key] || key;
}

(async () => {
    const guest = localStorage.getItem('vp_trip') || '';
    const r = await fetch('/api/trips' + (guest ? '?guest_id=' + guest : ''));
    if (!r.ok) {
        T.innerHTML = '<div class=empty>' + _t('failedLoad') + '</div>';
        return;
    }
    const trips = await r.json();
    if (!trips.length) {
        T.style.display = 'none';
        E.style.display = 'block';
        return;
    }
    T.innerHTML = trips.map(tr =>
        '<div class=trip-item>' +
        '<a href=/chat?trip=' + tr.id + ' style=text-decoration:none;color:inherit>' +
        '<h3>' + tr.cities.join(' → ') + '</h3>' +
        '<div class=meta>' + tr.msg_count + ' ' + _t('messages') + ' · ' +
        new Date(tr.updated_at).toLocaleDateString() + '</div></a>' +
        '<div style=margin-top:10px;display:flex;gap:8px>' +
        '<button onclick="event.stopPropagation();shareTrip(\'' + tr.id + '\')" ' +
        'class=btn style=font-size:11px;padding:4px 10px>' + _t('shareBtn') + '</button>' +
        '<button onclick="event.stopPropagation();renameTrip(\'' + tr.id + '\',\'' +
        (tr.title || '').replace(/'/g, '\\x27') + '\')" ' +
        'class=btn style=font-size:11px;padding:4px 10px>' + _t('renameBtn') + '</button>' +
        '<button onclick="event.stopPropagation();deleteTrip(\'' + tr.id + '\')" ' +
        'class=btn style=font-size:11px;padding:4px 10px;color:#fca5a5>' + _t('deleteBtn') + '</button>' +
        '</div></div>'
    ).join('');
})();

async function shareTrip(id) {
    const r = await fetch('/api/trips/' + id + '/share', { method: 'POST' });
    if (r.ok) {
        const d = await r.json();
        showShareModal(location.origin + d.url);
    } else {
        showToast('❌ ' + _t('shareFailed'));
    }
}

let shareModalEl = null;

function showShareModal(url) {
    hideShareModal();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'shareModal';
    overlay.onclick = hideShareModal;
    overlay.innerHTML =
        '<div class="modal-content" onclick="event.stopPropagation()">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">' +
        '<h3 style="margin:0;font-size:17px;font-weight:650">🔗 Share Trip</h3>' +
        '<button onclick="hideShareModal()" ' +
        'style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:22px;padding:0 4px;line-height:1">×</button>' +
        '</div>' +
        '<div style="display:flex;gap:8px">' +
        '<input type="text" id="shareLinkInput" value="' + url + '" readonly ' +
        'style="flex:1;padding:12px 14px;border-radius:8px;border:1px solid var(--line);background:rgba(255,255,255,.05);color:var(--text);font-size:13px;outline:none">' +
        '<button onclick="copyShareLink()" id="copyBtn" ' +
        'style="padding:12px 18px;border-radius:8px;border:1px solid rgba(125,211,252,.35);background:rgba(125,211,252,.12);color:var(--text);cursor:pointer;font-size:13px;white-space:nowrap;font-weight:600">📋 Copy</button>' +
        '</div></div>';
    document.body.appendChild(overlay);
    shareModalEl = overlay;
    setTimeout(() => document.getElementById('shareLinkInput')?.select(), 100);
}

function hideShareModal() {
    if (shareModalEl) {
        shareModalEl.remove();
        shareModalEl = null;
    }
}

async function copyShareLink() {
    const input = document.getElementById('shareLinkInput');
    if (!input) return;
    try {
        await navigator.clipboard.writeText(input.value);
    } catch {
        input.select();
        document.execCommand('copy');
    }
    showToast('✅ Copied!');
    setTimeout(hideShareModal, 600);
}

function showToast(msg) {
    const existing = document.getElementById('toast');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.id = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { const el = document.getElementById('toast'); if (el) el.remove(); }, 2000);
}

async function renameTrip(id, oldTitle) {
    const t = prompt(_t('renamePrompt'), oldTitle);
    if (!t) return;
    const r = await fetch('/api/trips/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: t })
    });
    if (r.ok) location.reload();
}

async function deleteTrip(id) {
    if (!confirm(_t('deleteConfirm'))) return;
    const r = await fetch('/api/trips/' + id, { method: 'DELETE' });
    if (r.ok) location.reload();
}
