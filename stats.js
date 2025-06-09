// === Import Firebase core app and Firestore ===
import {
  initializeApp,
  getApp,
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

// === Import Firebase Authentication ===
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";

// === Firebase project configuration ===
const firebaseConfig = {
  apiKey: "AIzaSyDJJ8FL79BXg4qA1Xev0eD3Qqj_q87lN-o",
  authDomain: "wacky-wings.firebaseapp.com",
  projectId: "wacky-wings",
  storageBucket: "wacky-wings.firebasestorage.app",
  messagingSenderId: "86787566584",
  appId: "1:86787566584:web:a4e421c1259763d061c48d",
  measurementId: "G-WYSDC4Q441",
};

// === Initialize Firebase services ===
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// === Optional: verify you’re pointing at the right project ===
// console.log(getApp().options);

// === DOM Elements ===
const usernameDisplay = document.getElementById("usernameDisplay");
const userMenu = document.getElementById("userMenu");
const logoutBtn = document.getElementById("logoutBtn");
const highScoreEl = document.getElementById("highScore");
const timesPlayedEl = document.getElementById("timesPlayed");
const averageScoreEl = document.getElementById("averageScore");
const leaderboardBody = document.getElementById("leaderboardBody");

// === Handle dropdown toggle on username click ===
usernameDisplay.addEventListener("click", () => {
  const visible = userMenu.style.display === "block";
  userMenu.style.display = visible ? "none" : "block";
  usernameDisplay.textContent = usernameDisplay.textContent.replace(
    /.$/,
    visible ? "▼" : "▲"
  );
});

// === Close dropdown when clicking outside of it ===
document.addEventListener("click", (e) => {
  if (!usernameDisplay.contains(e.target) && !userMenu.contains(e.target)) {
    userMenu.style.display = "none";
    if (!usernameDisplay.textContent.endsWith("▼")) {
      usernameDisplay.textContent = usernameDisplay.textContent.replace(
        /.$/,
        "▼"
      );
    }
  }
});

// === Logout logic ===
logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "index.html";
  } catch (err) {
    console.error("Logout failed:", err);
  }
});

// === When user logs in or out, update UI ===
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    usernameDisplay.textContent = "Guest ▼";
    return;
  }

  try {
    // Fetch logged-in user's stats
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) {
      usernameDisplay.textContent = "Player ▼";
    } else {
      const data = userDoc.data();
      usernameDisplay.textContent = `${data.username || "Player"} ▼`;
      highScoreEl.textContent = data.highscore || 0;
      timesPlayedEl.textContent = data.timesPlayed || 0;
      averageScoreEl.textContent = data.averageScore || 0;
    }
  } catch (err) {
    console.error("Error fetching user stats:", err);
  }

  // === Fetch and display global leaderboard ===
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    const leaderboard = [];
    usersSnap.forEach((doc) => {
      const d = doc.data();
      if (d.username && typeof d.highscore === "number") {
        leaderboard.push({ username: d.username, highscore: d.highscore });
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
    console.error("Firestore Error Object:", err);
    console.error("Error Details:", {
      code: err.code,
      message: err.message,
      path: err.internalPath, // may be under a different property
    });
    leaderboardBody.innerHTML =
      "<tr><td colspan='3'>Error loading leaderboard</td></tr>";
  }
});
