##  Automated Personal Finance Tracker & Spatiotemporal AI Fraud Shield
This application is a full-stack financial ecosystem built to manage modern personal accounting while protecting consumer transaction strings in real time. It blends dynamic front-end telemetry tracking, asynchronous server gateways, and unsupervised machine learning anomalies identification.
## The application is built completely without static data constraints—meaning it features Adaptive Online Learning where the system continuously learns and updates its intelligence directly from live user checkouts 

##  1. Architecture Overviews
The platform is engineered using a robust, decoupled 3-Tier Software Architecture:

[ Frontend: React + Vite ] ──(HTTP Payload Request)──> [ Backend: FastAPI Gateway ]
                                                                │
  [ Local Desktop Interface / UI ]                              ├──> [ Data Math Engine: Scikit-Learn ]
                                                                │
                                                                └──> [ Database: PostgreSQL Schema ]


* The Presentation Layer (Frontend): Architected in React (Vite), utilizing highly responsive component states to render user dashboards, available capital metrics, transactional histories, interactive checkout marketplaces, and live geolocation maps natively. [1] 
* The Network Gateway Layer (Backend Backend): Built on FastAPI (Python), utilizing fast Pydantic schema engines to run JWT user authentication handshakes and coordinate asynchronous input queries.
* The Structural Storage Layer (Database): Hosted on a localized relational PostgreSQL layout, managing multi-table data integrity chains mapped via SQLAlchemy Object Relational Mapping (ORM).

------------------------------
##  2. The Core AI Engine: Multi-Dimensional Anomaly Detection
Instead of using outdated, static, easily bypassed safety rules (like a hard limit checking if amount > $4000), this platform features an active Adaptive Machine Learning Immune System inside backend/app/fraud_detector.py.
The engine interprets every single payment swipe attempt as a 4-Dimensional Feature Vector Space Coordinate Grid:
$$\mathbf{X}_{\text{current}} = \begin{bmatrix} \text{Amount} & \text{Hour of Day} & \text{Latitude} & \text{Longitude} \end{bmatrix}$$ 
When a user triggers a swipe from an interactive terminal, the application processes the coordinate values across three defensive validation layers:
##  Layer 1: Strict Behavioral Profile Analytics (Value & Routine Variance)
The system drops back into your PostgreSQL ledger history to map your spending habits using standard statistical deviation formulas:

* The Global Cap Watchdog: The engine instantly computes your aggregate transaction average (μ). If a single incoming purchase size breaks past 10 times your historical mean, a critical value exception flag drops right away.
* Categorical Sigma Deviations: It isolates transactions belonging strictly to the requested category (e.g., Groceries). It calculates the category mean and standard deviation (σ). In standard probability, 99.7% of all normal user habits sit within 3 standard deviations of their average. If a new swipe breaks the 3σ boundary limit:

$$\text{Amount} > \mu_{\text{category}} + 3\sigma_{\text{category}}$$ 
the AI tags it as a high-volatility behavior anomaly.
##  Layer 2: Spatiotemporal Jet-Lag Velocity Tracking Engine
This module tracks human travel boundaries to distinguish legitimate vacation flights from instant account takeovers:

   1. The Live Query: The backend queries the database for your absolute latest successful chronological transaction record.
   2. Distance Mapping: It calculates the straight-line distance (in kilometers) between your real-time phone GPS location or manual input parameters, and where you last swiped the card.
   3. Fractional Time Deltas: It compares the exact timestamp records between the two swipes down to the fractional hour .
   4. Physical Speed Derivation: It divides distance by time to compute your exact travel vector velocity ($V = \frac{\Delta D}{\Delta T}$) .
   * The Fraud Breach Trigger: If the distance is significant (across cities/countries) and your calculated speed exceeds 900 km/h (the max cruising speed of a commercial jet airliner), the engine triggers an immediate Critical Velocity Breach Block, stopping the transaction instantly .
   
## Layer 3: Unsupervised Matrix Clustering (Isolation Forest)
The heart of the AI engine uses an Isolation Forest machine learning algorithm from scikit-learn .

* How it thinks: The algorithm treats your entire transaction history as a dense cloud of geometric dots on a 4D coordinate space. Normal human habits (like buying afternoon coffee near your home base coordinate cluster in Homs) group tightly together inside a dense cluster shape .
* The Isolation Process: When an anomalous transaction occurs (e.g., an unusual late-night swipe amount or an unexpected city location coordinate), that point lands far out in empty space. The Isolation Forest drops random partition lines across the grid matrix . Outlier anomalies standing alone require far fewer cuts to separate than points hidden deep within a crowded cluster . 
* The Verdict: If the model isolates the coordinate instantly, it yields a prediction payload score of -1 (Outlier Anomaly) . The code attaches an automatic risk penalty to trigger an immediate shutdown .

------------------------------
##  3. The End-to-End Operational Lifecycle
Every transaction processed inside your project moves through a strict 5-stage lifecycle sequence to ensure maximum data validation:

[1. Frontend Marketplace Swipe] ──> [2. Capture Silently Contextual Telemetry] 
                                                    │
[4. Frontend Renders Approved/Blocked] <── [3. FastAPI Handshake & AI Computation]


   1. The Client Intent Layer: The customer initiates a swipe request inside the Marketplace UI storefront. The frontend application instantly completely hard-locks navigation access to the sensitive AI Security Terminal to prevent unauthorized manipulation .
   2. Silent Hardware Telemetry Gathering: The browser natively requests access to the phone's HTML5 Geolocation hardware API to grab their current Latitude and Longitude automatically . It silently captures their browser user agent language and browser data strings to compile an unforgeable contextual hardware fingerprint signature matrix .
   3. The API Handshake Checkpoint: The payload bundle is securely transmitted to the FastAPI gateway endpoint (POST /api/transactions/verify-risk). The server evaluates the payload through the AI evaluate_swipe_risk module.
   4. The Circuit Breaker Decision Tree: If the total risk score breaches the strict safety threshold index boundaries (≥ 40%), the server terminates execution right then and there. It issues an explicit network code 400 Bad Request to halt database operations, keeping your funds safe .
   5. Adaptive Online Self-Learning: If the transaction passes all AI checks safely, the gateway approves the swipe, automatically deducts the funds from your account sheets, and silently appends the new transaction variables into your permanent PostgreSQL ledger rows.This lets the AI adapt dynamically over time—meaning as you continue to make safe purchases from your real location, the machine learning system automatically expands its safe zone boundaries to naturally absorb your routine habits completely on autopilot.
