const placeholderQuotes = [
  "Dust is inevitable, but a little sparkle makes all the difference! - Your Cleaning Guru",
  "Every speck of dust has a story. Let's clean up yours! - The AI Cleaning Maestro",
  "Messy room? Not on my watch. Let's get it shining! - Your Witty Cleaning Bot",
  "When in doubt, grab a duster and let the magic happen! - Cleaning AI",
  "Cleaning is the art of turning chaos into beauty! - Your Sparkling Assistant"
];

const botName = "Anna";

function getRandomPlaceholder() {
  const index = Math.floor(Math.random() * placeholderQuotes.length);
  return placeholderQuotes[index];
}

let currentTypingInterval = null;

function simulateTyping(text, element, callback) {
  if (currentTypingInterval) {
    clearInterval(currentTypingInterval);
    currentTypingInterval = null;
  }
  
  element.innerHTML = ''; 
  let index = 0;
  
  const timestamp = document.createElement('div');
  timestamp.className = 'message-timestamp';
  timestamp.textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  timestamp.style.display = 'none'; 
  
  const contentElement = document.createElement('div');
  contentElement.className = 'message-content';
  
  const typingIndicator = document.createElement('div');
  typingIndicator.className = 'typing-indicator';
  typingIndicator.innerHTML = '<span></span><span></span><span></span>';
  element.appendChild(typingIndicator);
  
  const chatBox = document.getElementById('chat-box');
  ensureScrollToBottom();
  
  currentTypingInterval = setInterval(() => {
    if (index === 0) {
      element.removeChild(typingIndicator);
      element.appendChild(contentElement);
      element.appendChild(timestamp); 
    }
    
    if (index < text.length) {
      if (text.substring(index).startsWith('\n')) {
        contentElement.innerHTML += '<br>';
        index += 2;
      } else if (text.substring(index).startsWith('\n- ')) {
        contentElement.innerHTML += '<br>• ';
        index += 3;
      } else if (text.substring(index).startsWith('\n')) {
        contentElement.innerHTML += '<br>';
        index += 1;
      } else {
        contentElement.innerHTML += text.charAt(index);
        index++;
      }
  ensureScrollToBottom();
    }
    
    if (index >= text.length) {
      clearInterval(currentTypingInterval);
      currentTypingInterval = null;
      timestamp.style.display = 'block'; 
  ensureScrollToBottom();
      if (callback) callback();
    }
  }, 28); 
}

let sessions = JSON.parse(localStorage.getItem('chatSessions')) || [];
let isUserLoggedIn = false;
let currentUser = null;

function createNewSession() {
  return {
    sessionId: Date.now().toString(),
    title: 'New Chat',
    createdAt: new Date().toISOString(),
    conversation: [
      {
        role: 'system',
        content: 'You are a cleaning expert and witty female robot assistant named Anna. Act as a friendly female bot. Follow the conversation context to provide detailed step-by-step cleaning instructions. Use bullet points, spacing, and relevant emojis (e.g., ✅, ✨, 🧹) in your responses. If the user greets you (e.g., "hi", "hello"), respond with a warm greeting. If the user asks personal questions like "Who are you?" or "What is your name?", reply "I am Anna, your AI cleaning assistant." Also, remember any cleaning-related details provided by the user for later reference. If the question is not about cleaning, respond with "Out of my scope".'
      }
    ]
  };
}

let currentSession = sessions.length > 0 ? sessions[sessions.length - 1] : createNewSession();

function saveSessions() {
  if (isUserLoggedIn) {
    saveSessionToServer(currentSession);
  } else {
    localStorage.setItem('chatSessions', JSON.stringify(sessions));
  }
}

async function saveSessionToServer(session) {
  try {
    const response = await fetch('/api/user/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session })
    });
    const data = await response.json();
    console.log('Session saved to server:', data.message);
  } catch (error) {
    console.error('Error saving session to server:', error);
  }
}

function analyzeChatForTitle(conversation) {
  const userMessages = conversation.filter(msg => msg.role === 'user');
  
  if (userMessages.length === 0) return 'New Chat';
  
  const firstUserMsg = userMessages[0].content;
  let defaultTitle = firstUserMsg.substring(0, 30) + (firstUserMsg.length > 30 ? '...' : '');
  
  const schedulingKeywords = /schedule|task|clean|reminder|appointment/i;
  const datePatterns = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|tomorrow|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i;
  const recurringPatterns = /weekly|daily|monthly|every day|each week/i;
  
  const allUserContent = userMessages.map(msg => msg.content).join(' ');
  
  if (schedulingKeywords.test(allUserContent)) {
    if (recurringPatterns.test(allUserContent)) {
      const match = allUserContent.match(recurringPatterns);
      if (match) {
        return `${match[0].charAt(0).toUpperCase() + match[0].slice(1)} Cleaning Schedule`;
      }
    }
    
    if (datePatterns.test(allUserContent)) {
      const match = allUserContent.match(datePatterns);
      if (match) {
        return `Cleaning Schedule for ${match[0]}`;
      }
    }
    
    if (/clean|dust|vacuum|mop|wash|scrub/i.test(allUserContent)) {
      return 'Cleaning Task Schedule';
    }
    
    return 'Scheduled Tasks';
  }
  
  if (/how to|tips|advice|best way|recommend/i.test(allUserContent)) {
    if (/stain|remove|dirt|spill/i.test(allUserContent)) {
      return 'Stain Removal Advice';
    }
    if (/clean|dust|vacuum|mop|wash|scrub/i.test(allUserContent)) {
      return 'Cleaning Tips & Advice';
    }
  }
  
  return defaultTitle;
}

