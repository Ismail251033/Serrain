/* =============================================
   SERENE — Premium Todo App
   JavaScript: Full Application Logic
   ============================================= */

'use strict';

// =============================================
// STORAGE MANAGER
// =============================================
const StorageManager = {
  TASKS_KEY: 'serene_tasks',
  THEME_KEY: 'serene_theme',

  getTasks() {
    try {
      const raw = localStorage.getItem(this.TASKS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  },

  saveTasks(tasks) {
    try { localStorage.setItem(this.TASKS_KEY, JSON.stringify(tasks)); } catch {}
  },

  getTheme() {
    return localStorage.getItem(this.THEME_KEY) || 'light';
  },

  saveTheme(theme) {
    localStorage.setItem(this.THEME_KEY, theme);
  }
};

// =============================================
// TASK MANAGER
// =============================================
const TaskManager = {
  tasks: [],

  init() {
    this.tasks = StorageManager.getTasks();
  },

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  addTask({ title, description = '', priority = 'low' }) {
    const task = {
      id: this.generateId(),
      title: title.trim(),
      description: description.trim(),
      priority,
      completed: false,
      createdAt: new Date().toISOString(),
      order: this.tasks.length
    };
    this.tasks.unshift(task);
    // Fix order values
    this.tasks.forEach((t, i) => t.order = i);
    StorageManager.saveTasks(this.tasks);
    return task;
  },

  updateTask(id, updates) {
    const idx = this.tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;
    Object.assign(this.tasks[idx], updates);
    StorageManager.saveTasks(this.tasks);
    return this.tasks[idx];
  },

  deleteTask(id) {
    const idx = this.tasks.findIndex(t => t.id === id);
    if (idx === -1) return false;
    this.tasks.splice(idx, 1);
    StorageManager.saveTasks(this.tasks);
    return true;
  },

  toggleComplete(id) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return null;
    task.completed = !task.completed;
    StorageManager.saveTasks(this.tasks);
    return task;
  },

  reorder(fromId, toId) {
    const fromIdx = this.tasks.findIndex(t => t.id === fromId);
    const toIdx = this.tasks.findIndex(t => t.id === toId);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
    const [moved] = this.tasks.splice(fromIdx, 1);
    this.tasks.splice(toIdx, 0, moved);
    this.tasks.forEach((t, i) => t.order = i);
    StorageManager.saveTasks(this.tasks);
  },

  getFiltered(view, query = '') {
    let tasks = [...this.tasks];
    const today = new Date().toDateString();

    switch (view) {
      case 'today':
        tasks = tasks.filter(t => !t.completed && new Date(t.createdAt).toDateString() === today);
        break;
      case 'important':
        tasks = tasks.filter(t => !t.completed && t.priority === 'high');
        break;
      case 'completed':
        tasks = tasks.filter(t => t.completed);
        break;
      default: // 'all'
        tasks = tasks.filter(t => !t.completed);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      tasks = tasks.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    }

    return tasks;
  },

  getCounts() {
    const today = new Date().toDateString();
    return {
      all: this.tasks.filter(t => !t.completed).length,
      today: this.tasks.filter(t => !t.completed && new Date(t.createdAt).toDateString() === today).length,
      important: this.tasks.filter(t => !t.completed && t.priority === 'high').length,
      completed: this.tasks.filter(t => t.completed).length
    };
  }
};

// =============================================
// THEME MANAGER
// =============================================
const ThemeManager = {
  current: 'light',

  init() {
    this.current = StorageManager.getTheme();
    document.documentElement.setAttribute('data-theme', this.current);
    this.updateToggle();
  },

  toggle() {
    document.body.classList.add('theme-transitioning');
    this.current = this.current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', this.current);
    StorageManager.saveTheme(this.current);
    this.updateToggle();
    setTimeout(() => document.body.classList.remove('theme-transitioning'), 400);
    ToastManager.show(this.current === 'dark' ? '🌙 Dark mode' : '☀️ Light mode');
  },

  updateToggle() {
    const label = document.getElementById('themeLabel');
    if (label) label.textContent = this.current === 'dark' ? 'Dark Mode' : 'Light Mode';
  }
};

// =============================================
// TOAST MANAGER
// =============================================
const ToastManager = {
  container: null,
  queue: [],

  init() {
    this.container = document.getElementById('toastContainer');
  },

  show(message, duration = 2600) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    this.container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 280);
    }, duration);
  }
};

