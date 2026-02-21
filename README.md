# GiesenCloud Mobile

The official GiesenCloud mobile companion app for iOS and Android. Built with React Native (Expo) to give roastery teams on-the-go access to roast data, live monitoring, inventory tracking, production planning, and quality cupping.

---

## Getting Started

### Prerequisites

- **Node.js** 18+ or **Bun** (recommended)
- **Xcode** 17+ (iOS development)
- **Android Studio** (Android development)
- **Expo CLI**: Installed automatically via `npx`
- **GiesenCloud backend** running locally at `https://giesencloud.test` (served by Laravel Herd)

### Installation

```bash
# Clone the repository
git clone git@github.com:GiesenCoffeeRoasters/GiesenCloudMobile.git
cd GiesenCloudMobile

# Install dependencies
bun install
# or
npm install

# Install iOS native dependencies
cd ios && pod install && cd ..
```

### Running the App

```bash
# iOS Simulator
bun ios
# or specify a device
npx expo run:ios --device "iPhone 16e"

# Android Emulator
bun android

# Start Metro bundler only (if app is already installed)
bun start
```

### Environment Configuration

The API base URL and Reverb host are configured per environment in `app.config.ts`, selected via the `APP_ENV` variable:

| Environment | API Base URL | Reverb Host |
|---|---|---|
| Development | `https://giesencloud.test/api/mobile/v1` | `reverb.herd.test` |
| Staging | `https://staging.giesen.cloud/api/mobile/v1` | `reverb.staging.giesen.cloud` |
| Production | `https://giesen.cloud/api/mobile/v1` | `reverb.giesen.cloud` |

The iOS development build allows insecure HTTP for `giesencloud.test` via App Transport Security exceptions in `app.config.ts`.

---

## Features

### Dashboard
The home screen provides a customizable overview of your roastery operations:

- **Quick Stats** -- Today's roasts, active roasters, low stock alerts
- **Today's Schedule** -- Planned roasts with status indicators
- **Live Roasters** -- Real-time roaster metrics with pulsing activity indicators
- **Quick Actions** -- Shortcuts to plan roasts, log quality, and check inventory
- **Recent Activity** -- Feed of latest events (completed roasts, stock alerts, deliveries)
- **Inventory Alerts** -- Items running low or at critical stock levels
- **Production Summary** -- Daily KPIs: total kg roasted, batch count, averages
- **Recent Roasts** -- Last completed roasts with cupping scores

Widgets can be reordered, enabled, or disabled via the edit button. Preferences are persisted locally.

### Roasts
Browse and inspect all completed roasts across your team:

- **Filters**: All, Today, This Week, This Month
- **Roast detail**: Profile name, device, bean type, weights, weight loss, duration
- **Cupping scores**: Color-coded badges (90+ green, 85+ blue, 80+ yellow, below orange)
- **Curve visualization**: Bean temperature, drum temperature, and ROR charts
- **Profiles tab**: View all roasting profiles, filter by favorites, see average durations

### Planning
Schedule and track roasting production:

- **Views**: Day, Week, or List
- **Status tracking**: Planned, In Progress, Completed -- with color-coded indicators
- **Create plans**: Select date, profile, device, batch size, and optional notes
- **Searchable pickers**: Quickly find profiles and devices

### Inventory
Track green bean stock and supplies:

- **Categories**: All, Green Beans, Roasted, Blends
- **View modes**: List or Grid
- **Stock status**: OK (green), Low (yellow), Critical (red) badges
- **Detail view**: Quantity, supplier, location, variety, certificates, received date

### Quality (Cupping)
Manage coffee cupping and quality evaluation:

- **Session list**: Active and completed sessions with overall scores
- **Blind cupping** support
- **Create sessions**: Name, description, form template selection, sample management
- **Score breakdown**: Per-sample scoring with evaluations

### Equipment
Monitor your Giesen roasting machines:

- **Device list**: Online/offline status with model and serial number
- **Metrics**: Roasting hours, running hours, IP address
- **Subscriptions**: Feature availability per device (Giesen Live, Roast Planning, Inventory, etc.)
- **Sync status**: Last sync timestamp and recent roasts

### Giesen Live
Real-time monitoring of active roasting sessions via WebSocket:

- **Live metrics**: Bean temperature, air temperature, power, speed, ROR, pressure
- **Status detection**: Roasting, Replaying, Recording, Connected, Disconnected
- **Pulsing indicators** for active roasts
- **Auto-disconnect**: Devices marked offline after 10 seconds without data
- Powered by Pusher (Laravel Reverb) on private team channels

### Reports
Production analytics and quality insights:

- **Production**: Total roasts, weight roasted, average duration, daily breakdown
- **Quality**: Average cupping scores, session count, score distribution
- **Top profiles** analysis

### Notifications
In-app notification center with read/unread status, categorized by type (roast, inventory, general).

### Tab Bar Customization
Users can personalize which tabs appear in the bottom navigation:

- Select 2-5 visible tabs
- Reorder tab positions
- Hidden tabs remain accessible via the "More" menu
- Preferences saved locally

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo 54, React Native 0.81 |
| Language | TypeScript 5.9 |
| Routing | Expo Router 6 (file-based) |
| Styling | NativeWind 4 (Tailwind CSS 3) |
| State Management | Zustand 5 |
| HTTP Client | Axios |
| Real-time | Pusher JS (WebSocket via Laravel Reverb) |
| Secure Storage | Expo Secure Store |
| Fonts | DM Sans, JetBrains Mono |

---

## Project Structure