function updateSession() {
  if (currentSession.title === 'New Chat' && currentSession.conversation.length > 1) {
    currentSession.title = analyzeChatForTitle(currentSession.conversation);
  }
  if (isUserLoggedIn) {
    saveSessionToServer(currentSession);
    const index = sessions.findIndex(s => s.sessionId === currentSession.sessionId);
    if (index !== -1) {
      sessions[index] = currentSession;
    } else {
      sessions.push(currentSession);
    }
  } else {
    const index = sessions.findIndex(s => s.sessionId === currentSession.sessionId);
    if (index !== -1) {
      sessions[index] = currentSession;
    } else {
      sessions.push(currentSession);
    }
    saveSessions();
  }
  loadChatHistory();
}

function displayPlaceholder() {
  const chatBox = document.getElementById('chat-box');
  if (currentSession.conversation.length === 1) {
    chatBox.innerHTML = `
      <div class="placeholder">
        <p>${getRandomPlaceholder()}</p>
      </div>
    `;
    chatBox.classList.add('placeholder-active');
  }
}

function removePlaceholder() {
  const chatBox = document.getElementById('chat-box');
  chatBox.classList.remove('placeholder-active');
  if (chatBox.querySelector('.placeholder')) {
    chatBox.innerHTML = '';
  }
}

function startNewChat() {
  updateSession();
  currentSession = createNewSession();
  document.getElementById('chat-box').innerHTML = '';
  // Show welcome screen when starting a new chat
  document.getElementById('welcome-screen').style.display = 'flex';
  loadChatHistory();
  displayPlaceholder();
}


function deleteSession(sessionId) {
  if (isUserLoggedIn) {
    // For logged-in users, delete from server
    deleteSessionFromServer(sessionId);
  } else {
    // For non-logged-in users, delete from localStorage
    sessions = sessions.filter(s => s.sessionId !== sessionId);
    saveSessions();
  }
  
  if (currentSession.sessionId === sessionId) {
    currentSession = createNewSession();
    document.getElementById('chat-box').innerHTML = '';
  }
  
  loadChatHistory();
  loadSession(currentSession);
}

