# Top 30 Technical Interview Questions & Answers
## Multi-Tenant AI Support & Real-Time Ticketing Platform

---

### 🏛️ Category 1: Project Architecture & Business Logic

#### Q1: Give a 2-minute elevator pitch explaining this project to an interviewer.
> **Answer**:  
> "I built **SupportHub**, a multi-tenant B2B AI support and ticketing platform backend using Node.js, Express.js, MongoDB Atlas, and Google Gemini AI. It allows multiple organizations (tenants) to share a single backend infrastructure securely with **strict database-level data isolation**.  
> The system automates support queries using **Google Gemini AI**. If a customer asks a query, Gemini answers using recent chat context. If the AI cannot answer, if the API fails, or if the customer explicitly requests human support, the system automatically creates a support ticket, finds an online agent belonging to that tenant, assigns the ticket, and transitions it into human support mode."

#### Q2: What architecture pattern did you follow, and why?
> **Answer**:  
> "I followed a strict **MVC + Service Layer Architecture**:
> - **Models**: Define database schemas and relationships.
> - **Services**: Encapsulate all core business logic and tenant-scoped database queries.
> - **Controllers**: Handle HTTP request validation, status codes, and JSON responses.
> - **Routes**: Map URI paths and attach middleware.
> 
> Separating the **Service Layer** from Controllers ensures that business logic (like AI fallback and agent auto-assignment) can be reused and tested independently without HTTP dependency."

---

### 🔒 Category 2: Multi-Tenancy & Security Isolation

#### Q3: How do you implement Multi-Tenant Data Isolation?
> **Answer**:  
> "Tenant isolation is enforced at the database level. Every single database query in the service layer includes a mandatory `tenantId: req.user.tenantId` filter.  
> `req.user.tenantId` is populated securely from the user's verified JWT token by the authentication middleware (`auth.middleware.js`). We never trust `tenantId` sent in request bodies or query params from the client."

#### Q4: What happens if a User from Tenant A tries to access Tenant B's ticket or conversation?
> **Answer**:  
> "Because every query includes `tenantId: req.user.tenantId`, a query attempting to access another tenant's resource will find zero matching documents in MongoDB. The backend returns a clean `404 Not Found in your organization` or `403 Forbidden` status code, completely preventing cross-tenant data leakage."

#### Q5: How do you prevent self-privilege escalation during public user registration?
> **Answer**:  
> "In `auth.service.js`, the registration function enforces `role = 'customer'` for public registration requests (`POST /api/auth/register`). If a user attempts to pass `role: 'admin'` or `role: 'agent'` in the request body, the backend explicitly rejects the request with a `400 Bad Request` error."

---

### 🔑 Category 3: Authentication & Password Security

#### Q6: How is user authentication handled?
> **Answer**:  
> "Authentication is stateless using **JSON Web Tokens (JWT)**. On login (`POST /api/auth/login`), credentials are verified, and a signed JWT containing `{ id, email, role, tenantId }` is returned. For subsequent requests, the client sends this token in the `Authorization: Bearer <token>` header."

#### Q7: Why did you use a Mongoose `pre('save')` hook for password hashing?
> **Answer**:  
> "Using a Mongoose `pre('save')` hook ensures that whenever a User document is created or its password modified, password hashing via `bcryptjs` (salt factor 10) happens automatically before hitting the database. This eliminates the risk of accidentally saving plain-text passwords anywhere in the codebase."

#### Q8: How do you guarantee that password hashes are never leaked in API responses?
> **Answer**:  
> "We implemented a custom `toJSON()` method on the `User` schema that automatically strips the `password` field whenever user documents are serialized into JSON responses. Additionally, database queries use `.select('-password')` by default."

---

### 🤖 Category 4: Google Gemini AI Integration

#### Q9: How did you integrate Google Gemini AI into the project?
> **Answer**:  
> "I integrated Gemini using the official `@google/genai` SDK in `src/services/ai.service.js`. I instantiated `GoogleGenAI` using the `GEMINI_API_KEY` stored in `.env` and used the `gemini-2.5-flash` model via `ai.models.generateContent()`."

