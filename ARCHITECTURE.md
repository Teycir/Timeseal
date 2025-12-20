# Architecture & Abstraction Guide

## Overview

Time-Seal follows a layered architecture with clear separation of concerns and dependency injection for maximum reusability and testability.

## Layer Structure

```
┌─────────────────────────────────────┐
│         Presentation Layer          │
│  (UI Components, Pages, Hooks)      │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│         Application Layer           │
│  (API Handlers, Middleware)         │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│          Service Layer              │
│  (Business Logic, SealService)      │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│       Infrastructure Layer          │
│  (Storage, Database, Crypto)        │
└─────────────────────────────────────┘
```

## Core Abstractions

### 1. Service Layer (`lib/sealService.ts`)
**Purpose**: Encapsulates all business logic for seal operations

**Benefits**:
- Single source of truth for seal operations
- Easy to test in isolation
- Reusable across different API endpoints

**Usage**:
```typescript
const service = new SealService(storage, database);
const sealId = await service.createSeal(request, ip);
const metadata = await service.getSeal(sealId, ip);
```

### 2. Storage Abstraction (`lib/storage.ts`)
**Purpose**: Provides unified interface for R2 and mock storage

**Benefits**:
- Environment-agnostic code
- Easy to switch between mock and production
- Testable without R2 dependencies

**Usage**:
```typescript
const storage = createStorage(env);
await storage.uploadBlob(id, data, unlockTime);
const blob = await storage.downloadBlob(id);
```

### 3. Database Abstraction (`lib/database.ts`)
**Purpose**: Provides unified interface for D1 and mock database

**Benefits**:
- Type-safe database operations
- Easy to test without D1
- Consistent API across environments

**Usage**:
```typescript
const db = createDatabase(env);
await db.createSeal(record);
const seal = await db.getSeal(id);
```

### 4. API Handler Abstraction (`lib/apiHandler.ts`)
**Purpose**: Composable middleware system for request handling

**Benefits**:
- Reusable middleware (logging, error handling, CORS)
- Consistent error handling
- Easy to add new middleware

**Usage**:
```typescript
const handler = createHandler(async (ctx) => {
  const service = ctx.env.sealService;
  const result = await service.createSeal(data, ctx.ip);
  return jsonResponse({ sealId: result });
});
```

### 5. Custom Hooks (`lib/hooks.ts`)
**Purpose**: Reusable React logic for common patterns

**Benefits**:
- DRY principle for UI logic
- Consistent behavior across components
- Easy to test

**Usage**:
```typescript
const { timeLeft, isExpired } = useCountdown(unlockTime);
const { data, loading, error } = useAPI('/api/seal/123');
const { copied, copy } = useCopyToClipboard();
```

### 6. Dependency Injection (`lib/container.ts`)
**Purpose**: Manages service dependencies and lifecycle

**Benefits**:
- Loose coupling between components
- Easy to mock for testing
- Centralized service configuration

**Usage**:
```typescript
const container = createContainer(env);
const sealService = container.resolve('sealService');
const logger = container.resolve('logger');
```

### 7. Configuration Management (`lib/config.ts`)
**Purpose**: Centralized configuration with validation

**Benefits**:
- Type-safe configuration access
- Environment-specific settings
- Validation on startup

**Usage**:
```typescript
const maxSize = config.get('maxFileSizeMB');
if (config.isProduction()) { /* ... */ }
```

## Design Patterns Used

### 1. **Factory Pattern**
- `createStorage()`, `createDatabase()`, `createContainer()`
- Abstracts object creation based on environment

### 2. **Strategy Pattern**
- `StorageProvider`, `DatabaseProvider` interfaces
- Different implementations for dev/prod

### 3. **Middleware Pattern**
- `compose()`, `withLogging`, `withErrorHandling`
- Composable request processing pipeline

### 4. **Circuit Breaker Pattern**
- `CircuitBreaker` class in `lib/circuitBreaker.ts`
- Prevents cascading failures

### 5. **Repository Pattern**
- `DatabaseProvider` interface
- Abstracts data access layer

## Testing Strategy

### Unit Tests
```typescript
// Test service in isolation
const mockStorage = new MockStorage();
const mockDb = new MockDatabase();
const service = new SealService(mockStorage, mockDb);
```

### Integration Tests
```typescript
// Test with real implementations
const container = createContainer(testEnv);
const service = container.resolve('sealService');
```

### E2E Tests
```typescript
// Test full stack with Playwright
await page.goto('/');
await page.fill('[data-testid="secret"]', 'test');
```

## Adding New Features

### Example: Add Email Notifications

1. **Create abstraction** (`lib/notifications.ts`):
```typescript
export interface NotificationProvider {
  sendUnlockNotification(email: string, sealId: string): Promise<void>;
}
```

2. **Register in container** (`lib/container.ts`):
```typescript
c.registerFactory('notifications', () => {
  return new EmailNotificationProvider();
});
```

3. **Use in service** (`lib/sealService.ts`):
```typescript
const notifications = container.resolve('notifications');
await notifications.sendUnlockNotification(email, sealId);
```

## Best Practices

1. **Always use abstractions** - Never directly instantiate infrastructure classes
2. **Inject dependencies** - Use constructor injection or container
3. **Write interfaces first** - Define contracts before implementations
4. **Keep layers separate** - UI shouldn't know about database details
5. **Test at boundaries** - Mock external dependencies
6. **Use factories** - Abstract environment-specific logic

## File Organization

```
lib/
├── apiHandler.ts      # Request handling abstraction
├── circuitBreaker.ts  # Resilience patterns
├── config.ts          # Configuration management
├── container.ts       # Dependency injection
├── crypto.ts          # Encryption primitives
├── database.ts        # Database abstraction
├── errors.ts          # Error handling
├── hooks.ts           # React hooks
├── keyEncryption.ts   # Key security
├── logger.ts          # Structured logging
├── metrics.ts         # Observability
├── rateLimit.ts       # Rate limiting
├── sealService.ts     # Business logic
├── storage.ts         # Storage abstraction
├── utils.ts           # Utility functions
└── validation.ts      # Input validation
```
