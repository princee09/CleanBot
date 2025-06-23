const express = require('express');
const cors = require('cors');
const session = require('express-session');
const mongoose = require('mongoose');
const passport = require('./passport-config');
const User = require('./models/User');
const UserChatSession = require('./models/UserChatSession');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const MongoStore = require('connect-mongo');
require('dotenv').config();

const app = express();

// Trust proxy - CRITICAL for deployment platforms
app.set('trust proxy', 1);

// Security middleware with relaxed CSP for API connections
// Temporary fix - disable CSP in development
if (process.env.NODE_ENV !== 'production') {
  app.use(helmet({
    contentSecurityPolicy: false
  }));
} else {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      },
    },
  }));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Chat-specific rate limiting
const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 chat requests per minute
  message: 'Too many chat requests, please slow down.'
});
app.use('/api/chat', chatLimiter);

app.use(cors());
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    touchAfter: 24 * 3600 // lazy session update
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
}));
app.use(passport.initialize());
app.use(passport.session());


mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  connectTimeoutMS: 30000,
})
.then(() => console.log(' MongoDB Connected'))
.catch(err => console.error('MongoDB error:', err));


app.post('/auth/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User exists' });
    
    user = new User({ username, email, password });
    await user.save();
    
    req.login(user, (err) => {
      if (err) return res.status(500).json({ message: 'Login error' });
      res.status(200).json({ message: 'Signup success', user });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/auth/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return res.status(500).json({ message: 'Authentication error', error: err.message });
    if (!user) return res.status(401).json({ message: info.message || 'Authentication failed' });
    
    req.login(user, (err) => {
      if (err) return res.status(500).json({ message: 'Login error', error: err.message });
      return res.json({ message: 'Login success', user });
    });
  })(req, res, next);
});


app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    
    res.redirect('/');
  }
);


// Initialize Google Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


const systemPrompt = 'You are a cleaning expert and witty female robot assistant named Anna. Act as a friendly female bot. Follow the conversation context to provide detailed step-by-step cleaning instructions. Use bullet points, spacing, and relevant emojis (e.g., ✅, ✨, 🧹) in your responses. If the user greets you (e.g., "hi", "hello"), respond with a warm greeting. If the user asks personal questions like "Who are you?" or "What is your name?", reply "I am Anna, your AI cleaning assistant." Also, remember any cleaning-related details provided by the user for later reference. I want you to answer according to the temperature set like if it is low the answer should be in tact and brief but if it is high it should be more random and cover more content. If the question is not about cleaning, respond with "Out of my scope".'

let currentSession = {
  sessionId: Date.now().toString(),
  title: 'New Chat',
  conversation: [{
    role: 'system',
    content: systemPrompt
  }]
};

app.post('/api/chat/new', (req, res) => {
  currentSession = {
    sessionId: Date.now().toString(),
    title: 'New Chat',
    conversation: [{ role: 'system', content: systemPrompt }]
  };
  res.json({ message: 'New session', session: currentSession });
});


function generateChatTitle(message) {
  if (!message || message.length < 3) return 'New Chat';
  
  
  const maxLength = 30;
  let title = message.substring(0, maxLength);
  if (message.length > maxLength) title += '...';
  
  return title;
}

app.delete('/api/chat', (req, res) => {
  currentSession = {
    sessionId: Date.now().toString(),
    title: 'New Chat',
    conversation: [{ role: 'system', content: systemPrompt }]
  };
  res.json({ message: 'Session reset', session: currentSession });
});

app.put('/api/chat/rename', (req, res) => {
  const { newTitle } = req.body;
  if (!newTitle) return res.status(400).json({ error: 'Title required' });
  currentSession.title = newTitle;
  res.json({ message: 'Renamed', session: currentSession });
});


app.post('/api/chat', async (req, res) => {
  const { message, temperature } = req.body;
  currentSession.conversation.push({ role: 'user', content: message });
  
  try {
    // Validate temperature
    let validTemperature = 0.7; 
    if (temperature !== undefined) {
      validTemperature = Math.max(0.3, Math.min(1.0, parseFloat(temperature)));
    }
    
    // Get Gemini model
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: validTemperature,
        maxOutputTokens: 800,
      },
    });
    
    // Format conversation history for Gemini
    const formattedHistory = currentSession.conversation.map(msg => {
      if (msg.role === 'system') {
        return { role: 'user', parts: [{ text: msg.content }] };
      } else if (msg.role === 'user') {
        return { role: 'user', parts: [{ text: msg.content }] };
      } else {
        return { role: 'model', parts: [{ text: msg.content }] };
      }
    });
    
    // Create chat session
    const chat = model.startChat({
      history: formattedHistory.slice(0, -1), // Exclude the last user message
      generationConfig: {
        temperature: validTemperature,
        maxOutputTokens: 800,
      },
    });
    
    // Generate response
    const result = await chat.sendMessage(message);
    const reply = result.response.text();
    
    // Add response to conversation history
    currentSession.conversation.push({ role: 'assistant', content: reply });
    
    // Update title if this is the first message
    if (currentSession.title === 'New Chat' && currentSession.conversation.length === 3) {
      const firstUserMessage = currentSession.conversation[1].content;
      currentSession.title = generateChatTitle(firstUserMessage);
    }
    
    res.json({ reply, session: currentSession });
    
  } catch (error) {
    console.error('Gemini API error:', error);
    res.json({ reply: '🤖 Service unavailable', session: currentSession });
  }
});

app.get('/api/user', (req, res) => {
  req.isAuthenticated() ? res.json({ user: req.user }) : res.json({ user: null });
});

app.get('/logout', (req, res) => {
  req.logout(() => res.redirect('/'));
});

// User chat session endpoints
app.get('/api/user/sessions', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  try {
    const userSessions = await UserChatSession.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .exec();
    res.json({ sessions: userSessions });
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/user/sessions', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  try {
    const { session } = req.body;
    
    // Create a new session or update existing one
    const existingSession = await UserChatSession.findOne({ 
      userId: req.user._id,
      sessionId: session.sessionId 
    });
    
    if (existingSession) {
      existingSession.title = session.title;
      existingSession.conversation = session.conversation;
      await existingSession.save();
      res.json({ message: 'Session updated', session: existingSession });
    } else {
      const newSession = new UserChatSession({
        userId: req.user._id,
        sessionId: session.sessionId,
        title: session.title,
        conversation: session.conversation,
        createdAt: session.createdAt || new Date()
      });
      await newSession.save();
      res.json({ message: 'Session created', session: newSession });
    }
  } catch (error) {
    console.error('Error saving user session:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/user/sessions/:sessionId', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  try {
    await UserChatSession.findOneAndDelete({
      userId: req.user._id,
      sessionId: req.params.sessionId
    });
    res.json({ message: 'Session deleted' });
  } catch (error) {
    console.error('Error deleting user session:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/user/sessions/:sessionId/rename', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  try {
    const { newTitle } = req.body;
    if (!newTitle) return res.status(400).json({ error: 'Title required' });
    
    const session = await UserChatSession.findOne({
      userId: req.user._id,
      sessionId: req.params.sessionId
    });
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    session.title = newTitle;
    await session.save();
    res.json({ message: 'Session renamed', session });
  } catch (error) {
    console.error('Error renaming user session:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.use(express.static('public'));
app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'));

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong!' 
      : err.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || process.env.BACKEND_PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

