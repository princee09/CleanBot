# Cleaning Assistant Chatbot

A full-stack web application featuring an AI-powered cleaning assistant chatbot named Anna, user authentication (local & Google OAuth), persistent chat sessions, and a built-in cleaning task scheduler/calendar. Built with Node.js, Express, MongoDB, Passport.js, and integrates Google Gemini AI for natural language responses.

## Features
- **AI Cleaning Chatbot**: Anna, a witty and friendly cleaning expert, provides step-by-step cleaning advice, tips, and reminders using Google Gemini AI.
- **User Authentication**: Secure signup/login with email & password or Google OAuth 2.0.
- **Persistent Chat Sessions**: User conversations are saved and can be revisited anytime.
- **Cleaning Task Scheduler**: Add, view, and manage cleaning tasks in a calendar-style modal.
- **Responsive UI**: Modern, mobile-friendly design with accessible components.

## Tech Stack
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: Passport.js (Local & Google OAuth)
- **AI Integration**: Google Gemini Generative AI
- **Frontend**: HTML, CSS, JavaScript (Vanilla)

## Usage
- **Sign up or log in** (with email/password or Google)
- **Chat with Anna** for cleaning advice and tips
- **Schedule cleaning tasks** using the calendar modal
- **View and manage your chat sessions and tasks**

## Project Structure
```
finalBot/
├── models/                # Mongoose models (User, ChatSession, UserChatSession)
├── public/                # Frontend assets (HTML, CSS, JS, SVG)
├── server.js              # Main Express server
├── passport-config.js     # Passport strategies
├── package.json           # Project metadata & dependencies
└── README.md              # Project documentation
```

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/YourFeature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/YourFeature`)
5. Open a Pull Request