# GiesenCloudMobile

## Project Overview
React Native (Expo) mobile app for GiesenCloud coffee roasting platform.

## Tech Stack
- Expo / React Native with TypeScript
- Expo Router for navigation
- Axios for API calls
- expo-secure-store for auth token storage

## API Configuration
- Backend project: `/Users/daveygiesen/Documents/GitHub/GiesenCloud` (Laravel)
- API base path: `/api/mobile/v1` (NOT `/mobile/api`)
- Environment configs in `app.config.ts`:
  - Development: `https://giesencloud.test/api/mobile/v1`
  - Staging: `https://staging.giesen.cloud/api/mobile/v1`
  - Production: `https://giesen.cloud/api/mobile/v1`
- API client: `src/api/client.ts` (axios with Bearer token auth)
- Config: `src/constants/config.ts`

## API Endpoints (relative to base URL)
- `/auth/login`, `/auth/logout`, `/auth/user`, `/auth/profile`
- `/dashboard`
- `/planning` (CRUD + complete)
- `/employees` (team members list, paginated)
- `/profiles`, `/profiles/summary`, `/profiles/{id}`
- `/devices`, `/equipment`, `/equipment/{id}`
- `/roasts`, `/roasts/summary`, `/roasts/{id}`
- `/inventory`, `/inventory/summary`, `/inventory/{id}`, `/inventory/{id}/adjust`
- `/suppliers`, `/suppliers/{id}`
- `/purchase-orders`, `/purchase-orders/{id}`
- `/quality`, `/quality/summary`, `/quality/forms`, `/quality/{id}`
- `/reports/production`, `/reports/quality`, `/reports/inventory`
- `/teams`, `/teams/switch`
- `/notifications`, `/notifications/{id}/read`, `/notifications/read-all`
- `/broadcasting/auth`
- `/tickets`, `/tickets/{id}`, `/tickets/{id}/message`, `/tickets/{id}/close`, `/tickets/assets`, `/tickets/statuses`, `/tickets/upload-url`
- `/knowledge-base/questions`, `/knowledge-base/categories`, `/knowledge-base/roaster-models`, `/knowledge-base/category-stats`
- `/service-appointments`, `/service-appointments/{id}`, `/service-appointments/{id}/confirm`, `/service-appointments/{id}/decline`, `/service-appointments/{id}/reschedule`, `/service-appointments/assets`, `/service-appointments/work-types`

## Backend Routes
- Backend mobile routes defined in: `GiesenCloud/routes/api_mobile.php`
- Route prefix registered in: `GiesenCloud/app/Providers/RouteServiceProvider.php`
- Mobile controllers in: `GiesenCloud/app/Http/Controllers/API/Mobile/`

## Important Notes
- When adding new API endpoints in the mobile app, the corresponding route and controller must also be created in the GiesenCloud backend project.
- Auth uses Sanctum tokens with `ability:mobile`.
- Employees are team members (Users) from the current team, served via `/employees` endpoint.
