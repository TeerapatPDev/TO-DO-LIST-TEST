class Task {
    constructor(text, category, dueDate, dueTime, reminder, email) {
        this.id = Date.now();
        this.text = text;
        this.category = category;
        this.status = 'progress'; // Default status is 'progress'
        this.completed = false;
        this.createdAt = new Date().toISOString();
        
        // New properties for due date, time and notifications
        this.dueDate = dueDate;
        this.dueTime = dueTime;
        this.reminder = reminder;
        this.email = email;
        this.isLate = false;
        this.reminderSent = false;
    }

    // Calculate the due date and time as a Date object
    getDueDateTime() {
        if (!this.dueDate || !this.dueTime) return null;
        
        const [year, month, day] = this.dueDate.split('-');
        const [hours, minutes] = this.dueTime.split(':');
        return new Date(year, month - 1, day, hours, minutes);
    }

    // Calculate the reminder time as a Date object
    getReminderTime() {
        if (this.reminder === 'none' || !this.dueDate || !this.dueTime) return null;
        
        const dueDateTime = this.getDueDateTime();
        if (!dueDateTime) return null;
        
        // Convert reminder minutes to milliseconds and subtract from due date
        return new Date(dueDateTime.getTime() - parseInt(this.reminder) * 60 * 1000);
    }

    // Check if the task is late (past due date and not completed)
    checkIfLate() {
        if (this.completed) return false;
        
        const dueDateTime = this.getDueDateTime();
        if (!dueDateTime) return false;
        
        return new Date() > dueDateTime;
    }

    // Calculate progress as percentage of time elapsed
    calculateProgress() {
        if (this.completed) return 100;
        
        const dueDateTime = this.getDueDateTime();
        if (!dueDateTime) return 0;
        
        const now = new Date();
        const createdDate = new Date(this.createdAt);
        
        // If task is already late
        if (now > dueDateTime) return 100;
        
        // Calculate percentage of time elapsed
        const totalDuration = dueDateTime - createdDate;
        const elapsedDuration = now - createdDate;
        
        return Math.min(Math.floor((elapsedDuration / totalDuration) * 100), 100);
    }
}

