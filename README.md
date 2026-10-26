# PulseCheck — Website Uptime Monitoring Dashboard

PulseCheck is a full-stack website monitoring application that checks website availability, records HTTP responses and response times, and presents monitoring results through an analytics dashboard.

Built to explore backend development, REST APIs, SQL database management, scheduled monitoring, and data visualization.

## Features

- **Website Management:** Register and manage website endpoints for monitoring.
- **Automated Monitoring:** Run scheduled checks every five minutes while the backend server is running.
- **HTTP Status Detection:** Distinguish successful responses, redirects, HTTP errors, and unreachable websites.
- **Response-Time Tracking:** Measure and store the time taken for each check.
- **Persistent History:** Save monitoring results in an SQLite database.
- **Analytics Dashboard:** View total checks, success rate, average latency, and status-category counts.
- **Check History:** Review recorded monitoring results for registered websites.
- **Data Visualization:** Present monitoring data and response-time trends through charts.

## Tech Stack

| Technology | Purpose |
|---|---|
| React | Frontend user interface |
| Vite | Frontend development and build tooling |
| Node.js | Backend runtime |
| Express.js | REST API and server |
| SQLite | Persistent data storage |
| better-sqlite3 | SQLite database access |
| Recharts | Dashboard data visualization |

## How It Works

1. Register a website endpoint in the dashboard.
2. PulseCheck sends an HTTP request to the registered URL.
3. The backend records the HTTP status code, response time, success result, and timestamp.
4. The check result is stored in SQLite.
5. The analytics API aggregates historical records.
6. The frontend displays the monitoring results and analytics.

## Architecture

```text
React + Vite Dashboard
          |
          | REST API requests
          v
    Express.js Backend
          |
          v
   Website HTTP Checks
          |
          v
      SQLite Database
          |
          v
   Analytics Aggregation
          |
          v
   Dashboard + Charts
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Check backend health |
| POST | `/api/endpoints` | Register a website |
| GET | `/api/endpoints` | Retrieve registered websites |
| POST | `/api/endpoints/:id/check` | Run a manual website check |
| GET | `/api/endpoints/:id/checks` | Retrieve check history |
| GET | `/api/endpoints/:id/analytics` | Retrieve aggregated analytics |

## Getting Started

### Prerequisites

- Node.js and npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/varshitha1706-bit/PulseCheck-FullStackProject.git
cd PulseCheck-FullStackProject
```

### 2. Install backend dependencies

```bash
npm install
```

### 3. Start the backend

```bash
npm start
```

The backend runs on port `5000` by default.

Verify the server using:

```text
http://localhost:5000/api/health
```

### 4. Start the frontend

Open a second terminal from the project root:

```bash
cd client
npm install
npm run dev
```

Open the local URL printed by Vite, usually:

```text
http://localhost:5173
```

Keep both development servers running while using the application.

## Analytics Explained

PulseCheck currently reports:

- **Total Checks:** Number of recorded monitoring attempts.
- **Successful Checks:** Checks that received HTTP 2xx responses.
- **Success Rate:** Successful checks divided by total checks, multiplied by 100.
- **Average Latency:** Average recorded response time in milliseconds.
- **Healthy Responses:** HTTP 2xx responses.
- **Redirects:** HTTP 3xx responses.
- **HTTP Errors:** HTTP 4xx and 5xx responses.
- **Unreachable:** Checks that did not receive an HTTP status code.

**Note:** Redirects are not followed in the current implementation. A redirect response is therefore recorded separately and does not count as a successful 2xx check.

## Database

PulseCheck uses SQLite to persist registered endpoints and their monitoring history.

The database is created and initialized by the backend. Monitoring history supports analytics and allows previously recorded checks to be reviewed after restarting the server.

## Future Improvements

- Deploy the frontend and backend for public access.
- Add pagination and filtering to check history.
- Improve redirect handling and configurable timeout settings.
- Add uptime trends over selectable time ranges.
- Introduce alerts for downtime and repeated failures.
- Add authentication and user-specific monitoring.

## What I Learned

Building PulseCheck provided hands-on experience with:

- Designing REST APIs using Express.js.
- Integrating a React frontend with a Node.js backend.
- Persisting and querying data using SQLite.
- Performing HTTP requests and measuring response latency.
- Aggregating historical records using SQL.
- Building analytics dashboards and visualizing data.
- Debugging frontend, backend, and database integration issues.

## Author

**R Sri Sai Varshitha**  
B.Tech Computer Science and Engineering

[GitHub Repository](https://github.com/varshitha1706-bit/PulseCheck-FullStackProject)
