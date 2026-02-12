# Family Hub - Frontend

A modern family organization app that helps families manage shared tasks, calendars, and member profiles in one centralized hub.

## Tech Stack

- **React** 19.2.0 - UI framework
- **Vite** 7.2.4 - Build tool & dev server with HMR
- **React Router** 7.13.0 - Client-side routing
- **date-fns** 4.1.0 - Date utilities
- **react-day-picker** 9.7.0 - Calendar component
- **ESLint** - Code linting

## Project Structure

```
src/
 api/                    # API service layer
    auth.js
    persona.js
    fetchProtectedDataService.js
 Components/             # Reusable components
    LoginForm.jsx
    TodoList.jsx
 Layouts/                # Layout wrappers
    AppShell.jsx        # Main app layout with sidebar
 Pages/                  # Page components
    Public/             # Pages for unauthenticated users
       WelcomePage.jsx
       LoginPage.jsx
    Private/            # Pages for authenticated users
        FamilyHubPage.jsx
        ProfileSettingsPage.jsx
        TodoListsPage.jsx
        FamilyCalendarPage.jsx
 assets/                 # Static assets
 App.jsx                 # Main app & routing
 main.jsx                # Entry point
 index.css               # Global styles
```

## Installation

1. Clone the repository and navigate to the project directory:
   ```sh
   cd family-hub-front
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

## Development

Start the development server with hot module replacement:
```sh
npm run dev
```

The app will be available at `localhost:5173` (or similar).

## Build

Create an optimized production build:
```sh
npm run build
```

Preview the production build:
```sh
npm run preview
```

## Linting

Check code for linting errors:
```sh
npm run lint
```

## Pages

- **Welcome** - Landing page for new visitors
- **Login/Register** - Authentication pages
- **Family Hub** - Family group management (invitation codes, members, shared spaces)
- **Profile Settings** - Personal user profile (name, birthday, gender, avatar)
- **To-Do Lists** - Shared family task management
- **Family Calendar** - Shared family calendar

## Routing

- `/welcome` - Welcome page
- `/login` - Login page
- `/register` - Registration page
- `/app` - Family Hub (requires authentication)
  - `/app/profile` - Profile settings
  - `/app/family/todo` - To-do lists
  - `/app/family/calendar` - Family calendar

## License

Private project
