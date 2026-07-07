(function () {
  "use strict";

  const LOGS_KEY = "jw_logs_v1";
  const sessions = PROGRAM.sessions;
  const byId = Object.fromEntries(sessions.map((s) => [s.id, s]));
  const sessionByDate = Object.fromEntries(sessions.map((s) => [s.date, s]));
  const firstProgramMonth = sessions[0].date.slice(0, 7);
  const lastProgramMonth = sessions[sessions.length - 1].date.slice(0, 7);
  let calendarMonth = null;

  // ---------- storage ----------
  function getLogs() {
    try {
      return JSON.parse(localStorage.getItem(LOGS_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }
  function saveLogEntry(id, entry) {
    const logs = getLogs();
    logs[id] = entry;
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  }
  function isDone(id) {
    return !!getLogs()[id];
  }

  // ---------- cloud sync (private GitHub repo) ----------
  const GH_OWNER = "jonnymacworth";
  const GH_REPO = "voltage-data";
  const GH_PATH = "logs.json";
  const GH_TOKEN_KEY = "jw_gh_token";
  const LAST_SYNCED_KEY = "jw_last_synced";

  function getGhToken() {
    return localStorage.getItem(GH_TOKEN_KEY) || "";
  }
  function setGhToken(token) {
    if (token) localStorage.setItem(GH_TOKEN_KEY, token);
    else localStorage.removeItem(GH_TOKEN_KEY);
  }
  function utf8ToBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }
  function base64ToUtf8(b64) {
    return decodeURIComponent(escape(atob(b64.replace(/\n/g, ""))));
  }
  function ghRequest(path, options) {
    const token = getGhToken();
    options = options || {};
    return fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        ...(options.headers || {}),
      },
    });
  }
  async function pushLogsToCloud() {
    if (!getGhToken()) return { ok: false, reason: "no-token" };
    try {
      let sha = null;
      const getRes = await ghRequest(GH_PATH);
      if (getRes.status === 200) {
        sha = (await getRes.json()).sha;
      } else if (getRes.status !== 404) {
        return { ok: false, reason: `get-${getRes.status}` };
      }
      const body = {
        message: `Sync logs ${new Date().toISOString()}`,
        content: utf8ToBase64(JSON.stringify(getLogs(), null, 2)),
      };
      if (sha) body.sha = sha;
      const putRes = await ghRequest(GH_PATH, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!putRes.ok) return { ok: false, reason: `put-${putRes.status}` };
      localStorage.setItem(LAST_SYNCED_KEY, new Date().toISOString());
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: "network" };
    }
  }
  async function pullLogsFromCloud() {
    if (!getGhToken()) return { ok: false, reason: "no-token" };
    try {
      const getRes = await ghRequest(GH_PATH);
      if (getRes.status === 404) return { ok: false, reason: "not-found" };
      if (!getRes.ok) return { ok: false, reason: `get-${getRes.status}` };
      const data = await getRes.json();
      const logs = JSON.parse(base64ToUtf8(data.content));
      localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
      localStorage.setItem(LAST_SYNCED_KEY, new Date().toISOString());
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: "network" };
    }
  }

  // ---------- date helpers ----------
  function todayStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  function formatDate(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  }
  function formatDateTime(isoStr) {
    return new Date(isoStr).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }
  function monthKeyOf(dateStr) {
    return dateStr.slice(0, 7);
  }
  function shiftMonthKey(monthKey, delta) {
    const [y, m] = monthKey.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  function monthLabel(monthKey) {
    const [y, m] = monthKey.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }

  // ---------- routing ----------
  const appEl = document.getElementById("app");
  const tabs = document.querySelectorAll(".tab");

  function currentRoute() {
    return window.location.hash || "#/today";
  }

  function navigate(route) {
    window.location.hash = route;
  }

  function setActiveTab(route) {
    tabs.forEach((t) => {
      t.classList.toggle("active", route.indexOf(t.dataset.route) === 0);
    });
  }

  tabs.forEach((t) => t.addEventListener("click", () => navigate(t.dataset.route)));

  window.addEventListener("hashchange", render);
  window.addEventListener("DOMContentLoaded", render);

  function render() {
    const route = currentRoute();
    setActiveTab(route);
    if (route.startsWith("#/session/")) {
      const id = route.slice("#/session/".length);
      renderSessionDetail(id);
    } else if (route === "#/schedule") {
      renderSchedule();
    } else if (route === "#/history") {
      renderHistory();
    } else if (route === "#/settings") {
      renderSettings();
    } else {
      renderToday();
    }
    window.scrollTo(0, 0);
  }

  // ---------- Today ----------
  function findTodaySession() {
    const t = todayStr();
    return sessions.find((s) => s.date === t) || null;
  }
  function findNextSession() {
    const t = todayStr();
    return sessions.find((s) => s.date > t) || null;
  }
  function findPrevSession() {
    const t = todayStr();
    const past = sessions.filter((s) => s.date < t);
    return past.length ? past[past.length - 1] : null;
  }

  function heroCard(session, opts) {
    opts = opts || {};
    const done = isDone(session.id);
    const typeClass = session.type === "run" ? "run" : "";
    const badgeText = session.type === "run" ? "Run" : "Lift";
    return `
      <div class="hero ${typeClass}">
        <div class="week-tag">${opts.tag || `Week ${session.week} · ${session.day}`}</div>
        <h2>${escapeHtml(session.title)}</h2>
        <div class="sub">${escapeHtml(formatDate(session.date))}${session.note ? " · " + escapeHtml(session.note) : ""}</div>
        <a class="cta" href="#/session/${session.id}">${done ? "✓ Logged — view / edit" : "Log this workout →"}</a>
      </div>
    `;
  }

  function renderToday() {
    const today = findTodaySession();
    const coverWeek = (today || findNextSession() || sessions[sessions.length - 1]).week;
    let html = `
      <div class="cover-hero">
        <img src="images/hero-athlete.jpg" alt="" class="cover-hero-img" />
        <div class="cover-hero-overlay">
          <div class="cover-hero-brand">VOLTAGE<span class="accent-dot">.</span></div>
          <div class="cover-hero-tag">Half Marathon Build · Week ${coverWeek} of 12</div>
        </div>
      </div>
    `;

    if (today) {
      html += heroCard(today);
    } else {
      const prev = findPrevSession();
      const next = findNextSession();
      html += `
        <div class="card empty-state">
          <div class="big">🌿</div>
          <h3>Rest day</h3>
          <p>Nothing scheduled today. Good day for the mobility flow (Section 5.1) if your back is stiff.</p>
        </div>
      `;
      if (next) {
        html += `<div class="section-label">Coming up</div>`;
        html += sessionRow(next);
      } else if (prev) {
        html += `<div class="card empty-state"><p>You've reached the end of the 12-week block. Nice work — time to reassess with a new plan.</p></div>`;
      }
    }

    html += `<div class="section-label">Program</div>`;
    html += `<div class="card">
      <p style="font-size:13px; color:var(--text-muted); line-height:1.5;">${escapeHtml(PROGRAM.meta.goal)}</p>
      <p style="font-size:13px; margin-top:8px;"><strong>Target finish:</strong> ${escapeHtml(PROGRAM.meta.targetFinish)}</p>
    </div>`;

    appEl.innerHTML = html;
  }

  // ---------- Schedule ----------
  function sessionRow(s) {
    const done = isDone(s.id);
    const typeClass = s.type === "run" ? "run" : "";
    return `
      <a class="session-row ${typeClass} ${done ? "done" : ""}" href="#/session/${s.id}" style="text-decoration:none; color:inherit;">
        <span class="dot"></span>
        <span class="info">
          <span class="date-line">${escapeHtml(formatDate(s.date))} · Wk${s.week}</span>
          <span class="title-line">${escapeHtml(s.title)}</span>
        </span>
        ${done ? '<span class="check">✓</span>' : ""}
      </a>
    `;
  }

  function renderSchedule() {
    const t = todayStr();
    let html = "";
    let currentWeek = null;

    sessions.forEach((s) => {
      if (s.week !== currentWeek) {
        currentWeek = s.week;
        html += `<div class="section-label" id="week-${currentWeek}">Week ${currentWeek}</div>`;
      }
      html += sessionRow(s);
    });

    appEl.innerHTML = html;

    // Scroll to the week containing today's date (or the next upcoming week) on first load.
    const todaySession = sessions.find((s) => s.date === t);
    const nextSession = sessions.find((s) => s.date >= t);
    const targetWeek = (todaySession || nextSession || sessions[sessions.length - 1]).week;
    const anchor = document.getElementById(`week-${targetWeek}`);
    if (anchor) anchor.scrollIntoView({ block: "start" });
  }

  // ---------- Consistency & scoring ----------
  function computeStats() {
    const logs = getLogs();
    const t = todayStr();
    const dueSessions = sessions.filter((s) => s.date <= t);
    const loggedCount = sessions.filter((s) => logs[s.id]).length;
    const loggedDueCount = dueSessions.filter((s) => logs[s.id]).length;
    const consistency = dueSessions.length ? Math.round((loggedDueCount / dueSessions.length) * 100) : 0;

    let longest = 0;
    let running = 0;
    dueSessions.forEach((s) => {
      if (logs[s.id]) {
        running++;
        longest = Math.max(longest, running);
      } else {
        running = 0;
      }
    });
    const current = running;

    const weekMap = {};
    sessions.forEach((s) => {
      (weekMap[s.week] = weekMap[s.week] || []).push(s);
    });
    const fullWeeks = Object.values(weekMap).filter((weekSessions) => weekSessions.every((s) => logs[s.id])).length;

    const points = loggedCount * 10 + fullWeeks * 20;

    return { loggedCount, consistency, longest, current, fullWeeks, points };
  }

  function scoreHero(stats) {
    const streakLine =
      stats.current > 0
        ? `🔥 ${stats.current} session streak`
        : "Log a session to start a streak";
    return `
      <div class="hero score-hero">
        <div class="week-tag">Consistency Score</div>
        <h2>${stats.points} pts</h2>
        <div class="sub">${streakLine}</div>
      </div>
    `;
  }

  function renderCalendar(monthKey) {
    const [y, m] = monthKey.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const startWeekday = new Date(y, m - 1, 1).getDay();
    const t = todayStr();
    const logs = getLogs();
    const canPrev = monthKey > firstProgramMonth;
    const canNext = monthKey < lastProgramMonth;

    let cells = "";
    for (let i = 0; i < startWeekday; i++) {
      cells += `<div class="cal-cell empty"></div>`;
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const session = sessionByDate[dateStr];
      let cellClass = "cal-cell";
      if (dateStr === t) cellClass += " today";
      let dotHtml = "";
      if (session) {
        cellClass += " has-session";
        const typeClass = session.type === "run" ? "run" : "";
        if (logs[session.id]) {
          dotHtml = `<span class="cal-dot ${typeClass}"></span>`;
        } else if (dateStr < t) {
          dotHtml = `<span class="cal-dot missed"></span>`;
        } else {
          dotHtml = `<span class="cal-dot upcoming ${typeClass}"></span>`;
        }
      }
      const tag = session ? "a" : "div";
      const hrefAttr = session ? ` href="#/session/${session.id}"` : "";
      cells += `<${tag} class="${cellClass}"${hrefAttr}><span class="cal-daynum">${day}</span>${dotHtml}</${tag}>`;
    }

    return `
      <div class="card cal-card">
        <div class="cal-header">
          <button class="cal-nav" id="cal-prev" ${canPrev ? "" : "disabled"}>‹</button>
          <div class="cal-month-label">${monthLabel(monthKey)}</div>
          <button class="cal-nav" id="cal-next" ${canNext ? "" : "disabled"}>›</button>
        </div>
        <div class="cal-grid cal-weekdays">
          ${["S", "M", "T", "W", "T", "F", "S"].map((d) => `<div class="cal-wd">${d}</div>`).join("")}
        </div>
        <div class="cal-grid">${cells}</div>
        <div class="cal-legend">
          <span><span class="cal-dot"></span> Lift logged</span>
          <span><span class="cal-dot run"></span> Run logged</span>
          <span><span class="cal-dot missed"></span> Missed</span>
        </div>
      </div>
    `;
  }

  function bindCalendarNav() {
    const prevBtn = document.getElementById("cal-prev");
    const nextBtn = document.getElementById("cal-next");
    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        if (calendarMonth > firstProgramMonth) {
          calendarMonth = shiftMonthKey(calendarMonth, -1);
          renderHistory();
        }
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        if (calendarMonth < lastProgramMonth) {
          calendarMonth = shiftMonthKey(calendarMonth, 1);
          renderHistory();
        }
      });
    }
  }

  // ---------- History ----------
  function renderHistory() {
    const logs = getLogs();
    const loggedIds = Object.keys(logs);
    const completed = loggedIds.length;
    const stats = computeStats();

    if (!calendarMonth) {
      const tMonth = todayStr().slice(0, 7);
      calendarMonth = tMonth < firstProgramMonth ? firstProgramMonth : tMonth > lastProgramMonth ? lastProgramMonth : tMonth;
    }

    let html = scoreHero(stats);

    html += `
      <div class="stat-grid">
        <div class="stat-card"><div class="num">${stats.current}</div><div class="label">Current streak</div></div>
        <div class="stat-card"><div class="num">${stats.longest}</div><div class="label">Best streak</div></div>
        <div class="stat-card"><div class="num">${stats.consistency}%</div><div class="label">Consistency</div></div>
        <div class="stat-card"><div class="num">${stats.loggedCount}</div><div class="label">Sessions logged</div></div>
      </div>
    `;

    html += `<div class="section-label">Calendar</div>`;
    html += renderCalendar(calendarMonth);

    if (completed === 0) {
      html += `<div class="card empty-state"><div class="big">📋</div><p>Nothing logged yet. Log your first session from Today or Schedule.</p></div>`;
      appEl.innerHTML = html;
      bindCalendarNav();
      return;
    }

    const entries = loggedIds
      .map((id) => ({ id, session: byId[id], log: logs[id] }))
      .filter((e) => e.session)
      .sort((a, b) => (b.log.completedAt || "").localeCompare(a.log.completedAt || ""));

    html += `<div class="section-label">Logged sessions</div>`;
    entries.forEach(({ id, session, log }) => {
      const typeClass = session.type === "run" ? "run" : "";
      let summary = "";
      if (session.type === "run") {
        const bits = [];
        if (log.distance) bits.push(`${escapeHtml(log.distance)} mi`);
        if (log.time) bits.push(escapeHtml(log.time));
        if (log.rpe) bits.push(`RPE ${escapeHtml(log.rpe)}`);
        summary = bits.join(" · ");
      } else {
        const doneCount = (log.exercises || []).filter((e) => e.done).length;
        const totalCount = (log.exercises || []).length;
        summary = `${doneCount}/${totalCount} exercises`;
      }
      html += `
        <a class="session-row ${typeClass}" href="#/session/${id}" style="text-decoration:none; color:inherit;">
          <span class="dot"></span>
          <span class="info">
            <span class="date-line">${escapeHtml(formatDate(session.date))} · Wk${session.week}</span>
            <span class="title-line">${escapeHtml(session.title)}</span>
            <span class="date-line">${summary}</span>
          </span>
          <span class="check">✓</span>
        </a>
      `;
    });

    appEl.innerHTML = html;
    bindCalendarNav();
  }

  // ---------- Settings / cloud sync ----------
  function renderSettings() {
    const token = getGhToken();
    const lastSynced = localStorage.getItem(LAST_SYNCED_KEY);

    let html = `<a class="back-link" href="${window.__jwLastListRoute || "#/today"}">← Back</a>`;
    html += `<h2 style="margin:10px 0 4px; font-size:20px;">Cloud Sync</h2>`;
    html += `<p style="color:var(--text-muted); font-size:13px; margin-bottom:16px; line-height:1.5;">Back up your logs to a private GitHub repo so they survive a reinstall — and so Claude can see your data to help adjust the plan.</p>`;

    html += `<div class="card">
      <div class="field-row">
        <label>GitHub Token</label>
        <input type="password" id="gh-token-input" placeholder="${token ? "Saved — paste a new one to replace" : "Paste your token here"}" />
      </div>
      <button class="btn" id="save-token-btn">${token ? "Update Token" : "Save Token"}</button>
      ${token ? '<button class="btn secondary" id="remove-token-btn">Remove Token</button>' : ""}
    </div>`;

    if (token) {
      html += `<div class="card">
        <p style="font-size:13px;">Status: <strong style="color:var(--accent);">Connected</strong></p>
        <p style="font-size:13px; color:var(--text-muted); margin-top:4px;">Last synced: ${lastSynced ? escapeHtml(formatDateTime(lastSynced)) : "Never"}</p>
        <button class="btn" id="sync-now-btn">Sync Now</button>
        <button class="btn secondary" id="restore-btn">Restore from Cloud</button>
      </div>`;
    }

    html += `<div class="note-box">
      <strong>How to get a token:</strong><br/>
      1. On github.com: Settings → Developer settings → Personal access tokens → Fine-grained tokens<br/>
      2. Generate new token<br/>
      3. Repository access → Only select repositories → voltage-data<br/>
      4. Permissions → Repository permissions → Contents → Read and write<br/>
      5. Generate, copy it, and paste it above
    </div>`;

    appEl.innerHTML = html;

    document.getElementById("save-token-btn").addEventListener("click", async () => {
      const val = document.getElementById("gh-token-input").value.trim();
      if (!val) return;
      setGhToken(val);
      showToast("Saving...");
      const result = await pushLogsToCloud();
      showToast(result.ok ? "Connected & synced" : "Saved — sync failed, check token");
      renderSettings();
    });

    const removeBtn = document.getElementById("remove-token-btn");
    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        setGhToken(null);
        renderSettings();
      });
    }
    const syncBtn = document.getElementById("sync-now-btn");
    if (syncBtn) {
      syncBtn.addEventListener("click", async () => {
        showToast("Syncing...");
        const result = await pushLogsToCloud();
        showToast(result.ok ? "Synced" : "Sync failed");
        renderSettings();
      });
    }
    const restoreBtn = document.getElementById("restore-btn");
    if (restoreBtn) {
      restoreBtn.addEventListener("click", async () => {
        if (!confirm("This replaces your local logs with the cloud backup. Continue?")) return;
        showToast("Restoring...");
        const result = await pullLogsFromCloud();
        showToast(result.ok ? "Restored" : "Restore failed");
        renderSettings();
      });
    }
  }

  // ---------- Session detail ----------
  function renderSessionDetail(id) {
    const session = byId[id];
    if (!session) {
      appEl.innerHTML = `<div class="card empty-state"><p>Workout not found.</p></div>`;
      return;
    }
    const log = getLogs()[id] || null;
    const backRoute = window.__jwLastListRoute || "#/today";

    let html = `<a class="back-link" href="${backRoute}">← Back</a>`;
    html += `<div class="badge ${session.type === "run" ? "run" : ""}">${session.type === "run" ? "Run" : "Lift"}</div>`;
    html += `<h2 style="margin:10px 0 2px; font-size:20px;">${escapeHtml(session.title)}</h2>`;
    html += `<p style="color:var(--text-muted); font-size:13px; margin-bottom:14px;">Week ${session.week} · ${session.day} · ${escapeHtml(formatDate(session.date))}</p>`;

    if (session.note) {
      html += `<div class="note-box">${escapeHtml(session.note)}</div>`;
    }

    if (session.type === "lift") {
      html += `<div class="section-label">Warm-up / Cooldown Flow</div>`;
      html += `<div class="card"><ul class="list-plain">`;
      session.warmup.forEach((w) => {
        html += `<li><span>${escapeHtml(w.name)}</span><span class="muted">${escapeHtml(w.detail)}</span></li>`;
      });
      if (session.warmupExtra) {
        html += `<li><span>${escapeHtml(session.warmupExtra)}</span><span class="muted"></span></li>`;
      }
      html += `</ul></div>`;

      html += `<div class="section-label">Exercises</div>`;
      session.exercises.forEach((ex, i) => {
        const saved = log && log.exercises && log.exercises[i] ? log.exercises[i] : {};
        html += `
          <div class="exercise">
            <div class="exercise-head">
              <input type="checkbox" id="ex-${i}-done" ${saved.done ? "checked" : ""} />
              <div>
                <div class="exercise-name">${escapeHtml(ex.name)}</div>
                <div class="exercise-detail">${escapeHtml(ex.detail)}</div>
              </div>
            </div>
            <div class="exercise-fields">
              <input type="text" id="ex-${i}-weight" placeholder="Weight used" value="${escapeHtml(saved.weight || "")}" />
              <input type="text" id="ex-${i}-notes" placeholder="Notes" value="${escapeHtml(saved.notes || "")}" />
            </div>
          </div>
        `;
      });

      const coreSaved = (log && log.core) || {};
      html += `
        <div class="exercise">
          <div class="exercise-head">
            <input type="checkbox" id="core-done" ${coreSaved.done ? "checked" : ""} />
            <div>
              <div class="exercise-name">Core Finisher: ${escapeHtml(session.coreFinisher.name)}</div>
              <div class="exercise-detail">${escapeHtml(session.coreFinisher.detail)}${session.coreFinisherExtra ? " · extra time on mobility this week" : ""} · 3 rounds</div>
            </div>
          </div>
        </div>
      `;

      if (session.conditioning) {
        const condSaved = (log && log.conditioning) || {};
        html += `
          <div class="exercise">
            <div class="exercise-head">
              <input type="checkbox" id="cond-done" ${condSaved.done ? "checked" : ""} />
              <div>
                <div class="exercise-name">${escapeHtml(session.conditioning.name)} (optional)</div>
                <div class="exercise-detail">${escapeHtml(session.conditioning.detail)}</div>
              </div>
            </div>
          </div>
        `;
      }
    } else {
      // Run session
      html += `<div class="section-label">Planned</div>`;
      html += `<div class="card"><ul class="list-plain">
        <li><span>Type</span><span class="muted">${session.runKind === "long" ? "Long run" : "Tempo / Speed"}</span></li>
        ${session.miles ? `<li><span>Target distance</span><span class="muted">${session.miles} mi</span></li>` : ""}
      </ul></div>`;

      html += `<div class="section-label">Pace bands (from 9:30/mi 10K)</div>`;
      html += `<div class="card"><ul class="list-plain">`;
      PROGRAM.paceBands.forEach((p) => {
        html += `<li><span>${escapeHtml(p.type)}</span><span class="muted">${escapeHtml(p.pace)}</span></li>`;
      });
      html += `</ul></div>`;

      html += `<div class="section-label">Log this run</div>`;
      html += `<div class="card">
        <div class="field-row">
          <label>Distance (mi)</label>
          <input type="text" id="run-distance" inputmode="decimal" placeholder="e.g. ${session.miles || 4}" value="${escapeHtml(log && log.distance)}" />
        </div>
        <div class="field-row">
          <label>Time</label>
          <input type="text" id="run-time" placeholder="e.g. 42:30" value="${escapeHtml(log && log.time)}" />
        </div>
      </div>`;
    }

    html += `<div class="section-label">Effort</div>`;
    const rpeSaved = log && log.rpe ? log.rpe : 6;
    html += `
      <div class="card">
        <div class="field-row">
          <label>RPE (1 = easy, 10 = max effort): <span class="rpe-value" id="rpe-display">${rpeSaved}</span></label>
          <input type="range" id="rpe" min="1" max="10" value="${rpeSaved}" />
        </div>
        <div class="field-row">
          <label>Notes</label>
          <textarea id="session-notes" placeholder="How did it feel? Anything for next time?">${escapeHtml(log && log.notes)}</textarea>
        </div>
      </div>
    `;

    html += `<button class="btn" id="save-btn">${log ? "Update Log" : "Save Log"}</button>`;
    if (log) {
      html += `<button class="btn secondary" id="clear-btn">Clear Log</button>`;
    }

    appEl.innerHTML = html;

    const rpeInput = document.getElementById("rpe");
    const rpeDisplay = document.getElementById("rpe-display");
    rpeInput.addEventListener("input", () => (rpeDisplay.textContent = rpeInput.value));

    document.getElementById("save-btn").addEventListener("click", () => saveSession(session));
    const clearBtn = document.getElementById("clear-btn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        const logs = getLogs();
        delete logs[id];
        localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
        if (getGhToken()) pushLogsToCloud();
        render();
      });
    }
  }

  function saveSession(session) {
    const entry = {
      completedAt: new Date().toISOString(),
      type: session.type,
      rpe: document.getElementById("rpe").value,
      notes: document.getElementById("session-notes").value.trim(),
    };

    if (session.type === "lift") {
      entry.exercises = session.exercises.map((ex, i) => ({
        name: ex.name,
        done: document.getElementById(`ex-${i}-done`).checked,
        weight: document.getElementById(`ex-${i}-weight`).value.trim(),
        notes: document.getElementById(`ex-${i}-notes`).value.trim(),
      }));
      entry.core = { done: document.getElementById("core-done").checked };
      const condCheckbox = document.getElementById("cond-done");
      if (condCheckbox) entry.conditioning = { done: condCheckbox.checked };
    } else {
      entry.distance = document.getElementById("run-distance").value.trim();
      entry.time = document.getElementById("run-time").value.trim();
    }

    saveLogEntry(session.id, entry);
    showToast("Saved");
    if (getGhToken()) pushLogsToCloud();
    navigate(window.__jwLastListRoute || "#/today");
  }

  function showToast(msg) {
    let toast = document.querySelector(".saved-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "saved-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(() => toast.classList.remove("show"), 1600);
  }

  // Track which list view to return to after viewing a session.
  window.addEventListener("hashchange", () => {
    const r = currentRoute();
    if (r === "#/today" || r === "#/schedule" || r === "#/history") {
      window.__jwLastListRoute = r;
    }
  });

  render();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
})();
