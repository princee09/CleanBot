// Scheduler functionality for Cleaning Bot

// Array to store scheduled tasks
let scheduledTasks = JSON.parse(localStorage.getItem('scheduledTasks')) || [];

// Function to save tasks to localStorage
function saveScheduledTasks() {
  localStorage.setItem('scheduledTasks', JSON.stringify(scheduledTasks));
}

// Function to add a new scheduled task
function addScheduledTask(task, date, time, isRecurring = false, recurringPattern = '') {
  const newTask = {
    id: Date.now().toString(),
    task,
    date,
    time,
    completed: false,
    createdAt: new Date().toISOString(),
    isRecurring: isRecurring,
    recurringPattern: recurringPattern
  };
  
  scheduledTasks.push(newTask);
  saveScheduledTasks();
  return newTask;
}

// Function to mark a task as completed
function completeTask(taskId) {
  const taskIndex = scheduledTasks.findIndex(task => task.id === taskId);
  if (taskIndex !== -1) {
    scheduledTasks[taskIndex].completed = true;
    saveScheduledTasks();
    return true;
  }
  return false;
}

// Function to delete a task
function deleteTask(taskId) {
  scheduledTasks = scheduledTasks.filter(task => task.id !== taskId);
  saveScheduledTasks();
}

// Function to get all scheduled tasks
function getAllTasks() {
  return scheduledTasks;
}

// Function to get upcoming tasks (not completed)
function getUpcomingTasks() {
  return scheduledTasks.filter(task => !task.completed);
}

