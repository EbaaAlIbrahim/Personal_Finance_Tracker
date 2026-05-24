# Secure Full-Stack Personal Finance Tracker Architecture

An enterprise-grade, high-performance financial telemetry platform designed to aggregate bank-level transaction streams, execute low-latency server-side analytics, and deliver responsive data visualizations.

---

##  Project Capability Overview

The architecture serves as an autonomous financial asset optimizer and data protection system, delivering the following core capabilities:

### 1. Bank-Grade Cryptographic Data Protection
* **Symmetric Token Encryption:** Implements an automated cryptographic pipeline utilizing Advanced Encryption Standard (AES-256) via Fernet symmetric ciphers. This architecture explicitly scrambles long-lived third-party bank tokens and OAuth credentials prior to database persistence, neutralizing exposure vectors from cold storage data breaches.
* **One-Way Password Stretching:** Employs cryptographically salted password hashes via a hardened `bcrypt` engine context, preventing raw text credentials from ever being written to or exposed within the persistence layer.
* **Penny-Accurate Financial Math:** Enforces strict ACID compliance inside **PostgreSQL** by mapping all transaction ledgers to `Numeric(12, 2)` decimal column data types. This explicitly prevents the IEEE 754 precision truncation errors and trailing rounding anomalies inherent to native JavaScript/Python float definitions.

### 2. Identity Guarding & Low-Latency Event Processing
* **OAuth2 Authentication Framework:** Features standard-compliant token issuance routers utilizing `OAuth2PasswordRequestForm` constructs that return cryptographically signed, expiration-bound JSON Web Tokens (JWT) for secure user sessions.
* **Contextual Route Guard Checkpoints:** Leverages an injectable dependency verification layer that captures inbound HTTP headers, decodes the signature, and evaluates the active user profile before granting access to downstream pipelines.
* **Sub-Millisecond Multi-Row Analytics:** Shifts data-crunching overhead completely away from the client-side. A single-pass backend aggregation parser processes massive transaction arrays on the server, outputting aggregated category cost distribution metrics and exact percentage allocations on demand.
* **Automated Sandbox Pipeline Fallbacks:** Features an internal state controller that handles environmental property evaluation. If live Plaid API keys are absent, the application instantly diverts data flows into an embedded local simulation matrix to seed and test full-stack modules safely.
* **Reactive Budget Threshold Watcher:** Continually monitors transactional velocities. If variable expenditure breaks past a designated threshold, the platform throws dynamic visual layout warnings, changing dashboard status card components to a high-priority alert state.

### 3. Dynamic Visualization Dashboard
* **Automated Token Injection:** Utilizes a global **Axios** HTTP client connection instance armed with an active request interceptor. The system automatically captures cached session JWT tokens from browser memory and appends them to outgoing headers behind the scenes.
* **Interactive Responsive Charts:** Transforms backend JSON payloads into animated, interactive **Recharts Bar and Donut Charts**, equipped with custom color-indexed mapping nodes and fluid hover tooltip popups.
* **Stateful Client Routing Layout:** Handles workspace tab shifts using local component state caching. Users switch effortlessly between their Main Overview, Connected Accounts, and Plastic Credit Cards views without inducing browser page reloads.

---

##  System Architecture Blueprint

[React Frontend App] ──── ( Vite Local Engine - Port 5173 )
        │
        ▼ ( Outbound HTTP Requests Intercepted )
        │
  [Secure JWT Bearer Header Attached] ──► ( Authorization: Bearer eyJ... )
        │
        ▼ 
[FastAPI Backend Server] ── ( Uvicorn Async Runtime - Port 8000 )
        │
        ├──► [Symmetric Fernet Engine]   ◄──► [AES-256 Encrypted Third-Party Keys]
        ├──► [Passlib Bcrypt Engine]     ◄──► [One-Way Secure Password Salting]
        └──► [High-Speed Math Parser]   ◄──► [Single-Pass Server Matrix Cruncher]
        │
        ▼ ( Context Pool Dependency Injection / get_db )
        │
[PostgreSQL Database Core] ── ( Local SQL Instance - Port 5432 )
