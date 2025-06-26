# Interactive Event Calendar

A modern, interactive calendar web app for managing and scheduling events with drag-and-drop, recurring events, and more.

## Prerequisites

- **Node.js** (v18 or newer recommended)
- **npm** (v9 or newer) or **yarn**

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd <project-directory>
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start the development server:**
   ```bash
   npm run build
   npm run dev
   # or
   yarn dev
   ```

4. **Open the app:**
   Visit [http://localhost:5173](http://localhost:5173) (or the port shown in your terminal) in your browser.

## Features
- Month view calendar
- Add, edit, and delete events
- Drag and drop events to different days (future days only)
- Recurring events support
- Category and search filtering
- Responsive design

## Tech Stack
- React 19
- TypeScript
- Vite
- date-fns
- react-dnd
- react-toastify
- Tailwind CSS (via CDN)

## Notes
- Events are stored in your browser's local storage.
- You cannot add or move events to past days.
- Toast notifications are used for feedback and errors.

## License
MIT
