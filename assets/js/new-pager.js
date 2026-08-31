(function () {
  "use strict";

  const KEYS = {
    profile: "solforge.new-pager.profile.v1",
    messages: "solforge.new-pager.messages.v1",
    archive: "solforge.new-pager.archive.v1",
    numbers: "solforge.new-pager.numbers.v1"
  };
  const MAX_MESSAGE_AGE = 2 * 24 * 60 * 60 * 1000;
  const ARCHIVE_AFTER = 24 * 60 * 60 * 1000;
  const PROFILE_RETENTION = 30 * 24 * 60 * 60 * 1000;
  const MESSAGE_PATTERN = /^[0-9\p{Emoji}\s\uFE0F\u200D]+$/u;
  const NICKNAME_PATTERN = /^[\p{L}\p{N}]{2,12}$/u;
  const EMOJIS = ["😀", "😂", "🥲", "😎", "👍", "🤝", "🫡", "🏃💨", "❤️", "✨"];
  const $ = (selector) => document.querySelector(selector);
  const copies = (key) => $(`[data-pager-copy="${key}"]`)?.innerHTML.trim() || "";
  const text = (key, values = {}) => Object.entries(values).reduce((value, [name, replacement]) => value.replace(`{${name}}`, replacement), copies(key));
  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (_error) { return fallback; }
  };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const now = () => Date.now();
  let profile = null;
  let messages = [];
  let activeMode = "all";
  let activeRecipient = "ALL";

  function generatePagerNumber() {
    const used = new Set(read(KEYS.numbers, []));
    let number = "";
    do { number = String(Math.floor(100000 + Math.random() * 900000)); } while (used.has(number));
    used.add(number);
    write(KEYS.numbers, [...used].slice(-200));
    return number;
  }

  function cleanupStorage() {
    const timestamp = now();
    const active = [];
    const archived = read(KEYS.archive, []);
    for (const message of read(KEYS.messages, [])) {
      const age = timestamp - message.createdAt;
      if (age > MAX_MESSAGE_AGE) {
        continue;
      }
      if (age > ARCHIVE_AFTER) {
        archived.push({ ...message, archivedAt: timestamp });
      } else {
        active.push(message);
      }
    }
    write(KEYS.messages, active);
    write(KEYS.archive, archived.slice(-1000));
    messages = active;
  }

  function loadProfile() {
    const saved = read(KEYS.profile, null);
    if (!saved || !saved.id || !saved.nickname) return null;
    saved.lastSeenAt = now();
    saved.retainedUntil = Math.max(saved.retainedUntil || 0, now() + PROFILE_RETENTION);
    write(KEYS.profile, saved);
    return saved;
  }

  function showMessage(element, value, tone) {
    element.innerHTML = value || "";
    element.dataset.tone = tone || "";
  }

  function setProfilePreview() {
    if (!profile) {
      profile = { id: generatePagerNumber() };
    }
    $("#pagerIdValue").textContent = profile.id;
    $("#selfPagerId").textContent = profile.id;
    $("#selfNickname").textContent = profile.nickname || "—";
  }

  function closeAuthModal() {
    $("#pagerLanding").classList.remove("is-auth-open");
    $("#pagerOnboarding").setAttribute("aria-hidden", "true");
  }

  function openAuthModal() {
    $("#pagerLanding").classList.add("is-auth-open");
    $("#pagerOnboarding").removeAttribute("aria-hidden");
    window.setTimeout(() => $("#pagerNickname").focus(), 0);
  }

  function makeSystemMessage(body, conversation) {
    return { id: `system-${now()}-${Math.random()}`, senderId: "SYSTEM", senderName: text("system"), recipientId: conversation, body, createdAt: now(), system: true };
  }

  function ensureConversationMessage() {
    if (messages.length) return;
    messages.push(makeSystemMessage(text("allWelcome"), "ALL"));
    write(KEYS.messages, messages);
  }

  function visibleMessages() {
    return messages.filter((message) => {
      if (activeRecipient === "ALL") return message.recipientId === "ALL";
      return (message.senderId === profile.id && message.recipientId === activeRecipient) || (message.senderId === activeRecipient && message.recipientId === profile.id);
    });
  }

  function formatTime(timestamp) {
    return new Intl.DateTimeFormat(document.documentElement.lang === "en" ? "en-US" : "ko-KR", { hour: "2-digit", minute: "2-digit" }).format(timestamp);
  }

  function renderMessages() {
    const stream = $("#messageStream");
    stream.innerHTML = "";
    const list = visibleMessages();
    if (!list.length) {
      stream.innerHTML = `<div class="pager-empty">${copies("noMessages").replace(/&lt;br&gt;/gi, "<br>")}</div>`;
      return;
    }
    for (const message of list) {
      const item = document.createElement("article");
      item.className = `pager-message${message.senderId === profile.id ? " is-own" : ""}${message.system ? " is-system" : ""}`;
      const sender = message.system ? text("system") : message.senderId === profile.id ? text("you") : `${message.senderName} (#${message.senderId})`;
      item.innerHTML = `<div class="pager-message-meta"><strong>${sender}</strong><span class="pager-message-time">${formatTime(message.createdAt)}</span></div><div class="pager-message-body"></div>`;
      item.querySelector(".pager-message-body").textContent = message.body;
      stream.appendChild(item);
    }
    stream.scrollTop = stream.scrollHeight;
  }

  function setMode(mode) {
    activeMode = mode;
    $("#allModeButton").classList.toggle("is-active", mode === "all");
    $("#directModeButton").classList.toggle("is-active", mode === "direct");
    $("#pagerTargetRow").hidden = mode !== "direct";
    if (mode === "all") {
      activeRecipient = "ALL";
      $("#connectionLabel").textContent = "ALL CHANNEL";
      showMessage($("#messageStatus"), text("allConnected"));
      ensureConversationMessage();
    } else {
      showMessage($("#messageStatus"), text("directWelcome"));
    }
    renderMessages();
  }

  function openChat() {
    cleanupStorage();
    setProfilePreview();
    $("#pagerChat").hidden = false;
    closeAuthModal();
    ensureConversationMessage();
    setMode("all");
    renderMessages();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function appendToComposer(value) {
    const input = $("#messageInput");
    const next = `${input.value}${value}`.slice(0, 80);
    if (!MESSAGE_PATTERN.test(next)) return;
    input.value = next;
    $("#messageCounter").textContent = `${next.length} / 80`;
  }

  function sendMessage() {
    const input = $("#messageInput");
    const body = input.value.trim();
    if (!body) { showMessage($("#messageStatus"), text("messageEmpty"), "error"); return; }
    if (!MESSAGE_PATTERN.test(body)) { showMessage($("#messageStatus"), text("messageInvalid"), "error"); return; }
    if (activeMode === "direct" && !/^\d{6}$/.test(activeRecipient)) { showMessage($("#messageStatus"), text("targetRequired"), "error"); return; }
    const message = { id: `message-${now()}-${Math.random()}`, senderId: profile.id, senderName: profile.nickname, recipientId: activeRecipient, body, createdAt: now() };
    messages.push(message);
    write(KEYS.messages, messages);
    input.value = "";
    $("#messageCounter").textContent = "0 / 80";
    showMessage($("#messageStatus"), `${text("messageSent")} ${text("messageWaiting")}`);
    renderMessages();
  }

  function startProfile(event) {
    event.preventDefault();
    const input = $("#pagerNickname");
    const nickname = input.value.trim();
    const message = $("#profileMessage");
    if (!nickname) { showMessage(message, text("nicknameRequired"), "error"); return; }
    if (!NICKNAME_PATTERN.test(nickname)) { showMessage(message, text("nicknameInvalid"), "error"); return; }
    profile = { id: profile?.id || generatePagerNumber(), nickname, createdAt: profile?.createdAt || now(), lastSeenAt: now(), retainedUntil: now() + PROFILE_RETENTION };
    write(KEYS.profile, profile);
    openChat();
  }

  function connectTarget() {
    const target = $("#pagerTarget").value.trim();
    if (!/^\d{6}$/.test(target)) { showMessage($("#messageStatus"), text("targetRequired"), "error"); return; }
    if (target === profile.id) { showMessage($("#messageStatus"), text("targetInvalid"), "error"); return; }
    activeRecipient = target;
    $("#connectionLabel").textContent = `#${target}`;
    showMessage($("#messageStatus"), `${text("directConnected")} ${text("sentTo", { target })}`);
    renderMessages();
  }

  function initializeEmojiPicker() {
    const picker = $("#emojiPicker");
    for (const emoji of EMOJIS) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = emoji;
      button.setAttribute("aria-label", emoji);
      button.addEventListener("click", () => appendToComposer(emoji));
      picker.appendChild(button);
    }
  }

  function bind() {
    $("#pagerProfileForm").addEventListener("submit", startProfile);
    $("#resumePager").addEventListener("click", openChat);
    $("#allModeButton").addEventListener("click", () => setMode("all"));
    $("#directModeButton").addEventListener("click", () => setMode("direct"));
    $("#connectTarget").addEventListener("click", connectTarget);
    $("#sendMessage").addEventListener("click", sendMessage);
    $("#emojiToggle").addEventListener("click", () => {
      const picker = $("#emojiPicker");
      picker.hidden = !picker.hidden;
      $("#emojiToggle").setAttribute("aria-expanded", String(!picker.hidden));
    });
    document.querySelectorAll(".pager-keypad [data-key]").forEach((button) => button.addEventListener("click", () => appendToComposer(button.dataset.key)));
    document.querySelector("[data-action=space]").addEventListener("click", () => appendToComposer(" "));
    document.querySelector("[data-action=backspace]").addEventListener("click", () => {
      const input = $("#messageInput"); input.value = input.value.slice(0, -1); $("#messageCounter").textContent = `${input.value.length} / 80`;
    });
    $("#messageInput").addEventListener("keydown", (event) => event.preventDefault());
    $("#messageInput").addEventListener("beforeinput", (event) => event.preventDefault());
    document.querySelectorAll(".dictionary-list [data-code]").forEach((button) => button.addEventListener("click", () => appendToComposer(button.dataset.code)));
  }

  function init() {
    profile = loadProfile();
    const hasSavedProfile = Boolean(profile);
    messages = read(KEYS.messages, []);
    setProfilePreview();
    initializeEmojiPicker();
    bind();
    $("#pagerChat").hidden = false;
    ensureConversationMessage();
    setMode("all");
    if (hasSavedProfile) {
      $("#pagerNickname").value = profile.nickname;
      $("#pagerReturning").hidden = false;
      showMessage($("#profileMessage"), text("profileLoaded"));
      closeAuthModal();
    } else {
      openAuthModal();
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