class TaskManager {
    constructor() {
        this.taskForm = document.getElementById('task-form');
        this.taskInput = document.getElementById('task-input');
        this.taskCategory = document.getElementById('task-category');
        this.taskDate = document.getElementById('task-date');
        this.taskTime = document.getElementById('task-time');
        this.taskReminder = document.getElementById('task-reminder');
        this.taskEmail = document.getElementById('task-email');
        
        this.progressList = document.getElementById('progress-list');
        this.completedList = document.getElementById('completed-list');
        this.lateList = document.getElementById('late-list');
        
        this.progressCount = document.getElementById('progress-count');
        this.completedCount = document.getElementById('completed-count');
        this.lateCount = document.getElementById('late-count');
        
        this.filterButtons = document.querySelectorAll('.filter-btn');
        this.categoryList = document.getElementById('category-list');
        this.addCategoryBtn = document.getElementById('add-category-btn');
        this.categoryModal = document.getElementById('category-modal');
        this.categoryForm = document.getElementById('category-form');
        this.closeModalBtns = document.querySelectorAll('.close-modal');
        
        this.notificationModal = document.getElementById('notification-modal');
        this.notificationMessage = document.getElementById('notification-message');
        this.dismissNotification = document.getElementById('dismiss-notification');
        this.snoozeNotification = document.getElementById('snooze-notification');
        
        // Edit category modal elements
        this.editCategoryModal = document.getElementById('edit-category-modal');
        this.editCategoryForm = document.getElementById('edit-category-form');
        this.editCategoryId = document.getElementById('edit-category-id');
        this.editCategoryName = document.getElementById('edit-category-name');
        this.editCategoryIcon = document.getElementById('edit-category-icon');

        // Edit task modal elements
        this.editTaskModal = document.getElementById('edit-task-modal');
        this.editTaskForm = document.getElementById('edit-task-form');
        this.editTaskId = document.getElementById('edit-task-id');
        this.editTaskText = document.getElementById('edit-task-text');
        this.editTaskCategory = document.getElementById('edit-task-category');
        this.editTaskDate = document.getElementById('edit-task-date');
        this.editTaskTime = document.getElementById('edit-task-time');
        this.editTaskReminder = document.getElementById('edit-task-reminder');
        this.editTaskEmail = document.getElementById('edit-task-email');

        this.tasks = (JSON.parse(localStorage.getItem('tasks')) || []).map(taskData => {
            const task = new Task(
                taskData.text,
                taskData.category,
                taskData.dueDate,
                taskData.dueTime,
                taskData.reminder,
                taskData.email
            );
            Object.assign(task, taskData);
            return task;
        });
        
        
        // Update existing tasks with new properties
        this.tasks = this.tasks.map(task => {
            if (task.status === 'todo') {
                task.status = 'progress';
            }
            if (!task.dueDate) {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                task.dueDate = tomorrow.toISOString().split('T')[0];
                task.dueTime = '12:00';
                task.reminder = 'none';
                task.email = '';
                task.isLate = false;
                task.reminderSent = false;
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
        
        // Timer for checking task status
        this.checkTimer = null;

        this.init();
    }

    init() {
        // Set default date value to today
        const today = new Date();
        this.taskDate.value = today.toISOString().split('T')[0];
        this.taskTime.value = '12:00';
        
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

        // Notification modal buttons
        this.dismissNotification.addEventListener('click', () => {
            this.notificationModal.classList.remove('show');
        });

        this.snoozeNotification.addEventListener('click', () => {
            this.notificationModal.classList.remove('show');
            // Snooze for 15 minutes
            setTimeout(() => {
                this.showNotification(this.currentNotificationTask);
            }, 15 * 60 * 1000);
        });

        this.renderCategoryList();
        this.updateCategoryDropdown();
        this.updateEditTaskCategoryDropdown();
        this.renderTasks();
        this.updateTaskCounts();
        
        // Start checking task status (every minute)
        this.startTaskStatusChecker();
    }

    startTaskStatusChecker() {
        // Check immediately and then every minute
        this.checkTaskStatus();
        this.checkTimer = setInterval(() => this.checkTaskStatus(), 60 * 1000);
    }

    checkTaskStatus() {
        let updated = false;
        
        this.tasks.forEach(task => {
            // Check if task is late
            const wasLate = task.isLate;
            task.isLate = task.checkIfLate();
            
            if (wasLate !== task.isLate) {
                updated = true;
            }
            
            // Check if reminder should be sent
            if (!task.completed && !task.reminderSent && task.reminder !== 'none') {
                const reminderTime = task.getReminderTime();
                if (reminderTime && new Date() >= reminderTime) {
                    this.sendReminder(task);
                    task.reminderSent = true;
                    updated = true;
                }
            }
        });
        
        if (updated) {
            this.saveTasks();
            this.renderTasks();
            this.updateTaskCounts();
        }
    }

    sendReminder(task) {
        // Show local notification
        this.showNotification(task);
        
        // In a real application, this would send an email
        console.log(`Email notification sent to ${task.email} for task: ${task.text}`);
        
        // For a real implementation, you'd need a server-side component to send emails
        // Here we can just simulate it with a local notification
        if (Notification.permission === "granted") {
            new Notification("Task Reminder", {
                body: `Task "${task.text}" is due at ${task.dueTime} on ${task.dueDate}`,
                icon: "/favicon.ico"
            });
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    new Notification("Task Reminder", {
                        body: `Task "${task.text}" is due at ${task.dueTime} on ${task.dueDate}`,
                        icon: "/favicon.ico"
                    });
                }
            });
        }
    }

    showNotification(task) {
        this.currentNotificationTask = task;
        this.notificationMessage.textContent = `Your task "${task.text}" is due at ${task.dueTime} on ${task.dueDate}`;
        this.notificationModal.classList.add('show');
    }

