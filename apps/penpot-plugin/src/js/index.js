let ws = null;
let isConnected = false;
let lastSnapshot = null;
let currentGitData = null;

const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const btnConnect = document.getElementById('btn-connect');
const btnPull = document.getElementById('btn-pull');
const btnPushSel = document.getElementById('btn-push-sel');
const btnPushAll = document.getElementById('btn-push-all');
const liveToggle = document.getElementById('live-toggle');
const logBox = document.getElementById('log');

const branchCard = document.getElementById('branch-card');
const historyCard = document.getElementById('history-card');
const branchSelect = document.getElementById('branch-select');
const activeBranchName = document.getElementById('active-branch-name');
const commitCountBadge = document.getElementById('commit-count-badge');
const commitList = document.getElementById('commit-list');

function log(msg, type = 'info') {
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  entry.innerHTML = `<span class="log-time">[${timeStr}]</span> ${msg}`;
  logBox.appendChild(entry);
  logBox.scrollTop = logBox.scrollHeight;
}

function clearLog() {
  logBox.innerHTML = '';
}

function setConnected(connected, connecting = false) {
  isConnected = connected;
  btnConnect.disabled = connecting;
  btnPull.disabled = !connected;
  btnPushSel.disabled = !connected;
  btnPushAll.disabled = !connected;

  if (connecting) {
    statusDot.className = 'status-dot connecting';
    statusText.innerText = 'Connecting...';
    btnConnect.innerText = 'Wait';
  } else if (connected) {
    statusDot.className = 'status-dot connected';
    statusText.innerText = 'Connected';
    btnConnect.innerText = 'Disconnect';
    btnConnect.classList.add('secondary');
    branchCard.style.display = 'block';
    historyCard.style.display = 'block';
  } else {
    statusDot.className = 'status-dot';
    statusText.innerText = 'Disconnected';
    btnConnect.innerText = 'Connect';
    btnConnect.classList.remove('secondary');
    branchCard.style.display = 'none';
    historyCard.style.display = 'none';
  }
}

function toggleConnect() {
  if (isConnected || (ws && ws.readyState === WebSocket.CONNECTING)) {
    if (ws) ws.close();
    lastSnapshot = null;
    setConnected(false);
    log('Disconnected from server.', 'warn');
    return;
  }

  const url = document.getElementById('server-url').value.trim();
  log(`Connecting to ${url}...`, 'info');
  lastSnapshot = null;
  setConnected(false, true);

  try {
    ws = new WebSocket(url);

    ws.onopen = () => {
      setConnected(true);
      log('Connected to Vitra Sync Server!', 'success');
       ws.send(JSON.stringify({ type: 'git_status_request' }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleServerMessage(data);
      } catch (e) {
        log('Error parsing server message: ' + e.message, 'error');
      }
    };

    ws.onclose = () => {
      setConnected(false);
      log('Connection closed.', 'warn');
    };

    ws.onerror = (_err) => {
      setConnected(false);
      log('WebSocket connection error.', 'error');
    };
  } catch (err) {
    setConnected(false);
    log('Failed to create WebSocket: ' + err.message, 'error');
  }
}

let snapshotApplyTimer = null;
let mutationDebounceTimer = null;

function handleServerMessage(data) {
  if (data.type === 'snapshot') {
    lastSnapshot = data;
    const count = Object.keys(data.nodes || {}).length;
    if (snapshotApplyTimer) clearTimeout(snapshotApplyTimer);
    snapshotApplyTimer = setTimeout(() => {
      log(`Received snapshot with ${count} nodes.`, 'info');
      log('Applying snapshot to Penpot...', 'info');
      parent.postMessage({ type: 'APPLY_SNAPSHOT', root: data.root, nodes: data.nodes }, '*');
      snapshotApplyTimer = null;
    }, 50);

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'git_status_request' }));
    }
  } else if (data.type === 'git_status') {
    currentGitData = data;
    renderGitStatus(data);
  } else if (data.type === 'event' || data.type === 'mutation') {
    log(`Mutation: ${data.event?.type}`, 'info');
    if (liveToggle.checked && ws && ws.readyState === WebSocket.OPEN) {
      if (mutationDebounceTimer) clearTimeout(mutationDebounceTimer);
      mutationDebounceTimer = setTimeout(() => {
        ws.send(JSON.stringify({ type: 'get_snapshot' }));
        mutationDebounceTimer = null;
      }, 80);
    }
  }
}

