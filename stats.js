// === Import Firebase core app and Firestore ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

// === Import Firebase Authentication ===
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";

// === Firebase project configuration ===
const firebaseConfig = {
  apiKey: "AIzaSyDJJ8FL79BXg4qA1XevOeD3Qqj_q87lN-o",
  authDomain: "wacky-wings.firebaseapp.com",
  projectId: "wacky-wings",
  storageBucket: "wacky-wings.appspot.com",
  messagingSenderId: "86787566584",
  appId: "1:86787566584:web:a4e421c1259763d061c40d"
};

// === Initialize Firebase services ===
const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // Firestore for database
const auth = getAuth(app);    // Firebase Auth

// === DOM Elements ===
const usernameDisplay = document.getElementById("usernameDisplay"); // Display username in navbar
const userMenu = document.getElementById("userMenu");               // Dropdown menu
const logoutBtn = document.getElementById("logoutBtn");             // Logout button
const highScoreEl = document.getElementById("highScore");           // High score value
const timesPlayedEl = document.getElementById("timesPlayed");       // Games played value
const averageScoreEl = document.getElementById("averageScore");     // Average score value
const leaderboardBody = document.getElementById("leaderboardBody"); // Leaderboard table body

// === Handle dropdown toggle on username click ===
usernameDisplay.addEventListener("click", () => {
  const visible = userMenu.style.display === "block";
  userMenu.style.display = visible ? "none" : "block";
  usernameDisplay.textContent = usernameDisplay.textContent.replace(/.$/, visible ? "▼" : "▲");
});

// === Close dropdown when clicking outside of it ===
document.addEventListener("click", (e) => {
  if (!usernameDisplay.contains(e.target) && !userMenu.contains(e.target)) {
    userMenu.style.display = "none";
    if (!usernameDisplay.textContent.endsWith("▼")) {
      usernameDisplay.textContent = usernameDisplay.textContent.replace(/.$/, "▼");
    }
  }
});

// === Logout logic ===
logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth); // Sign out current user
    window.location.href = "index.html"; // Redirect to login/home page
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
      usernameDisplay.textContent = "User ▼";
      return;
    }

    const userData = userDoc.data();
    const username = userData.username || "Player";
    const highscore = userData.highscore || 0;
    const plays = userData.timesPlayed || 0;
    const avg = userData.averageScore || 0;

    // Display user stats in the DOM
    usernameDisplay.textContent = `${username} ▼`;
    highScoreEl.textContent = highscore;
    timesPlayedEl.textContent = plays;
    averageScoreEl.textContent = avg;

  } catch (err) {
    console.error("Error fetching user stats:", err);
  }

  // === Fetch and display global leaderboard ===
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    const leaderboard = [];

    // Extract each user's data into leaderboard array
    usersSnap.forEach(doc => {
      const data = doc.data();
      if (data.username && typeof data.highscore === "number") {
        leaderboard.push({ username: data.username, highscore: data.highscore });
      }
    });

    // Sort leaderboard by score in descending order
    leaderboard.sort((a, b) => b.highscore - a.highscore);

    // Clear current leaderboard and populate top 10
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
