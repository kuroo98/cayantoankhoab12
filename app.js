const API_URL = "/api/messages";
const LOCAL_KEY = "message-tree-v2";
const LEGACY_LOCAL_KEY = "message-tree-v1";

const state = { messages: [], apiAvailable: true, admin: false, currentMessageId: null };

// Positions are spread along the real branch silhouette rather than a simple grid.
const leafPositions = [
  [23, 30, -23], [29, 25, 19], [34, 34, -12], [39, 23, 23], [44, 18, -17],
  [48, 29, 12], [53, 20, -18], [58, 27, 21], [63, 19, -10], [69, 28, 17], [75, 23, -22],
  [20, 41, 17], [27, 45, -12], [35, 41, 21], [42, 37, -19], [49, 40, 14], [56, 36, -18], [63, 42, 22], [71, 39, -14], [79, 41, 18],
  [24, 52, -24], [32, 54, 15], [41, 49, -11], [49, 52, 18], [58, 49, -20], [66, 53, 14], [75, 51, -19],
  [30, 60, 18], [39, 58, -25], [48, 61, 12], [58, 59, -15], [67, 61, 23], [73, 57, -8]
];

const palette = ["fresh", "green", "lime", "olive", "gold", "amber", "rust", "dry", "brown"];

const stage = document.getElementById("treeStage");
const leafLayer = document.getElementById("leafLayer");
const emptyTree = document.getElementById("emptyTree");
const leafCount = document.getElementById("leafCount");
const form = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const authorInput = document.getElementById("authorInput");
const websiteInput = document.getElementById("websiteInput");
const messageCount = document.getElementById("messageCount");
const formStatus = document.getElementById("formStatus");
const sendButton = document.getElementById("sendButton");
const modalBackdrop = document.getElementById("modalBackdrop");
const modalClose = document.getElementById("modalClose");
const modalMessage = document.getElementById("modalMessage");
const modalAuthor = document.getElementById("modalAuthor");
const modalDate = document.getElementById("modalDate");
const modalTitle = document.getElementById("modalTitle");
const adminEntry = document.getElementById("adminEntry");
const adminPanel = document.getElementById("adminPanel");
const adminStatus = document.getElementById("adminStatus");
const deleteAllButton = document.getElementById("deleteAllButton");
const logoutButton = document.getElementById("logoutButton");
const deleteMessageButton = document.getElementById("deleteMessageButton");
const modalAdminActions = document.getElementById("modalAdminActions");
const editMessageButton = document.getElementById("editMessageButton");
const editMessageForm = document.getElementById("editMessageForm");
const editAuthor = document.getElementById("editAuthor");
const editCreatedAt = document.getElementById("editCreatedAt");
const editMessage = document.getElementById("editMessage");
const editMessageCount = document.getElementById("editMessageCount");
const editStatus = document.getElementById("editStatus");
const cancelEditButton = document.getElementById("cancelEditButton");
const saveEditButton = document.getElementById("saveEditButton");
const loginBackdrop = document.getElementById("loginBackdrop");
const loginClose = document.getElementById("loginClose");
const adminLoginForm = document.getElementById("adminLoginForm");
const adminUsername = document.getElementById("adminUsername");
const adminPassword = document.getElementById("adminPassword");
const loginStatus = document.getElementById("loginStatus");
const loginButton = document.getElementById("loginButton");

messageInput.addEventListener("input", () => { messageCount.textContent = messageInput.value.length; });
modalClose.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", (event) => { if (event.target === modalBackdrop) closeModal(); });
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!loginBackdrop.hidden) closeLogin();
  else if (!modalBackdrop.hidden) closeModal();
});
adminEntry.addEventListener("click", () => {
  if (state.admin) {
    adminPanel.scrollIntoView({ behavior: "smooth", block: "center" });
  } else {
    openLogin();
  }
});
loginClose.addEventListener("click", closeLogin);
loginBackdrop.addEventListener("click", (event) => { if (event.target === loginBackdrop) closeLogin(); });
deleteMessageButton.addEventListener("click", deleteCurrentMessage);
editMessageButton.addEventListener("click", openEditForm);
cancelEditButton.addEventListener("click", closeEditForm);
editMessage.addEventListener("input", () => { editMessageCount.textContent = editMessage.value.length; });
editMessageForm.addEventListener("submit", saveCurrentMessage);
deleteAllButton.addEventListener("click", deleteAllMessages);
logoutButton.addEventListener("click", logoutAdmin);

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeMessage(item) {
  return {
    id: String(item.id || makeId()),
    author: String(item.author || "Ẩn danh").trim().slice(0, 60) || "Ẩn danh",
    message: String(item.message || "").trim().slice(0, 500),
    createdAt: item.createdAt || null,
  };
}