async function deleteSessionFromServer(sessionId) {
  try {
    const response = await fetch(`/api/user/sessions/${sessionId}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    console.log('Session deleted from server:', data.message);
    
    // Update local sessions array after server deletion
    sessions = sessions.filter(s => s.sessionId !== sessionId);
  } catch (error) {
    console.error('Error deleting session from server:', error);
  }
}


function renameSession(sessionId, newTitle) {
  let session = sessions.find(s => s.sessionId === sessionId);
  if (session) {
    session.title = newTitle;
    if (currentSession.sessionId === sessionId) {
      currentSession.title = newTitle;
    }
    
    if (isUserLoggedIn) {
      // For logged-in users, rename on server
      renameSessionOnServer(sessionId, newTitle);
    } else {
      // For non-logged-in users, save to localStorage
      saveSessions();
    }
    
    loadChatHistory();
  }
}

async function renameSessionOnServer(sessionId, newTitle) {
  try {
    const response = await fetch(`/api/user/sessions/${sessionId}/rename`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newTitle })
    });
    const data = await response.json();
    console.log('Session renamed on server:', data.message);
  } catch (error) {
    console.error('Error renaming session on server:', error);
  }
}


function shareSession(sessionId) {
  const shareURL = `${window.location.origin}/chat/${sessionId}`;
  alert('Share this URL: ' + shareURL);
}

function loadChatHistory() {
  const historyList = document.getElementById('history-list');
  historyList.innerHTML = '';
  
  const groupedSessions = {};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  
  sessions.forEach(session => {
    const sessionDate = session.createdAt ? new Date(session.createdAt).toDateString() : today;
    let dateGroup;
    
    if (sessionDate === today) {
      dateGroup = 'Today';
    } else if (sessionDate === yesterday) {
      dateGroup = 'Yesterday';
    } else {
      dateGroup = sessionDate;
    }
    
    if (!groupedSessions[dateGroup]) {
      groupedSessions[dateGroup] = [];
    }
    
    groupedSessions[dateGroup].push(session);
  });
  
  const sortedGroups = Object.keys(groupedSessions).sort((a, b) => {
    if (a === 'Today') return -1;
    if (b === 'Today') return 1;
    if (a === 'Yesterday') return -1;
    if (b === 'Yesterday') return 1;
    return new Date(b) - new Date(a);
  });
  
  sortedGroups.forEach(dateGroup => {
    const dateHeader = document.createElement('div');
    dateHeader.className = 'history-date-section';
    dateHeader.textContent = dateGroup;
    historyList.appendChild(dateHeader);
    
    groupedSessions[dateGroup].forEach(session => {
      const li = document.createElement('li');
      li.className = 'chat-session-item';
      li.setAttribute('data-session-id', session.sessionId);
    
      const titleContainer = document.createElement('div');
      titleContainer.className = 'chat-session-title-container';
      
      const titleSpan = document.createElement('span');
      titleSpan.className = 'chat-session-title';
      
      if (session.title === 'New Chat' && session.conversation.length > 1) {
        const chatTitle = analyzeChatForTitle(session.conversation);
        titleSpan.textContent = chatTitle;
      } else {
        titleSpan.textContent = session.title;
      }
      
      titleContainer.appendChild(titleSpan);
      
      if (dateGroup !== 'Today' && dateGroup !== 'Yesterday') {
        const dateSpan = document.createElement('span');
        dateSpan.className = 'chat-session-date';
        const date = new Date(session.createdAt || Date.now());
        dateSpan.textContent = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        titleContainer.appendChild(dateSpan);
      }
      
      li.appendChild(titleContainer);
    
      const optionsSpan = document.createElement('span');
      optionsSpan.className = 'chat-session-options';
      optionsSpan.textContent = '⋮';
      li.appendChild(optionsSpan);
    
      const menuDiv = document.createElement('div');
      menuDiv.className = 'options-menu';
    
      const renameBtn = document.createElement('button');
      renameBtn.textContent = 'Rename Chat';
      renameBtn.onclick = (e) => {
        e.stopPropagation();
        const newTitle = prompt('Enter new chat title:', titleSpan.textContent);
        if (newTitle) renameSession(session.sessionId, newTitle);
      };
      menuDiv.appendChild(renameBtn);
    
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete Chat';
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this chat?')) {
          deleteSession(session.sessionId);
        }
      };
      menuDiv.appendChild(deleteBtn);
    
      const shareBtn = document.createElement('button');
      shareBtn.textContent = 'Share Chat';
      shareBtn.onclick = (e) => {
        e.stopPropagation();
        shareSession(session.sessionId);
      };
      menuDiv.appendChild(shareBtn);
    
      li.appendChild(menuDiv);
    
      optionsSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.options-menu').forEach(menu => {
          if (menu !== menuDiv) menu.style.display = 'none';
        });
        menuDiv.style.display = (menuDiv.style.display === 'block') ? 'none' : 'block';
      });
    
      li.addEventListener('click', () => {
        loadSession(session);
      });
    
      historyList.appendChild(li);
    });
  });
  
  const historyPanel = document.querySelector('.history-panel');
  
  historyPanel.style.position = 'relative';
  
  // Registration number removed as requested
}
function ensureScrollToBottom() {
  const chatBox = document.getElementById('chat-box');
  setTimeout(() => {
    chatBox.scrollTop = chatBox.scrollHeight;
  }, 10);
}

function loadSession(session) {
  currentSession = session;
  const chatBox = document.getElementById('chat-box');
  const welcomeScreen = document.getElementById('welcome-screen');
  
  welcomeScreen.style.display = 'none';
  
  removePlaceholder();
  chatBox.innerHTML = '';
  
  session.conversation.forEach((msg, index) => {
    if (msg.role === 'system') return;
    
    const msgDiv = document.createElement('div');
    msgDiv.className = msg.role === 'user' ? 'user-msg' : 'bot-msg';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    if (msg.role === 'user') {
      contentDiv.innerHTML = `You: ${msg.content}`;
    } else {
      let botContent = msg.content;
      if (botContent.startsWith(`${botName}:`)) {
        botContent = botContent.replace(new RegExp(`^${botName}:\s*${botName}:`, 'i'), `${botName}:`);
        contentDiv.innerHTML = botContent.replace(/\n\n/g, '<br><br>').replace(/\n- /g, '<br>• ');
      } else {
        contentDiv.innerHTML = `${botName}: ${botContent.replace(/\n\n/g, '<br><br>').replace(/\n- /g, '<br>• ')}`;
      }
    }
    
    const timestamp = document.createElement('div');
    timestamp.className = 'message-timestamp';
    timestamp.textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    msgDiv.appendChild(contentDiv);
    msgDiv.appendChild(timestamp);
    chatBox.appendChild(msgDiv);
    
    setTimeout(() => {
      timestamp.style.display = 'block';
      ensureScrollToBottom();
    }, 300 * (index + 1));
  });
  
  ensureScrollToBottom();
}

async function sendMessage() {
  const userInput = document.getElementById('user-input');
  const chatBox = document.getElementById('chat-box');
  const welcomeScreen = document.getElementById('welcome-screen');
  const sendBtn = document.getElementById('send-btn');
  const message = userInput.value.trim();
  if (!message) return;
  
  welcomeScreen.style.display = 'none';
  
  removePlaceholder();
  
  const userMsgDiv = document.createElement('div');
  userMsgDiv.className = 'user-msg';
  
  const userContent = document.createElement('div');
  userContent.className = 'message-content';
  userContent.textContent = `You: ${message}`;
  
  const timestamp = document.createElement('div');
  timestamp.className = 'message-timestamp';
  timestamp.textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  timestamp.style.display = 'none'; 
  
  userMsgDiv.appendChild(userContent);
  userMsgDiv.appendChild(timestamp);
  chatBox.appendChild(userMsgDiv);
  
  setTimeout(() => {
    timestamp.style.display = 'block';
  }, 500);
  
  currentSession.conversation.push({ role: 'user', content: message });
  userInput.value = '';
  
  sendBtn.innerHTML = '<i class="fas fa-stop"></i>';
  sendBtn.classList.add('stop-btn');
  
  const originalOnClick = sendBtn.onclick;
  
  sendBtn.onclick = () => {
    if (currentTypingInterval) {
      clearInterval(currentTypingInterval);
      currentTypingInterval = null;
      
      sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
      sendBtn.classList.remove('stop-btn');
      sendBtn.onclick = originalOnClick;
    }
  };
  
  const schedulingResponse = handleSchedulingInChat(message);
  
  const temperature = getCurrentTemperature();
  
  try {
    const response = await fetch('http://localhost:4000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, temperature })
    });
    const data = await response.json();
    let replyText = data.reply;
    
    if (schedulingResponse) {
      replyText = schedulingResponse;
      updateTaskCounter(); 
    }
    
    replyText = replyText.replace(/###/g, '\n\n');
    replyText = replyText.replace(/-\s/g, '\n- ');
    
    if (replyText.startsWith(`${botName}:`)) {
      replyText = replyText.replace(new RegExp(`^${botName}:\s*${botName}:`, 'i'), `${botName}:`);
    } else if (replyText.toLowerCase().startsWith('hello') || replyText.toLowerCase().startsWith('hi')) {
      replyText = `${botName}: ${replyText}`;
    } else {
      replyText = `${botName}: ${replyText}`;
    }
    
    const botMsgDiv = document.createElement('div');
    botMsgDiv.className = 'bot-msg';
    chatBox.appendChild(botMsgDiv);
    
    simulateTyping(replyText, botMsgDiv, () => {
      sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
      sendBtn.classList.remove('stop-btn');
      sendBtn.onclick = originalOnClick;
      
      currentSession.conversation.push({ role: 'assistant', content: replyText });
      updateSession();
    });
  } catch (error) {
    sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
    sendBtn.classList.remove('stop-btn');
    sendBtn.onclick = originalOnClick;
    
    const errDiv = document.createElement('div');
    errDiv.className = 'bot-msg';
    
    const errContent = document.createElement('div');
    errContent.className = 'message-content';
    errContent.textContent = `${botName}: 🔧 Maintenance in progress!`;
    
    const timestamp = document.createElement('div');
    timestamp.className = 'message-timestamp';
    timestamp.textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    errDiv.appendChild(errContent);
    errDiv.appendChild(timestamp);
    chatBox.appendChild(errDiv);
  }
  ensureScrollToBottom();
}

async function checkUserStatus() {
  try {
    const res = await fetch('/api/user');
    const data = await res.json();
    const authBtn = document.getElementById('login-btn');
    const userMenu = document.getElementById('user-menu');
    const welcomeText = document.getElementById('welcome-text');

    if (data.user) {
      isUserLoggedIn = true;
      currentUser = data.user;
      userMenu.style.display = 'block';
      authBtn.style.display = 'none';
      welcomeText.textContent = `Welcome, ${data.user.firstName || data.user.username || data.user.displayName || data.user.email}`;
      document.getElementById('username-btn').addEventListener('click', toggleDropdown);
      await loadUserSessionsFromServer();
    } else {
      isUserLoggedIn = false;
      currentUser = null;
      userMenu.style.display = 'none';
      authBtn.style.display = 'block';
      sessions = JSON.parse(localStorage.getItem('chatSessions')) || [];
      currentSession = sessions.length > 0 ? sessions[sessions.length - 1] : createNewSession();
    }
  } catch (error) {
    isUserLoggedIn = false;
    currentUser = null;
    sessions = JSON.parse(localStorage.getItem('chatSessions')) || [];
    currentSession = sessions.length > 0 ? sessions[sessions.length - 1] : createNewSession();
  }
}

async function loadUserSessionsFromServer() {
  try {
    const response = await fetch('/api/user/sessions');
    const data = await response.json();
    
    if (data.sessions) {
      sessions = data.sessions;
      currentSession = sessions.length > 0 ? sessions[sessions.length - 1] : createNewSession();
      loadChatHistory();
    } else {
      sessions = [];
      currentSession = createNewSession();
      loadChatHistory();
    }
  } catch (error) {
    console.error('Error loading user sessions:', error);
    // Fallback to creating a new session if loading fails
    sessions = [];
    currentSession = createNewSession();
    loadChatHistory();
  }
}

function toggleDropdown(e) {
  e.stopPropagation();
  const dropdown = document.getElementById('dropdown-menu');
  dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
}

window.addEventListener('click', () => {
  document.getElementById('dropdown-menu').style.display = 'none';
});

async function logoutUser() {
  try {
    await fetch('/logout');
    document.getElementById('user-menu').style.display = 'none';
    document.getElementById('login-btn').style.display = 'block';
    sessions = [];
    localStorage.removeItem('chatSessions');
    currentSession = createNewSession();
    isUserLoggedIn = false;
    currentUser = null;
    sessions = JSON.parse(localStorage.getItem('chatSessions')) || [];
    currentSession = sessions.length > 0 ? sessions[sessions.length - 1] : createNewSession();
    if (sessions.length === 0) {
      currentSession = createNewSession();
      sessions.push(currentSession);
      localStorage.setItem('chatSessions', JSON.stringify(sessions));
    }
    loadChatHistory();
    loadSession(currentSession);
  } catch (error) {
    document.getElementById('user-menu').style.display = 'none';
    document.getElementById('login-btn').style.display = 'block';
    isUserLoggedIn = false;
    currentUser = null;
    sessions = JSON.parse(localStorage.getItem('chatSessions')) || [];
    currentSession = sessions.length > 0 ? sessions[sessions.length - 1] : createNewSession();
    loadChatHistory();
    loadSession(currentSession);
  }
}

document.getElementById('login-btn').addEventListener('click', () => {
  document.getElementById('auth-modal').style.display = 'flex';
});
document.getElementById('google-signup-btn').addEventListener('click', () => {
  window.location.href = 'http://localhost:4000/auth/google';
});
document.getElementById('google-login-btn').addEventListener('click', () => {
  window.location.href = 'http://localhost:4000/auth/google';
});
document.getElementById('signup-submit').addEventListener('click', async () => {
  const username = document.getElementById('signup-username').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  try {
    const res = await fetch('http://localhost:4000/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();
    if (data.message && data.message.includes('Signup success')) {
      document.getElementById('auth-modal').style.display = 'none';
      
      // Save current anonymous sessions before switching to logged-in user
      if (!isUserLoggedIn && sessions.length > 0) {
        localStorage.setItem('chatSessions', JSON.stringify(sessions));
      }
      
      // Update user status and load their sessions
      checkUserStatus();
    } else {
      alert(data.message || 'Signup failed. Please try again.');
    }
  } catch (error) {
    console.error('Signup error:', error);
    alert('Signup failed. Please check the console for more details.');
  }
});

document.getElementById('login-submit').addEventListener('click', async () => {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  try {
    const res = await fetch('http://localhost:4000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.message === 'Login success') {
      document.getElementById('auth-modal').style.display = 'none';
      
      // Save current anonymous sessions before switching to logged-in user
      if (!isUserLoggedIn && sessions.length > 0) {
        localStorage.setItem('chatSessions', JSON.stringify(sessions));
      }
      
      // Update user status and load their sessions
      checkUserStatus();
    } else {
      alert(data.message || 'Login failed. Please try again.');
    }
  } catch (error) {
    console.error('Login error:', error);
    alert('Login failed. Please check the console for more details.');
  }
});
function updateTaskCounter() {
  const taskCounter = document.getElementById('task-counter');
  const upcomingTasks = getUpcomingTasks();
  
  if (upcomingTasks.length > 0) {
    taskCounter.textContent = upcomingTasks.length;
    taskCounter.style.display = 'flex';
  } else {
    taskCounter.style.display = 'none';
  }
}

function handleSchedulingInChat(message) {
  const schedulingRegex = /schedule|remind|task|appointment|set up|plan|on\s+\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|weekly|daily|monthly|tomorrow|next week/i;
  
  if (!schedulingRegex.test(message)) return null;
  
  let date = 'today';
  let time = '9:00 AM';
  let taskDescription = message;
  let isRecurring = false;
  let recurringPattern = '';
  
  const dateRegex = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i;
  const dateMatch = message.match(dateRegex);
  
  if (dateMatch) {
    date = dateMatch[1];
    const dateParts = date.split(/[\/\-]/);
    if (dateParts.length === 3) {
      const dateObj = new Date(dateParts[2].length === 2 ? `20${dateParts[2]}` : dateParts[2], dateParts[0] - 1, dateParts[1]);
      date = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
  }
  
  const timeRegex = /(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i;
  const timeMatch = message.match(timeRegex);
  if (timeMatch) {
    time = timeMatch[1];
  }
  
  const weeklyRegex = /weekly|every\s+week|each\s+week/i;
  const dailyRegex = /daily|every\s+day|each\s+day/i;
  const monthlyRegex = /monthly|every\s+month|each\s+month/i;
  
  if (weeklyRegex.test(message)) {
    isRecurring = true;
    recurringPattern = 'weekly';
  } else if (dailyRegex.test(message)) {
    isRecurring = true;
    recurringPattern = 'daily';
  } else if (monthlyRegex.test(message)) {
    isRecurring = true;
    recurringPattern = 'monthly';
  }
  
  taskDescription = taskDescription
    .replace(/schedule|remind me to|set up|plan/gi, '')
    .replace(dateRegex, '')
    .replace(timeRegex, '')
    .replace(weeklyRegex, '')
    .replace(dailyRegex, '')
    .replace(monthlyRegex, '')
    .replace(/on|at|for|by/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  const newTask = addScheduledTask(taskDescription, date, time, isRecurring, recurringPattern);
  
  let responseMessage = `${botName}: I've added "${taskDescription}" to your schedule for ${date}`;
  if (time) responseMessage += ` at ${time}`;
  if (isRecurring) responseMessage += `. This task will repeat ${recurringPattern}.`;
  responseMessage += ".\n\nYou can view and manage all your scheduled tasks by clicking the calendar icon in the top right corner.";
  
  return responseMessage;
}

function setTemperature(temp) {
  const dropdown = document.getElementById('temperature-dropdown');
  
  temp = Math.max(0.3, Math.min(1.0, parseFloat(temp)));
  
  let closestOption;
  if (temp <= 0.3) closestOption = '0.3';
  else if (temp <= 0.7) closestOption = '0.7';
  else closestOption = '1.0';
  
  dropdown.value = closestOption;
  
  localStorage.setItem('chatTemperature', closestOption);
  
  console.log('Temperature set to:', closestOption);
}

function getCurrentTemperature() {
  return parseFloat(localStorage.getItem('chatTemperature') || 0.7);
}

window.addEventListener('load', async () => {
  // Check user status first - this will determine which sessions to load
  await checkUserStatus();
  
  const welcomeScreen = document.getElementById('welcome-screen');
  
  // Always show welcome screen on initial load
  welcomeScreen.style.display = 'flex';
  
  if (currentSession.conversation.length === 1) {
    displayPlaceholder();
  } else {
    loadSession(currentSession);
  }
  
  updateTaskCounter();
  
  const temperatureDropdown = document.getElementById('temperature-dropdown');
  
  const tempDropdownContainer = document.querySelector('.temperature-dropdown-container');
  
  tempDropdownContainer.addEventListener('click', function(e) {
    if (e.target !== temperatureDropdown) {
      e.preventDefault();
      this.classList.toggle('active');
      
      if (this.classList.contains('active')) {
        temperatureDropdown.style.display = 'block';
        temperatureDropdown.focus();
      }
    }
    e.stopPropagation();
  });
  
  // Close dropdown when clicking elsewhere
  document.addEventListener('click', function() {
    tempDropdownContainer.classList.remove('active');
    temperatureDropdown.style.display = 'none';
  });

  // Handle dropdown option selection
  temperatureDropdown.addEventListener('change', function() {
    const temp = parseFloat(this.value);
    setTemperature(temp);
    console.log('Temperature set to:', temp);
    tempDropdownContainer.classList.remove('active');
    temperatureDropdown.style.display = 'none';
  });
  
  // Close dropdown when losing focus
  temperatureDropdown.addEventListener('blur', function() {
    setTimeout(() => {
      tempDropdownContainer.classList.remove('active');
      temperatureDropdown.style.display = 'none';
    }, 200); // Small delay to allow for option selection
  });

  
  // Set initial temperature from localStorage
  const savedTemp = getCurrentTemperature();
  setTemperature(savedTemp);
  
  // Temperature settings initialized
});

// Temperature slider is always visible, no need to close it
document.getElementById('user-input').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') sendMessage();
});

