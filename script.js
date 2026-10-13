const TASKS_KEY = 'kanbanLite.tasks';
const THEME_KEY = 'kanbanLite.theme';

// The three board stages, in display order.
const STATUSES = [
  { id: 'todo', label: 'To Do' },
  { id: 'progress', label: 'In Progress' },
  { id: 'done', label: 'Completed' }
];

let tasks = loadTasks();

const filters = { search: '', category: 'all' };

/* ---------- My DOM references ---------- */

const form = document.getElementById('taskForm');
const titleInput = document.getElementById('titleInput');
const titleError = document.getElementById('titleError');
const descInput = document.getElementById('descInput');
const categoryInput = document.getElementById('categoryInput');
const priorityInput = document.getElementById('priorityInput');
const searchInput = document.getElementById('searchInput');
const filterCategory = document.getElementById('filterCategory');
const taskCounter = document.getElementById('taskCounter');
const themeToggle = document.getElementById('themeToggle');
const themeLabel = document.getElementById('themeLabel');

/* ---------- 2. Storage helpers ---------- */

function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(TASKS_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

function addTask({ title, description, category, priority }) {
  tasks.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), // unique id
    title,
    description,
    category,
    priority,
    status: 'todo',
    createdAt: Date.now()
  });
  saveTasks();
  render();
}

function moveTask(id, newStatus) {
  const task = tasks.find((t) => t.id === id);
  if (!task || task.status === newStatus) return;
  task.status = newStatus;
  saveTasks();
  render();
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  render();
}

/* ---------- Rendering ---------- */

function matchesFilters(task) {
  const matchesSearch = task.title.toLowerCase().includes(filters.search.toLowerCase());
  const matchesCategory = filters.category === 'all' || task.category === filters.category;
  return matchesSearch && matchesCategory;
}

function createCard(task) {
  const card = document.createElement('li');
  card.className = 'card';
  card.draggable = true;
  card.dataset.id = task.id;
  card.dataset.priority = task.priority;
  card.dataset.status = task.status;

  const title = document.createElement('h3');
  title.className = 'card__title';
  title.textContent = task.title;
  card.appendChild(title);

  if (task.description) {
    const desc = document.createElement('p');
    desc.className = 'card__desc';
    desc.textContent = task.description;
    card.appendChild(desc);
  }

  const tags = document.createElement('div');
  tags.className = 'card__tags';

  const priorityTag = document.createElement('span');
  priorityTag.className = 'tag tag--priority';
  priorityTag.dataset.priority = task.priority;
  priorityTag.textContent = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);

  const categoryTag = document.createElement('span');
  categoryTag.className = 'tag';
  categoryTag.textContent = task.category;

  tags.append(priorityTag, categoryTag);
  card.appendChild(tags);

  const actions = document.createElement('div');
  actions.className = 'card__actions';

  const moveSelect = document.createElement('select');
  moveSelect.className = 'card__move';
  moveSelect.setAttribute('aria-label', `Move "${task.title}" to another column`);
  STATUSES.forEach((s) => {
    const option = document.createElement('option');
    option.value = s.id;
    option.textContent = s.label;
    option.selected = s.id === task.status;
    moveSelect.appendChild(option);
  });
  moveSelect.addEventListener('change', () => moveTask(task.id, moveSelect.value));

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'card__delete';
  deleteButton.textContent = 'Delete';
  deleteButton.setAttribute('aria-label', `Delete "${task.title}"`);
  deleteButton.addEventListener('click', () => {
    if (confirm(`Delete "${task.title}"?`)) deleteTask(task.id);
  });

  actions.append(moveSelect, deleteButton);
  card.appendChild(actions);

  // Drag events (see section 5)
  card.addEventListener('dragstart', (event) => {
    event.dataTransfer.setData('text/plain', task.id);
    event.dataTransfer.effectAllowed = 'move';
    card.classList.add('is-dragging');
  });
  card.addEventListener('dragend', () => card.classList.remove('is-dragging'));

  return card;
}

function render() {
  STATUSES.forEach((status) => {
    const list = document.getElementById(`list-${status.id}`);
    list.innerHTML = '';

    const visible = tasks.filter((t) => t.status === status.id && matchesFilters(t));
    visible.forEach((task) => list.appendChild(createCard(task)));

    // Friendly message when a column has nothing to show
    if (visible.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'empty';
      empty.textContent = tasks.some((t) => t.status === status.id)
        ? 'No tasks match your filters.'
        : 'Nothing here yet.';
      list.appendChild(empty);
    }

    document.querySelector(`[data-count="${status.id}"]`).textContent = visible.length;
  });

  updateCounter();
}

function updateCounter() {
  const completed = tasks.filter((t) => t.status === 'done').length;
  const active = tasks.length - completed;
  taskCounter.textContent = `${active} active · ${completed} completed`;
}

/* ---------- Drag and drop (native HTML5 API) ---------- */

document.querySelectorAll('.column').forEach((column) => {
  column.addEventListener('dragover', (event) => {
    event.preventDefault();
    column.classList.add('is-drop-target');
  });
  column.addEventListener('dragleave', (event) => {
    if (!column.contains(event.relatedTarget)) column.classList.remove('is-drop-target');
  });
  column.addEventListener('drop', (event) => {
    event.preventDefault();
    column.classList.remove('is-drop-target');
    const id = event.dataTransfer.getData('text/plain');
    moveTask(id, column.dataset.status);
  });
});

/* ---------- Dark mode ---------- */

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
  themeLabel.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
}

themeToggle.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});


form.addEventListener('submit', (event) => {
  event.preventDefault();
  const title = titleInput.value.trim();

  if (!title) {
    titleError.hidden = false;
    titleInput.classList.add('is-invalid');
    titleInput.focus();
    return;
  }
  titleError.hidden = true;
  titleInput.classList.remove('is-invalid');

  addTask({
    title,
    description: descInput.value.trim(),
    category: categoryInput.value,
    priority: priorityInput.value
  });

  form.reset();
  priorityInput.value = 'medium';
  titleInput.focus();
});

searchInput.addEventListener('input', () => {
  filters.search = searchInput.value;
  render();
});
filterCategory.addEventListener('change', () => {
  filters.category = filterCategory.value;
  render();
});

applyTheme(document.documentElement.dataset.theme);
render();