// =============================================
// DRAG & DROP MANAGER
// =============================================
const DragManager = {
  draggedId: null,
  placeholder: null,

  init() {
    // Delegated via UIManager
  },

  startDrag(taskId, taskEl) {
    this.draggedId = taskId;
    taskEl.classList.add('dragging');

    this.placeholder = document.createElement('li');
    this.placeholder.className = 'task-placeholder';
    taskEl.after(this.placeholder);
  },

  endDrag(taskEl) {
    taskEl.classList.remove('dragging');
    if (this.placeholder) { this.placeholder.remove(); this.placeholder = null; }
    this.draggedId = null;
  },

  handleDragOver(targetEl) {
    if (!this.draggedId || !targetEl.dataset.taskId || targetEl.dataset.taskId === this.draggedId) return;
    const list = document.getElementById('taskList');
    const items = [...list.querySelectorAll('.task-item:not(.dragging)')];
    const targetIdx = items.indexOf(targetEl);
    if (this.placeholder && targetEl !== this.placeholder) {
      targetEl.before(this.placeholder);
    }
    targetEl.classList.add('drag-over');
    setTimeout(() => targetEl.classList.remove('drag-over'), 200);
  },

  drop(targetEl) {
    if (!this.draggedId || !targetEl.dataset.taskId) return;
    if (targetEl.dataset.taskId !== this.draggedId) {
      TaskManager.reorder(this.draggedId, targetEl.dataset.taskId);
    }
  }
};