function localRead() {
  try {
    const current = JSON.parse(localStorage.getItem(LOCAL_KEY) || "null");
    if (Array.isArray(current)) return current.map(normalizeMessage);
    const legacy = JSON.parse(localStorage.getItem(LEGACY_LOCAL_KEY) || "[]");
    return Array.isArray(legacy) ? legacy.map(normalizeMessage) : [];
  } catch {
    return [];
  }
}

function localWrite(messages) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(messages));
}

async function loadMessages() {
  try {
    const response = await fetch(API_URL, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("API unavailable");
    const data = await response.json();
    state.apiAvailable = true;
    state.admin = data.admin === true;
    state.messages = Array.isArray(data.messages) ? data.messages.map(normalizeMessage) : [];
  } catch {
    state.apiAvailable = false;
    state.admin = false;
    state.messages = localRead();
  }
  renderLeaves();
  renderAdmin();
}

function renderAdmin() {
  const message = currentMessage();
  modalDate.hidden = !state.admin || !message?.createdAt;
  modalDate.textContent = modalDate.hidden ? "" : formatDate(message.createdAt);
  adminPanel.hidden = !state.admin;
  adminEntry.textContent = state.admin ? "Đang quản trị" : "Quản trị";
  adminEntry.classList.toggle("active", state.admin);
  modalAdminActions.hidden = !state.admin || !state.currentMessageId || !editMessageForm.hidden;
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function colorFor(message, index) {
  const hash = hashString(`${message.id}-${index}`);
  return palette[hash % palette.length];
}

function shapeFor(message, index) {
  const hash = hashString(`${message.message}-${message.id}-${index}`);
  return hash % 4;
}

function leafSvg(shape = 0) {
  const paths = [
    { body: "M24 3 C14 7 5 18 7 29 C9 40 18 49 28 54 C35 46 41 36 40 26 C39 15 32 7 24 3 Z", highlight: "M27 7 C18 12 13 20 13 30 C14 37 18 42 22 45 C22 30 24 17 27 7 Z" },
    { body: "M24 4 C11 7 5 17 8 30 C11 42 20 51 30 54 C38 45 41 34 38 23 C35 12 30 7 24 4 Z", highlight: "M28 9 C19 13 14 21 15 30 C16 38 20 44 24 47 C25 32 26 20 28 9 Z" },
    { body: "M23 4 C12 8 5 18 8 30 C10 40 17 49 27 54 C37 48 41 38 39 28 C37 17 31 8 23 4 Z", highlight: "M24 9 C18 16 15 24 16 32 C17 39 20 44 24 48 C27 34 27 21 24 9 Z" },
    { body: "M25 3 C15 7 7 15 7 27 C7 40 16 50 27 55 C36 48 41 37 39 26 C37 15 31 7 25 3 Z", highlight: "M29 8 C20 13 15 21 15 30 C15 38 19 45 23 49 C26 34 28 19 29 8 Z" }
  ];
  const p = paths[shape % paths.length];
  return `<span class="leaf-art"><svg viewBox="0 0 48 64" aria-hidden="true"><path class="leaf-body" d="${p.body}"/><path class="leaf-highlight" d="${p.highlight}"/><path class="leaf-vein" d="M10 49 C18 38 23 27 26 9"/><path class="leaf-side" d="M16 39 L10 34 M19 34 L11 28 M22 28 L14 23 M25 22 L18 17 M28 17 L23 12"/><path class="leaf-side" d="M18 37 L29 30 M21 31 L33 25 M24 25 L35 20 M26 19 L33 15"/></svg></span>`;
}

function positionFor(index) {
  if (index < leafPositions.length) return leafPositions[index];
  const angle = index * 2.39996;
  const radius = 24 + (index % 5) * 3.4;
  const x = 50 + Math.cos(angle) * radius;
  const y = 37 + Math.sin(angle) * radius * 0.82;
  const rotation = Math.round(Math.sin(angle * 1.7) * 28);
  return [Math.max(13, Math.min(87, x)), Math.max(17, Math.min(66, y)), rotation];
}

function renderLeaves(newId = null) {
  leafLayer.innerHTML = "";
  const messages = state.messages;
  messages.forEach((message, index) => {
    const [x, y, rotation] = positionFor(index);
    const leaf = document.createElement("button");
    const color = colorFor(message, index);
    const shape = shapeFor(message, index);
    leaf.type = "button";
    leaf.className = `leaf leaf--${color}${message.id === newId ? " leaf--new" : ""}`;
    leaf.style.left = `${x}%`;
    leaf.style.top = `${y}%`;
    leaf.style.setProperty("--rot", `${rotation}deg`);
    leaf.setAttribute("aria-label", `Đọc lời nhắn của ${message.author}`);
    leaf.title = "Chạm để đọc lời nhắn";
    leaf.innerHTML = leafSvg(shape);
    leaf.addEventListener("click", () => openModal(message));
    leafLayer.appendChild(leaf);
  });
  leafCount.textContent = messages.length;
  emptyTree.classList.toggle("hidden", messages.length > 0);
}

function formatDate(iso) {
  try {
    return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  } catch { return ""; }
}

function toLocalInputValue(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function currentMessage() {
  return state.messages.find((message) => message.id === state.currentMessageId) || null;
}

function openModal(message) {
  state.currentMessageId = message.id;
  editMessageForm.hidden = true;
  modalTitle.textContent = `Lời nhắn của ${message.author}`;
  modalMessage.textContent = message.message;
  modalAuthor.textContent = message.author === "Ẩn danh" ? "— Gửi bởi một người ẩn danh —" : `— ${message.author} —`;
  modalBackdrop.hidden = false;
  document.body.style.overflow = "hidden";
  renderAdmin();
  modalClose.focus();
}

function closeModal() {
  modalBackdrop.hidden = true;
  state.currentMessageId = null;
  editMessageForm.hidden = true;
  modalAdminActions.hidden = true;
  document.body.style.overflow = "";
}

function openLogin() {
  loginStatus.textContent = "";
  loginBackdrop.hidden = false;
  document.body.style.overflow = "hidden";
  setTimeout(() => adminUsername.focus(), 0);
}

function closeLogin() {
  loginBackdrop.hidden = true;
  document.body.style.overflow = "";
  adminLoginForm.reset();
}

adminLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginButton.disabled = true;
  loginStatus.textContent = "Đang xác thực…";
  loginStatus.className = "form-status";

  try {
    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ username: adminUsername.value.trim(), password: adminPassword.value }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Không thể đăng nhập.");
    window.location.reload();
  } catch (error) {
    loginStatus.textContent = error.message || "Không thể đăng nhập.";
    loginStatus.className = "form-status error";
    loginButton.disabled = false;
  }
});