// Feature buttons functionality
function insertQuery(query) {
  const userInput = document.getElementById('user-input');
  userInput.value = query;
  sendMessage();
}

document.getElementById('cleaning-tips-btn').addEventListener('click', function() {
  insertQuery('Give me some general cleaning tips');
});

document.getElementById('stain-removal-btn').addEventListener('click', function() {
  insertQuery('How do I remove tough stains?');
});

document.getElementById('cleaning-schedule-btn').addEventListener('click', function() {
  showSchedulerModal();
});

document.getElementById('eco-cleaning-btn').addEventListener('click', function() {
  insertQuery('What are some eco-friendly cleaning solutions?');
});

// Temperature slider removed as requested

document.getElementById('new-chat-btn').addEventListener('click', function() {
  startNewChat();
});


document.getElementById('login-btn').addEventListener('click', () => {
  document.getElementById('auth-modal').style.display = 'flex';
});
document.getElementById('modal-close').addEventListener('click', () => {
  document.getElementById('auth-modal').style.display = 'none';
});

document.getElementById('tab-signup').addEventListener('click', () => {
  document.getElementById('signup-section').style.display = 'block';
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('tab-signup').classList.add('active');
  document.getElementById('tab-login').classList.remove('active');
});

document.getElementById('tab-login').addEventListener('click', () => {
  document.getElementById('login-section').style.display = 'block';
  document.getElementById('signup-section').style.display = 'none';
  document.getElementById('tab-login').classList.add('active');
  document.getElementById('tab-signup').classList.remove('active');
});

