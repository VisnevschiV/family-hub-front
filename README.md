# Family Hub Frontend

Frontend application for a shared family workspace with authentication, to-do lists, calendar, budget tracking, profile settings, and real-time notifications.

## Tech Stack

- React 19
- Vite 7
- React Router 7
- date-fns
- react-day-picker
- ESLint 9

## Prerequisites

- Node.js 20+ (recommended)
- npm

## Getting Started

1. Install dependencies:

```sh
npm install
```

2. Start the development server:

```sh
npm run dev
```

3. Open the app at `http://localhost:5173`.

## Available Scripts

- `npm run dev` - start Vite dev server
- `npm run build` - build production assets
- `npm run preview` - preview production build locally
- `npm run lint` - run ESLint checks

## Environment Variables

Create a `.env` file in the project root when you need to override API endpoints.

- `VITE_API_BASE_URL` (default: `http://localhost:8080`)
- `VITE_NOTIFICATIONS_SSE_URL` (optional, defaults to `${VITE_API_BASE_URL}/notifications/stream`)

Example:

```env
VITE_API_BASE_URL=http://localhost:8080
```

## Development API Notes

- API requests use cookie-based auth (`credentials: include`) and CSRF headers for write requests.
- The Vite dev server includes a proxy for `/notifications` to `http://localhost:8080`.
- Most API calls use `VITE_API_BASE_URL`, so ensure the backend is reachable from the frontend.

## App Routes

Public routes:

- `/welcome`
- `/login`
- `/register`

Private app routes:

- `/app` (family hub home)
- `/app/family`
- `/app/family/todo`
- `/app/family/calendar`
- `/app/family/budget`
- `/app/profile`
- `/app/notifications`

## Project Structure

```text
src/
  api/                 API clients and domain services
  Components/          Shared UI components and modals
  Layouts/             App shell and layout-specific styles
  Pages/
    Public/            Welcome/Login pages
    Private/           Authenticated feature pages
  App/                 App-level styles
  styles/              Global styles (base, desktop, mobile)
  App.jsx              Route configuration and auth gate
  main.jsx             React entry point
```

## License

Private project.
