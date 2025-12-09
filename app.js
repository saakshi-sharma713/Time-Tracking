// ===== IMPORTS =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ===== FIREBASE CONFIG =====
const firebaseConfig = {
  apiKey: "AIzaSyC5uK-FDQRgwbu8yCEdlW_LungZBAv9sc0",
  authDomain: "time-tracking-53af4.firebaseapp.com",
  projectId: "time-tracking-53af4",
  storageBucket: "time-tracking-53af4.firebasestorage.app",
  messagingSenderId: "472688493018",
  appId: "1:472688493018:web:73585730b39a797bcac0e3",
  measurementId: "G-RD4ZDRZPHX"
};

// ===== INITIALIZE FIREBASE =====
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const GoogleProvider = new GoogleAuthProvider();

// ===== GLOBAL =====
window.auth = auth;
window.db = db;
window.GoogleProvider = GoogleProvider;

// ===== STATE =====
const state = {
  user: null,
  currentDate: new Date().toISOString().split("T")[0],
  activities: [],
};

// ===== PAGE MANAGEMENT =====
function showPage(pageId){
  document.querySelectorAll(".page").forEach(p => p.style.display="none");
  document.getElementById(pageId).style.display = "block";
}
window.showPage = showPage;

// ===== AUTH STATE =====
onAuthStateChanged(auth, async (user) => {
  state.user = user;
  if(user){
    document.getElementById("user-info").textContent = user.email;
    showPage("dashboard-page");
    await loadActivities();
  } else {
    showPage("auth-page");
  }
});

// ===== AUTH FUNCTIONS =====
window.signUp = async function(){
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;
  const confirm = document.getElementById("signup-confirm-password").value;
  const errorEl = document.getElementById("signup-error");

  if(!email || !password || !confirm){
    errorEl.textContent = "Fill all fields";
    return;
  }
  if(password !== confirm){
    errorEl.textContent = "Passwords do not match";
    return;
  }

  try{
    await createUserWithEmailAndPassword(auth,email,password);
    errorEl.textContent = "";
  } catch(err){
    errorEl.textContent = err.message;
  }
};

window.signIn = async function(){
  const email = document.getElementById("signin-email").value;
  const password = document.getElementById("signin-password").value;
  const errorEl = document.getElementById("signin-error");

  if(!email || !password){
    errorEl.textContent = "Fill all fields";
    return;
  }

  try{
    await signInWithEmailAndPassword(auth,email,password);
    errorEl.textContent = "";
  } catch(err){
    errorEl.textContent = err.message;
  }
};

window.signOut = async function(){
  try{
    await signOut(auth);
  } catch(err){
    console.error(err);
  }
};

window.signInWithGoogle = async function(){
  try{
    await signInWithPopup(auth,GoogleProvider);
  } catch(err){
    console.error(err.code, err.message);
  }
};

// ===== ACTIVITIES CRUD =====
window.addActivity = async function(){
  const name = document.getElementById("activity-name").value;
  const category = document.getElementById("activity-category").value;
  const minutes = parseInt(document.getElementById("activity-minutes").value);

  if(!name || !category || !minutes || minutes <= 0){
    alert("Fill all fields with valid values");
    return;
  }

  const activitiesRef = collection(db, "users", state.user.uid, "days", state.currentDate, "activities");
  await addDoc(activitiesRef, { name, category, minutes, createdAt: new Date() });

  document.getElementById("activity-name").value="";
  document.getElementById("activity-minutes").value="";
  await loadActivities();
};

window.deleteActivity = async function(id){
  const docRef = doc(db,"users",state.user.uid,"days",state.currentDate,"activities",id);
  await deleteDoc(docRef);
  await loadActivities();
};

// ===== LOAD ACTIVITIES =====
async function loadActivities(){
  const activitiesRef = collection(db,"users",state.user.uid,"days",state.currentDate,"activities");
  const snapshot = await getDocs(activitiesRef);

  state.activities = snapshot.docs.map(d=>({id:d.id,...d.data()}));
  renderActivities();
  updateStats();
}