```
app/                        # Expo Router file-based routes
  _layout.tsx               # Root layout (auth guard, font loading)
  login.tsx                 # Login screen
  profile.tsx               # User profile settings
  notifications.tsx         # Notification center
  tab-settings.tsx          # Tab bar customization
  (tabs)/                   # Tab navigator
    _layout.tsx             # Tab bar configuration
    index.tsx               # Dashboard
    roasts.tsx              # Roast history
    planning.tsx            # Production planning
    inventory.tsx           # Inventory management
    quality.tsx             # Cupping sessions
    equipment.tsx           # Profiler devices
    reports.tsx             # Analytics
    giesen-live.tsx         # Real-time monitoring
    more.tsx                # Overflow menu
  roasts/[id].tsx           # Roast detail
  profiles/[id].tsx         # Profile detail
  planning/[id].tsx         # Plan detail
  planning/create.tsx       # Create plan form
  quality/[id].tsx          # Cupping session detail
  quality/create.tsx        # Create session form
  equipment/[id].tsx        # Device detail
  inventory/[id].tsx        # Inventory item detail

src/
  api/client.ts             # Axios instance with auth interceptors
  components/               # Reusable UI components
    dashboard/              # Dashboard widget components
  constants/Colors.ts       # Design system color palette
  hooks/useGiesenLive.ts    # Pusher WebSocket hook
  services/pusher.ts        # Pusher client configuration
  stores/                   # Zustand state stores
    authStore.ts            # Authentication state
    liveStore.ts            # Giesen Live device readings
    tabStore.ts             # Tab bar order/visibility
    widgetStore.ts          # Dashboard widget preferences
  types/index.ts            # TypeScript interfaces

ios/                        # iOS native project
android/                    # Android native project
assets/                     # App icons, splash, fonts
```

---

## Authentication

The app uses token-based authentication against the GiesenCloud API:

1. User enters email and password on the login screen
2. `POST /auth/login` returns an API token
3. Token is stored securely via `expo-secure-store`
4. All subsequent API requests include the token via an Axios interceptor
5. On 401 responses, the user is automatically logged out
6. Logout clears the token and disconnects Pusher

---

## Design System

### Colors

| Name | Hex | Usage |
|---|---|---|
| Primary (Slate) | `#383838` | Text, headers |
| Secondary | `#7a7a76` | Labels, descriptions |
| Tertiary | `#a5a5a0` | Hints, placeholders |
| Leaf | `#71b068` | Success, OK status, high scores (90+) |
| Sky | `#4d92b8` | Info, planned status, good scores (85+) |
| Sun | `#f5c462` | Warning, low stock, fair scores (80+) |
| Boven | `#fc8758` | Active/roasting, lower scores |
| Traffic | `#db5a5a` | Critical, errors |
| Grape | `#7e6599` | Profile accent |
| Background | `#f7f7f5` | Screen background |
| Card | `#ffffff` | Card surfaces |
| Border | `#e8e8e3` | Dividers, borders |

### Typography

- **DM Sans** -- Primary font (Regular, Medium, SemiBold, Bold)
- **JetBrains Mono** -- Monospace for data values and metrics

---

## API Endpoints

All endpoints are prefixed with `/api/mobile/v1`.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/login` | Authenticate user |
| `POST` | `/auth/logout` | Sign out |
| `GET` | `/auth/user` | Current user info |
| `GET` | `/dashboard` | Dashboard data |
| `GET` | `/roasts` | Roast history (paginated) |
| `GET` | `/roasts/:id` | Roast detail with curves |
| `GET` | `/profiles` | Roasting profiles |
| `GET` | `/profiles/:id` | Profile detail |
| `GET` | `/planning` | Production plans |
| `POST` | `/planning` | Create plan |
| `GET` | `/planning/:id` | Plan detail |
| `GET` | `/inventory` | Inventory items |
| `GET` | `/inventory/:id` | Item detail |
| `GET` | `/equipment` | Profiler devices |
| `GET` | `/equipment/:id` | Device detail |
| `GET` | `/quality` | Cupping sessions |
| `POST` | `/quality` | Create session |
| `GET` | `/quality/:id` | Session detail |
| `GET` | `/reports/production` | Production analytics |
| `GET` | `/reports/quality` | Quality analytics |
| `POST` | `/broadcasting/auth` | WebSocket channel auth |

---

## Real-Time (Giesen Live)

Giesen Live uses Pusher (via Laravel Reverb) for WebSocket communication:

- **Channel**: `private-team.{teamId}.giesen-live`
- **Event**: `batch.received`
- **Data**: Bean temp, air temp, ROR, power, speed, pressure, roaster status
- **Check interval**: 2 seconds for disconnect detection
- **Timeout**: Devices marked disconnected after 10 seconds without data

Configuration in `app.config.ts` (consumed via `src/constants/config.ts`):

| Setting | Development | Staging | Production |
|---|---|---|---|
| Host | `reverb.herd.test` | `reverb.staging.giesen.cloud` | `reverb.giesen.cloud` |
| Port | 443 | 443 | 443 |
| TLS | Yes | Yes | Yes |

---

## Scripts

```bash
bun start          # Start Expo development server
bun ios            # Build and run on iOS simulator
bun android        # Build and run on Android emulator
bun web            # Start web version (experimental)
```

---

## Troubleshooting

### Metro bundler port conflict
If port 8081 is already in use:
```bash
npx expo start --port 8082
```

### iOS build fails
```bash
cd ios && pod install --repo-update && cd ..
```

### Clearing caches
```bash
npx expo start --clear
```

### App not connecting to local API
Ensure Laravel Herd is serving `giesencloud.test` and that the simulator can reach it. The iOS build includes an ATS exception for `giesencloud.test` to allow local HTTP connections.
