import './style.css';
import { diff_match_patch } from 'diff-match-patch';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

type PresenceUser = {
  name: string;
  color: string;
};

const randomName = `User-${Math.floor(Math.random() * 1000)}`;
const randomColor = `hsl(${Math.floor(Math.random() * 360)} 80% 45%)`;
const wsUrl = import.meta.env.VITE_COLLAB_SERVER_URL || 'ws://localhost:1234';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('App container not found');
}

app.innerHTML = `
  <main class="container">
    <section class="card">
      <h2>Collaborative Document Editor</h2>
      <p>Join the same room from multiple tabs/users to co-edit in real time.</p>
      <div class="toolbar">
        <input id="roomInput" placeholder="Room ID" value="team-notes" />
        <input id="nameInput" placeholder="Your name" value="${randomName}" />
        <button id="joinButton">Join Room</button>
        <button id="disconnectButton" class="secondary">Disconnect</button>
        <span id="status" class="status">Status: disconnected</span>
      </div>
    </section>
    <section class="card">
      <h3>Online collaborators</h3>
      <div id="users" class="users"></div>
    </section>
    <section class="card">
      <textarea id="editor" placeholder="Start typing..."></textarea>
    </section>
  </main>
`;

const roomInput = document.querySelector<HTMLInputElement>('#roomInput');
const nameInput = document.querySelector<HTMLInputElement>('#nameInput');
const joinButton = document.querySelector<HTMLButtonElement>('#joinButton');
const disconnectButton =
  document.querySelector<HTMLButtonElement>('#disconnectButton');
const statusText = document.querySelector<HTMLSpanElement>('#status');
const usersContainer = document.querySelector<HTMLDivElement>('#users');
const editor = document.querySelector<HTMLTextAreaElement>('#editor');

if (
  !roomInput ||
  !nameInput ||
  !joinButton ||
  !disconnectButton ||
  !statusText ||
  !usersContainer ||
  !editor
) {
  throw new Error('Required UI element is missing');
}

let doc: Y.Doc | null = null;
let ytext: Y.Text | null = null;
let provider: WebsocketProvider | null = null;
let previousText = '';
let applyingRemote = false;

const dmp = new diff_match_patch();

const renderUsers = (): void => {
  if (!provider) {
    usersContainer.innerHTML = '';
    return;
  }
  const states = Array.from(provider.awareness.getStates().values());
  const users = states
    .map((state) => state.user as PresenceUser | undefined)
    .filter(Boolean);

  usersContainer.innerHTML = users
    .map(
      (user) =>
        `<span class="user-pill" style="background:${user?.color}">${user?.name}</span>`
    )
    .join('');
};

const setStatus = (status: string): void => {
  statusText.textContent = `Status: ${status}`;
};

const disconnect = (): void => {
  provider?.destroy();
  doc?.destroy();
  provider = null;
  doc = null;
  ytext = null;
  previousText = '';
  setStatus('disconnected');
  usersContainer.innerHTML = '';
};

const connect = (): void => {
  disconnect();

  const room = roomInput.value.trim() || 'team-notes';
  const name = nameInput.value.trim() || randomName;
  const user: PresenceUser = { name, color: randomColor };

  doc = new Y.Doc();
  ytext = doc.getText('content');
  provider = new WebsocketProvider(wsUrl, room, doc, {
    params: { room }
  });

  provider.awareness.setLocalStateField('user', user);
  provider.on('status', (event: { status: string }) => {
    setStatus(event.status);
  });
  provider.awareness.on('change', renderUsers);

  ytext.observe(() => {
    if (!ytext || !editor) {
      return;
    }
    const nextText = ytext.toString();
    if (nextText === editor.value) {
      previousText = nextText;
      return;
    }

    const selectionStart = editor.selectionStart;
    const selectionEnd = editor.selectionEnd;
    applyingRemote = true;
    editor.value = nextText;
    previousText = nextText;
    editor.setSelectionRange(selectionStart, selectionEnd);
    applyingRemote = false;
  });

  editor.value = ytext.toString();
  previousText = editor.value;
  renderUsers();
};

editor.addEventListener('input', () => {
  if (!ytext || applyingRemote) {
    return;
  }

  const currentText = editor.value;
  const diffs = dmp.diff_main(previousText, currentText);
  dmp.diff_cleanupEfficiency(diffs);

  let cursor = 0;
  doc?.transact(() => {
    for (const [operation, data] of diffs) {
      if (operation === 0) {
        cursor += data.length;
      } else if (operation === -1) {
        ytext?.delete(cursor, data.length);
      } else if (operation === 1) {
        ytext?.insert(cursor, data);
        cursor += data.length;
      }
    }
  }, 'local-input');

  previousText = currentText;
});

joinButton.addEventListener('click', connect);
disconnectButton.addEventListener('click', disconnect);
window.addEventListener('beforeunload', disconnect);

connect();
