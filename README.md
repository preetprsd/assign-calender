# Event Calendar

This contains everything you need to run your app locally.

## Features

- **Interactive Calendar**: View and manage events in a monthly calendar view
- **Drag and Drop**: Move events between dates using React DnD
- **Event Management**: Create, edit, and delete events with recurring options
- **Search and Filter**: Search events by title/description and filter by category
- **Conflict Detection**: Automatic detection of event conflicts
- **Responsive Design**: Works on desktop and mobile devices

## Drag and Drop Implementation

The calendar uses **React DnD** for smooth drag and drop functionality:

- **Drag Source**: Events are draggable using the `useDrag` hook
- **Drop Target**: Calendar cells accept drops using the `useDrop` hook
- **Visual Feedback**: Drag and drop operations provide visual feedback
- **Conflict Handling**: Automatic conflict detection when dropping events

### Dependencies

- `react-dnd`: Core drag and drop functionality
- `react-dnd-html5-backend`: HTML5 backend for drag and drop

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`