// =============================================
// UI MANAGER
// =============================================
const UIManager = {
  currentView: 'all',
  searchQuery: '',
  addFormOpen: false,
  selectedPriority: 'low',
  editingTaskId: null,
  editingPriority: 'low',

  // DOM refs
  el: {},

  init() {
    this.cacheElements();
    this.setDate();
    this.bindEvents();
    this.render();
  },

  cacheElements() {
    const ids = [
      'taskList', 'emptyState', 'emptyTitle', 'emptyText',
      'viewTitle', 'viewSubtitle',
      'searchInput', 'searchClear',
      'addTaskInput', 'addTaskDesc', 'addTaskMeta',
      'addTaskForm', 'addTaskWrap',
      'cancelAddTask', 'confirmAddTask',
      'prioritySelector',
      'fab',
      'countAll', 'countToday', 'countImportant', 'countCompleted',
      'themeToggle',
      'modalBackdrop', 'modal', 'modalClose', 'modalCancel', 'modalSave',
      'editTaskTitle', 'editTaskDesc', 'editPrioritySelector',
      'mobileMenuBtn', 'sidebar', 'sidebarOverlay',
      'topbarDate'
    ];
    ids.forEach(id => {
      this.el[id] = document.getElementById(id);
    });
    // Also cache add task meta
    this.el.addTaskMeta = this.el.addTaskForm.querySelector('.add-task-meta');
  },

  setDate() {
    const now = new Date();
    const opts = { weekday: 'long', month: 'long', day: 'numeric' };
    const el = this.el.topbarDate || document.getElementById('topbarDate');
    if (el) el.textContent = now.toLocaleDateString('en-US', opts);
  },

  bindEvents() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentView = btn.dataset.view;
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.render();
        // Close mobile sidebar
        if (window.innerWidth <= 768) this.closeSidebar();
      });
    });

    // Search
    this.el.searchInput.addEventListener('input', e => {
      this.searchQuery = e.target.value;
      this.el.searchClear.classList.toggle('hidden', !this.searchQuery);
      this.renderTaskList();
    });
    this.el.searchClear.addEventListener('click', () => {
      this.searchQuery = '';
      this.el.searchInput.value = '';
      this.el.searchClear.classList.add('hidden');
      this.renderTaskList();
      this.el.searchInput.focus();
    });

    // Add task — open form on input focus
    this.el.addTaskInput.addEventListener('focus', () => this.openAddForm());
    this.el.addTaskInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); this.handleAddTask(); }
      if (e.key === 'Escape') this.closeAddForm();
    });

    // FAB
    this.el.fab.addEventListener('click', () => {
      this.openAddForm();
      this.el.addTaskInput.focus();
      this.el.addTaskInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    // Cancel / Confirm
    this.el.cancelAddTask.addEventListener('click', () => this.closeAddForm());
    this.el.confirmAddTask.addEventListener('click', () => this.handleAddTask());

    // Priority selector (add form)
    this.el.prioritySelector.querySelectorAll('.priority-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedPriority = btn.dataset.priority;
        this.el.prioritySelector.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Theme toggle
    this.el.themeToggle.addEventListener('click', () => ThemeManager.toggle());

    // Mobile menu
    this.el.mobileMenuBtn.addEventListener('click', () => this.toggleSidebar());
    this.el.sidebarOverlay.addEventListener('click', () => this.closeSidebar());

    // Modal events
    this.el.modalClose.addEventListener('click', () => this.closeModal());
    this.el.modalCancel.addEventListener('click', () => this.closeModal());
    this.el.modalSave.addEventListener('click', () => this.handleSaveEdit());
    this.el.modalBackdrop.addEventListener('click', e => {
      if (e.target === this.el.modalBackdrop) this.closeModal();
    });
    this.el.editTaskTitle.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); this.handleSaveEdit(); }
      if (e.key === 'Escape') this.closeModal();
    });

    // Edit priority
    this.el.editPrioritySelector.querySelectorAll('.priority-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.editingPriority = btn.dataset.priority;
        this.el.editPrioritySelector.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Global keyboard shortcuts
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (!this.el.modalBackdrop.classList.contains('hidden')) { this.closeModal(); return; }
        if (this.addFormOpen) this.closeAddForm();
      }
    });

    // Click outside add form to close
    document.addEventListener('click', e => {
      if (this.addFormOpen &&
          !this.el.addTaskWrap.contains(e.target) &&
          !this.el.fab.contains(e.target)) {
        if (!this.el.addTaskInput.value && !this.el.addTaskDesc.value) {
          this.closeAddForm();
        }
      }
    });
  },

  openAddForm() {
    this.addFormOpen = true;
    this.el.addTaskMeta.classList.add('open');
    this.el.addTaskInput.style.borderBottom = '';
  },

  closeAddForm() {
    this.addFormOpen = false;
    this.el.addTaskMeta.classList.remove('open');
    this.el.addTaskInput.value = '';
    this.el.addTaskDesc.value = '';
    this.selectedPriority = 'low';
    this.el.prioritySelector.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('active'));
    this.el.prioritySelector.querySelector('[data-priority="low"]').classList.add('active');
  },

  handleAddTask() {
    const title = this.el.addTaskInput.value.trim();
    if (!title) {
      this.el.addTaskInput.focus();
      this.shakeElement(this.el.addTaskInput);
      return;
    }
    const task = TaskManager.addTask({
      title,
      description: this.el.addTaskDesc.value,
      priority: this.selectedPriority
    });
    this.closeAddForm();
    this.renderTaskList();
    this.updateCounts();
    ToastManager.show('✓ Task added');
  },

  shakeElement(el) {
    el.style.animation = 'none';
    el.style.transition = 'transform 0.1s';
    el.style.transform = 'translateX(6px)';
    setTimeout(() => { el.style.transform = 'translateX(-6px)'; }, 80);
    setTimeout(() => { el.style.transform = 'none'; el.style.transition = ''; }, 160);
  },

  openModal(taskId) {
    const task = TaskManager.tasks.find(t => t.id === taskId);
    if (!task) return;
    this.editingTaskId = taskId;
    this.editingPriority = task.priority;
    this.el.editTaskTitle.value = task.title;
    this.el.editTaskDesc.value = task.description;
    // Set priority buttons
    this.el.editPrioritySelector.querySelectorAll('.priority-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.priority === task.priority);
    });
    this.el.modalBackdrop.classList.remove('hidden');
    setTimeout(() => this.el.editTaskTitle.focus(), 100);
  },

  closeModal() {
    this.el.modalBackdrop.classList.add('hidden');
    this.editingTaskId = null;
  },

  handleSaveEdit() {
    const title = this.el.editTaskTitle.value.trim();
    if (!title) { this.shakeElement(this.el.editTaskTitle); return; }
    TaskManager.updateTask(this.editingTaskId, {
      title,
      description: this.el.editTaskDesc.value.trim(),
      priority: this.editingPriority
    });
    this.closeModal();
    this.renderTaskList();
    this.updateCounts();
    ToastManager.show('✓ Task updated');
  },

  toggleSidebar() {
    this.el.sidebar.classList.toggle('open');
    this.el.sidebarOverlay.classList.toggle('visible');
  },

  closeSidebar() {
    this.el.sidebar.classList.remove('open');
    this.el.sidebarOverlay.classList.remove('visible');
  },

  render() {
    this.renderViewHeader();
    this.renderTaskList();
    this.updateCounts();
  },

  renderViewHeader() {
    const labels = {
      all: { title: 'All Tasks', sub: '' },
      today: { title: 'Today', sub: formatDateNice(new Date()) },
      important: { title: 'Important', sub: 'High priority tasks' },
      completed: { title: 'Completed', sub: 'Well done!' }
    };
    const { title, sub } = labels[this.currentView] || labels.all;
    this.el.viewTitle.textContent = title;
    this.el.viewSubtitle.textContent = sub;

    // Hide add form on completed view
    this.el.addTaskWrap.style.display = this.currentView === 'completed' ? 'none' : '';
  },

  renderTaskList() {
    const tasks = TaskManager.getFiltered(this.currentView, this.searchQuery);
    const list = this.el.taskList;

    // Animate removal of old items
    list.innerHTML = '';

    if (tasks.length === 0) {
      this.el.emptyState.classList.remove('hidden');
      this.setEmptyState();
      return;
    }
    this.el.emptyState.classList.add('hidden');

    tasks.forEach((task, i) => {
      const item = this.createTaskElement(task, i);
      list.appendChild(item);
    });

    this.initDragDrop();
  },

  setEmptyState() {
    const states = {
      all: { title: 'Nothing to do.', text: 'Enjoy the quiet.' },
      today: { title: 'A clear day ahead.', text: 'No tasks for today.' },
      important: { title: 'All calm here.', text: 'No important tasks.' },
      completed: { title: 'Nothing completed yet.', text: 'Finish a task to see it here.' }
    };
    if (this.searchQuery) {
      this.el.emptyTitle.textContent = 'No results found.';
      this.el.emptyText.textContent = `Nothing matches "${this.searchQuery}"`;
      return;
    }
    const s = states[this.currentView] || states.all;
    this.el.emptyTitle.textContent = s.title;
    this.el.emptyText.textContent = s.text;
  },

  createTaskElement(task, index) {
    const li = document.createElement('li');
    li.className = `task-item${task.completed ? ' completed' : ''}`;
    li.dataset.taskId = task.id;
    li.dataset.priority = task.priority;
    li.setAttribute('role', 'listitem');
    li.style.animationDelay = `${index * 30}ms`;

    const checkIcon = task.completed
      ? `<svg viewBox="0 0 20 20" fill="none"><path d="M5 10.5l3.5 3.5L15 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`
      : '';

    const priorityBadge = task.priority !== 'low'
      ? `<span class="task-priority-badge badge-${task.priority}">${task.priority}</span>` : '';

    li.innerHTML = `
      <button class="task-check-btn" aria-label="${task.completed ? 'Undo complete' : 'Mark complete'}" data-action="toggle">
        ${checkIcon}
      </button>
      <div class="task-content">
        <div class="task-title">${escapeHtml(task.title)}</div>
        ${task.description ? `<div class="task-desc">${escapeHtml(task.description)}</div>` : ''}
        <div class="task-meta">
          <span class="task-date">${formatRelativeDate(task.createdAt)}</span>
          ${priorityBadge}
        </div>
      </div>
      <div class="task-actions">
        <button class="task-action-btn" aria-label="Edit task" data-action="edit">
          <svg viewBox="0 0 20 20" fill="none"><path d="M14.5 3.5a1.5 1.5 0 012.12 2.12L7.5 14.75l-3 .75.75-3L14.5 3.5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
        </button>
        <button class="task-action-btn task-delete-btn" aria-label="Delete task" data-action="delete">
          <svg viewBox="0 0 20 20" fill="none"><path d="M4 6h12M8 6V4h4v2M7 9v6M13 9v6M5 6l1 10h8l1-10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
    `;

    // Events
    li.addEventListener('click', e => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (action === 'toggle') this.handleToggle(task.id, li);
      else if (action === 'edit') this.openModal(task.id);
      else if (action === 'delete') this.handleDelete(task.id, li);
    });

    // Drag events
    li.setAttribute('draggable', 'true');
    li.addEventListener('dragstart', e => {
      DragManager.startDrag(task.id, li);
      e.dataTransfer.effectAllowed = 'move';
    });
    li.addEventListener('dragend', () => DragManager.endDrag(li));
    li.addEventListener('dragover', e => {
      e.preventDefault();
      DragManager.handleDragOver(li);
    });
    li.addEventListener('drop', e => {
      e.preventDefault();
      DragManager.drop(li);
      this.renderTaskList();
    });

    return li;
  },

  handleToggle(taskId, el) {
    el.classList.add('completing');
    setTimeout(() => {
      const task = TaskManager.toggleComplete(taskId);
      this.renderTaskList();
      this.updateCounts();
      const msg = task.completed ? '✓ Task completed' : '↩ Task restored';
      ToastManager.show(msg);
    }, 200);
  },

  handleDelete(taskId, el) {
    el.classList.add('removing');
    setTimeout(() => {
      TaskManager.deleteTask(taskId);
      this.renderTaskList();
      this.updateCounts();
      ToastManager.show('🗑 Task deleted');
    }, 280);
  },

  updateCounts() {
    const c = TaskManager.getCounts();
    this.el.countAll.textContent = c.all || '';
    this.el.countToday.textContent = c.today || '';
    this.el.countImportant.textContent = c.important || '';
    this.el.countCompleted.textContent = c.completed || '';
  },

  initDragDrop() {
    // Already handled via per-element listeners in createTaskElement
  }
};

// =============================================
// HELPERS
// =============================================
function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function formatRelativeDate(isoStr) {
  const date = new Date(isoStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateNice(date) {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// =============================================
// STARTUP
// =============================================
(function boot() {
  // Apply theme immediately before DOMContentLoaded flash
  const savedTheme = StorageManager.getTheme();
  document.documentElement.setAttribute('data-theme', savedTheme);

  document.addEventListener('DOMContentLoaded', () => {
    // Init managers
    TaskManager.init();
    ThemeManager.init();
    ToastManager.init();
    DragManager.init();

    // Splash screen → app reveal
    const splash = document.getElementById('splash');
    const app = document.getElementById('app');

    setTimeout(() => {
      splash.classList.add('fade-out');
      app.classList.remove('hidden');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          app.classList.add('visible');
        });
      });
      setTimeout(() => splash.remove(), 600);
    }, 1600);

    // Init UI
    UIManager.init();
  });
})();