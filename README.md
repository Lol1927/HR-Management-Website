# HR Event Staffing Platform

A full-stack, cloud-native workforce management system for event staffing operations — built with **React 19 + TypeScript** on the frontend and a **serverless Node.js backend** deployed on **AWS Lambda, API Gateway, and DynamoDB**.

> Designed as a multi-role platform: an **admin dashboard** for managing staff and events, and a **job seeker portal** for browsing and applying to event positions.

---

## Live Architecture

```
┌─────────────────┐        ┌──────────────────────────────────────┐
│  Admin Web App  │───────▶│             AWS Cloud (us-east-2)     │
│  React 19 + TS  │        │                                       │
└─────────────────┘        │  API Gateway ──▶ Lambda Functions     │
                           │                        │               │
┌─────────────────┐        │                   DynamoDB Tables      │
│  Job Seeker App │───────▶│  API Gateway ──▶ Lambda Functions     │
│  React + Vite   │        │                        │               │
└─────────────────┘        │              ┌─────────┴──────────┐   │
                           │              │  employees │ events  │   │
                           │              │  positions │ history │   │
                           │              │  provinces │ cities  │   │
                           │              └────────────────────┘   │
                           │                                       │
                           │  Serverless Framework (CI/CD + IaC)  │
                           └──────────────────────────────────────┘
```

---

## Tech Stack

### Admin Dashboard (`hr-management-web/`)
| Layer | Technology |
|---|---|
| Framework | React 19.2.3 |
| Language | JavaScript (ES2022) |
| Styling | Tailwind CSS 3.4 |
| Calendar UI | FullCalendar 6.1 |
| HTTP Client | Axios 1.13 |
| Internationalization | i18next 25.7 (Korean / English) |
| Excel Import | XLSX 0.18 |
| Icons | Lucide React |
| Build | Create React App |

### Admin Backend (`backend/`)
| Layer | Technology |
|---|---|
| Runtime | Node.js 18.x (ES Modules) |
| Framework | Serverless Framework 4.29 |
| Cloud | AWS Lambda + API Gateway + DynamoDB |
| Region | us-east-2 |
| AWS SDK | @aws-sdk v3 |
| Validation | Zod 4.2 |
| Utilities | UUID 13 |

### Job Seeker Portal (`Event-Job-Finder/`)
| Layer | Technology |
|---|---|
| Framework | React 18.3 + TypeScript 5.6 |
| Build Tool | Vite 7.3 |
| Routing | Wouter 3.3 |
| Data Fetching | TanStack React Query 5.60 |
| Forms | React Hook Form + Zod |
| Styling | Tailwind CSS + shadcn/ui (Radix UI) |
| Animation | Framer Motion 11.13 |
| Date Utils | date-fns 3.6 (Korean locale) |
| Prototype Backend | Express 5 + Drizzle ORM + PostgreSQL |

---

## Features

### Admin Dashboard
- **Staff Management** — Full CRUD with search, filter by name / phone / region, and active/inactive status toggle
- **Bulk Excel Import** — Upload employees via Excel template with duplicate detection, preview, and validation before commit
- **Calendar-based Event Scheduling** — FullCalendar monthly view with drag-to-select date ranges, multi-step staff assignment (date, hours, wage, position per employee)
- **Performance Evaluation** — 5-star rating + feedback text per staff member per event; visual completion indicator
- **Hierarchical Region Management** — Province → City two-level structure, full CRUD
- **Korean / English Localization** — Full UI translation via i18next with runtime language switching

### Job Seeker Portal
- Event browsing with category (sports / concert / exhibition), date, and region filters
- List view and calendar view toggle
- Job application submission with self-introduction, document upload (ID, photo)
- Application status tracking — `pending`, `hired`, `rejected`
- Standing availability registration (preferred days, categories, time slots)
- Mobile-first bottom navigation

---

## Database Design (DynamoDB)

| Table | Partition Key | Purpose |
|---|---|---|
| `hr-management-api-employees-{stage}` | `id` (SHA256 hash) | Staff master data |
| `Events` | `id` | Event / job listings |
| `PositionsTable` | `name` | Job roles (team lead, general, etc.) |
| `hr-management-api-provinces-{stage}` | `provinceName` | Province / metro data |
| `hr-management-api-cities-{stage}` | `cityName` | City / district data |
| `hr-management-api-history-{stage}` | `employeeId` | Performance evaluation history |

Stage-based table naming (`-dev` / `-prod`) enables safe environment separation without separate AWS accounts.

---

## RESTful API Endpoints