function renderGitStatus(data) {
  activeBranchName.innerText = data.currentBranch || 'main';
  branchSelect.innerHTML = '';
  const branches = data.branches && data.branches.length > 0 ? data.branches : ['main'];
  for (const b of branches) {
    const opt = document.createElement('option');
    opt.value = b;
    opt.innerText = b;
    if (b === data.currentBranch) {
      opt.selected = true;
    }
    branchSelect.appendChild(opt);
  }

  // 2. Update Commit Timeline
  const commits = data.commits || [];
  commitCountBadge.innerText = `${commits.length} commit${commits.length === 1 ? '' : 's'}`;
  commitList.innerHTML = '';

  if (commits.length === 0) {
    commitList.innerHTML = '<div style="color: #666; font-size: 10px; text-align: center; padding: 10px 0;">No commits yet</div>';
    return;
  }

   const reversed = [...commits].reverse();
  const activeHeadIndex = data.headIndex !== undefined ? data.headIndex : commits.length - 1;
  const activeCommitHash = commits[activeHeadIndex]?.hash;

  reversed.forEach((c) => {
    const isActive = c.hash === activeCommitHash;
    const row = document.createElement('div');
    row.className = `commit-row ${isActive ? 'active' : ''}`;

    const shortHash = c.hash.length > 10 ? c.hash.slice(0, 10) : c.hash;
    const dateStr = c.timestamp ? new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    row.innerHTML = `
      <div class="commit-dot"></div>
      <div class="commit-body">
        <div class="commit-msg" title="${escapeHtml(c.message)}">${escapeHtml(c.message)}</div>
        <div class="commit-meta">
          <span class="commit-hash">${shortHash}</span>
          <span>${escapeHtml(c.author || 'agent')}</span>
          <span>•</span>
          <span>${dateStr}</span>
        </div>
      </div>
      ${!isActive ? `<button class="btn-restore" onclick="restoreCommit('${c.hash}')">
        <svg class="icon-svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
        Restore
      </button>` : ''}
    `;
    commitList.appendChild(row);
  });
}

function switchBranch(branch) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    log(`Switching branch to "${branch}"...`, 'info');
    ws.send(JSON.stringify({ type: 'checkout_branch', branch }));
  }
}

function restoreCommit(commitId) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    log(`Restoring snapshot ${commitId}...`, 'info');
    ws.send(JSON.stringify({ type: 'checkout_commit', commitId }));
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pullFromVitra() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    log('Requesting snapshot from server...', 'info');
    ws.send(JSON.stringify({ type: 'get_snapshot' }));
    ws.send(JSON.stringify({ type: 'git_status_request' }));
  } else if (lastSnapshot) {
    log('Applying cached snapshot to Penpot...', 'info');
    parent.postMessage({ type: 'APPLY_SNAPSHOT', root: lastSnapshot.root, nodes: lastSnapshot.nodes }, '*');
  } else {
    log('Not connected to server. Click Connect first.', 'error');
  }
}

function pushSelection() {
  log('Requesting Penpot selection export...', 'info');
  parent.postMessage({ type: 'REQUEST_PUSH_SELECTION' }, '*');
}

function pushAll() {
  log('Requesting full Penpot page export...', 'info');
  parent.postMessage({ type: 'REQUEST_PUSH_ALL' }, '*');
}

function toggleLiveMode(enabled) {
  parent.postMessage({ type: 'SET_LIVE_MODE', enabled }, '*');
  log(`Live Mode ${enabled ? 'enabled' : 'disabled'}.`, 'info');
}

window.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg) return;

  if (msg.type === 'PULL_SUCCESS') {
    log(msg.message, 'success');
  } else if (msg.type === 'SELECTION_SERIALIZED') {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'import_penpot',
        json: JSON.stringify(msg.penpotJson),
      }));
      log('Pushed Penpot scene to Vitra Sync Server!', 'success');
    } else {
      log('Cannot push: WebSocket not connected.', 'error');
    }
  } else if (msg.type === 'ERROR') {
    log(msg.error, 'error');
  }
});
