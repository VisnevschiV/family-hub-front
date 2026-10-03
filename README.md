<div align="center">
  <img src="public/logo.png" alt="Happy Wife Happy Life logo" width="140" />
  <h1>Happy Wife Happy Life 🏡</h1>
  <p><strong>A little less chaos. A little more together.</strong></p>
  <p>A family organizer for shared plans, everyday tasks, and household budgets.</p>
  <p>
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=white" alt="React 19" />
    <img src="https://img.shields.io/badge/Vite-7-646CFF?style=flat&logo=vite&logoColor=white" alt="Vite 7" />
    <img src="https://img.shields.io/badge/JavaScript-ES_Modules-F7DF1E?style=flat&logo=javascript&logoColor=black" alt="JavaScript ES modules" />
    <img src="https://img.shields.io/badge/Made_for-everyday_life-F4A7B9?style=flat" alt="Made for everyday life" />
  </p>
</div>

---

Families juggle appointments, shopping lists, chores, and expenses every day. **Happy Wife Happy Life** brings those small moving parts into one shared space, with responsive layouts and light and dark themes.

This repository contains the **React frontend**, plus an Azure Function for exchange rates. Authentication and family data rely on a separate backend API.

## 🌷 Take a look

The `/welcome` page includes interactive examples of tasks, calendar days, and budgets, so visitors can explore the idea before creating an account. Run the frontend locally and open [the welcome page](http://localhost:5173/welcome).

## ✨ What families can do

| Feature | What it offers |
| --- | --- |
| 🏡 Family hub | Create or join a family, manage members, and share invitation codes. |
| ✅ Shared to-do lists | Organize lists and tasks, track progress, and complete lists together. |
| 📅 Family calendar | Create and edit events, configure recurring events, and browse the month. |
| 💰 Household budgets | Organize nested budgets and transactions, with multiple currencies and exchange-rate conversion. |
| 🔔 Notifications | Browse notifications, mark them as read, and receive updates through a server-sent event stream. Optional browser push uses a service worker. |
| 🌸 Personal profiles | Edit profile details and configure period tracking and calendar information. |
| 🎨 Personal touches | Switch between light and dark themes, with layouts adapted for desktop and mobile. |

## 🛠️ Engineering highlights

- **Reusable UI:** shared modal primitives, segmented controls, and task components keep common interactions consistent across pages.
- **Centralized API handling:** one fetch client handles credentialed requests, CSRF headers, session refresh, and a retry after refresh. Concurrent refresh requests share a single promise.
- **Calendar interactions:** recurring-event configuration, date navigation, and touch gestures support everyday planning.
- **Nested budget calculations:** totals include child budgets, while exchange rates use an in-memory cache to reduce repeated requests.
- **Live updates:** server-sent events deliver incoming notifications; browser push subscriptions are managed separately.
- **Responsive styling:** shared color variables and separate desktop and mobile styles support both themes and screen sizes.

## 🧰 Tech stack

| Area | Tools |
| --- | --- |
| Interface | React 19, JavaScript, CSS |
| Routing | React Router 7 |
| Dates | date-fns 4, react-day-picker 9 |
| Development | Vite 7, ESLint 9 |
| Browser integration | EventSource, service workers, Push API |
| Hosting configuration | Azure Static Web Apps, Azure Function for exchange rates |

## 🚀 Run locally

Use **Node.js 20.19+ or 22.12+** and npm, matching Vite 7's supported Node versions. Start from a local clone of this repository:

```sh
cd family-hub-front
npm ci
```

Copy `.env.example` to `.env.local`. In PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Set the backend address in `.env.local`:

```dotenv
VITE_API_BASE_URL=http://localhost:8080
```

Start the development server:

```sh
npm run dev
```

Open the URL printed by Vite, usually `http://localhost:5173`. The welcome page contains local demo interactions; signing in and using saved family data require the separate backend. The backend must allow credentialed requests from the frontend origin and provide the expected authentication and CSRF cookies.

### Optional notification configuration

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_WEB_PUSH_PUBLIC_KEY` | Public VAPID key for browser push subscriptions. | Unset; push subscriptions require configuration. |
| `VITE_PUSH_SUBSCRIPTIONS_PATH` | Backend endpoint for push subscriptions. | `/push/subscriptions` |
| `VITE_NOTIFICATIONS_SSE_URL` | Notification stream URL. | `${VITE_API_BASE_URL}/notifications/stream` |

Restart Vite after changing environment variables. Browser push also requires backend support and a supported browser in a secure context, such as HTTPS or localhost.

In development, Vite proxies `/api/exchange-rates` to the exchange-rate provider. The production configuration uses the Azure Function in `api/exchange-rates`; `npm run preview` only serves the frontend build and does not run that function.

### Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server with hot reload. |
| `npm run build` | Create a production build in `dist/`. |
| `npm run preview` | Serve the production frontend build locally. |
| `npm run lint` | Run ESLint. |

## 🗂️ Project map

```text
src/
  api/           API client and feature-specific services
  Components/    Shared UI, forms, lists, and modals
  Layouts/       App shell and navigation
  Pages/
    Public/      Welcome and login/register pages
    Private/     Family hub, calendar, tasks, budgets, and profiles
  styles/        Shared styles and color palette
  theme.js       Theme selection and persistence
  App.jsx        Routes and authentication state
  main.jsx       Application entry point
public/          Logo, web manifest, and push service worker
api/             Azure Function for exchange rates
```

<details>
<summary><strong>Page routes</strong></summary>

| Route | Page |
| --- | --- |
| `/welcome` | Welcome and interactive examples |
| `/login` | Sign in |
| `/register` | Registration |
| `/app` | Family hub |
| `/app/profile` | Profile settings |
| `/app/family/todo` | Shared to-do lists |
| `/app/family/calendar` | Family calendar |
| `/app/family/budget` | Household budgets |
| `/app/notifications` | Notifications |

</details>

## 📄 Project status

This personal portfolio project is currently at the **prototype stage**. Major updates are planned, including resolving remaining inconsistencies, refactoring the color system, and reorganizing the project structure to improve consistency and maintainability. Features and layouts may evolve as this work progresses.

No open-source license is currently included in this repository.