### Staff
| Method | Path | Description |
|---|---|---|
| `POST` | `/employees` | Create employee (SHA256-hashed ID from resident number) |
| `GET` | `/employees` | List all employees |
| `PUT` | `/employees/{id}` | Update employee (transaction support for ID changes) |
| `DELETE` | `/employees/{id}` | Delete employee |

### Events
| Method | Path | Description |
|---|---|---|
| `GET` | `/events` | List all events |
| `POST` | `/events` | Create event (auto-calculates work hours) |
| `PUT` | `/events` | Update event |
| `DELETE` | `/events/{id}` | Delete event |

### Positions / Regions / Evaluation History
| Method | Path | Description |
|---|---|---|
| `GET/POST/DELETE` | `/positions` | Job position management |
| `GET/POST/DELETE` | `/province` | Province management |
| `GET/POST/DELETE` | `/city` | City management |
| `POST/GET/PUT/DELETE` | `/history` | Staff evaluation CRUD (DynamoDB `list_append`) |

---

## Security

| Measure | Implementation |
|---|---|
| Sensitive ID hashing | SHA256 + SALT on resident numbers |
| Data masking | Resident numbers stored masked |
| IAM segmentation | Fine-grained Lambda execution roles |
| Transaction safety | DynamoDB TransactWrite for ID update operations |
| Input validation | Zod schema validation on all API inputs |

> Known gaps (planned): CORS currently set to `*`; no authentication on admin API endpoints; rate limiting not yet configured — Cognito + API Gateway throttling are next priorities.

---

## Deployment

The backend uses **Serverless Framework** for infrastructure-as-code and automated deployment:

```bash
# Deploy to development
cd backend
npm install
serverless deploy --stage dev

# Deploy to production
serverless deploy --stage prod
```

This creates a full CI/CD-ready pipeline where each `deploy` command provisions or updates:
- API Gateway routes
- Lambda functions
- DynamoDB tables (with stage-specific naming)
- IAM roles

### Frontend
```bash
# Admin dashboard
cd hr-management-web
npm install
REACT_APP_API_BASE_URL=<your-api-gateway-url> npm start

# Job seeker portal (prototype)
cd Event-Job-Finder
npm install
npm run dev
```

---

## Project Structure

```
HR-Management-Website/
│
├── backend/                          # Serverless admin API
│   ├── serverless.yml                # IaC — Lambda + API Gateway + DynamoDB config
│   ├── package.json
│   └── functions/
│       ├── employeeHandler.mjs       # Staff CRUD
│       ├── eventHandler.mjs          # Event CRUD + work-hour calculation
│       ├── positionHandler.mjs       # Position CRUD
│       ├── provinceHandler.mjs       # Province CRUD
│       ├── cityHandler.mjs           # City CRUD
│       └── employeeEventHistory.mjs  # Evaluation history CRUD
│
├── hr-management-web/                # Admin frontend (React 19)
│   ├── tailwind.config.js
│   └── src/
│       ├── App.js                    # Root layout + global state
│       ├── i18n.js                   # i18next config
│       ├── locales/                  # ko.json, en.json
│       └── components/
│           ├── StaffManagement.js    # Staff list + CRUD modals
│           ├── EventManager.js       # FullCalendar integration
│           ├── EventAddFullModal.jsx  # Multi-step event creation
│           ├── EventViewModal.jsx     # Event detail + staff assignment
│           ├── StaffEvaluation.js    # Evaluation dashboard
│           ├── EventEvaluationFullModal.jsx
│           ├── CategoryManager.js    # Position + region management
│           ├── WorkplaceManagement.js
│           └── BulkEmployeeUpload.js # Excel import with validation
│
└── Event-Job-Finder/                 # Job seeker portal (prototype)
    ├── vite.config.ts
    ├── shared/schema.ts              # Drizzle DB schema
    ├── server/
    │   ├── index.ts                  # Express entry point
    │   ├── routes.ts                 # API routes + seed data
    │   └── storage.ts                # DB access layer
    └── client/src/
        ├── pages/                    # landing, home, event-detail,
        │                             # my-applications, profile, regular
        └── components/ui/            # shadcn/ui component library
```

---

## Roadmap

- [ ] Add AWS Cognito authentication to admin API
- [ ] Remove `CORS: *` and restrict to specific origins
- [ ] Add API Gateway throttling and rate limiting
- [ ] Migrate Event-Job-Finder backend from Replit → AWS Lambda + DynamoDB
- [ ] Connect Events table between admin and job seeker systems
- [ ] Implement S3 pre-signed URL file uploads (ID cards, photos)
- [ ] Add SNS / SES notification system for application status changes
- [ ] Add Global Secondary Indexes on applications table for efficient queries

---

## Author

Built by [YOUR NAME] — [github.com/Lol1927](https://github.com/Lol1927)
