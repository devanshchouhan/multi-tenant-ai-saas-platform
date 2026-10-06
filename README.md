# Multi-Tenant AI Support & Real-Time Ticketing Platform

A scalable, secure, multi-tenant B2B customer support backend built with Node.js, Express.js, MongoDB Atlas, Mongoose, and Google Gemini AI.

---

## 📌 Project Overview & Problem Solved

Modern SaaS platforms and B2B businesses need to manage support queries across multiple client organizations (tenants) simultaneously. Operating separate databases or servers for each organization is expensive and complex.

**SupportHub** solves this by providing a unified multi-tenant backend architecture:
- **Strict Tenant Data Isolation**: Enforces organization-level data boundaries across all DB queries.
- **AI-First Automation**: Automatically answers customer support inquiries using Google Gemini AI.
- **Smart Human Escalation**: Automatically creates support tickets and assigns available online human agents when AI cannot answer or when a customer explicitly requests human help.
- **Role-Based Access Control**: Distinguishes permissions between Platform Admins, Tenant Admins, Agents, and Customers.

---

## 🛠️ Tech Stack

- **Runtime Environment**: Node.js
- **Web Framework**: Express.js
- **Database**: MongoDB Atlas (Cloud)
- **ODM**: Mongoose
- **Authentication**: JWT (JSON Web Tokens) & bcryptjs
- **AI Integration**: Google GenAI SDK (`@google/genai`)
- **Architecture**: Strict MVC (Model-View-Controller) with Service Layer

---

## 📁 Folder Structure

```
support hub/
├── server.js               # Application entry point & DB listener
├── package.json            # Project dependencies and scripts
├── .env.example            # Environment variables template
├── src/
│   ├── app.js              # Express app setup and middleware configuration
│   ├── db/
│   │   └── connect.js      # MongoDB Atlas connection handler
│   ├── models/             # Mongoose Schemas
│   │   ├── tenant.model.js
│   │   ├── user.model.js
│   │   ├── customer.model.js
│   │   ├── agent.model.js
│   │   ├── conversation.model.js
│   │   ├── message.model.js
│   │   └── ticket.model.js
│   ├── services/           # Business Logic & DB Queries (Tenant-Scoped)
│   │   ├── auth.service.js
│   │   ├── tenant.service.js
│   │   ├── customer.service.js
│   │   ├── agent.service.js
│   │   ├── conversation.service.js
│   │   ├── message.service.js
│   │   ├── ticket.service.js
│   │   └── ai.service.js
│   ├── controllers/        # Request Validation & Response Handlers
│   │   ├── health.controller.js
│   │   ├── auth.controller.js
│   │   ├── tenant.controller.js
│   │   ├── customer.controller.js
│   │   ├── agent.controller.js
│   │   ├── conversation.controller.js
│   │   ├── message.controller.js
│   │   └── ticket.controller.js
│   ├── routes/             # API Route Definitions
│   │   ├── health.routes.js
│   │   ├── auth.routes.js
│   │   ├── tenant.routes.js
│   │   ├── customer.routes.js
│   │   ├── agent.routes.js
│   │   ├── conversation.routes.js
│   │   └── ticket.routes.js
│   └── middlewares/        # Authentication, Authorization, Error Handling
│       ├── auth.middleware.js
│       └── error.middleware.js
└── scratch/                # Automated End-to-End Test Scripts
```

---