function openEditForm() {
  const message = currentMessage();
  if (!state.admin || !message) return;
  editAuthor.value = message.author === "Ẩn danh" ? "" : message.author;
  editCreatedAt.value = toLocalInputValue(message.createdAt);
  editMessage.value = message.message;
  editMessageCount.textContent = editMessage.value.length;
  editStatus.textContent = "";
  editStatus.className = "form-status";
  editMessageForm.hidden = false;
  renderAdmin();
  editMessage.focus();
}

function closeEditForm() {
  editMessageForm.hidden = true;
  renderAdmin();
}

function setEditStatus(message, type = "") {
  editStatus.textContent = message;
  editStatus.className = `form-status ${type}`.trim();
}

async function saveCurrentMessage(event) {
  event.preventDefault();
  const id = state.currentMessageId;
  if (!state.admin || !id) return;

  const message = editMessage.value.trim();
  if (!message) {
    setEditStatus("Nội dung lời nhắn không được để trống.", "error");
    editMessage.focus();
    return;
  }
  const createdAt = new Date(editCreatedAt.value);
  if (!editCreatedAt.value || Number.isNaN(createdAt.getTime())) {
    setEditStatus("Thời gian viết không hợp lệ.", "error");
    editCreatedAt.focus();
    return;
  }

  saveEditButton.disabled = true;
  setEditStatus("Đang lưu…");
  try {
    const response = await fetch(`${API_URL}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ author: editAuthor.value.trim(), message, createdAt: createdAt.toISOString() }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(response.status === 401 ? "Phiên quản trị đã hết hạn, vui lòng đăng nhập lại." : "Không thể lưu thay đổi.");

    const updated = normalizeMessage(data.message);
    state.messages = state.messages.map((item) => (item.id === id ? updated : item));
    renderLeaves();
    openModal(updated);
    showAdminStatus("Đã cập nhật chiếc lá.", "success");
  } catch (error) {
    setEditStatus(error.message || "Không thể lưu thay đổi.", "error");
  } finally {
    saveEditButton.disabled = false;
  }
}

async function deleteCurrentMessage() {
  const id = state.currentMessageId;
  if (!state.admin || !id) return;
  if (!window.confirm("Xóa vĩnh viễn chiếc lá này?")) return;

  deleteMessageButton.disabled = true;
  try {
    const response = await fetch(`${API_URL}/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Không thể xóa chiếc lá.");
    state.messages = state.messages.filter((message) => message.id !== id);
    closeModal();
    renderLeaves();
    showAdminStatus("Đã xóa chiếc lá.", "success");
  } catch (error) {
    showAdminStatus(error.message || "Không thể xóa chiếc lá.", "error");
  } finally {
    deleteMessageButton.disabled = false;
  }
}

async function deleteAllMessages() {
  if (!state.admin || !state.messages.length) return;
  if (!window.confirm(`Xóa vĩnh viễn toàn bộ ${state.messages.length} chiếc lá? Thao tác này không thể hoàn tác.`)) return;

  deleteAllButton.disabled = true;
  try {
    const response = await fetch(API_URL, { method: "DELETE" });
    if (!response.ok) throw new Error("Không thể xóa toàn bộ lá.");
    state.messages = [];
    renderLeaves();
    showAdminStatus("Đã xóa toàn bộ lá.", "success");
  } catch (error) {
    showAdminStatus(error.message || "Không thể xóa toàn bộ lá.", "error");
  } finally {
    deleteAllButton.disabled = false;
  }
}

async function logoutAdmin() {
  logoutButton.disabled = true;
  try {
    await fetch("/api/admin/session", { method: "DELETE" });
  } finally {
    window.location.reload();
  }
}

function showAdminStatus(message, type = "") {
  adminStatus.textContent = message;
  adminStatus.className = `admin-status ${type}`.trim();
}

function setStatus(message, type = "") {
  formStatus.textContent = message;
  formStatus.className = `form-status ${type}`.trim();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = messageInput.value.trim();
  const author = authorInput.value.trim();

  if (websiteInput.value) return;
  if (!message) {
    setStatus("Bạn hãy viết một lời nhắn trước nhé.", "error");
    messageInput.focus();
    return;
  }
  if (message.length > 500) {
    setStatus("Lời nhắn tối đa 500 ký tự.", "error");
    return;
  }

  sendButton.disabled = true;
  setStatus("Đang thả chiếc lá…");
  const payload = normalizeMessage({ id: makeId(), author: author || "Ẩn danh", message, createdAt: new Date().toISOString() });

  try {
    if (state.apiAvailable) {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ author: payload.author, message: payload.message, website: "" }),
      });
      if (!response.ok) throw new Error("Unable to save");
      const data = await response.json();
      state.messages.push(normalizeMessage(data.message || payload));
    } else {
      state.messages.push(payload);
      localWrite(state.messages);
    }

    renderLeaves(payload.id);
    form.reset();
    messageCount.textContent = "0";
    setStatus("Chiếc lá đã ở trên cây. 🌿", "success");
    setTimeout(() => setStatus(""), 3500);
  } catch {
    state.apiAvailable = false;
    state.messages.push(payload);
    localWrite(state.messages);
    renderLeaves(payload.id);
    form.reset();
    messageCount.textContent = "0";
    setStatus("Đã lưu trên thiết bị này. Máy chủ đang tạm bận.", "success");
  } finally {
    sendButton.disabled = false;
  }
});

loadMessages();