    addTask() {
        const text = this.taskInput.value.trim();
        const category = this.taskCategory.value;
        const dueDate = this.taskDate.value;
        const dueTime = this.taskTime.value;
        const reminder = this.taskReminder.value;
        const email = this.taskEmail.value;
        
        if (!text) return;

        const newTask = new Task(text, category, dueDate, dueTime, reminder, email);
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
                
                // Reset late status if completed
                if (task.completed) {
                    task.isLate = false;
                } else {
                    // Check if the task is late when uncompleted
                    task.isLate = task.checkIfLate();
                }
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
        this.editTaskDate.value = task.dueDate;
        this.editTaskTime.value = task.dueTime;
        this.editTaskReminder.value = task.reminder;
        this.editTaskEmail.value = task.email;
        
        this.editTaskModal.classList.add('show');
    }

    updateTask() {
        const taskId = parseInt(this.editTaskId.value);
        const text = this.editTaskText.value.trim();
        const category = this.editTaskCategory.value;
        const dueDate = this.editTaskDate.value;
        const dueTime = this.editTaskTime.value;
        const reminder = this.editTaskReminder.value;
        const email = this.editTaskEmail.value;
        
        if (!text) return;

        this.tasks = this.tasks.map(task => {
            if (task.id === taskId) {
                task.text = text;
                task.category = category;
                task.dueDate = dueDate;
                task.dueTime = dueTime;
                task.reminder = reminder;
                task.email = email;
                
                // Reset reminder status if date/time/reminder changed
                task.reminderSent = false;
                
                // Update late status
                task.isLate = task.checkIfLate();
            }
            return task;
        });

        this.saveTasks();
        this.renderTasks();
        this.editTaskModal.classList.remove('show');
    }

    createTaskElement(task) {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''} ${task.isLate ? 'late' : ''}`;
        li.dataset.id = task.id;

        const category = this.categories.find(cat => cat.id === task.category) || { name: 'Uncategorized', icon: '📝' };
        const progress = task.calculateProgress();
        
        // Format the due date for display
        const dueDateTime = task.getDueDateTime();
        let dueDateFormatted = '';
        if (dueDateTime) {
            dueDateFormatted = new Intl.DateTimeFormat('default', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).format(dueDateTime);
        }

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
            <div class="task-due-date">Due: ${dueDateFormatted}</div>
            <div class="task-progress-container">
                <div class="task-progress-bar ${task.isLate ? 'late' : ''}" style="width: ${progress}%"></div>
            </div>
            <div class="task-status ${task.isLate ? 'late' : ''}">
                ${task.isLate ? 'LATE' : `${progress}% until due`}
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
        this.lateList.innerHTML = '';
        this.completedList.innerHTML = '';

        let filtered = this.tasks;
        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(t => t.category === this.currentCategory);
        }
        
        // Filter by status
        if (this.currentFilter === 'active') {
            filtered = filtered.filter(t => !t.completed);
        } else if (this.currentFilter === 'completed') {
            filtered = filtered.filter(t => t.completed);
        } else if (this.currentFilter === 'late') {
            filtered = filtered.filter(t => t.isLate);
        }

        if (filtered.length === 0) {
            const msg = document.createElement('li');
            msg.className = 'empty-message';
            msg.textContent = 'No tasks to show';
            this.progressList.appendChild(msg.cloneNode(true));
            this.lateList.appendChild(msg.cloneNode(true));
            this.completedList.appendChild(msg.cloneNode(true));
            return;
        }

        filtered.forEach(task => {
            const el = this.createTaskElement(task);
            if (task.completed) {
                this.completedList.appendChild(el);
            } else if (task.isLate) {
                this.lateList.appendChild(el);
            } else {
                this.progressList.appendChild(el);
            }
        });
    }

    updateTaskCounts() {
        let progress = 0, late = 0, done = 0;
        let filtered = this.tasks;
        
        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(t => t.category === this.currentCategory);
        }
        
        filtered.forEach(t => {
            if (t.completed) {
                done++;
            } else if (t.isLate) {
                late++;
            } else {
                progress++;
            }
        });

        this.progressCount.textContent = progress;
        this.lateCount.textContent = late;
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