// ===== RENDER DASHBOARD =====
function renderActivities(){
  const container = document.getElementById("activities-list");
  container.innerHTML = "";

  if(state.activities.length === 0){
    container.innerHTML="<p>No activities yet</p>";
    return;
  }

  state.activities.forEach(act=>{
    const div = document.createElement("div");
    div.className="activity-item";
    div.innerHTML=`
      <div>${act.name} • ${act.category} • ${act.minutes} min</div>
      <button onclick="deleteActivity('${act.id}')">Delete</button>
    `;
    container.appendChild(div);
  });
}

function updateStats(){
  const total = state.activities.reduce((a,b)=>a+b.minutes,0);
  document.getElementById("total-minutes").textContent=total;
  document.getElementById("remaining-minutes").textContent=1440-total;
  document.getElementById("activities-count").textContent=state.activities.length;
}

// ===== MODALS =====
window.openModal = function(id){ document.getElementById(id).style.display="flex"; };
window.closeModal = function(id){ document.getElementById(id).style.display="none"; };

// ===== DATE CHANGE =====
document.getElementById("current-date")?.addEventListener("change", async (e)=>{
  state.currentDate=e.target.value;
  await loadActivities();
});

// ===== ANALYTICS =====
async function loadAnalytics(date){
  if(!state.user) return;

  const selectedDate = date || state.currentDate;
  const activitiesRef = collection(db,"users",state.user.uid,"days",selectedDate,"activities");
  const snapshot = await getDocs(activitiesRef);
  const activities = snapshot.docs.map(d=>({id:d.id,...d.data()}));

  const container = document.getElementById("analytics-content");
  container.innerHTML = "";

  if(activities.length === 0){
    container.innerHTML = "<p>No activities for this date</p>";
    return;
  }

  const table = document.createElement("table");
  table.innerHTML = `
    <tr>
      <th>Name</th>
      <th>Category</th>
      <th>Minutes</th>
    </tr>
  `;
  activities.forEach(act=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${act.name}</td><td>${act.category}</td><td>${act.minutes}</td>`;
    table.appendChild(tr);
  });
  container.appendChild(table);
}

document.getElementById("analytics-date")?.addEventListener("change", async (e)=>{
  await loadAnalytics(e.target.value);
});

window.showAnalytics = async function(){
  showPage("analytics-page");
  document.getElementById("analytics-date").value = state.currentDate;
  await loadAnalytics();
};

// ===== INIT =====
document.addEventListener("DOMContentLoaded", ()=>{
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("current-date").value=today;
});





let analyticsChart = null;

async function showAnalytics() {
  if (!state.user) return;

  showPage("analytics-page");

  const dateEl = document.getElementById("analytics-date");
  const date = dateEl.value || new Date().toISOString().split("T")[0];
  dateEl.value = date;

  // Fetch activities
  const activitiesRef = collection(db, "users", state.user.uid, "days", date, "activities");
  const snapshot = await getDocs(activitiesRef);
  const activities = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

  // ---------- TABLE ----------
  const tbody = document.getElementById("analytics-table-body");
  tbody.innerHTML = "";

  if (activities.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-secondary)">No activities for this date</td></tr>`;
    
    // Destroy chart if exists
    if (analyticsChart) analyticsChart.destroy();
    return;
  }

  activities.forEach(a => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="padding:8px;">${a.name}</td>
      <td style="padding:8px;">${a.category}</td>
      <td style="padding:8px;">${a.minutes}</td>
    `;
    tbody.appendChild(tr);
  });

  // ---------- CHART ----------
  const categoryTotals = {};
  activities.forEach(a => {
    if (!categoryTotals[a.category]) categoryTotals[a.category] = 0;
    categoryTotals[a.category] += a.minutes;
  });

  const ctx = document.getElementById("analytics-chart").getContext("2d");

  if (analyticsChart) analyticsChart.destroy();

  analyticsChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: Object.keys(categoryTotals),
      datasets: [{
        label: 'Minutes per Category',
        data: Object.values(categoryTotals),
        backgroundColor: ['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444'],
        borderColor: '#1e293b',
        borderWidth: 2
      }]
    },
    options: {
      responsive: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: 'white', font: { size: 12 } }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.label + ": " + context.raw + " min";
            }
          }
        }
      }
    }
  });
}

// Update chart + table on date change
document.getElementById("analytics-date").addEventListener("change", showAnalytics);
