# 🥗 GreenBite: AI-Powered Carbon Footprint Food Tracker

GreenBite is a mobile-friendly web application that helps users track and reduce their carbon footprint from food consumption using AI-powered food recognition and a comprehensive carbon footprint database.

---

## 🚀 What It Does

- **Log Meals with AI:** Snap a photo of your meal or enter items manually. The AI identifies food items and estimates quantities.
- **Instant Carbon Footprint:** Get an automatic calculation of your meal's carbon footprint (kg CO₂e) using our comprehensive database or AI estimation.
- **Progress Tracking:** Visualize your daily and weekly carbon impact, compare to national averages, and see trends.
- **Personalized Recommendations:** Receive AI-powered eco-friendly tips, food swaps, and sustainability advice.
- **Challenges & Streaks:** Stay motivated with daily/weekly goals, streaks, and achievement feedback.

---

## 🧩 Core Features

### 1. 📷 AI Meal Logging
- Take a photo or enter food items.
- AI detects and estimates food quantities (e.g., "200g beef", "1 cup rice").
- Edit and confirm before saving.
- Instant carbon footprint breakdown and history.

### 2. 📈 Progress & Analytics
- See today's and last 7 days' CO₂e totals.
- 7-day bar graph with national average reference.
- Tap a bar to view detailed food logs for that day.
- AI-generated insights and affirmations.

### 3. 💬 AI Recommendations
- Personalized tips based on your eating patterns.
- Suggested food swaps to lower your carbon impact.
- Built-in AI chatbot for sustainability questions.

### 4. 🏆 Challenges & Streaks
- Daily/weekly goals (e.g., stay under X kg/day).
- Streaks for eco-friendly eating.
- Visual feedback and achievement badges.

### 5. 🌱 Smart Feedback
- AI analyzes each meal for impact.
- High footprint? Get reduction suggestions.
- Low footprint? Receive positive affirmations.
- Real-world equivalency (e.g., "This meal = 4 km of driving").

---

## 🛠️ Tech Stack

- **Frontend:** Next.js, React, TypeScript
- **Styling:** Tailwind CSS, Shadcn UI
- **State Management:** React Context API
- **AI Integration:** Gemini API (for food recognition and smart recommendations)
- **Data Storage:** CSV food database and browser LocalStorage
- **Data Visualization:** Recharts
- **Forms & Validation:** React Hook Form

---

## 🗂️ Project Structure

```
/
├── ai/              # AI flows: food recognition, carbon estimation, tips, chatbot, etc.
│   └── flows/       # Individual AI-powered features
├── app/             # Next.js app router pages (log-meal, meal-result, reports, etc.)
├── components/      # Reusable UI components (header, nav, cards, etc.)
├── context/         # React context providers (app context for state management)
├── hooks/           # Custom React hooks
├── lib/             # Utility functions and helpers
├── services/        # Data services (food database, carbon calculations)
├── ui/              # Shadcn UI components
└── public/          # Static assets including the food database (CSV)
```

---

## 📱 Main Pages

- `/` – Home/Dashboard: Streaks, today's CO₂e, quick actions, challenges
- `/log-meal` – Log a meal (photo upload, AI detection)
- `/review-meal` – Edit and confirm meal details
- `/meal-result` – See carbon breakdown, feedback, and suggestions
- `/reports` – Progress analytics, 7-day graph, meal logs
- `/recommendations` – Personalized tips, food swaps, chatbot
- `/login` – Lightweight login (no authentication for MVP)

---

## 🏁 Getting Started

### Prerequisites
- Node.js (LTS)
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd greenbite
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   ```
   The app will be available at [http://localhost:3000](http://localhost:3000)

---

## 📊 Architecture & Process Flow

GreenBite follows a modular architecture with clear separation between UI components, AI processing flows, data services, and state management.

- **Architecture Diagram:** View the complete architecture in `/architecture-diagram-mermaid.html`
- **Process Flow Diagram:** See the detailed user journey in `/process-flow-diagram.html`

These diagrams show how the different components of the application interact, from user actions to AI processing to data storage.

---

## 🤝 Contributing

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

[MIT License](LICENSE) – see the LICENSE file for details.

---

## 🙏 Acknowledgments

- Next.js, React, Tailwind CSS, Shadcn UI, Gemini API, Recharts
- All contributors and open-source projects that made this possible
