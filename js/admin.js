// Admin dashboard: Firebase Auth (Email/Password) + Firestore reads & deletes
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Setup config
const firebaseConfig = {
  apiKey: "AIzaSyDcOcGYXHgma9yFdUqNSKmeVi_Ew_Sbp3Q",
  authDomain: "texmorro-c6c76.firebaseapp.com",
  projectId: "texmorro-c6c76",
  storageBucket: "texmorro-c6c76.firebasestorage.app",
  messagingSenderId: "942262670790",
  appId: "1:942262670790:web:aec64957c1078190018ec7",
  measurementId: "G-3KXZMCXC6S",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const loginSection = document.getElementById("loginSection");
const loginForm = document.getElementById("loginForm");
const signOutBtn = document.getElementById("signOutBtn");
const authInfo = document.getElementById("authInfo");
const content = document.getElementById("content");
const tablesEl = document.getElementById("tables");
const errorEl = document.getElementById("error");

// Handle Form Submission Login
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.style.display = "none";

  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value;

  const btn = document.getElementById("signInBtn");
  btn.disabled = true;
  btn.textContent = "Signing In...";

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    showError("Authentication failed: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Sign In";
  }
});

signOutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

// Auth State Monitor
onAuthStateChanged(auth, async (user) => {
  errorEl.style.display = "none";
  if (user) {
    const email = user.email || "";

    loginSection.style.display = "none";
    signOutBtn.style.display = "inline-block";
    authInfo.textContent = `Signed in as ${email}`;
    content.style.display = "block";
    await loadAllSubmissions();
  } else {
    loginSection.style.display = "block";
    signOutBtn.style.display = "none";
    authInfo.textContent = "";
    content.style.display = "none";
    tablesEl.innerHTML = "";
    loginForm.reset();
  }
});

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.style.display = "block";
}

async function loadAllSubmissions() {
  tablesEl.innerHTML = "";
  const collections = [
    { id: "sample_enquiries", label: "Sample Requests" },
    { id: "brand_enquiries", label: "Brand Enquiries" },
    { id: "corporate_enquiries", label: "Corporate Enquiries" },
  ];

  for (const col of collections) {
    try {
      const q = query(collection(db, col.id), orderBy("submittedAt", "desc"));
      const snap = await getDocs(q);
      renderCollection(col.id, col.label, snap.docs);
    } catch (err) {
      const section = document.createElement("section");
      section.innerHTML = `<h3>${col.label}</h3><p class='text-muted'>Unable to read ${col.id}: ${err.message}</p>`;
      tablesEl.appendChild(section);
    }
  }
}

function renderCollection(collectionId, label, docs) {
  const section = document.createElement("section");
  section.className = "mb-5";
  const heading = document.createElement("h3");
  heading.textContent = `${label} (${docs.length})`;
  section.appendChild(heading);

  if (docs.length === 0) {
    const p = document.createElement("p");
    p.className = "text-muted";
    p.textContent = "No submissions yet.";
    section.appendChild(p);
    tablesEl.appendChild(section);
    return;
  }

  const table = document.createElement("table");
  table.className = "table table-striped table-bordered mb-0";
  const thead = document.createElement("thead");
  thead.innerHTML = "<tr><th>Submitted</th><th>Name</th><th>Email</th><th>Phone</th><th>Action</th></tr>";
  table.appendChild(thead);
  const tbody = document.createElement("tbody");

  docs.forEach((d, i) => {
    const data = d.data();
    const docId = d.id; // Unique document reference ID from Firestore
    const tr = document.createElement("tr");
    const submittedAt = formatTimestamp(data.submittedAt);
    const name = data.name || data.fullName || "";
    const email = data.email || "";
    const phone = data.phone || "";

    tr.innerHTML = `
      <td>${submittedAt}</td>
      <td>${escapeHtml(name)}</td>
      <td>${escapeHtml(email)}</td>
      <td>${escapeHtml(phone)}</td>
      <td>
        <button class='btn btn-sm btn-outline-primary details-btn me-2' data-idx='${i}'>Details</button>
        <button class='btn btn-sm btn-outline-danger btn-delete' data-id='${docId}'>Delete</button>
      </td>
    `;
    tbody.appendChild(tr);

    const normalizedData = normalizeTimestamps(data);

    let detailsRowsHtml = "";
    Object.keys(normalizedData).forEach((key) => {
      const formattedKey = key.replace(/_/g, " ");
      let value = normalizedData[key];

      if (value === null || value === undefined || value === "") {
        value = "<em class='text-muted'>none</em>";
      } else if (typeof value === "object") {
        value = JSON.stringify(value);
      } else {
        value = escapeHtml(String(value));
      }

      detailsRowsHtml += `<tr><th>${escapeHtml(formattedKey)}</th><td>${value}</td></tr>`;
    });

    const detailsTr = document.createElement("tr");
    detailsTr.className = "details-row";
    detailsTr.style.display = "none";
    detailsTr.innerHTML = `
      <td colspan='5' class='p-3'>
        <div class='table-responsive'>
          <table class='table table-sm table-bordered details-table mb-0'>
            <tbody>
              ${detailsRowsHtml}
            </tbody>
          </table>
        </div>
      </td>
    `;
    tbody.appendChild(detailsTr);

    // Toggle Details logic
    tr.querySelector(".details-btn").addEventListener("click", function() {
      const isHidden = detailsTr.style.display === "none";
      detailsTr.style.display = isHidden ? "table-row" : "none";
      this.textContent = isHidden ? "Hide" : "Details";
      this.classList.toggle("btn-outline-primary", !isHidden);
      this.classList.toggle("btn-secondary", isHidden);
    });

    // Delete Submission Logic
    tr.querySelector(".btn-delete").addEventListener("click", async function() {
      const confirmed = confirm(`Are you sure you want to permanently delete the entry from "${name}"?`);
      if (!confirmed) return;

      errorEl.style.display = "none";
      this.disabled = true;
      this.textContent = "Deleting...";

      try {
        // Point to the specific record target inside Firestore
        const docRef = doc(db, collectionId, docId);
        await deleteDoc(docRef);
        
        // Refresh entries list layout on successful deletion
        await loadAllSubmissions();
      } catch (err) {
        showError("Failed to delete record: " + err.message);
        this.disabled = false;
        this.textContent = "Delete";
      }
    });
  });

  table.appendChild(tbody);
  section.appendChild(table);
  tablesEl.appendChild(section);
}

function formatTimestamp(ts) {
  try {
    if (!ts) return "-";
    if (typeof ts.toDate === "function") return new Date(ts.toDate()).toLocaleString();
    if (ts instanceof Date) return ts.toLocaleString();
    if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
    return String(ts);
  } catch (e) {
    return "-";
  }
}

function normalizeTimestamps(obj) {
  if (obj == null) return obj;
  if (Array.isArray(obj)) return obj.map(normalizeTimestamps);
  if (typeof obj === "object") {
    const out = {};
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (v && typeof v.toDate === "function") {
        out[k] = new Date(v.toDate()).toLocaleString();
      } else if (typeof v === "object") {
        out[k] = normalizeTimestamps(v);
      } else out[k] = v;
    }
    return out;
  }
  return obj;
}

function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}