# Expert Twin

**Expert Twin** is a cognitive replication engine that allows creators to build and interact with digital duplicates of their own expertise. Think of it as **"Airbnb for your brain"**—a space where you can configure your knowledge base, customize your tone of voice, and host a digital twin that can consult, answer questions, and converse 24/7.

---

## 🚀 Key Features

* **Creator Dashboard**: An elegant layout to configure your digital twin. Set the expert's name, choose a specific tone of voice, and paste raw text documents to construct the brain's knowledge base.
* **Tone of Voice Personalization**: Dynamic persona settings including:
  * 👔 **Professional**: Formal, structured, precise, and authoritative.
  * ☕ **Casual**: Conversational, friendly, accessible, and simple.
  * ✨ **Witty**: Clever, humorous, engaging, and sharp.
* **Dual-Inference Backend**: Automatically routes traffic to **OpenAI** (`gpt-4o-mini`) or **Groq** (`llama-3.3-70b-versatile`) depending on which API key is configured.
* **Interactive Sandbox Chat**: A built-in testing interface allowing you to chat with any of your synthesized twins in real time to refine their responses.
* **Local Memory Persistence**: Digital twins are saved in local state and persisted inside browser `localStorage`, keeping configuration fully private and surviving page refreshes.
* **Sleek Dark Theme**: Premium glassmorphic interface built with neon glowing grids, transitions, and text-gradient animations.

---

## 🛠️ Technology Stack

* **Framework**: [Next.js](https://nextjs.org/) (App Router, Route Handlers, TypeScript)
* **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (CSS variables, `@theme inline`, Backdrop Filters)
* **AI Completions**: [OpenAI SDK](https://github.com/openai/openai-node) (compatible with Groq API endpoints)
* **Package Manager**: NPM

---

## 💻 Running Locally

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed (v18.x or higher is recommended).

### 2. Scaffolding Installation
Clone or navigate to the project directory and install the dependencies:
```bash
npm install
```

### 3. Setup API Keys
Create a `.env.local` file in the root directory (a template is provided) and configure your preferred API key:
```env
# To use OpenAI (gpt-4o-mini):
OPENAI_API_KEY=your_openai_key

# OR to use Groq (llama-3.3-70b-versatile):
GROQ_API_KEY=your_groq_key
```
*Note: If both keys are missing, the application will run in simulated fallback mode, utilizing a local keyword-search engine so you can still test the interface.*

### 4. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your web browser to explore your dashboard.
