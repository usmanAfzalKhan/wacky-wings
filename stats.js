// === stats.js ===
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";

// — your Firebase config —
const firebaseConfig = {
  apiKey: "AIzaSyDJJ8FL79BXg4qA1XevOeD3Qqj_q87lN-o",
  authDomain: "wacky-wings.firebaseapp.com",
  projectId: "wacky-wings",
  storageBucket: "wacky-wings.firebasestorage.app",
  messagingSenderId: "86787566584",
  appId: "1:86787566584:web:a4e421c1259763d061c48d",
  measurementId: "G-WYSDC4Q441"
};

// init Firebase once
const app = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// DOM refs
const usernameDisplay = document.getElementById("usernameDisplay");
const userMenu        = document.getElementById("userMenu");
const logoutBtn       = document.getElementById("logoutBtn");
const highScoreEl     = document.getElementById("highScore");
const timesPlayedEl   = document.getElementById("timesPlayed");
const averageScoreEl  = document.getElementById("averageScore");
const leaderboardBody = document.getElementById("leaderboardBody");

// toggle dropdown
usernameDisplay.addEventListener("click", () => {
  const open = userMenu.style.display === "block";
  userMenu.style.display = open ? "none" : "block";
  usernameDisplay.textContent = usernameDisplay.textContent.replace(/.$/, open ? "▼" : "▲");
});
document.addEventListener("click", e => {
  if (!usernameDisplay.contains(e.target) && !userMenu.contains(e.target)) {
    userMenu.style.display = "none";
    if (!usernameDisplay.textContent.endsWith("▼")) {
      usernameDisplay.textContent = usernameDisplay.textContent.replace(/.$/, "▼");
    }
  }
});

// logout
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

// when auth state changes (login/logout)
onAuthStateChanged(auth, async user => {
  if (!user) {
    usernameDisplay.textContent = "Guest ▼";
    highScoreEl.textContent     = "–";
    timesPlayedEl.textContent   = "–";
    averageScoreEl.textContent  = "–";
    leaderboardBody.innerHTML   = `<tr><td colspan="3">Please log in to see leaderboard.</td></tr>`;
    return;
  }

  // show username
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    const data = snap.data() || {};
    usernameDisplay.textContent = `${data.username || "Player"} ▼`;
    // fill your personal stats
    highScoreEl.textContent    = data.highscore    ?? 0;
    timesPlayedEl.textContent  = data.timesPlayed  ?? 0;
    averageScoreEl.textContent = data.averageScore ?? 0;
  } catch {
    // ignore
  }

  // fetch & render leaderboard
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    const arr = [];
    usersSnap.forEach(d => {
      const u = d.data();
      if (u.username && typeof u.highscore === "number")
        arr.push({ username: u.username, highscore: u.highscore });
    });
    // sort desc
    arr.sort((a,b) => b.highscore - a.highscore);
    // render top 10
    leaderboardBody.innerHTML = arr.slice(0,10).map((u,i) => `
      <tr>
        <td>#${i+1}</td>
        <td>${u.username}</td>
        <td>${u.highscore}</td>
      </tr>
    `).join("");
  } catch {
    leaderboardBody.innerHTML = `<tr><td colspan="3">Error loading leaderboard</td></tr>`;
  }
});
