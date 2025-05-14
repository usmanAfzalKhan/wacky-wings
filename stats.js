import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
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

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDJJ8FL79BXg4qA1XevOeD3Qqj_q87lN-o",
  authDomain: "wacky-wings.firebaseapp.com",
  projectId: "wacky-wings",
  storageBucket: "wacky-wings.appspot.com",
  messagingSenderId: "86787566584",
  appId: "1:86787566584:web:a4e421c1259763d061c40d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// DOM elements
const usernameDisplay = document.getElementById("usernameDisplay");
const userMenu = document.getElementById("userMenu");
const logoutBtn = document.getElementById("logoutBtn");
const highScoreEl = document.getElementById("highScore");
const timesPlayedEl = document.getElementById("timesPlayed");
const averageScoreEl = document.getElementById("averageScore");
const leaderboardBody = document.getElementById("leaderboardBody");

// Dropdown toggle
usernameDisplay.addEventListener("click", () => {
  const visible = userMenu.style.display === "block";
  userMenu.style.display = visible ? "none" : "block";
  usernameDisplay.textContent = usernameDisplay.textContent.replace(/.$/, visible ? "▼" : "▲");
});

document.addEventListener("click", (e) => {
  if (!usernameDisplay.contains(e.target) && !userMenu.contains(e.target)) {
    userMenu.style.display = "none";
    if (!usernameDisplay.textContent.endsWith("▼")) {
      usernameDisplay.textContent = usernameDisplay.textContent.replace(/.$/, "▼");
    }
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "index.html";
  } catch (err) {
    console.error("Logout failed:", err);
  }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    usernameDisplay.textContent = "Guest ▼";
    return;
  }

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));

    if (!userDoc.exists()) {
      usernameDisplay.textContent = "User ▼";
      return;
    }

    const userData = userDoc.data();
    const username = userData.username || "Player";
    const highscore = userData.highscore || 0;
    const plays = userData.timesPlayed || 0;
    const avg = userData.averageScore || 0;

    usernameDisplay.textContent = `${username} ▼`;
    highScoreEl.textContent = highscore;
    timesPlayedEl.textContent = plays;
    averageScoreEl.textContent = avg;

  } catch (err) {
    console.error("Error fetching user stats:", err);
  }

  // Load leaderboard from all users
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    const leaderboard = [];

    usersSnap.forEach(doc => {
      const data = doc.data();
      if (data.username && typeof data.highscore === "number") {
        leaderboard.push({ username: data.username, highscore: data.highscore });
      }
    });

    leaderboard.sort((a, b) => b.highscore - a.highscore);

    leaderboardBody.innerHTML = "";
    leaderboard.slice(0, 10).forEach((entry, i) => {
      leaderboardBody.innerHTML += `
        <tr>
          <td>#${i + 1}</td>
          <td>${entry.username}</td>
          <td>${entry.highscore}</td>
        </tr>
      `;
    });

  } catch (err) {
    console.error("Failed to load leaderboard:", err);
    leaderboardBody.innerHTML = "<tr><td colspan='3'>Error loading leaderboard</td></tr>";
  }
});