#### Q10: How do you maintain conversation context when sending requests to Gemini?
> **Answer**:  
> "Before calling Gemini, the service queries MongoDB for the last 10 messages of that specific conversation (`Message.find({ conversationId, tenantId }).sort({ createdAt: 1 }).limit(10)`). These messages are formatted chronologically into a conversation context (`Customer: ... / Assistant: ...`) and appended to the system prompt."

#### Q11: What system instructions did you give to the Gemini AI model?
> **Answer**:  
> "I instructed Gemini to act as a multi-tenant support AI assistant, providing concise and helpful responses. Crucially, I instructed it to return the exact string `'ESCALATE_TO_HUMAN'` whenever it lacks sufficient information or when human intervention is required."

#### Q12: How does the system handle missing API keys or Gemini API failures?
> **Answer**:  
> "If `GEMINI_API_KEY` is missing, unconfigured, or if the Gemini API call times out / throws an error, `ai.service.js` catches the exception gracefully, logs an internal warning, and returns `{ success: false, reason: 'GEMINI_ERROR' }`. The platform then seamlessly falls back to human ticket escalation without crashing or exposing stack traces to the user."

---

### 🎟️ Category 5: Human Ticket Escalation & Fallback

#### Q13: What triggers the human escalation workflow?
> **Answer**:  
> Escalation is triggered under three conditions:
> 1. **Explicit Keyword Detection**: If the customer's text contains words like *"human"*, *"agent"*, *"representative"*, or *"escalate"*.
> 2. **AI Uncertainty**: If Gemini returns `'ESCALATE_TO_HUMAN'`.
> 3. **System / API Failure**: If the Gemini API key is missing or the API call fails.

#### Q14: How do you prevent duplicate open tickets for the same conversation?
> **Answer**:  
> "Before creating a new ticket during escalation, the system searches for an active ticket using `Ticket.findOne({ conversationId, tenantId, status: { $in: ['open', 'in_progress'] } })`. If an active ticket already exists, it reuses that ticket instead of creating a duplicate."

#### Q15: How does the online agent auto-assignment algorithm work?
> **Answer**:  
> "When a ticket is created or escalated, the service queries `Agent.findOne({ tenantId, availability: 'online' })`. If an online agent is found:
> - Ticket status updates to `'in_progress'`.
> - `ticket.assignedAgentId` is set to `agent._id`.
> - The customer gets a message: *"Agent [Name] has been assigned to your ticket."*  
> If no agent is online, ticket status remains `'open'`, `assignedAgentId` is `null`, and the customer is notified that their ticket is queued."

#### Q16: How does an Agent reply to a ticket, and how is chat history synchronized?
> **Answer**:  
> "When an agent replies via `POST /api/tickets/:id/reply`, the service creates a new `Message` document with `senderType: 'agent'` and attaches it to the ticket's `conversationId`. This keeps the full conversation thread intact for both customer and agent."

---

### 🗄️ Category 6: Database & Mongoose Schema Design

#### Q17: What Mongoose models exist in this project, and how are they related?
> **Answer**:  
> - `Tenant`: Organization entity.
> - `User`: Auth credentials, role, referenced to `Tenant`.
> - `Customer`: Customer profiles, referenced to `Tenant`.
> - `Agent`: Support agent profiles & `availability`, referenced to `Tenant`.
> - `Conversation`: References `Customer`, `Tenant`, and optional `assignedAgentId`.
> - `Message`: References `Conversation` and `Tenant` (`senderType`: `customer`, `agent`, `AI`).
> - `Ticket`: References `Customer`, `Conversation`, `Tenant`, and optional `assignedAgentId`.

#### Q18: Why did you use Mongoose `.populate()`?
> **Answer**:  
> "I used `.populate()` to fetch referenced document fields (such as customer name/email or agent details) alongside ticket/conversation queries in a single step, avoiding manual N+1 round-trip database queries."

#### Q19: How would you index MongoDB to optimize performance for this platform?
> **Answer**:  
> "I would create **compound indexes** combining `tenantId` with high-frequency lookup fields:
> - `{ tenantId: 1, email: 1 }` on `User` and `Customer`.
> - `{ tenantId: 1, conversationId: 1, createdAt: -1 }` on `Message`.
> - `{ tenantId: 1, status: 1 }` on `Ticket` and `Conversation`."

---

### 🛠️ Category 7: Middleware & Express.js Best Practices

