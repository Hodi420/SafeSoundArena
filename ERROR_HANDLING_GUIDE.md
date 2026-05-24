# Error Handling Architecture Guide

## 📊 Overview

SafeSoundArena has a comprehensive error handling system with layers for:
- **Frontend:** React Error Boundaries, Error Alerts, utility functions
- **Backend:** Error middleware, custom error classes, structured logging
- **API:** Consistent error response format, typed error handling

---

## 🎯 Frontend Error Handling

### 1. Error Boundary (React.FC)

**File:** `frontend/src/components/ErrorBoundary.tsx`

Catches React component errors and renders fallback UI instead of blank screen.

```tsx
import ErrorBoundary from '@/components/ErrorBoundary';

<ErrorBoundary fallback={(error, reset) => (
  <div>
    <h1>Something went wrong</h1>
    <button onClick={reset}>Try Again</button>
  </div>
)}>
  <YourComponent />
</ErrorBoundary>
```

**Features:**
- Catches render errors in child components
- Custom fallback UI support
- Reset button to recover from errors
- Logs errors to console for debugging

### 2. Error Alert (Inline Display)

**File:** `frontend/src/components/ErrorAlert.tsx`

Displays errors inline without blocking UI.

```tsx
import { ErrorAlert } from '@/components/ErrorAlert';

const [error, setError] = useState<string | null>(null);

<ErrorAlert
  error={error}
  severity="error"
  title="Failed to load data"
  onDismiss={() => setError(null)}
/>
```

**Severity Levels:**
- `error` - Red, for critical failures
- `warning` - Orange, for warnings
- `info` - Blue, for information

### 3. useAsyncError Hook

**File:** `frontend/src/hooks/useAsyncError.ts`

Handle async errors in components and throw them to Error Boundary.

```tsx
import { useAsyncError } from '@/hooks/useAsyncError';

export function DataFetcher(): JSX.Element {
  const throwAsyncError = useAsyncError();

  useEffect(() => {
    fetchData()
      .catch(throwAsyncError);
  }, [throwAsyncError]);

  return <div>Data loaded!</div>;
}
```

### 4. Error Utilities

**File:** `frontend/src/utils/errorUtils.ts`

Type-safe error handling helpers.

```tsx
import {
  isApiError,
  getErrorMessage,
  handleFetchError,
  retryAsync,
  logError
} from '@/utils/errorUtils';

// Type guard for API errors
if (isApiError(response)) {
  console.error(response.error.message);
}

// Extract error message from any error type
const msg = getErrorMessage(error);

// Retry failed requests
const result = await retryAsync(
  () => fetch('/api/data'),
  3,    // max retries
  1000  // delay in ms
);

// Log with context
logError(error, 'DataFetcher');
```

---

## 🔧 Backend Error Handling

### 1. Error Handler Middleware

**File:** `backend/errorHandler.js`

Catches all errors from routes and returns consistent error responses.

```javascript
const express = require('express');
const { errorHandler, asyncHandler } = require('./errorHandler');

const app = express();

// Your routes here
app.get('/api/users', asyncHandler(async (req, res) => {
  const users = await User.find();
  res.json({ success: true, data: users });
}));

// Error middleware - MUST be last
app.use(errorHandler);
```

### 2. Custom Error Classes

```javascript
const { ApiError, ValidationError, UnauthorizedError, NotFoundError } = require('./errorHandler');

// Throw custom errors
throw new ValidationError('Email is invalid', 'email');
throw new UnauthorizedError('Invalid credentials');
throw new NotFoundError('User not found');

// Use with HTTP status codes
throw new ApiError('Custom error message', 401, 'CUSTOM_CODE');
```

### 3. Error Response Format

All API errors return consistent format:

```json
{
  "success": false,
  "error": {
    "message": "User not found",
    "code": "NOT_FOUND",
    "stack": "Error: User not found\n    at ..."  // Only in development
  }
}
```

**Status Codes:**
- `400` - Validation Error
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Error (default)

---

## 🔄 Best Practices

### Frontend

1. **Wrap async operations:**
   ```tsx
   try {
     const data = await fetch('/api/data');
     setData(data);
   } catch (error) {
     setError(getErrorMessage(error));
   }
   ```

2. **Use Error Boundary for components:**
   ```tsx
   <ErrorBoundary>
     <GameWorld />
   </ErrorBoundary>
   ```

3. **Show user-friendly messages:**
   ```tsx
   const userMessage = error.statusCode === 404
     ? 'Item not found'
     : 'Something went wrong';
   ```

4. **Log errors for debugging:**
   ```tsx
   logError(error, 'ComponentName.useEffect');
   ```

### Backend

1. **Use asyncHandler for all async routes:**
   ```javascript
   app.get('/api/data', asyncHandler(async (req, res) => {
     // Error will be caught automatically
   }));
   ```

2. **Throw errors instead of returning:**
   ```javascript
   if (!user) {
     throw new NotFoundError('User not found');
   }
   ```

3. **Validate early:**
   ```javascript
   if (!email || !isValidEmail(email)) {
     throw new ValidationError('Invalid email', 'email');
   }
   ```

4. **Don't expose sensitive data:**
   ```javascript
   // Bad
   throw new ApiError(`Database error: ${dbError.message}`);

   // Good
   logError(dbError, 'DatabaseOperation');
   throw new ApiError('Internal server error');
   ```

---

## 🧪 Testing Errors

### Unit Tests

```typescript
describe('ErrorBoundary', () => {
  it('should catch errors', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    const { container } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(container.textContent).toContain('Something went wrong');
  });
});
```

### Integration Tests

```typescript
describe('/api/users', () => {
  it('should return 404 for missing user', async () => {
    const response = await fetch('/api/users/999');
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('NOT_FOUND');
  });
});
```

---

## 📋 Checklist

- [ ] All async routes wrapped in `asyncHandler`
- [ ] Custom error classes used instead of generic errors
- [ ] Error middleware placed after all routes
- [ ] Error Boundary wraps major feature components
- [ ] ErrorAlert used for user-facing errors
- [ ] All error messages are user-friendly
- [ ] Sensitive data not included in error responses
- [ ] Errors logged with context for debugging
- [ ] Error response format consistent across all endpoints

---

## 🔗 Related Files

- `frontend/src/components/ErrorBoundary.tsx` - React Error Boundary
- `frontend/src/components/ErrorAlert.tsx` - Inline error display
- `frontend/src/hooks/useAsyncError.ts` - Async error hook
- `frontend/src/utils/errorUtils.ts` - Error utilities
- `backend/errorHandler.js` - Backend error middleware
- `utils/validation.js` - Input validation (prevents many errors)