## ⚙️ Setup & Installation Instructions

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd "support hub"
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory (refer to `.env.example`):
   ```env
   PORT=3000
   MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/supporthub
   NODE_ENV=development
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRES_IN=7d
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Or run with standard Node:
   ```bash
   npm start
   ```

---

## 📡 Complete API Endpoints

### 1. Health Check
- `GET /api/health` - System health check (Public)

### 2. Authentication (`/api/auth`)
- `POST /api/auth/register` - Register new user (Restricted to `customer` role for public registration)
- `POST /api/auth/login` - Authenticate user & return JWT token
- `GET /api/auth/me` - Fetch profile of currently authenticated user (`Protected`)

### 3. Tenant Management (`/api/tenants`)
- `POST /api/tenants` - Create new tenant (`Protected`, Admin only)
- `GET /api/tenants/:id` - Get tenant details (`Protected`, Tenant Isolation enforced)

### 4. Customers (`/api/customers`)
- `POST /api/customers` - Create customer (`Protected`)
- `GET /api/customers` - Get all customers for logged-in tenant (`Protected`)
- `GET /api/customers/:id` - Get customer by ID (`Protected`)
- `PUT /api/customers/:id` - Update customer details (`Protected`)
- `DELETE /api/customers/:id` - Delete customer (`Protected`)

### 5. Agents (`/api/agents`)
- `POST /api/agents` - Create agent (`Protected`)
- `GET /api/agents` - Get all agents for logged-in tenant (`Protected`)
- `GET /api/agents/:id` - Get agent by ID (`Protected`)
- `PUT /api/agents/:id` - Update agent availability/details (`Protected`)
- `DELETE /api/agents/:id` - Delete agent (`Protected`)

### 6. Conversations & Messages (`/api/conversations`)
- `POST /api/conversations` - Create conversation (`Protected`)
- `GET /api/conversations` - List tenant conversations (`Protected`)
- `GET /api/conversations/:id` - Get conversation details (`Protected`)
- `PATCH /api/conversations/:id` - Update conversation status/assigned agent (`Protected`)
- `POST /api/conversations/:id/messages` - Post customer/agent message. Triggers Gemini AI & Automatic Human Ticket Escalation (`Protected`)
- `GET /api/conversations/:id/messages` - Fetch message history (`Protected`)

### 7. Support Tickets (`/api/tickets`)
- `POST /api/tickets` - Create ticket manually (`Protected`)
- `GET /api/tickets` - Get all tenant tickets (`Protected`)
- `GET /api/tickets/:id` - Get ticket by ID (`Protected`)
- `PATCH /api/tickets/:id/assign` - Assign ticket to online agent (`Protected`, Admin/Agent)
- `PATCH /api/tickets/:id/status` - Update ticket status (`Protected`)
- `POST /api/tickets/:id/reply` - Agent reply to ticket (Saves message to conversation) (`Protected`, Admin/Agent)

---

## 🧪 Postman Testing Steps

1. **Login & Get Bearer Token**:
   Send `POST` to `/api/auth/login` with email and password. Copy the returned `token`.
2. **Set Postman Authorization**:
   In Postman headers, add `Authorization: Bearer <YOUR_TOKEN>`.
3. **Send Customer Message with Gemini AI**:
   Send `POST` to `/api/conversations/<CONVERSATION_ID>/messages`:
   ```json
   {
     "text": "What is your refund policy?"
   }
   ```
   If `GEMINI_API_KEY` is configured, Gemini returns an automated `AI_RESPONSE`.
4. **Trigger Ticket Escalation**:
   Send `POST` with explicit human request:
   ```json
   {
     "text": "I want to speak to a human agent please"
   }
   ```
   The platform creates a ticket, assigns an online agent (`status: in_progress`) or queues it (`status: open`), and returns `mode: ESCALATED_TO_HUMAN`.

---

## 📊 Feature Implementation Status

### ✅ Fully Implemented & Tested
- JWT Authentication (Register, Login, Me profile)
- Password Hashing with bcryptjs & Output Sanitization
- Multi-Tenant Isolation across all models and queries
- Role-Based Access Control (Admin, Agent, Customer)
- Customer & Agent CRUD Management
- Conversation Lifecycle & History Tracking
- Google Gemini AI Integration (`@google/genai`)
- Intelligent Human Ticket Escalation & Fallback
- Automatic Agent Assignment for Escalated Tickets
- Ticket Lifecycle Management & Agent Ticket Replies
- Centralized Error Handling & Validation Middleware

### 🟡 Partially Implemented
- AI Prompt customization per tenant (Currently uses standardized support prompt).

### ❌ Not Implemented (Out of Scope by Design)
- WebSockets / Real-Time Sockets
- Vector Databases / RAG (Retrieval-Augmented Generation)
- WhatsApp / External Messaging Gateway Integrations
- Redis / BullMQ Background Queues

---

## ⚡ Known Limitations & Future Improvements

1. **Rate Limiting**: Currently relies on standard Express connection limits; future updates can add `express-rate-limit`.
2. **Tenant-Specific AI Prompts**: Prompts can be extended to allow tenants to store custom knowledge base context in MongoDB.