#### Q20: How does your centralized error middleware (`error.middleware.js`) work?
> **Answer**:  
> "Any error passed to `next(error)` in controllers is caught by `error.middleware.js`. It handles specific Mongoose errors cleanly:
> - Duplicate key error (`code 11000`) ➔ Returns `409 Conflict`.
> - Invalid ObjectId (`CastError`) ➔ Returns `400 Bad Request`.
> - Mongoose `ValidationError` ➔ Returns `400 Bad Request`.  
> In development, it includes error stack traces, but hides stack traces in production for security."

#### Q21: How do you handle input validation across Express routes?
> **Answer**:  
> "Controllers validate required fields, string types, email regex formats, and check ObjectId validity using `mongoose.Types.ObjectId.isValid(id)`. If validation fails, an explicit error with a `400` status code is thrown immediately before hitting services or database queries."

#### Q22: Why did you use `bcryptjs` instead of standard `bcrypt`?
> **Answer**:  
> "`bcryptjs` is a pure JavaScript library. Standard `bcrypt` relies on native C++ bindings that can fail during `npm install` on different OS platforms (especially Windows). `bcryptjs` ensures 100% cross-platform compatibility."

---

### 🚦 Category 8: Role-Based Access Control (RBAC) & HTTP Status Codes

#### Q23: How is Role-Based Authorization enforced in routes?
> **Answer**:  
> "We use an `authorize(...roles)` middleware helper. For instance, route definitions like `router.patch('/:id/assign', authorize('admin', 'agent'), assignTicket)` check if `req.user.role` matches allowed roles. If not, it returns `403 Forbidden: Access denied`."

#### Q24: List the HTTP status codes used in your API and when they are returned.
> **Answer**:  
> - `200 OK`: Successful data fetch or update.
> - `201 Created`: Resource successfully created (User, Customer, Ticket, Message).
> - `400 Bad Request`: Missing body params, invalid ObjectId format, invalid email.
> - `401 Unauthorized`: Missing or expired JWT token.
> - `403 Forbidden`: Role permission failure or suspended tenant.
> - `404 Not Found`: Resource or conversation does not exist in the tenant.
> - `409 Conflict`: Duplicate email registration.
> - `500 Internal Server Error`: Server failure.

---

### 🧪 Category 9: Testing, Design Decisions & Roadmap

#### Q25: How did you test all these endpoints and flows?
> **Answer**:  
> "I wrote automated Node.js integration scripts in the `scratch/` directory (`test_all_features.js` and `test_ai_and_escalation.js`). The scripts simulate real HTTP requests covering user registration, tenant isolation, AI responses, agent availability assignment, ticket escalation, and agent replies."

#### Q26: Why didn't you include WebSockets or Socket.IO in this phase?
> **Answer**:  
> "To keep the core backend architecture clean, simple, and easy to explain. The current REST API establishes a robust foundation for multi-tenancy, AI integration, and ticket workflows. Real-time WebSocket streaming can easily be layered on top in the next iteration."

#### Q27: Why didn't you use Vector Databases or RAG (Retrieval-Augmented Generation)?
> **Answer**:  
> "For our MVP, feeding recent conversation history into Gemini's context window provides fast, accurate contextual support without the architectural complexity and cost of maintaining a Vector Database (like Pinecone) or embedding pipelines."

#### Q28: How are secrets managed in the codebase?
> **Answer**:  
> "All secrets (`MONGO_URI`, `JWT_SECRET`, `GEMINI_API_KEY`) are stored in `.env`, which is added to `.gitignore`. A `.env.example` file with dummy placeholders is committed for setup guidance."

#### Q29: What are the main limitations of the current architecture?
> **Answer**:  
> 1. AI system prompts are platform-wide rather than custom per tenant.  
> 2. Ticket agent assignment uses simple first-available online agent selection rather than round-robin or load-balanced routing.

#### Q30: If you had 2 more weeks on this project, what features would you add?
> **Answer**:  
> 1. **Tenant-Specific Knowledge Bases**: Allow each tenant to upload FAQ documents for tenant-scoped AI retrieval.  
> 2. **WebSocket Real-Time Chat**: Push AI responses and agent ticket replies instantly to front-end clients.  
> 3. **Background Job Queues**: Use BullMQ and Redis for sending automated email notifications when tickets are assigned or resolved.
