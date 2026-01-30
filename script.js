// ====================
//  State & Constants
// ====================

// In-memory array that mirrors what we store in localStorage.
// Each todo is an object: { id, text, completed }
let todos = [];

// Current filter: "all" | "pending" | "completed"
let currentFilter = "all";

// Cache DOM elements once for better performance and cleaner code.
const todoForm = document.getElementById("todo-form");
const todoInput = document.getElementById("todo-input");
const todoList = document.getElementById("todo-list");
const todoCountSpan = document.getElementById("todo-count");
const todoMessage = document.getElementById("todo-message");
const filterButtons = document.querySelectorAll(".filter-button");

// ====================
//  Local Storage Keys
// ====================

const STORAGE_KEY = "todo_list_items_v1";

// ====================
//  Utility Functions
// ====================

/**
 * Save the current todos array into localStorage.
 */
function saveTodosToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

/**
 * Load todos from localStorage into the in-memory array.
 * If nothing is stored yet, keep an empty array.
 */
function loadTodosFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      todos = [];
      return;
    }
    const parsed = JSON.parse(saved);

    // Only accept an array of objects with required fields.
    if (Array.isArray(parsed)) {
      todos = parsed.map((item) => ({
        // Ensure stored ids are numbers (required todo shape)
        id: Number(item.id),
        text: String(item.text),
        completed: Boolean(item.completed),
      }));
    } else {
      todos = [];
    }
  } catch (error) {
    console.error("Failed to parse saved todos:", error);
    todos = [];
  }
}

/**
 * Update the counter displaying a small summary:
 * "Total: X | Pending: Y | Completed: Z"
 */
function updateTodoCounter() {
  const total = todos.length;
  const pending = todos.filter((todo) => !todo.completed).length;
  const completed = todos.filter((todo) => todo.completed).length;

  // Put full summary text in the counter span
  todoCountSpan.textContent = `Total: ${total} | Pending: ${pending} | Completed: ${completed}`;
}

/**
 * Show a short validation or info message under the input.
 * Pass an empty string ("") to clear the message.
 */
function setTodoMessage(message) {
  todoMessage.textContent = message;
}

/**
 * Clear the input field and focus it for convenience.
 */
function resetInput() {
  todoInput.value = "";
  todoInput.focus();
}

// ====================
//  Core CRUD Operations
// ====================

/**
 * Add a new todo to the list.
 * @param {string} text - The todo text.
 */
function addTodo(text) {
  const trimmedText = text.trim();

  // Prevent empty or whitespace-only todos.
  if (!trimmedText) {
    setTodoMessage("Please enter a todo before adding.");
    return;
  }

  const newTodo = {
    // Use a number id (required todo shape)
    id: Date.now(),
    text: trimmedText,
    completed: false,
  };

  todos.push(newTodo);
  saveTodosToStorage();
  renderTodos();
  updateTodoCounter();
  setTodoMessage("");
  resetInput();
}

/**
 * Toggle the completed state of a todo by id.
 */
function toggleTodoCompleted(id) {
  todos = todos.map((todo) =>
    todo.id === id ? { ...todo, completed: !todo.completed } : todo,
  );
  saveTodosToStorage();
  renderTodos();
  // Counter summary still changes for pending/completed breakdown.
  updateTodoCounter();
}

/**
 * Delete a todo by id.
 */
function deleteTodo(id) {
  todos = todos.filter((todo) => todo.id !== id);
  saveTodosToStorage();
  renderTodos();
  updateTodoCounter();
}

/**
 * Change the current filter and update UI.
 * @param {"all" | "pending" | "completed"} filter
 */
function setFilter(filter) {
  currentFilter = filter;

  // Update active visual state on filter buttons.
  filterButtons.forEach((button) => {
    const buttonFilter = button.getAttribute("data-filter");
    const isActive = buttonFilter === filter;
    button.classList.toggle("filter-button--active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });

  renderTodos();
}

// ====================
//  Rendering Functions
// ====================

/**
 * Create a single todo DOM element (<li>) based on a todo object.
 */
function createTodoElement(todo) {
  const li = document.createElement("li");
  li.className = "todo-item";
  if (todo.completed) {
    li.classList.add("todo-item--completed");
  }
  li.setAttribute("data-id", todo.id);

  // Main container (checkbox + text)
  const mainDiv = document.createElement("div");
  mainDiv.className = "todo-item__main";

  // Checkbox for completion
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "todo-item__checkbox";
  checkbox.checked = todo.completed;
  checkbox.setAttribute("aria-label", "Mark todo as completed");
  // Event: when checkbox changes, toggle completion
  checkbox.addEventListener("change", () => {
    toggleTodoCompleted(todo.id);
  });

  // Todo text
  const textSpan = document.createElement("span");
  textSpan.className = "todo-item__text";
  textSpan.textContent = todo.text;

  mainDiv.appendChild(checkbox);
  mainDiv.appendChild(textSpan);

  // Delete button
  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "todo-item__delete-btn";
  deleteButton.textContent = "Delete";
  deleteButton.setAttribute("aria-label", "Delete todo");
  // Event: when button clicked, delete todo
  deleteButton.addEventListener("click", () => {
    deleteTodo(todo.id);
  });

  li.appendChild(mainDiv);
  li.appendChild(deleteButton);

  return li;
}

/**
 * Get the todos that should be visible based on the current filter.
 */
function getFilteredTodos() {
  if (currentFilter === "pending") {
    return todos.filter((todo) => !todo.completed);
  }
  if (currentFilter === "completed") {
    return todos.filter((todo) => todo.completed);
  }
  return todos;
}

/**
 * Render the todos from state into the <ul> in the DOM.
 * This clears and rebuilds the list each time the state changes.
 */
function renderTodos() {
  // Clear current list
  todoList.innerHTML = "";

  const visibleTodos = getFilteredTodos();

  if (visibleTodos.length === 0) {
    // Context-aware empty state message based on the active filter
    let emptyMessage = "No tasks yet. Add your first todo.";
    if (currentFilter === "pending") {
      emptyMessage = "No pending tasks 🎉";
    } else if (currentFilter === "completed") {
      emptyMessage = "No completed tasks yet.";
    }

    const emptyItem = document.createElement("li");
    emptyItem.className = "todo-item";
    emptyItem.textContent = emptyMessage;
    emptyItem.style.justifyContent = "center";
    emptyItem.style.color = "#9ca3af";
    todoList.appendChild(emptyItem);
    return;
  }

  // Build list
  visibleTodos.forEach((todo) => {
    const todoElement = createTodoElement(todo);
    todoList.appendChild(todoElement);
  });
}

// ====================
//  Event Handlers
// ====================

/**
 * Handle the form submission (Add button click or Enter key).
 */
function handleFormSubmit(event) {
  event.preventDefault(); // prevent page reload
  const text = todoInput.value;
  addTodo(text);
}

// ====================
//  Initial Setup
// ====================

/**
 * Initialize the application:
 * - Load from storage
 * - Attach event listeners
 * - Render initial UI
 */
function init() {
  loadTodosFromStorage();
  updateTodoCounter();
  renderTodos();

  // Form submit event (add todo)
  todoForm.addEventListener("submit", handleFormSubmit);

  // Filter buttons click events
  filterButtons.forEach((button) => {
    const filter = button.getAttribute("data-filter");
    button.addEventListener("click", () => {
      setFilter(filter);
    });
  });
}

// Run init when DOM is ready.
document.addEventListener("DOMContentLoaded", init);
