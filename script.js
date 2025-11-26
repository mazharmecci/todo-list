cassette printer
Coverslipper
Cryo console
Cryoplate
Cryostat
Cytocentrifuge
Diamond bone band saw
Dispensing console
Farmadose
Formalin tank
Gross imaging camera
Grossing station



// 🔹 Firebase Setup

const firebaseConfig = {
  apiKey: "AIzaSyA7gVA0edDxcs3x0P_IqozAAVNnUMXacVU",
  authDomain: "istos-todo-sync.firebaseapp.com",
  projectId: "istos-todo-sync",
  storageBucket: "istos-todo-sync.firebasestorage.app",
  messagingSenderId: "538717309457",
  appId: "1:538717309457:web:95bd368388f6feea04bfb0"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let currentUserId = null;

// 🔹 Firebase Auth
function handleLogin() {
  const email = document.getElementById("emailInput").value;
  const password = document.getElementById("passwordInput").value;

  firebase.auth().signInWithEmailAndPassword(email, password)
    .then(userCredential => {
      currentUserId = userCredential.user.uid;
      initUserSession();
    })
    .catch(error => {
      alert("Login failed: " + error.message);
    });
}

function handleLogout() {
  firebase.auth().signOut().then(() => {
    currentUserId = null;
    document.getElementById("taskForm").style.display = "none";
    document.getElementById("loginSection").style.display = "block";
    document.getElementById("todoGrid").innerHTML = "";
  });
}

function initUserSession() {
  document.getElementById("loginSection").style.display = "none";
  document.getElementById("taskForm").style.display = "block";

  const grid = document.getElementById("todoGrid");
  grid.innerHTML = "";
  categories.forEach(cat => grid.appendChild(createTodoBox(cat)));

  loadTasks(currentUserId);
  document.getElementById("taskForm").onsubmit = e => handleSubmit(e);
}

// 🔹 Categories
const categories = [
  { id: "leads", title: "🎯 Leads", color: "#FCE4EC" },
  { id: "office", title: "🏢 Office", color: "#FFFDE7" },
  { id: "order", title: "🚚 Orders", color: "#E3F2FD" },
  { id: "personal", title: "🔔 Personal", color: "#FFEBEE" },
  { id: "paydo", title: "💰 Do-Payments", color: "#E1F5FE" },
  { id: "get", title: "💵 Get-Payments", color: "#E8F5E9" },
  { id: "tobeorder", title: "🧾 To be ordered", color: "#F3E5F5" },
  { id: "service", title: "🛠️ Service", color: "#FFF3E0" }
];

// 🔹 Firestore Sync
async function loadTasks(userId) {
  const doc = await db.collection("todos").doc(userId).get();
  const tasks = doc.exists ? doc.data().tasks || [] : [];

  // Clear all boxes before rendering
  categories.forEach(cat => {
    const container = document.querySelector(`#${cat.id}Box .tasks`);
    if (container) container.innerHTML = "";
  });

  tasks.forEach(({ text, category }) => {
    const container = document.querySelector(`#${category}Box .tasks`);
    if (container) container.appendChild(createTaskElement(text, category));
    addTaskToCardStack(text, category);
  });
}


async function saveTaskToCloud(text, category) {
  const task = { text, category };
  await db.collection("todos").doc(currentUserId).set(
    { tasks: firebase.firestore.FieldValue.arrayUnion(task) },
    { merge: true }
  );
}

async function deleteTaskFromCloud(text, category) {
  const doc = await db.collection("todos").doc(currentUserId).get();
  const currentTasks = doc.exists ? doc.data().tasks || [] : [];
  const updated = currentTasks.filter(task => !(task.text === text && task.category === category));
  await db.collection("todos").doc(currentUserId).set({ tasks: updated });
}

// 🔹 UI Builders
function createTodoBox({ id, title, color }) {
  const box = document.createElement("div");
  box.className = "todo-box";
  box.id = `${id}Box`;
  box.style.background = `linear-gradient(135deg, ${color}, #ffffff)`;

  const boxTitle = document.createElement("div");
  boxTitle.className = "box-title";
  boxTitle.textContent = title;

  const tasks = document.createElement("div");
  tasks.className = "tasks";

  box.appendChild(boxTitle);
  box.appendChild(tasks);
  return box;
}

function createTaskElement(text, category) {
  const taskDiv = document.createElement("div");
  taskDiv.className = "task-item";

  const taskContent = document.createElement("span");
  taskContent.textContent = text;

  const removeBtn = document.createElement("span");
  removeBtn.textContent = "✕";
  removeBtn.className = "remove-btn";
  removeBtn.title = "Remove task";
  removeBtn.style.cursor = "pointer";
  removeBtn.style.marginLeft = "12px";
  removeBtn.onclick = async () => {
    taskDiv.remove();
    await deleteTaskFromCloud(text, category);
  };

  taskDiv.appendChild(taskContent);
  taskDiv.appendChild(removeBtn);
  return taskDiv;
}

// 🔹 Task Creation
function handleSubmit(event) {
  event.preventDefault();
  addTask();
}

async function addTasks() {
  const rawInput = document.getElementById("taskInput").value.trim();
  if (!rawInput) return;

  let assignedBox = null;
  categories.forEach(cat => {
    const checkbox = document.getElementById(`${cat.id}Checkbox`);
    if (checkbox?.checked) assignedBox = cat.id;
  });

  if (!assignedBox) {
    alert("Please select a category before adding tasks.");
    return;
  }

  const taskLines = rawInput.split(/\r?\n/).map(line => line.trim()).filter(line => line);

  for (const taskText of taskLines) {
    const container = document.querySelector(`#${assignedBox}Box .tasks`);
    if (container) container.appendChild(createTaskElement(taskText, assignedBox));
    addTaskToCardStack(taskText, assignedBox);
    await saveTaskToCloud(taskText, assignedBox);
  }

  document.getElementById("taskInput").value = "";
  categories.forEach(cat => {
    const checkbox = document.getElementById(`${cat.id}Checkbox`);
    if (checkbox) checkbox.checked = false;
  });
}

// 🔹 Card Stack Logic
function addTaskToCardStack(taskText, category) {
  const cards = document.querySelectorAll('#cardStack .card');
  for (let card of cards) {
    if (card.dataset.category === category) {
      const taskItem = document.createElement("div");
      taskItem.className = "task-item";

      const closeBtn = document.createElement("span");
      closeBtn.textContent = "❌";
      closeBtn.className = "close-btn";
      closeBtn.onclick = async () => {
        taskItem.remove();
        await deleteTaskFromCloud(taskText, category);
      };

      taskItem.textContent = taskText;
      taskItem.appendChild(closeBtn);
      card.appendChild(taskItem);
      break;
    }
  }
}

// 🔹 Task Count Table
function updateTaskCount() {
  const tbody = document.getElementById('taskCountBody');
  if (!tbody) return;

  tbody.innerHTML = '';
  categories.forEach(cat => {
    const box = document.getElementById(`${cat.id}Box`);
    const taskCount = box ? box.querySelectorAll('.task-item').length : 0;

    const row = document.createElement('tr');
    row.innerHTML = `<td>${cat.title}</td><td>${taskCount}</td>`;
    tbody.appendChild(row);
  });
}
setInterval(updateTaskCount, 1000);

// 🔹 Auth Listener
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    currentUserId = user.uid;
    initUserSession();
  } else {
    document.getElementById("taskForm").style.display = "none";
    document.getElementById("loginSection").style.display = "block";
  }
});
