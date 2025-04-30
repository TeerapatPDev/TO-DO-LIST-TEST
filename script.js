class Task {
    constructor(text, category) {
        this.id = Date.now();
        this.text = text;
        this.category = category;
        this.status = 'progress'; // Changed default status to 'progress'
        this.completed = false;
        this.createdAt = new Date().toISOString();
    }
}

class TaskManager {
    constructor() {
        this.taskForm = document.getElementById('task-form');
        this.taskInput = document.getElementById('task-input');
        this.taskCategory = document.getElementById('task-category');
        this.progressList = document.getElementById('progress-list');
        this.completedList = document.getElementById('completed-list');
        this.progressCount = document.getElementById('progress-count');
        this.completedCount = document.getElementById('completed-count');
        this.filterButtons = document.querySelectorAll('.filter-btn');
        this.categoryList = document.getElementById('category-list');
        this.addCategoryBtn = document.getElementById('add-category-btn');
        this.categoryModal = document.getElementById('category-modal');
        this.categoryForm = document.getElementById('category-form');
        this.closeModalBtns = document.querySelectorAll('.close-modal');
        
        // New elements for edit category modal
        this.editCategoryModal = document.getElementById('edit-category-modal');
        this.editCategoryForm = document.getElementById('edit-category-form');
        this.editCategoryId = document.getElementById('edit-category-id');
        this.editCategoryName = document.getElementById('edit-category-name');
        this.editCategoryIcon = document.getElementById('edit-category-icon');

        // New elements for edit task modal
        this.editTaskModal = document.getElementById('edit-task-modal');
        this.editTaskForm = document.getElementById('edit-task-form');
        this.editTaskId = document.getElementById('edit-task-id');
        this.editTaskText = document.getElementById('edit-task-text');
        this.editTaskCategory = document.getElementById('edit-task-category');

        this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        
        // Update existing tasks with 'todo' status to 'progress'
        this.tasks = this.tasks.map(task => {
            if (task.status === 'todo') {
                task.status = 'progress';
            }
            return task;
        });
        
        this.categories = JSON.parse(localStorage.getItem('categories')) || [
            { id: 'work', name: 'Work', icon: '💼' },
            { id: 'personal', name: 'Personal', icon: '🏠' },
            { id: 'shopping', name: 'Shopping', icon: '🛒' }
        ];
        this.currentFilter = 'all';
        this.currentCategory = 'all';

        this.init();
    }

