# ClientPortal SADC — Project Task List

> **From zero to production — every task in order**
>
> **Legend:** `[ ]` Todo · `[~]` In Progress · `[x]` Done · `[T]` Needs Tests

---

## Table of Contents

- [Phase 0 — Foundation & Scaffolding](#phase-0--foundation--scaffolding)
- [Phase 1 — Shared Kernel & Cross-Cutting Concerns](#phase-1--shared-kernel--cross-cutting-concerns)
- [Phase 2 — Multi-Tenancy](#phase-2--multi-tenancy)
- [Phase 3 — Authentication & Authorization](#phase-3--authentication--authorization)
- [Phase 4 — Client Management](#phase-4--client-management)
- [Phase 5 — Project Management](#phase-5--project-management)
- [Phase 6 — Documents & Contracts](#phase-6--documents--contracts)
- [Phase 7 — Invoicing & Financials](#phase-7--invoicing--financials)
- [Phase 8 — Communication & Meetings](#phase-8--communication--meetings)
- [Phase 9 — Notifications](#phase-9--notifications)
- [Phase 10 — Frontend: Business Portal](#phase-10--frontend-business-portal)
- [Phase 11 — Frontend: Client Portal](#phase-11--frontend-client-portal)
- [Phase 12 — Security Hardening & Compliance](#phase-12--security-hardening--compliance)
- [Phase 13 — Testing](#phase-13--testing)
- [Phase 14 — Production Readiness](#phase-14--production-readiness)

---

## Phase 0 — Foundation & Scaffolding

> Solution setup, Docker, database, CI/CD baseline

### 0.1 Solution & Repository Setup

- [ ] **0.1.1** Create GitHub repository with branch protection rules for `main`, `develop`, and `feature/*`
- [x] **0.1.2** Scaffold .NET 10 solution `ClientPortal.sln` with projects: `Domain`, `Application`, `Infrastructure`, `Api`, `Shared`
- [x] **0.1.3** Configure `.editorconfig`, `.gitignore`, `.gitattributes`
- [x] **0.1.4** Add `Directory.Build.props` with shared package versions and `<Nullable>enable</Nullable>`
- [x] **0.1.5** Create two Angular 21 applications: `client-portal` and `business-portal` in `/frontend`
- [x] **0.1.6** Set up shared Angular library `shared-ui` with common components (monorepo or npm package)
- [x] **0.1.7** Configure Tailwind CSS 4 in both Angular apps with shared design tokens
- [x] **0.1.8** Install and configure shadcn/ui (Angular port) in both apps

### 0.2 Docker & Local Environment

- [x] **0.2.1** Write `docker-compose.yml`: postgres, redis, api, client-app, business-app, seq, minio
- [x] **0.2.2** Write `docker-compose.override.yml` for local dev (volumes, hot reload, dev certs)
- [x] **0.2.3** Write `.env.example` with all required environment variables documented
- [x] **0.2.4** Configure Nginx reverse proxy: `/api` → api container, `/` → Angular apps
- [x] **0.2.5** Configure MinIO for local S3-compatible storage with bucket creation script
- [x] **0.2.6** Verify all services start and communicate correctly via `docker compose up`

### 0.3 CI/CD Pipeline

- [ ] **0.3.1** Create GitHub Actions workflow: build, test, lint on pull request to `develop` and `main`
- [ ] **0.3.2** Add Docker build and push to registry on merge to `main`
- [ ] **0.3.3** Configure branch protection: require CI pass + 1 code review before merge

> ✅ **Checkpoint:** All services running via `docker compose up`. CI pipeline green. Both Angular apps serve on `localhost:4200` and `localhost:4201`.

---

## Phase 1 — Shared Kernel & Cross-Cutting Concerns

> Result\<T\>, error types, base classes, middleware

### 1.1 Shared Kernel (`ClientPortal.Shared`)

- [x] **1.1.1** Implement `Result<T>` and `Result` with `IsSuccess`, `IsFailed`, `Error`, `Errors` properties
- [x] **1.1.2** Implement `Error` record: `Code`, `Message`, `Type` (Validation | NotFound | Conflict | Forbidden | Unexpected)
- [x] **1.1.3** Implement `Guard` static class: `NotNull`, `NotEmpty`, `NotDefault` helper methods
- [x] **1.1.4** Implement `PagedResult<T>` with `Items`, `TotalCount`, `Page`, `PageSize`, `TotalPages`

### 1.2 Domain Base Classes (`ClientPortal.Domain`)

- [x] **1.2.1** Implement `Entity<TId>` base class: Id, CreatedAt, UpdatedAt, equality by Id
- [x] **1.2.2** Implement `AggregateRoot<TId>` extending `Entity<TId>` with domain event collection and clearing
- [x] **1.2.3** Implement `ValueObject` base class with structural equality via `GetEqualityComponents()`
- [x] **1.2.4** Define `IDomainEvent` marker interface extending MediatR `INotification`
- [x] **1.2.5** Implement common value objects: `Money(Amount, Currency)`, `EmailAddress`, `PhoneNumber`, `Address`
- [x] **1.2.6** `[T]` Write unit tests for all base classes and value objects — equality, immutability, invariants

### 1.3 MediatR Pipeline Behaviours

- [x] **1.3.1** Install MediatR and configure in DI
- [x] **1.3.2** Implement `ValidationBehaviour<TRequest, TResponse>`: run FluentValidation, return validation errors as `Result.Failure`
- [x] **1.3.3** Implement `LoggingBehaviour<TRequest, TResponse>`: log request name, execution time, errors with Serilog
- [x] **1.3.4** Implement `TenantBehaviour<TRequest, TResponse>`: inject `ICurrentTenant`, fail fast if tenant unresolved
- [x] **1.3.5** Implement `PerformanceBehaviour<TRequest, TResponse>`: warn via logger if handler exceeds 500ms
- [x] **1.3.6** Register pipeline behaviours in correct order: Logging → Tenant → Validation → Performance → Handler

### 1.4 API Conventions & Global Middleware

- [x] **1.4.1** Configure Scalar at `/scalar/v1` with JWT bearer auth scheme and OpenAPI 3.1
- [x] **1.4.2** Implement global exception handler middleware returning RFC 9457 Problem Details
- [x] **1.4.3** Implement `ApiResponse<T>` wrapper: `{ success, data, errors, meta }`
- [x] **1.4.4** Create `ControllerBase` extension methods: `OkResult<T>()`, `CreatedResult<T>()`, `NotFoundResult()`, `ValidationResult()`
- [x] **1.4.5** Configure CORS: allow Angular dev origins, lock down to tenant domains in production
- [x] **1.4.6** Configure Serilog with Seq sink, structured logging, request logging middleware
- [x] **1.4.7** Configure health checks at `/health`: postgres, redis, S3 connectivity checks

> ✅ **Checkpoint:** `Result<T>` pattern working end-to-end. Validation errors surface correctly. Scalar UI shows documented endpoints. Logs visible in Seq.

---

## Phase 2 — Multi-Tenancy

> Tenant resolution, schema provisioning, EF Core integration

### 2.1 Tenant Domain Model

- [x] **2.1.1** Define `Tenant` aggregate: `Id`, `Slug`, `Name`, `Domain`, `Plan`, `Settings` (JSONB as `TenantSettings` VO), `IsActive`, `CreatedAt`
- [x] **2.1.2** Define `TenantSettings` value object: `BrandColour`, `LogoUrl`, `DefaultCurrency`, `NotificationChannels`, `TaxConfig`
- [x] **2.1.3** Define `Plan` enum: `Free` | `Starter` | `Professional` | `Enterprise` with associated feature flags

### 2.2 Tenant Resolution Middleware

- [x] **2.2.1** Define `ITenantResolver` interface: `ResolveAsync(HttpContext) → TenantId?`
- [x] **2.2.2** Implement `SubdomainTenantResolver`: extract slug from host header (`slug.clientportal.app`)
- [x] **2.2.3** Implement `CustomDomainTenantResolver`: lookup tenant by exact `Host` header in public schema
- [x] **2.2.4** Implement `TenantMiddleware`: resolve tenant, set `ICurrentTenant` in DI scope, return 400 if unresolved for tenant-required routes
- [x] **2.2.5** Implement `ICurrentTenant` service: `TenantId`, `Slug`, `Settings` properties, scoped DI lifetime

### 2.3 Multi-Tenant EF Core DbContext

- [x] **2.3.1** Create `TenantDbContext` extending `DbContext`. Override `OnConfiguring` to `SET search_path = tenant_{slug}`
- [x] **2.3.2** Create `PublicDbContext` for shared schema: tenants, plans, countries tables
- [x] **2.3.3** Implement `ITenantDbContextFactory`: creates `TenantDbContext` scoped to the current tenant
- [x] **2.3.4** Configure all tenant-schema entities in `TenantDbContext` with snake_case conventions
- [x] **2.3.5** Add PostgreSQL Row-Level Security (RLS) policy on all tenant tables as defence-in-depth

### 2.4 Tenant Migrations & Provisioning

- [x] **2.4.1** Create `PublicDbContext` initial migration: `tenants`, `plans` tables in public schema
- [x] **2.4.2** Create `TenantDbContext` initial migration: all tenant-schema tables
- [x] **2.4.3** Implement `IDbInitializer`: run public migrations on startup, apply pending tenant migrations to all active tenants
- [x] **2.4.4** Implement `ITenantProvisioner`: `CreateSchemaAsync(slug)` → create schema, run migrations, seed defaults
- [x] **2.4.5** `[T]` Write integration test: provision tenant → verify schema + tables created → write and read data

### 2.5 Unit of Work

- [x] **2.5.1** Define `IUnitOfWork`: `SaveChangesAsync()`, `BeginTransactionAsync()`, `CommitAsync()`, `RollbackAsync()`
- [x] **2.5.2** Implement `UnitOfWork` wrapping `TenantDbContext`, dispatching domain events after successful `SaveChanges`
- [x] **2.5.3** Register `UnitOfWork` as scoped, ensure same `DbContext` instance within request scope

> ✅ **Checkpoint:** Tenant resolved from subdomain and custom domain. Schema provisioned on signup. EF Core switches `search_path` per request. Integration tests green.

---

## Phase 3 — Authentication & Authorization

> JWT, refresh tokens, roles, permissions

### 3.1 User Domain Model

- [x] **3.1.1** Define `User` aggregate: `Id`, `Email`, `FullName`, `PasswordHash`, `Role`, `IsActive`, `LastLoginAt`, `RefreshTokens` (collection)
- [x] **3.1.2** Define `Role` enum: `Owner` | `Admin` | `Staff` | `ClientAdmin` | `ClientUser`
- [x] **3.1.3** Define `Permission` value object collection for fine-grained access control
- [x] **3.1.4** Define `RefreshToken` value object: `Token` (hashed), `ExpiresAt`, `CreatedByIp`, `RevokedAt`, `ReplacedByToken`

### 3.2 Auth Application Layer

- [x] **3.2.1** Implement `LoginCommand`: email + password → `Result<AuthTokenDto>` (accessToken, expiresAt, user info)
- [x] **3.2.2** Implement `RefreshTokenCommand`: refresh token from cookie → `Result<AuthTokenDto>` with token rotation (revoke old, issue new)
- [x] **3.2.3** Implement `LogoutCommand`: revoke current refresh token
- [x] **3.2.4** Implement `RegisterBusinessCommand`: company details → provision tenant + create Owner user
- [x] **3.2.5** Implement `ForgotPasswordCommand` and `ResetPasswordCommand` with time-limited tokens (15-minute expiry)

### 3.3 JWT Infrastructure

- [x] **3.3.1** Implement `IJwtTokenService`: `GenerateAccessToken(user, tenant)`, `ValidateToken(token)`
- [x] **3.3.2** Configure JWT: 15-minute expiry, RS256 signing, claims: `userId`, `tenantId`, `tenantSlug`, `role`, `permissions`
- [x] **3.3.3** Implement `IRefreshTokenService`: `Generate()`, `Hash()`, `Validate()` using Argon2id for storage
- [x] **3.3.4** Configure refresh token as httpOnly `SameSite=Strict` cookie with 7-day expiry
- [x] **3.3.5** Implement refresh token reuse detection: if a used token is presented → revoke entire family, log security event

### 3.4 Authorization Policies

- [x] **3.4.1** Configure ASP.NET Core policy-based authorization
- [ ] **3.4.2** Implement resource-based authorization handler: enforce user's `tenantId` matches resource's tenant
- [ ] **3.4.3** Register policies: `RequireOwner`, `RequireAdmin`, `RequireStaff`, `RequireAnyStaff`, `RequireClientUser`
- [ ] **3.4.4** Apply `[Authorize]` as default on `ApiController` base. Use `[AllowAnonymous]` explicitly on login/register only

### 3.5 Auth API Controller

- [ ] **3.5.1** `POST /api/v1/auth/login` — with rate limiting (5 attempts per IP per minute)
- [ ] **3.5.2** `POST /api/v1/auth/refresh`
- [ ] **3.5.3** `POST /api/v1/auth/logout`
- [ ] **3.5.4** `POST /api/v1/auth/register` — business registration
- [ ] **3.5.5** `POST /api/v1/auth/forgot-password` and `POST /api/v1/auth/reset-password`
- [ ] **3.5.6** `[T]` Write unit tests: login success, wrong password, expired token, token rotation, reuse detection

> ✅ **Checkpoint:** Login → JWT → refresh → logout cycle working. Roles enforced on protected endpoints. Rate limiting active.

---

## Phase 4 — Client Management

> Invite, onboard, and manage clients

### 4.1 Client Domain

- [ ] **4.1.1** Define `Client` aggregate: `Id`, `CompanyName`, `ContactName`, `Email`, `Phone`, `Status`, `InvitedAt`, `OnboardedAt`, `Notes`
- [ ] **4.1.2** Define `ClientStatus` enum: `Invited` | `Active` | `Inactive` | `Suspended`
- [ ] **4.1.3** Define `ClientInvitedEvent`, `ClientOnboardedEvent`, `ClientDeactivatedEvent` domain events

### 4.2 Client Application Layer

- [ ] **4.2.1** Implement `InviteClientCommand`: create client record, create `ClientUser` account, send invite email, raise `ClientInvitedEvent`
- [ ] **4.2.2** Implement `AcceptInvitationCommand`: validate invite token, set password, activate client status
- [ ] **4.2.3** Implement `UpdateClientCommand`: update contact details, notes, status
- [ ] **4.2.4** Implement `DeactivateClientCommand`: set status to `Inactive`, revoke portal access
- [ ] **4.2.5** Implement `GetClientsQuery`: paginated list with search (name, email), filter by status
- [ ] **4.2.6** Implement `GetClientByIdQuery`: full client detail with projects summary and outstanding invoices
- [ ] **4.2.7** Implement `IClientRepository` with `GetByEmail`, `GetByInviteToken`, `GetWithProjects`

### 4.3 Client API Controller

- [ ] **4.3.1** `GET /api/v1/clients` — paginated, filterable, searchable
- [ ] **4.3.2** `GET /api/v1/clients/{id}` — client detail
- [ ] **4.3.3** `POST /api/v1/clients/invite` — invite new client
- [ ] **4.3.4** `PUT /api/v1/clients/{id}` — update client
- [ ] **4.3.5** `POST /api/v1/clients/{id}/deactivate` — deactivate
- [ ] **4.3.6** `POST /api/v1/auth/accept-invitation` — accept invite (anonymous)

### 4.4 Onboarding Checklist

- [ ] **4.4.1** Define `OnboardingChecklist` entity with configurable steps per tenant
- [ ] **4.4.2** Implement `GetOnboardingStatusQuery` for client portal
- [ ] **4.4.3** Implement `CompleteOnboardingStepCommand`

> ✅ **Checkpoint:** Business invites client via email. Client accepts invite, sets password, accesses portal. Onboarding checklist visible on first login.

---

## Phase 5 — Project Management

> Projects, tasks, milestones, client requests

### 5.1 Project Domain

- [ ] **5.1.1** Define `Project` aggregate: `Id`, `ClientId`, `Name`, `Description`, `Status`, `StartDate`, `EndDate`, `Budget`, `Currency`
- [ ] **5.1.2** Define `Milestone` entity: `Id`, `ProjectId`, `Name`, `DueDate`, `CompletedAt`, `Status`
- [ ] **5.1.3** Define `ProjectTask` entity: `Id`, `ProjectId`, `MilestoneId`, `Title`, `AssigneeId`, `Status`, `Priority`, `DueDate`
- [ ] **5.1.4** Define `ClientRequest` entity: `Id`, `ClientId`, `ProjectId`, `Title`, `Description`, `Status`, `Priority`
- [ ] **5.1.5** Define domain events: `ProjectCreated`, `MilestoneCompleted`, `TaskStatusChanged`, `ClientRequestSubmitted`

### 5.2 Project Application Layer

- [ ] **5.2.1** Implement `CreateProjectCommand` with client assignment and optional milestone scaffolding
- [ ] **5.2.2** Implement `UpdateProjectCommand`: name, description, dates, budget
- [ ] **5.2.3** Implement `CreateMilestoneCommand` and `UpdateMilestoneCommand`
- [ ] **5.2.4** Implement `CompleteMilestoneCommand`: set status, raise event, check if all milestones done
- [ ] **5.2.5** Implement `CreateTaskCommand`, `UpdateTaskCommand`, `ChangeTaskStatusCommand`
- [ ] **5.2.6** Implement `SubmitClientRequestCommand`: client submits request, notify business staff
- [ ] **5.2.7** Implement `UpdateClientRequestStatusCommand`: staff responds to or resolves request
- [ ] **5.2.8** Implement `GetProjectDashboardQuery`: project + milestones + tasks + requests + recent activity in one query
- [ ] **5.2.9** Implement `GetProjectsQuery`: paginated with status filter, client filter

### 5.3 Project API Controller

- [ ] **5.3.1** CRUD endpoints for `/api/v1/projects` and `/api/v1/projects/{id}`
- [ ] **5.3.2** `GET /api/v1/projects/{id}/dashboard` — full dashboard data
- [ ] **5.3.3** CRUD endpoints for `/api/v1/projects/{id}/milestones`
- [ ] **5.3.4** CRUD endpoints for `/api/v1/projects/{id}/tasks`
- [ ] **5.3.5** CRUD endpoints for `/api/v1/client-requests`

> ✅ **Checkpoint:** Projects fully manageable. Milestones and tasks CRUD working. Client can submit requests. Dashboard returns full project state in one call.

---

## Phase 6 — Documents & Contracts

> Upload, version control, e-sign, approve

### 6.1 Document Domain

- [ ] **6.1.1** Define `Document` aggregate: `Id`, `ClientId`, `ProjectId`, `Name`, `Type`, `S3Key`, `CurrentVersion`, `Tags`, `UploadedBy`
- [ ] **6.1.2** Define `DocumentVersion` entity: `Id`, `DocumentId`, `VersionNumber`, `S3Key`, `UploadedAt`, `UploadedBy`, `ChangeNotes`
- [ ] **6.1.3** Define `Contract` aggregate: `Id`, `ClientId`, `Title`, `Status`, `SignedAt`, `ExpiresAt`, `S3Key`, `Parties`
- [ ] **6.1.4** Define `ContractStatus` enum: `Draft` | `SentForSigning` | `Signed` | `Expired` | `Cancelled`

### 6.2 Document Application Layer

- [ ] **6.2.1** Implement `GetUploadPresignedUrlCommand`: generate S3 presigned PUT URL, create `Document` record in `Uploading` state
- [ ] **6.2.2** Implement `ConfirmUploadCommand`: mark document as `Active` after client confirms S3 upload complete
- [ ] **6.2.3** Implement `UpdateDocumentCommand`: rename, update tags, assign to project
- [ ] **6.2.4** Implement `UploadNewVersionCommand`: create `DocumentVersion`, increment version number
- [ ] **6.2.5** Implement `DeleteDocumentCommand`: soft-delete, revoke S3 access via bucket policy
- [ ] **6.2.6** Implement `GetDocumentsQuery`: paginated, filterable by type/project/client/date
- [ ] **6.2.7** Implement `GetDocumentDownloadUrlQuery`: generate presigned GET URL with 15-minute expiry
- [ ] **6.2.8** Implement `SendContractForSigningCommand`: update status, generate signing link, notify client
- [ ] **6.2.9** Implement `RecordSignatureCommand`: record signature, update status to `Signed`, raise `ContractSignedEvent`

### 6.3 Document API Controller

- [ ] **6.3.1** `POST /api/v1/documents/upload-url` — presigned S3 upload URL
- [ ] **6.3.2** `POST /api/v1/documents/confirm-upload` — confirm upload complete
- [ ] **6.3.3** `GET /api/v1/documents` — list (paginated, filterable)
- [ ] **6.3.4** `GET /api/v1/documents/{id}/download` — presigned download URL
- [ ] **6.3.5** `POST /api/v1/documents/{id}/versions` — upload new version
- [ ] **6.3.6** Full CRUD for `/api/v1/contracts`
- [ ] **6.3.7** `POST /api/v1/contracts/{id}/send` — send for signing
- [ ] **6.3.8** `POST /api/v1/contracts/{id}/sign` — record digital signature

> ✅ **Checkpoint:** Documents upload via presigned S3 URLs. Version history tracked. Contracts sent for signing and signature recorded.

---

## Phase 7 — Invoicing & Financials

> Invoices, quotes, multi-currency, SADC payments

### 7.1 Invoice Domain

- [ ] **7.1.1** Define `Invoice` aggregate: `Id`, `ClientId`, `ProjectId`, `InvoiceNumber`, `Status`, `LineItems`, `Subtotal`, `TaxAmount`, `Total`, `Currency`, `DueDate`, `PaidAt`, `Notes`
- [ ] **7.1.2** Define `LineItem` value object: `Description`, `Quantity`, `UnitPrice`, `TaxRate`, `Amount`
- [ ] **7.1.3** Define `InvoiceStatus` enum: `Draft` | `Sent` | `Viewed` | `PartiallyPaid` | `Paid` | `Overdue` | `Cancelled`
- [ ] **7.1.4** Define `Quote` aggregate with same structure; `QuoteStatus`: `Draft` | `Sent` | `Accepted` | `Rejected` | `Expired`
- [ ] **7.1.5** Define `Payment` entity: `Id`, `InvoiceId`, `Amount`, `Currency`, `Method`, `Reference`, `PaidAt`, `Notes`
- [ ] **7.1.6** Define domain events: `InvoiceSent`, `InvoiceViewed`, `InvoicePaid`, `QuoteAccepted`

### 7.2 Invoice Application Layer

- [ ] **7.2.1** Implement `CreateInvoiceCommand`: validate line items, compute totals with tenant tax logic
- [ ] **7.2.2** Implement `UpdateInvoiceCommand`: only allowed in `Draft` status
- [ ] **7.2.3** Implement `SendInvoiceCommand`: change status to `Sent`, email PDF to client, raise `InvoiceSentEvent`
- [ ] **7.2.4** Implement `RecordPaymentCommand`: manual payment recording with partial payment support
- [ ] **7.2.5** Implement `ProcessGatewayPaymentCommand`: handle online payment, verify webhook signature
- [ ] **7.2.6** Implement `ConvertQuoteToInvoiceCommand`: create invoice from accepted quote
- [ ] **7.2.7** Implement `ITaxCalculator`: per-country tax rates (ZA 15% VAT, ZW ZIMRA, ZM ZRA) configurable via tenant settings
- [ ] **7.2.8** Implement `IInvoicePdfGenerator`: generate branded PDF invoice using tenant logo and colours
- [ ] **7.2.9** Implement `GetInvoicesQuery`: paginated, filter by status/client/date, include aging summary
- [ ] **7.2.10** Implement `GetFinancialSummaryQuery`: total outstanding, paid this month, overdue count, cashflow chart data

### 7.3 Multi-Currency & Payment Infrastructure

- [ ] **7.3.1** Implement `ICurrencyConverter`: live or cached exchange rates (ZAR, USD, ZWL, ZMW, MWK, BWP, MZN, MUR)
- [ ] **7.3.2** Implement `IPaymentGateway` abstraction: `ChargeAsync`, `VerifyAsync`, `RefundAsync`
- [ ] **7.3.3** Implement `PeachPaymentsGateway`: South Africa card payments
- [ ] **7.3.4** Implement `StripeGateway`: international card payments
- [ ] **7.3.5** Implement `ManualPaymentGateway`: EFT / bank transfer / mobile money (EcoCash, M-Pesa) recording
- [ ] **7.3.6** Implement payment webhook controller: verify signature, dispatch to `ProcessGatewayPaymentCommand`

### 7.4 Invoice API Controller

- [ ] **7.4.1** Full CRUD for `/api/v1/invoices` and `/api/v1/quotes`
- [ ] **7.4.2** `POST /api/v1/invoices/{id}/send` — send to client
- [ ] **7.4.3** `POST /api/v1/invoices/{id}/payments` — record payment
- [ ] **7.4.4** `GET /api/v1/invoices/{id}/pdf` — download PDF
- [ ] **7.4.5** `POST /api/v1/quotes/{id}/convert` — convert quote to invoice
- [ ] **7.4.6** `GET /api/v1/reports/financial` — financial summary
- [ ] **7.4.7** `POST /api/v1/webhooks/payments` — payment gateway webhooks (anonymous)

> ✅ **Checkpoint:** Invoices created, sent, and paid. PDF generation working. Multi-currency and per-country tax calculated correctly. Payment gateway webhook verified.

---

## Phase 8 — Communication & Meetings

> Messaging, notice board, meeting scheduler

### 8.1 Messaging Domain

- [ ] **8.1.1** Define `MessageThread` aggregate: `Id`, `ClientId`, `ProjectId`, `Participants`, `Subject`, `LastMessageAt`
- [ ] **8.1.2** Define `Message` entity: `Id`, `ThreadId`, `SenderId`, `SenderRole`, `Content`, `SentAt`, `ReadAt`
- [ ] **8.1.3** Define `Notice` aggregate: `Id`, `Title`, `Content`, `PublishedAt`, `ExpiresAt`, `IsActive`, `TargetClientIds` (null = all clients)

### 8.2 Messaging Application Layer

- [ ] **8.2.1** Implement `SendMessageCommand`: add message to thread, update `LastMessageAt`, raise `MessageSentEvent`
- [ ] **8.2.2** Implement `CreateThreadCommand`: start a new conversation thread
- [ ] **8.2.3** Implement `MarkThreadReadCommand`: mark messages as read for the current user
- [ ] **8.2.4** Implement `GetThreadsQuery`: paginated list with unread message count per thread
- [ ] **8.2.5** Implement `GetThreadMessagesQuery`: paginated message history for a thread
- [ ] **8.2.6** Implement `PublishNoticeCommand` and `GetNoticesQuery`

### 8.3 Meeting Domain & Application

- [ ] **8.3.1** Define `Meeting` aggregate: `Id`, `ClientId`, `Title`, `Description`, `ScheduledAt`, `DurationMinutes`, `MeetingUrl`, `Status`, `Attendees`
- [ ] **8.3.2** Implement `ScheduleMeetingCommand`: create meeting, send calendar invite via email, raise `MeetingScheduledEvent`
- [ ] **8.3.3** Implement `UpdateMeetingCommand` and `CancelMeetingCommand`
- [ ] **8.3.4** Implement `GetMeetingsQuery`: filter by client, date range, status

### 8.4 Messaging API Controller

- [ ] **8.4.1** `GET/POST /api/v1/messages/threads` — list and create threads
- [ ] **8.4.2** `GET/POST /api/v1/messages/threads/{id}/messages` — read and send messages
- [ ] **8.4.3** `PUT /api/v1/messages/threads/{id}/read` — mark thread as read
- [ ] **8.4.4** Full CRUD for `/api/v1/notices`
- [ ] **8.4.5** Full CRUD for `/api/v1/meetings`

> ✅ **Checkpoint:** Messaging, notices, and meetings fully functional. Clients and business staff can communicate. Calendar invites sent via email.

---

## Phase 9 — Notifications

> Email, WhatsApp, SMS, in-app, Hangfire background jobs

### 9.1 Notification Infrastructure

- [ ] **9.1.1** Define `INotificationService`: `SendAsync(NotificationMessage)` with `Channel` enum: `Email` | `WhatsApp` | `SMS` | `InApp`
- [ ] **9.1.2** Implement `EmailNotificationService` using SendGrid / MailKit with HTML template support and tenant branding
- [ ] **9.1.3** Implement `WhatsAppNotificationService` using Twilio WhatsApp API
- [ ] **9.1.4** Implement `SmsNotificationService` using Africa's Talking (SADC coverage: ZA, ZW, ZM, KE, MW, MZ, TZ)
- [ ] **9.1.5** Implement `InAppNotificationService`: store in `notifications` table, expose via API
- [ ] **9.1.6** Implement `INotificationTemplateEngine`: compile HTML templates with data binding
- [ ] **9.1.7** Implement `NotificationPreferences` per user: which channels enabled, frequency (immediate | digest | off)

### 9.2 Notification Event Handlers

- [ ] **9.2.1** `ClientInvitedEventHandler` → send branded invite email with magic link
- [ ] **9.2.2** `InvoiceSentEventHandler` → email PDF + WhatsApp notification to client
- [ ] **9.2.3** `InvoicePaidEventHandler` → send receipt email to client + confirmation to business staff
- [ ] **9.2.4** `MessageSentEventHandler` → email notification if recipient is offline + in-app notification
- [ ] **9.2.5** `MeetingScheduledEventHandler` → send calendar invite (.ics) via email
- [ ] **9.2.6** `MilestoneCompletedEventHandler` → notify client of milestone completion via preferred channel
- [ ] **9.2.7** `ContractSignedEventHandler` → notify business staff that contract has been signed

### 9.3 Hangfire Background Jobs

- [ ] **9.3.1** Configure Hangfire with PostgreSQL storage (public schema). Dashboard secured at `/hangfire` (Owner only)
- [ ] **9.3.2** Implement `InvoiceReminderJob`: daily 8am — find overdue invoices, send email + WhatsApp reminders
- [ ] **9.3.3** Implement `RecurringInvoiceJob`: daily — auto-generate invoices for retainer clients
- [ ] **9.3.4** Implement `MeetingReminderJob`: hourly — send reminders 24h and 1h before meetings
- [ ] **9.3.5** Implement `DocumentExpiryJob`: daily — alert on contracts expiring in 30/7/1 days
- [ ] **9.3.6** Implement `WeeklyDigestJob`: every Monday 7am — send summary to business owners
- [ ] **9.3.7** Implement `CurrencyRateRefreshJob`: every 6 hours — refresh cached exchange rates

> ✅ **Checkpoint:** All notification channels working. Hangfire jobs scheduled and running. WhatsApp delivery confirmed for SADC numbers. No missed events.

---

## Phase 10 — Frontend: Business Portal

> Angular 19 business management dashboard

### 10.1 Angular Core Setup (Both Apps)

- [ ] **10.1.1** Configure Angular routing with lazy-loaded feature modules for all features
- [ ] **10.1.2** Implement `AuthInterceptor`: attach Bearer token, handle 401 with automatic token refresh, redirect to login on failure
- [ ] **10.1.3** Implement `TenantInterceptor`: attach `X-Tenant-Id` header on every request
- [ ] **10.1.4** Implement global error handler: catch HTTP errors, display toast notifications, log to console
- [ ] **10.1.5** Implement `AuthGuard`, `TenantGuard`, `RoleGuard` as functional `CanActivateFn`
- [ ] **10.1.6** Create typed API services: `AuthApiService`, `ClientApiService`, `ProjectApiService`, `InvoiceApiService`, `DocumentApiService`, `MessageApiService`, `MeetingApiService`
- [ ] **10.1.7** Implement NgRx Signal stores: `AuthStore`, `ClientStore`, `ProjectStore`, `InvoiceStore`, `NotificationStore`

### 10.2 Shared UI Component Library (`shared-ui`)

- [ ] **10.2.1** `DataTable` component: sortable columns, column filters, pagination, loading skeleton, empty state
- [ ] **10.2.2** `Modal` / `Dialog` component (shadcn dialog base)
- [ ] **10.2.3** Form components: `Input`, `Textarea`, `Select`, `DatePicker`, `FilePicker` (all reactive forms compatible)
- [ ] **10.2.4** `StatusBadge` component: colour-coded by status enum value
- [ ] **10.2.5** `StatCard` component: metric value + label + trend indicator for dashboards
- [ ] **10.2.6** `EmptyState` component: illustration + message + optional action button
- [ ] **10.2.7** `ConfirmDialog` component for destructive actions (delete, deactivate)
- [ ] **10.2.8** `ToastNotification` service and component with success/error/warning/info variants

### 10.3 Business Portal Screens

- [ ] **10.3.1** Login screen: email/password, remember me, forgot password link
- [ ] **10.3.2** Business dashboard: stat cards (active clients, open invoices, overdue amount, upcoming meetings), recent activity feed
- [ ] **10.3.3** Client list: data table with search, filter by status, invite button
- [ ] **10.3.4** Client detail: tabs for Overview, Projects, Invoices, Documents, Messages, Requests
- [ ] **10.3.5** Project list and project detail with Kanban board view for tasks
- [ ] **10.3.6** Invoice list, create invoice wizard (multi-step), invoice detail with payment recording
- [ ] **10.3.7** Quote builder with line items, send to client, accept/reject workflow
- [ ] **10.3.8** Document library: upload, preview, version history, send contract for signing
- [ ] **10.3.9** Messages inbox: thread list + message thread view with real-time feel
- [ ] **10.3.10** Meetings: calendar view + list view, meeting scheduler form
- [ ] **10.3.11** Notices: publish, archive, target specific clients
- [ ] **10.3.12** Reports: financial summary charts, project status overview, client activity
- [ ] **10.3.13** Settings: branding (logo upload, primary colour picker), team members, notification preferences, tax config

> ✅ **Checkpoint:** Business portal fully navigable. All CRUD operations wired to API. Responsive on desktop and tablet. No broken routes.

---

## Phase 11 — Frontend: Client Portal

> Angular 19 client-facing branded portal

- [ ] **11.1** Client login screen with invite accept flow (first login: set password)
- [ ] **11.2** Client dashboard: active projects card, outstanding invoices, recent documents, upcoming meetings, unread messages
- [ ] **11.3** Projects view: project cards with status badge, milestone progress bar, recent activity
- [ ] **11.4** Project detail: milestones timeline, task list (read-only for clients), documents, messages, requests
- [ ] **11.5** Client request form: submit new request with priority, view request history and current status
- [ ] **11.6** Invoices screen: list invoices with status, view invoice detail, pay online via payment gateway
- [ ] **11.7** Documents screen: view and download documents, sign contracts via e-signature flow
- [ ] **11.8** Messages inbox: send and receive messages, unread count in nav
- [ ] **11.9** Meetings screen: upcoming meetings with countdown, join link button
- [ ] **11.10** Notices screen: read company announcements, mark as read
- [ ] **11.11** Profile screen: update contact details, change password, notification preferences
- [ ] **11.12** Multi-tenant branding: load tenant CSS variables on bootstrap, apply logo, colours, and custom domain

> ✅ **Checkpoint:** Client portal fully functional. Client can log in, view all their data, pay invoices, sign contracts, submit requests, and communicate with the business.

---

## Phase 12 — Security Hardening & Compliance

> POPIA, audit logging, 2FA, security headers

- [ ] **12.1** Implement full audit log: every create/update/delete logs `userId`, `action`, `entityType`, `entityId`, `before`/`after` state as JSONB, `ipAddress`, `timestamp`
- [ ] **12.2** Implement audit log query API: `GET /api/v1/audit-logs` with date, user, and entity filters — accessible to Owner only
- [ ] **12.3** Implement TOTP (Google Authenticator) MFA: enroll endpoint, verify endpoint, generate backup codes
- [ ] **12.4** Implement POPIA compliance features: data export (all data for a client as JSON/CSV), data deletion workflow with approval, consent tracking table
- [ ] **12.5** Implement data retention policy: configurable per tenant (e.g. delete audit logs after N years), Hangfire job enforces policy
- [ ] **12.6** Add rate limiting middleware on all auth endpoints and public-facing APIs (use ASP.NET Core rate limiting)
- [ ] **12.7** Security headers middleware: `HSTS`, `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`
- [ ] **12.8** CORS lockdown for production: whitelist only known tenant domains
- [ ] **12.9** Dependency audit: `dotnet list package --vulnerable` and `npm audit` — resolve all high/critical issues

> ✅ **Checkpoint:** Audit trail complete. 2FA enrollable. POPIA data export and deletion working. Security headers passing [securityheaders.com](https://securityheaders.com) A rating.

---

## Phase 13 — Testing

> Unit, integration, and e2e coverage

### 13.1 Backend Tests

- [ ] **13.1.1** Unit tests: all domain entities and value objects — equality, invariants, factory method rejections
- [ ] **13.1.2** Unit tests: all command and query handlers with mocked repositories (NSubstitute)
- [ ] **13.1.3** Unit tests: all FluentValidation validators — valid cases and all invalid cases
- [ ] **13.1.4** Integration tests: EF Core repositories against real PostgreSQL via Testcontainers
- [ ] **13.1.5** Integration test: multi-tenant schema isolation — verify tenant A cannot read tenant B data under any query
- [ ] **13.1.6** Integration test: full auth flow — register, login, refresh, logout, token reuse detection
- [ ] **13.1.7** API tests: `WebApplicationFactory` — full HTTP request tests for all critical endpoints

### 13.2 Frontend Tests

- [ ] **13.2.1** Unit tests: Angular API services with `HttpClientTestingModule`
- [ ] **13.2.2** Unit tests: NgRx Signal stores — state transitions and side effects
- [ ] **13.2.3** Component tests: Angular Testing Library for all shared UI components
- [ ] **13.2.4** E2E tests: Playwright — login flow, invite client, create project, create and send invoice, pay invoice

> ✅ **Checkpoint:** Unit test coverage > 80% for Domain and Application layers. All integration tests green. E2E critical paths passing in CI.

---

## Phase 14 — Production Readiness

> Performance, monitoring, observability, deployment

- [ ] **14.1** Configure OpenTelemetry: traces (Jaeger/Tempo), metrics (Prometheus), logs (Seq) with appropriate sampling rates
- [ ] **14.2** Add Redis distributed caching: tenant settings, currency rates, user permission sets — with cache invalidation on change
- [ ] **14.3** Add response compression middleware (Brotli + Gzip with appropriate MIME type list)
- [ ] **14.4** Database query optimisation: add indexes on all FK columns, review N+1 queries with MiniProfiler in dev mode
- [ ] **14.5** Configure Npgsql connection pooling: `Min Pool Size`, `Max Pool Size`, `Connection Idle Lifetime`
- [ ] **14.6** Load test key endpoints with k6: invoice list, project dashboard, document upload presigned URL
- [ ] **14.7** Write production `docker-compose.prod.yml`: resource limits, restart policies, secrets via Docker Secrets
- [ ] **14.8** Configure automated PostgreSQL backups to S3 with 30-day retention and weekly restore test
- [ ] **14.9** Write runbook: deployment procedure, rollback procedure, incident response steps
- [ ] **14.10** Configure custom domain SSL: Caddy or Let's Encrypt with automatic renewal for all tenant domains

> ✅ **Final Checkpoint:** System monitored, load-tested, and production-deployed. Backups verified with test restore. Runbook reviewed. Go live.

---

## Summary

| Phase | Focus | Key Deliverable |
|---|---|---|
| 0 | Foundation | Docker stack running, repos scaffolded |
| 1 | Shared Kernel | Result\<T\>, middleware, Scalar docs |
| 2 | Multi-Tenancy | Schema isolation, provisioning |
| 3 | Auth | JWT, refresh tokens, RBAC |
| 4 | Clients | Invite & onboarding flow |
| 5 | Projects | Dashboard, milestones, tasks |
| 6 | Documents | Upload, versioning, e-signatures |
| 7 | Invoicing | Payments, multi-currency, tax |
| 8 | Communication | Messaging, notices, meetings |
| 9 | Notifications | Email, WhatsApp, SMS, Hangfire |
| 10 | Business Portal | Full Angular management dashboard |
| 11 | Client Portal | Full Angular client-facing portal |
| 12 | Security | POPIA, 2FA, audit trail |
| 13 | Testing | Unit, integration, E2E |
| 14 | Production | Monitoring, load test, deploy |

---

*ClientPortal SADC · Project Task List · ~14 phases · ~120 tasks · v1.0.0*
