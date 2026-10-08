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
const btnExportTokens = document.getElementById('btn-export-tokens');
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
  btnExportTokens.disabled = !connected;

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
    setConnected(false);
    log('Disconnected from server.', 'warn');
    return;
  }

  const url = document.getElementById('server-url').value.trim();
  log(`Connecting to ${url}...`, 'info');
  setConnected(false, true);

  try {
    ws = new WebSocket(url);

    ws.onopen = () => {
      setConnected(true);
      log('Connected to Vitra Sync Server!', 'success');
      ws.send(JSON.stringify({ type: 'get_snapshot' }));
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

function handleServerMessage(data) {
  if (data.type === 'snapshot') {
    lastSnapshot = data;
    const count = Object.keys(data.nodes || {}).length;
    log(`Received snapshot with ${count} nodes.`, 'info');
    if (liveToggle.checked) {
      parent.postMessage({ pluginMessage: { type: 'APPLY_SNAPSHOT', root: data.root, nodes: data.nodes } }, '*');
    }
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'git_status_request' }));
    }
  } else if (data.type === 'git_status') {
    currentGitData = data;
    renderGitStatus(data);
  } else if (data.type === 'event' || data.type === 'mutation') {
    log(`Mutation: ${data.event?.type} on ${data.event?.nodeId}`, 'info');
    if (liveToggle.checked && lastSnapshot) {
      parent.postMessage({ pluginMessage: { type: 'APPLY_MUTATION', event: data.event } }, '*');
    }
  } else if (data.type === 'ai_progress') {
    log(`AI: ${data.step} (${data.status})`, 'info');
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
  if (lastSnapshot) {
    log('Applying snapshot to Figma...', 'info');
    parent.postMessage({ pluginMessage: { type: 'APPLY_SNAPSHOT', root: lastSnapshot.root, nodes: lastSnapshot.nodes } }, '*');
  } else {
    log('Requesting fresh snapshot from server...', 'info');
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'get_snapshot' }));
      ws.send(JSON.stringify({ type: 'git_status_request' }));
    }
  }
}

function pushSelection() {
  log('Requesting Figma selection export...', 'info');
  parent.postMessage({ pluginMessage: { type: 'REQUEST_PUSH_SELECTION' } }, '*');
}

function pushAll() {
  log('Requesting full Figma page export...', 'info');
  parent.postMessage({ pluginMessage: { type: 'REQUEST_PUSH_ALL' } }, '*');
}

function toggleLiveMode(enabled) {
  parent.postMessage({ pluginMessage: { type: 'SET_LIVE_MODE', enabled } }, '*');
  log(`Live Mode ${enabled ? 'enabled' : 'disabled'}.`, 'info');
}

function exportFigmaTokens() {
  log('Extracting Figma Variables & Styles...', 'info');
  parent.postMessage({ pluginMessage: { type: 'REQUEST_EXPORT_VARIABLES' } }, '*');
}

 window.onmessage = (event) => {
  const msg = event.data.pluginMessage;
  if (!msg) return;

  if (msg.type === 'PULL_SUCCESS') {
    log(msg.message, 'success');
  } else if (msg.type === 'VARIABLES_SERIALIZED') {
    if (msg.count === 0) {
      log('No Figma Variables or Paint Styles found in this file.', 'warn');
      return;
    }
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'register_tokens',
        tokens: msg.tokens,
        themes: msg.themes,
      }));
      log(`Synced ${msg.count} design tokens to Vitra!`, 'success');
    } else {
      log(`Extracted ${msg.count} tokens (Connect server to sync)`, 'info');
    }
  } else if (msg.type === 'SELECTION_SERIALIZED') {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'import_figma',
        json: JSON.stringify(msg.figmaJson),
      }));
      log('Pushed Figma scene to Vitra Sync Server!', 'success');
    } else {
      log('Cannot push: WebSocket not connected.', 'error');
    }
  } else if (msg.type === 'ERROR') {
    log(msg.error, 'error');
  }
};