// Function to parse scheduling requests from chat
function parseSchedulingRequest(message) {
  // Enhanced regex to detect scheduling intent
  const scheduleRegex = /schedule|remind|appointment|task|set up|plan/i;
  if (!scheduleRegex.test(message)) return null;
  
  // Try to extract date information - improved to better catch standalone date formats
  const dateRegex = /(?:on|for|at)?\s*([a-z]+day|tomorrow|\d{1,2}(?:st|nd|rd|th)?\s(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(?:\s\d{4})?|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i;
  const timeRegex = /(?:at|by)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i;
  
  // Check for recurring patterns
  const weeklyRegex = /weekly|every\s+week|each\s+week/i;
  const dailyRegex = /daily|every\s+day|each\s+day/i;
  const monthlyRegex = /monthly|every\s+month|each\s+month/i;
  
  const dateMatch = message.match(dateRegex);
  const timeMatch = message.match(timeRegex);
  const isWeekly = weeklyRegex.test(message);
  const isDaily = dailyRegex.test(message);
  const isMonthly = monthlyRegex.test(message);
  
  // Determine if this is a recurring task
  const isRecurring = isWeekly || isDaily || isMonthly;
  let recurringPattern = '';
  if (isWeekly) recurringPattern = 'weekly';
  else if (isDaily) recurringPattern = 'daily';
  else if (isMonthly) recurringPattern = 'monthly';
  
  // Extract the task description (everything before date/time indicators)
  let taskDescription = message;
  if (dateMatch) {
    const parts = message.split(dateMatch[0]);
    taskDescription = parts[0].trim();
  } else if (timeMatch) {
    const parts = message.split(timeMatch[0]);
    taskDescription = parts[0].trim();
  }
  
  // Remove common prefixes and scheduling keywords
  taskDescription = taskDescription
    .replace(/^(?:please\s)?(?:schedule|remind me to|remind me about|set a reminder to|set a reminder for|set up|plan)\s/i, '')
    .replace(weeklyRegex, '')
    .replace(dailyRegex, '')
    .replace(monthlyRegex, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Format date if it's in MM/DD/YYYY format
  let formattedDate = dateMatch ? dateMatch[1] : 'today';
  if (formattedDate.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/)) {
    const dateParts = formattedDate.split(/[\/\-]/);
    if (dateParts.length === 3) {
      const year = dateParts[2].length === 2 ? `20${dateParts[2]}` : dateParts[2];
      const month = parseInt(dateParts[0]) - 1; // JavaScript months are 0-indexed
      const day = parseInt(dateParts[1]);
      const dateObj = new Date(year, month, day);
      formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
  }
  
  return {
    task: taskDescription,
    date: formattedDate,
    time: timeMatch ? timeMatch[1] : '9:00 am',
    isRecurring: isRecurring,
    recurringPattern: recurringPattern
  };
}

// Function to show the scheduler modal
function showSchedulerModal() {
  const modal = document.getElementById('scheduler-modal');
  modal.style.display = 'flex';
  
  // Load and display tasks
  displayScheduledTasks();
}

// Function to close the scheduler modal
function closeSchedulerModal() {
  const modal = document.getElementById('scheduler-modal');
  modal.style.display = 'none';
}

// Function to display scheduled tasks in the modal
function displayScheduledTasks() {
  const tasksList = document.getElementById('scheduled-tasks-list');
  tasksList.innerHTML = '';
  
  const tasks = getAllTasks();
  
  if (tasks.length === 0) {
    tasksList.innerHTML = '<div class="empty-tasks">No scheduled tasks yet.</div>';
    return;
  }
  
  // Group tasks by date
  const groupedTasks = {};
  
  tasks.forEach(task => {
    if (!groupedTasks[task.date]) {
      groupedTasks[task.date] = [];
    }
    groupedTasks[task.date].push(task);
  });
  
  // Create sections for each date
  for (const date in groupedTasks) {
    const dateSection = document.createElement('div');
    dateSection.className = 'task-date-section';
    dateSection.innerHTML = `<h3>${date}</h3>`;
    
    const tasksForDate = groupedTasks[date];
    tasksForDate.forEach(task => {
      const taskItem = document.createElement('div');
      taskItem.className = `task-item ${task.completed ? 'completed' : ''}`;
      taskItem.setAttribute('data-task-id', task.id);
      
      taskItem.innerHTML = `
        <div class="task-content">
          <div class="task-checkbox">
            <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTaskCompletion('${task.id}')">
          </div>
          <div class="task-details">
            <div class="task-text">${task.task}</div>
            <div class="task-time">
              ${task.time}
              ${task.isRecurring ? `<span class="recurring-indicator"><i class="fas fa-sync-alt"></i> ${task.recurringPattern}</span>` : ''}
            </div>
          </div>
        </div>
        <button class="delete-task-btn" onclick="deleteTask('${task.id}'); displayScheduledTasks();"><i class="fas fa-trash"></i></button>
      `;
      
      dateSection.appendChild(taskItem);
    });
    
    tasksList.appendChild(dateSection);
  }
}

// Function to toggle task completion status
function toggleTaskCompletion(taskId) {
  const taskIndex = scheduledTasks.findIndex(task => task.id === taskId);
  if (taskIndex !== -1) {
    scheduledTasks[taskIndex].completed = !scheduledTasks[taskIndex].completed;
    saveScheduledTasks();
    displayScheduledTasks();
  }
}

// Function to add a new task from the form
function addTaskFromForm() {
  const taskInput = document.getElementById('new-task-input');
  const dateInput = document.getElementById('new-task-date');
  const timeInput = document.getElementById('new-task-time');
  
  const task = taskInput.value.trim();
  const date = dateInput.value;
  const time = timeInput.value;
  
  if (!task || !date) {
    alert('Please enter both a task and a date');
    return;
  }
  
  // Format the date for display
  const formattedDate = new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  
  // Format the time for display
  let formattedTime = time;
  if (time) {
    const timeParts = time.split(':');
    const hours = parseInt(timeParts[0]);
    const minutes = timeParts[1];
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    formattedTime = `${displayHours}:${minutes} ${period}`;
  }
  
  addScheduledTask(task, formattedDate, formattedTime);
  
  // Clear the form
  taskInput.value = '';
  dateInput.value = '';
  timeInput.value = '';
  
  // Refresh the tasks list
  displayScheduledTasks();
}

// Initialize date input with today's date
function initSchedulerForm() {
  const dateInput = document.getElementById('new-task-date');
  if (dateInput) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${year}-${month}-${day}`;
    dateInput.min = dateInput.value; // Prevent selecting past dates
  }
}

// Function to handle chat messages that might contain scheduling requests
function handleSchedulingInChat(message) {
  // First try using the enhanced parser
  const schedulingInfo = parseSchedulingRequest(message);
  
  if (schedulingInfo) {
    const { task, date, time, isRecurring, recurringPattern } = schedulingInfo;
    const newTask = addScheduledTask(task, date, time, isRecurring, recurringPattern);
    
    // Update the task counter in the header
    updateTaskCounter();
    
    // Return a confirmation message for the bot to say
    let confirmationMsg = `I've scheduled "${task}" for ${date} at ${time}.`;
    
    // Add information about recurring pattern if applicable
    if (isRecurring) {
      confirmationMsg += ` This task will repeat ${recurringPattern}.`;
    }
    
    confirmationMsg += ` You can view all your scheduled tasks by clicking the Calendar button in the top right corner.`;
    
    return confirmationMsg;
  }
  
  // Fallback for direct date formats like "9/9/2025"
  const directDateRegex = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i;
  const dateMatch = message.match(directDateRegex);
  
  if (dateMatch && /schedule|task|remind/i.test(message)) {
    // Extract date
    const dateStr = dateMatch[1];
    const dateParts = dateStr.split(/[\/\-]/);
    
    if (dateParts.length === 3) {
      const year = dateParts[2].length === 2 ? `20${dateParts[2]}` : dateParts[2];
      const month = parseInt(dateParts[0]) - 1; // JavaScript months are 0-indexed
      const day = parseInt(dateParts[1]);
      const dateObj = new Date(year, month, day);
      const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      
      // Extract task description by removing date and scheduling keywords
      let taskDescription = message
        .replace(directDateRegex, '')
        .replace(/schedule|remind me to|set up|plan|task/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Add the task
      const newTask = addScheduledTask(taskDescription, formattedDate, '9:00 am');
      
      // Update the task counter
      updateTaskCounter();
      
      // Return confirmation
      return `I've scheduled "${taskDescription}" for ${formattedDate} at 9:00 am. You can view all your scheduled tasks by clicking the Calendar button in the top right corner.`;
    }
  }
  
  return null; // No scheduling request detected
}

// Export functions for use in main script
window.showSchedulerModal = showSchedulerModal;
window.closeSchedulerModal = closeSchedulerModal;
window.addTaskFromForm = addTaskFromForm;
window.toggleTaskCompletion = toggleTaskCompletion;
window.deleteTask = deleteTask;
window.handleSchedulingInChat = handleSchedulingInChat;

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize the scheduler form if it exists
  if (document.getElementById('new-task-date')) {
    initSchedulerForm();
  }
});