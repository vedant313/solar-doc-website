let state = {
  token: localStorage.getItem("sdm_token") || null,
  user: JSON.parse(localStorage.getItem("sdm_user") || "null"),
  page: "dashboard",
  stages: [],
  customers: [],
  activeCustomer: null,
  documents: [],
  stats: null,
};

function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}

async function api(path, opts = {}) {
  const headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
  if (state.token) headers["Authorization"] = "Bearer " + state.token;
  const res = await fetch((window.API_BASE || "") + path, Object.assign({}, opts, { headers }));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function logout() {
  localStorage.removeItem("sdm_token");
  localStorage.removeItem("sdm_user");
  state.token = null; state.user = null;
  render();
}

async function doLogin(mobile, password, errEl) {
  errEl.textContent = "";
  try {
    const data = await api("/api/login", { method: "POST", body: JSON.stringify({ mobile, password }) });
    if (data.user.role !== "admin") { errEl.textContent = "This panel is for admins. Use the app for staff login."; return; }
    state.token = data.token; state.user = data.user;
    localStorage.setItem("sdm_token", data.token);
    localStorage.setItem("sdm_user", JSON.stringify(data.user));
    await boot();
  } catch (e) { errEl.textContent = e.message; }
}

async function boot() {
  if (state.token) {
    try {
      state.stages = await api("/api/stages");
      await setPage("dashboard");
      return;
    } catch (e) { logout(); return; }
  }
  render();
}

function statusBadge(status) {
  const map = { completed: ["badge-green", "Completed"], "in-progress": ["badge-orange", "In Progress"], pending: ["badge-blue", "Pending"], rejected: ["badge-red", "Action Required"] };
  const [cls, label] = map[status] || ["badge-gray", "Not Started"];
  return `<span class="badge ${cls}">${label}</span>`;
}
function cellsHTML(step) {
  let out = "";
  for (let i = 1; i <= 10; i++) { let cls = "cell"; if (i < step) cls += " done"; else if (i === step) cls += " current"; out += `<div class="${cls}">${i}</div>`; }
  return out;
}

async function setPage(p, custId) {
  state.page = p;
  try {
    if (p === "dashboard") { state.stats = await api("/api/stats"); state.customers = await api("/api/customers"); }
    else if (p === "customers") { state.customers = await api("/api/customers"); }
    else if ((p === "update" || p === "flow") && custId) { state.activeCustomer = await api("/api/customers/" + custId); }
    else if (p === "documents" && !custId) { state.customers = await api("/api/customers"); state.activeCustomer = null; }
    else if (p === "documents" && custId) {
      state.activeCustomer = await api("/api/customers/" + custId);
      state.documents = await api(`/api/customers/${custId}/documents`);
    }
  } catch (e) { toast(e.message); }
  render();
}

async function submitAddCustomer(form) {
  const body = {
    name: form.name.value, mobile: form.mobile.value, email: form.email.value, address: form.address.value,
    consumerNo: form.consumerNo.value, capacity: form.capacity.value, type: form.type.value,
  };
  if (!body.name || !body.mobile) { toast("Name and mobile are required"); return; }
  try {
    await api("/api/customers", { method: "POST", body: JSON.stringify(body) });
    toast("Customer added");
    setPage("customers");
  } catch (e) { toast(e.message); }
}

async function submitStageUpdate(form) {
  const step = Number(form.step.value);
  const status = form.querySelector(".opt.sel").dataset.status;
  const remarks = form.remarks.value;
  try {
    await api(`/api/customers/${state.activeCustomer.id}/stage`, { method: "PUT", body: JSON.stringify({ step, status, remarks }) });
    toast("Stage updated");
    setPage("customers");
  } catch (e) { toast(e.message); }
}

function selectStatus(btn) {
  btn.parentElement.querySelectorAll(".opt").forEach((o) => o.classList.remove("sel"));
  btn.classList.add("sel");
}

function render() {
  const el = document.getElementById("app");

  if (!state.token) {
    el.innerHTML = `
      <div class="login-card">
        <h2 style="margin:0 0 2px;">Admin Login</h2>
        <p style="font-size:12px;color:var(--text-soft);margin:0 0 20px;">Solar Doc Manager admin panel</p>
        <div class="form-field" style="margin-bottom:12px;"><label>Mobile Number</label><input id="li-mobile" placeholder="9000000001"></div>
        <div class="form-field" style="margin-bottom:8px;"><label>Password</label><input id="li-pass" type="password" placeholder="admin123"></div>
        <div style="color:#C0392B;font-size:12px;margin-bottom:12px;" id="li-err"></div>
        <button class="btn btn-gold" style="width:100%;" onclick="doLogin(document.getElementById('li-mobile').value, document.getElementById('li-pass').value, document.getElementById('li-err'))">Login</button>
        <p style="font-size:11px;color:var(--text-soft);margin-top:16px;">Demo: 9000000001 / admin123</p>
      </div>`;
    return;
  }

  const sideItems = [
    ["dashboard", "▦", "Dashboard"], ["customers", "☰", "Customers"],
    ["add", "＋", "Add Customer"], ["documents", "🗎", "Documents"], ["flow", "◈", "Process Flow"],
  ];

  let main = "";
  if (state.page === "dashboard") {
    const s = state.stats || { total: 0, inProgress: 0, completed: 0, pending: 0, stageWiseCounts: new Array(10).fill(0) };
    const maxCount = Math.max(...s.stageWiseCounts, 1);
    main = `
      <div class="admin-main-head"><div><h2>Dashboard</h2><p>Overview across all customers</p></div><button class="btn btn-gold" onclick="setPage('add')">+ Add Customer</button></div>
      <div class="kpi-row">
        <div class="kpi"><div class="num">${s.total}</div><div class="lbl">Total Customers</div></div>
        <div class="kpi k-orange"><div class="num">${s.inProgress}</div><div class="lbl">In Progress</div></div>
        <div class="kpi k-green"><div class="num">${s.completed}</div><div class="lbl">Completed</div></div>
        <div class="kpi k-blue"><div class="num">${s.pending}</div><div class="lbl">Pending</div></div>
      </div>
      <div class="panel"><h3>Stage-wise Customer Count</h3>
        <div class="bars">${s.stageWiseCounts.map((c, i) => `<div class="bar-col"><div class="bar" style="height:${(c / maxCount) * 120 + 8}px;background:${i < 3 ? "var(--gold)" : i < 7 ? "var(--blue)" : "var(--green)"};"></div><div class="lbl">${i + 1}</div></div>`).join("")}</div>
      </div>
      <div class="panel" style="margin-bottom:0;"><h3>Action Required</h3>
        <p style="font-size:12.5px;color:var(--text-soft);margin:0;">${s.actionRequired ? `🚨 ${s.actionRequired} customer(s) need attention.` : "✅ All customers currently on track."}</p>
      </div>`;
  }

  else if (state.page === "customers") {
    main = `
      <div class="admin-main-head"><div><h2>Customers</h2><p>${state.customers.length} total</p></div><button class="btn btn-gold" onclick="setPage('add')">+ Add Customer</button></div>
      <div class="toolbar"><input id="cust-search" placeholder="🔍 Search customers…" oninput="filterAdminCustomers(this.value)"></div>
      <table><thead><tr><th>Name</th><th>System</th><th>Type</th><th>Current Stage</th><th>Progress</th><th>Status</th></tr></thead>
      <tbody id="cust-tbody">${customerRows(state.customers)}</tbody></table>`;
  }

  else if (state.page === "add") {
    main = `
      <div class="admin-main-head"><div><h2>Add Customer</h2><p>Register a new solar customer</p></div></div>
      <div class="panel">
        <form id="add-form" class="form-grid" onsubmit="event.preventDefault(); submitAddCustomer(this);">
          <div class="form-field"><label>Full Name</label><input name="name" required></div>
          <div class="form-field"><label>Mobile Number</label><input name="mobile" required></div>
          <div class="form-field"><label>Email</label><input name="email" placeholder="customer@email.com"></div>
          <div class="form-field"><label>Address</label><input name="address"></div>
          <div class="form-field"><label>Consumer Number</label><input name="consumerNo"></div>
          <div class="form-field"><label>Solar Capacity</label><input name="capacity" placeholder="e.g. 3kW"></div>
          <div class="form-field"><label>Customer Type</label><select name="type"><option>Loan</option><option>Cash</option></select></div>
        </form>
        <button class="btn btn-gold" style="margin-top:14px;" onclick="submitAddCustomer(document.getElementById('add-form'))">Save Customer</button>
      </div>`;
  }

  else if (state.page === "update" && state.activeCustomer) {
    const c = state.activeCustomer;
    main = `
      <div class="admin-main-head"><div><h2>Update Customer Stage</h2><p>${c.name} · ${c.capacity} System</p></div></div>
      <div class="two-col">
        <div class="panel">
          <form id="update-form">
            <h3>Current Stage</h3>
            <div class="form-field" style="margin-bottom:14px;"><select name="step">${state.stages.map((s, i) => `<option value="${i + 1}" ${i + 1 === c.step ? "selected" : ""}>${s}</option>`).join("")}</select></div>
            <h3>Update Status</h3>
            <div class="status-choice" style="margin-bottom:14px;">
              <div class="opt ${c.status === "pending" ? "sel" : ""}" data-status="pending" onclick="selectStatus(this)">Pending</div>
              <div class="opt ${c.status === "in-progress" ? "sel" : ""}" data-status="in-progress" onclick="selectStatus(this)">In Progress</div>
              <div class="opt ${c.status === "completed" ? "sel" : ""}" data-status="completed" onclick="selectStatus(this)">Completed</div>
              <div class="opt ${c.status === "rejected" ? "sel" : ""}" data-status="rejected" onclick="selectStatus(this)">Action Req.</div>
            </div>
            <h3>Remarks / Notes</h3>
            <textarea name="remarks" rows="3" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;font-family:inherit;font-size:12.5px;">${c.remarks || ""}</textarea>
          </form>
          <button class="btn btn-gold" style="margin-top:14px;" onclick="submitStageUpdate(document.getElementById('update-form'))">Update</button>
        </div>
        <div class="panel">
          <h3>Customer Details</h3>
          <div style="font-size:12.5px;line-height:2;color:var(--text-soft);">
            <div><b style="color:var(--text);">Mobile:</b> ${c.mobile}</div>
            ${c.email ? `<div><b style="color:var(--text);">Email:</b> ${c.email}</div>` : ""}
            <div><b style="color:var(--text);">Address:</b> ${c.address}</div>
            <div><b style="color:var(--text);">Type:</b> ${c.type} Customer</div>
            <div><b style="color:var(--text);">System:</b> ${c.capacity}</div>
          </div>
          <button class="btn btn-ghost" style="margin-top:12px;width:100%;" onclick="setPage('documents','${c.id}')">📄 View Documents</button>
        </div>
      </div>`;
  }

  else if (state.page === "documents" && !state.activeCustomer) {
    main = `<div class="admin-main-head"><div><h2>Documents</h2><p>Select a customer to view their uploaded documents</p></div></div>
      <div class="toolbar"><input id="cust-search" placeholder="🔍 Search customers…" oninput="filterAdminCustomers(this.value)"></div>
      <table><thead><tr><th>Name</th><th>System</th><th>Current Stage</th><th>Status</th></tr></thead>
      <tbody id="cust-tbody">${customerRows(state.customers, "flow")}</tbody></table>`;
  }

  else if (state.page === "documents" && state.activeCustomer) {
    const c = state.activeCustomer;
    main = `
      <div class="admin-main-head"><div><h2>Documents — ${c.name}</h2><p>${c.capacity} System · ${c.type} Customer · ${state.documents.length} document(s)</p></div><button class="btn btn-ghost" onclick="setPage('documents')">← All Customers</button></div>
      <div class="panel" style="margin-bottom:0;">
        ${docRows(state.documents)}
      </div>`;
  }

  else if (state.page === "flow" && !state.activeCustomer) {
    main = `<div class="admin-main-head"><div><h2>Process Flow</h2><p>Select a customer from the Customers tab first</p></div></div>
      <table><thead><tr><th>Name</th><th>System</th><th>Stage</th><th>Status</th></tr></thead><tbody>${customerRows(state.customers, "flow")}</tbody></table>`;
  }

  else if (state.page === "flow" && state.activeCustomer) {
    const c = state.activeCustomer;
    main = `
      <div class="admin-main-head"><div><h2>Process Flow View</h2><p>${c.name}</p></div></div>
      <div class="panel" style="box-shadow:none;"><div class="cells">${cellsHTML(c.step)}</div></div>
      <div class="panel" style="margin-bottom:0;">
        ${state.stages.map((s, i) => { const n = i + 1; const cls = n < c.step ? "done" : n === c.step ? "current" : "";
          return `<div class="flow-row ${cls}"><div class="num">${n < c.step ? "✓" : n}</div><div class="lbl">${s}</div>${n < c.step ? statusBadge("completed") : n === c.step ? statusBadge(c.status) : statusBadge("pending")}</div>`; }).join("")}
      </div>`;
  }

  el.innerHTML = `
    <div class="admin-shell">
      <div class="admin-side">
        <div class="brand"><h1>Solar Doc Manager</h1><p>Admin · ${state.user ? state.user.name : ""}</p></div>
        ${sideItems.map(([key, ic, label]) => `<div class="side-item ${state.page === key ? "active" : ""}" onclick="setPage('${key}')"><span class="ic">${ic}</span> ${label}</div>`).join("")}
        <div class="side-item" onclick="logout()"><span class="ic">⎋</span> Logout</div>
      </div>
      <div class="admin-main">${main}</div>
    </div>`;
}

function customerRows(list, mode) {
  const compact = mode === "flow" || mode === "documents";
  return list.map((c) => `<tr class="tbl-row" onclick="setPage('${mode === "flow" ? "flow" : mode === "documents" ? "documents" : "update"}','${c.id}')">
    <td><b>${c.name}</b></td><td>${c.capacity}</td>${compact ? "" : `<td>${c.type}</td>`}
    <td>${state.stages[c.step - 1] || ""}</td>
    ${compact ? "" : `<td><span class="progress-mini"><i style="width:${c.step * 10}%;"></i></span>${c.step}/10</td>`}
    <td>${statusBadge(c.status)}</td>
  </tr>`).join("") || `<tr><td colspan="6" style="text-align:center;color:var(--text-soft);">No customers yet.</td></tr>`;
}

function docStatusBadge(status) {
  if (status === "Uploaded") return `<span class="badge badge-green">Uploaded</span>`;
  if (status === "Needs Confirmation") return `<span class="badge badge-orange">Needs Confirmation</span>`;
  return `<span class="badge badge-blue">Pending</span>`;
}

function docRows(docs) {
  if (!docs.length) return `<p style="font-size:12.5px;color:var(--text-soft);text-align:center;padding:20px 0;">No documents uploaded yet for this customer.</p>`;
  return `<table><thead><tr><th>Type</th><th>File</th><th>Uploaded</th><th>Status</th><th style="text-align:right;">Actions</th></tr></thead><tbody>
    ${docs.map((d) => `<tr id="doc-row-${d.id}">
      <td><b>${d.type}</b></td>
      <td>${d.originalName || d.fileName || "—"}</td>
      <td>${d.uploadedAt || "—"}</td>
      <td>${docStatusBadge(d.status)}</td>
      <td style="text-align:right;white-space:nowrap;">
        <a href="${(window.API_BASE || "")}/api/uploads/${d.fileName}" target="_blank" style="color:var(--blue);font-weight:600;font-size:12px;margin-right:10px;">View</a>
        <a href="${(window.API_BASE || "")}/api/uploads/${d.fileName}?download=1" style="color:var(--green);font-weight:600;font-size:12px;margin-right:10px;">Download</a>
        <span onclick="renameDoc('${d.id}','${(d.type || "").replace(/'/g, "\\'")}')" style="cursor:pointer;color:var(--text-soft);font-weight:600;font-size:12px;margin-right:10px;">Rename</span>
        <span onclick="deleteDocAdmin('${d.id}')" style="cursor:pointer;color:#C0392B;font-weight:600;font-size:12px;">Delete</span>
      </td>
    </tr>`).join("")}
  </tbody></table>`;
}

async function renameDoc(docId, currentType) {
  const newType = prompt("Document type / name:", currentType);
  if (!newType || !newType.trim() || newType === currentType) return;
  try {
    await api(`/api/documents/${docId}`, { method: "PUT", body: JSON.stringify({ type: newType.trim() }) });
    toast("Document renamed");
    setPage("documents", state.activeCustomer.id);
  } catch (e) { toast(e.message); }
}

async function deleteDocAdmin(docId) {
  if (!confirm("Delete this document? This cannot be undone.")) return;
  try {
    await api(`/api/documents/${docId}`, { method: "DELETE" });
    toast("Document deleted");
    setPage("documents", state.activeCustomer.id);
  } catch (e) { toast(e.message); }
}

function filterAdminCustomers(q) {
  const filtered = state.customers.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) || c.mobile.includes(q));
  document.getElementById("cust-tbody").innerHTML = customerRows(filtered);
}

boot();