    init() {
        this.taskForm.addEventListener('submit', e => {
            e.preventDefault();
            this.addTask();
        });

        this.filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.dataset.filter;
                this.renderTasks();
            });
        });

        this.categoryList.addEventListener('click', e => {
            const item = e.target.closest('.category-item');
            if (item) {
                // Don't change category if clicking on action buttons
                if (e.target.closest('.category-actions')) {
                    if (e.target.classList.contains('category-edit-btn')) {
                        this.openEditCategoryModal(item.dataset.category);
                    } else if (e.target.classList.contains('category-delete-btn')) {
                        this.deleteCategory(item.dataset.category);
                    }
                    return;
                }

                this.categoryList.querySelectorAll('.category-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                this.currentCategory = item.dataset.category;
                this.renderTasks();
            }
        });

        this.addCategoryBtn.addEventListener('click', () => this.categoryModal.classList.add('show'));
        
        this.closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.modal').forEach(modal => modal.classList.remove('show'));
            });
        });
        
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', e => {
                if (e.target === modal) modal.classList.remove('show');
            });
        });

        this.categoryForm.addEventListener('submit', e => {
            e.preventDefault();
            this.addCategory();
        });

        this.editCategoryForm.addEventListener('submit', e => {
            e.preventDefault();
            this.updateCategory();
        });

        this.editTaskForm.addEventListener('submit', e => {
            e.preventDefault();
            this.updateTask();
        });

        this.renderCategoryList();
        this.updateCategoryDropdown();
        this.updateEditTaskCategoryDropdown();
        this.renderTasks();
        this.updateTaskCounts();
    }

    addTask() {
        const text = this.taskInput.value.trim();
        const category = this.taskCategory.value;
        if (!text) return;

        const newTask = new Task(text, category);
        this.tasks.push(newTask);
        this.saveTasks();

        this.taskInput.value = '';
        this.renderTasks();
        this.updateTaskCounts();
    }

    toggleTaskCompletion(taskId) {
        this.tasks = this.tasks.map(task => {
            if (task.id === taskId) {
                task.completed = !task.completed;
                task.status = task.completed ? 'completed' : 'progress';
            }
            return task;
        });
        this.saveTasks();
        this.renderTasks();
        this.updateTaskCounts();
    }

    deleteTask(taskId) {
        this.tasks = this.tasks.filter(task => task.id !== taskId);
        this.saveTasks();
        this.renderTasks();
        this.updateTaskCounts();
    }

    openEditTaskModal(taskId) {
        const task = this.tasks.find(t => t.id === parseInt(taskId));
        if (!task) return;

        this.editTaskId.value = task.id;
        this.editTaskText.value = task.text;
        this.editTaskCategory.value = task.category;
        this.editTaskModal.classList.add('show');
    }

    updateTask() {
        const taskId = parseInt(this.editTaskId.value);
        const text = this.editTaskText.value.trim();
        const category = this.editTaskCategory.value;
        
        if (!text) return;

        this.tasks = this.tasks.map(task => {
            if (task.id === taskId) {
                task.text = text;
                task.category = category;
            }
            return task;
        });

        this.saveTasks();
        this.renderTasks();
        this.editTaskModal.classList.remove('show');
    }

    createTaskElement(task) {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        li.dataset.id = task.id;

        const category = this.categories.find(cat => cat.id === task.category) || { name: 'Uncategorized', icon: '📝' };

        li.innerHTML = `
            <div class="task-header">
                <div class="task-category">
                    <span class="task-category-icon">${category.icon}</span>
                    <span>${category.name}</span>
                </div>
                <div class="task-actions">
                    <button class="action-btn edit" data-action="edit">✏️</button>
                    <button class="action-btn delete" data-action="delete">🗑️</button>
                </div>
            </div>
            <div class="task-content">
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                <span class="task-text">${task.text}</span>
            </div>
        `;

        li.querySelector('.task-checkbox').addEventListener('change', () => this.toggleTaskCompletion(task.id));
        li.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                if (action === 'delete') this.deleteTask(task.id);
                if (action === 'edit') this.openEditTaskModal(task.id);
            });
        });

        return li;
    }

    renderTasks() {
        this.progressList.innerHTML = '';
        this.completedList.innerHTML = '';

        let filtered = this.tasks;
        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(t => t.category === this.currentCategory);
        }
        if (this.currentFilter === 'active') {
            filtered = filtered.filter(t => !t.completed);
        } else if (this.currentFilter === 'completed') {
            filtered = filtered.filter(t => t.completed);
        }

        if (filtered.length === 0) {
            const msg = document.createElement('li');
            msg.className = 'empty-message';
            msg.textContent = 'No tasks to show';
            this.progressList.appendChild(msg.cloneNode(true));
            this.completedList.appendChild(msg.cloneNode(true));
            return;
        }

        filtered.forEach(task => {
            const el = this.createTaskElement(task);
            if (task.completed) this.completedList.appendChild(el);
            else this.progressList.appendChild(el);
        });
    }

    updateTaskCounts() {
        let progress = 0, done = 0;
        let filtered = this.tasks;
        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(t => t.category === this.currentCategory);
        }
        filtered.forEach(t => {
            if (t.completed) done++;
            else progress++;
        });

        this.progressCount.textContent = progress;
        this.completedCount.textContent = done;
    }

    addCategory() {
        const name = document.getElementById('category-name').value.trim();
        const icon = document.getElementById('category-icon').value.trim() || '📝';
        if (!name) return;

        const id = name.toLowerCase().replace(/\s+/g, '-');
        if (this.categories.some(c => c.id === id)) {
            alert('A category with this name already exists');
            return;
        }

        this.categories.push({ id, name, icon });
        this.saveCategories();
        this.renderCategoryList();
        this.updateCategoryDropdown();
        this.updateEditTaskCategoryDropdown();
        this.categoryModal.classList.remove('show');
        document.getElementById('category-name').value = '';
        document.getElementById('category-icon').value = '';
    }

    openEditCategoryModal(categoryId) {
        const category = this.categories.find(c => c.id === categoryId);
        if (!category) return;

        this.editCategoryId.value = category.id;
        this.editCategoryName.value = category.name;
        this.editCategoryIcon.value = category.icon;
        this.editCategoryModal.classList.add('show');
    }

    updateCategory() {
        const oldId = this.editCategoryId.value;
        const name = this.editCategoryName.value.trim();
        const icon = this.editCategoryIcon.value.trim() || '📝';
        
        if (!name) return;

        const newId = name.toLowerCase().replace(/\s+/g, '-');
        
        // Check if new name would create a duplicate ID (but allow same name as current category)
        if (newId !== oldId && this.categories.some(c => c.id === newId)) {
            alert('A category with this name already exists');
            return;
        }

        // Update category
        this.categories = this.categories.map(cat => {
            if (cat.id === oldId) {
                return { id: newId, name, icon };
            }
            return cat;
        });

        // Update tasks with this category
        this.tasks = this.tasks.map(task => {
            if (task.category === oldId) {
                task.category = newId;
            }
            return task;
        });

        // Update current category if needed
        if (this.currentCategory === oldId) {
            this.currentCategory = newId;
        }

        this.saveCategories();
        this.saveTasks();
        this.renderCategoryList();
        this.updateCategoryDropdown();
        this.updateEditTaskCategoryDropdown();
        this.renderTasks();
        this.editCategoryModal.classList.remove('show');
    }

    deleteCategory(categoryId) {
        // Don't delete the built-in categories for simplicity
        if (['all'].includes(categoryId)) {
            alert('Cannot delete this category');
            return;
        }

        if (!confirm(`Are you sure you want to delete the "${this.categories.find(c => c.id === categoryId)?.name}" category?`)) {
            return;
        }

        // Remove category
        this.categories = this.categories.filter(cat => cat.id !== categoryId);

        // Set tasks in this category to an alternative category (first available)
        const defaultCategory = this.categories[0]?.id || 'uncategorized';
        this.tasks = this.tasks.map(task => {
            if (task.category === categoryId) {
                task.category = defaultCategory;
            }
            return task;
        });

        // If current category is deleted, switch to 'all'
        if (this.currentCategory === categoryId) {
            this.currentCategory = 'all';
        }

        this.saveCategories();
        this.saveTasks();
        this.renderCategoryList();
        this.updateCategoryDropdown();
        this.updateEditTaskCategoryDropdown();
        this.renderTasks();
    }

    renderCategoryList() {
        this.categoryList.innerHTML = `
            <li class="category-item ${this.currentCategory === 'all' ? 'active' : ''}" data-category="all">
                <span class="category-icon">📋</span>
                <span class="category-name">All Tasks</span>
            </li>
        `;
        this.categories.forEach(cat => {
            const li = document.createElement('li');
            li.className = `category-item ${this.currentCategory === cat.id ? 'active' : ''}`;
            li.dataset.category = cat.id;
            li.innerHTML = `
                <span class="category-icon">${cat.icon}</span>
                <span class="category-name">${cat.name}</span>
                <div class="category-actions">
                    <button class="category-edit-btn">✏️</button>
                    <button class="category-delete-btn">🗑️</button>
                </div>
            `;
            this.categoryList.appendChild(li);
        });
    }

    updateCategoryDropdown() {
        this.taskCategory.innerHTML = '';
        this.categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = `${cat.icon} ${cat.name}`;
            this.taskCategory.appendChild(option);
        });
    }

    updateEditTaskCategoryDropdown() {
        this.editTaskCategory.innerHTML = '';
        this.categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = `${cat.icon} ${cat.name}`;
            this.editTaskCategory.appendChild(option);
        });
    }

    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }

    saveCategories() {
        localStorage.setItem('categories', JSON.stringify(this.categories));
    }
}

document.addEventListener('DOMContentLoaded', () => new TaskManager());