document.getElementById('google-signup-btn').addEventListener('click', () => {
  window.location.href = 'http://localhost:4000/auth/google';
});

document.getElementById('google-login-btn').addEventListener('click', () => {
  window.location.href = 'http://localhost:4000/auth/google';
});

document.getElementById('signup-submit').addEventListener('click', async () => {
  const username = document.getElementById('signup-username').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;

  try {
    const res = await fetch('http://localhost:4000/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();
    console.log(data);
    
    if (data.message && data.message.includes('Signup success')) {
      document.getElementById('auth-modal').style.display = 'none';
      
      // Save current anonymous sessions before switching to logged-in user
      if (!isUserLoggedIn && sessions.length > 0) {
        localStorage.setItem('chatSessions', JSON.stringify(sessions));
      }
      
      // Update user status and load their sessions
      checkUserStatus();
    } else {
      alert(data.message || 'Signup failed. Please try again.');
    }
  } catch (error) {
    console.error('Signup error:', error);
    alert('Signup failed. Please check the console for more details.');
  }
});

document.getElementById('login-submit').addEventListener('click', async () => {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch('http://localhost:4000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    console.log(data);
    if (data.message === 'Login success') {
      document.getElementById('auth-modal').style.display = 'none';
      
      // Save current anonymous sessions before switching to logged-in user
      if (!isUserLoggedIn && sessions.length > 0) {
        localStorage.setItem('chatSessions', JSON.stringify(sessions));
      }
      
      // Update user status and load their sessions
      checkUserStatus();
    } else {
      alert(data.message || 'Login failed. Please try again.');
    }
  } catch (error) {
    console.error('Login error:', error);
    alert('Login failed. Please check the console for more details.');
  }
});
function updateTaskCounter() {
  const taskCounter = document.getElementById('task-counter');
  const upcomingTasks = getUpcomingTasks();
  
  if (upcomingTasks.length > 0) {
    taskCounter.textContent = upcomingTasks.length;
    taskCounter.style.display = 'flex';
  } else {
    taskCounter.style.display = 'none';
  }
}

function handleSchedulingInChat(message) {
  const schedulingRegex = /schedule|remind|task|appointment|set up|plan|on\s+\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|weekly|daily|monthly|tomorrow|next week/i;
  
  if (!schedulingRegex.test(message)) return null;
  
  let date = 'today';
  let time = '9:00 AM';
  let taskDescription = message;
  let isRecurring = false;
  let recurringPattern = '';
  
  const dateRegex = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i;
  const dateMatch = message.match(dateRegex);
  
  if (dateMatch) {
    date = dateMatch[1];
    const dateParts = date.split(/[\/\-]/);
    if (dateParts.length === 3) {
      const dateObj = new Date(dateParts[2].length === 2 ? `20${dateParts[2]}` : dateParts[2], dateParts[0] - 1, dateParts[1]);
      date = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
  }
  
  const timeRegex = /(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i;
  const timeMatch = message.match(timeRegex);
  if (timeMatch) {
    time = timeMatch[1];
  }
  
  const weeklyRegex = /weekly|every\s+week|each\s+week/i;
  const dailyRegex = /daily|every\s+day|each\s+day/i;
  const monthlyRegex = /monthly|every\s+month|each\s+month/i;
  
  if (weeklyRegex.test(message)) {
    isRecurring = true;
    recurringPattern = 'weekly';
  } else if (dailyRegex.test(message)) {
    isRecurring = true;
    recurringPattern = 'daily';
  } else if (monthlyRegex.test(message)) {
    isRecurring = true;
    recurringPattern = 'monthly';
  }
  
  taskDescription = taskDescription
    .replace(/schedule|remind me to|set up|plan/gi, '')
    .replace(dateRegex, '')
    .replace(timeRegex, '')
    .replace(weeklyRegex, '')
    .replace(dailyRegex, '')
    .replace(monthlyRegex, '')
    .replace(/on|at|for|by/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  const newTask = addScheduledTask(taskDescription, date, time, isRecurring, recurringPattern);
  
  let responseMessage = `${botName}: I've added "${taskDescription}" to your schedule for ${date}`;
  if (time) responseMessage += ` at ${time}`;
  if (isRecurring) responseMessage += `. This task will repeat ${recurringPattern}.`;
  responseMessage += ".\n\nYou can view and manage all your scheduled tasks by clicking the calendar icon in the top right corner.";
  
  return responseMessage;
}

function setTemperature(temp) {
  const dropdown = document.getElementById('temperature-dropdown');
  
  temp = Math.max(0.3, Math.min(1.0, parseFloat(temp)));
  
  let closestOption;
  if (temp <= 0.3) closestOption = '0.3';
  else if (temp <= 0.7) closestOption = '0.7';
  else closestOption = '1.0';
  
  dropdown.value = closestOption;
  
  localStorage.setItem('chatTemperature', closestOption);
  
  console.log('Temperature set to:', closestOption);
}

function getCurrentTemperature() {
  return parseFloat(localStorage.getItem('chatTemperature') || 0.7);
}

window.addEventListener('load', async () => {
  // Check user status first - this will determine which sessions to load
  await checkUserStatus();
  
  const welcomeScreen = document.getElementById('welcome-screen');
  
  // Always show welcome screen on initial load
  welcomeScreen.style.display = 'flex';
  
  if (currentSession.conversation.length === 1) {
    displayPlaceholder();
  } else {
    loadSession(currentSession);
  }
  
  updateTaskCounter();
  
  const temperatureDropdown = document.getElementById('temperature-dropdown');
  
  const tempDropdownContainer = document.querySelector('.temperature-dropdown-container');
  
  tempDropdownContainer.addEventListener('click', function(e) {
    if (e.target !== temperatureDropdown) {
      e.preventDefault();
      this.classList.toggle('active');
      
      if (this.classList.contains('active')) {
        temperatureDropdown.style.display = 'block';
        temperatureDropdown.focus();
      }
    }
    e.stopPropagation();
  });
  
  // Close dropdown when clicking elsewhere
  document.addEventListener('click', function() {
    tempDropdownContainer.classList.remove('active');
    temperatureDropdown.style.display = 'none';
  });

  // Handle dropdown option selection
  temperatureDropdown.addEventListener('change', function() {
    const temp = parseFloat(this.value);
    setTemperature(temp);
    console.log('Temperature set to:', temp);
    tempDropdownContainer.classList.remove('active');
    temperatureDropdown.style.display = 'none';
  });
  
  // Close dropdown when losing focus
  temperatureDropdown.addEventListener('blur', function() {
    setTimeout(() => {
      tempDropdownContainer.classList.remove('active');
      temperatureDropdown.style.display = 'none';
    }, 200); // Small delay to allow for option selection
  });

  
  // Set initial temperature from localStorage
  const savedTemp = getCurrentTemperature();
  setTemperature(savedTemp);
  
  // Temperature settings initialized
});

// Temperature slider is always visible, no need to close it
document.getElementById('user-input').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') sendMessage();
});

// Feature buttons functionality
function insertQuery(query) {
  const userInput = document.getElementById('user-input');
  userInput.value = query;
  sendMessage();
}

document.getElementById('cleaning-tips-btn').addEventListener('click', function() {
  insertQuery('Give me some general cleaning tips');
});

document.getElementById('stain-removal-btn').addEventListener('click', function() {
  insertQuery('How do I remove tough stains?');
});

document.getElementById('cleaning-schedule-btn').addEventListener('click', function() {
  showSchedulerModal();
});

document.getElementById('eco-cleaning-btn').addEventListener('click', function() {
  insertQuery('What are some eco-friendly cleaning solutions?');
});

// Temperature slider removed as requested

document.getElementById('new-chat-btn').addEventListener('click', function() {
  startNewChat();
});


document.getElementById('login-btn').addEventListener('click', () => {
  document.getElementById('auth-modal').style.display = 'flex';
});
document.getElementById('modal-close').addEventListener('click', () => {
  document.getElementById('auth-modal').style.display = 'none';
});

document.getElementById('tab-signup').addEventListener('click', () => {
  document.getElementById('signup-section').style.display = 'block';
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('tab-signup').classList.add('active');
  document.getElementById('tab-login').classList.remove('active');
});

document.getElementById('tab-login').addEventListener('click', () => {
  document.getElementById('login-section').style.display = 'block';
  document.getElementById('signup-section').style.display = 'none';
  document.getElementById('tab-login').classList.add('active');
  document.getElementById('tab-signup').classList.remove('active');
});