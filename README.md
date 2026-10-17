# Full-stack starter

A reusable React and Express application for **আহ্বান রক্তদান সংস্থা**. It
includes the responsive blood-donation landing page and MongoDB-backed
registration, individual profile editing, and opt-in donor search using JWTs in
HttpOnly cookies.

## Recent Updates

- Removed the Navbar's duplicate **“রক্ত দান করুন”** registration button. Logged-out
  users use the existing **Login** and **Registration** links instead; the
  separate donation call to action on the homepage remains.
- After login or registration, the Navbar uses the authenticated user's actual
  profile image when available, otherwise showing a themed initials/icon
  fallback, alongside their name. Login and Registration are not shown while
  authenticated.
- Added a responsive profile dropdown with exactly **Profile**, **Profile
  Edit**, and **Logout** actions. It reuses the existing `/profile` and
  `/profile?edit=1` routes and the existing authentication provider/logout API.
- The profile menu supports keyboard dismissal, outside-click dismissal, and
  responsive layouts across desktop, tablet, and mobile.
- Authentication continues to use the existing safe current-user response and
  HttpOnly cookie session; credentials and tokens are not rendered in the
  Navbar.

## Authentication Navigation Fix

- Home navigation from other routes now uses React Router links instead of a
  full-page browser navigation, keeping the existing root-level auth provider
  mounted while navigating between Home and `/donor-experiences`.
- Public donor experiences remain viewable without authentication; browsing
  between these routes does not call logout or clear the session.
- Auth restoration continues through `/api/auth/me`. Initial loading remains
  distinct from unauthenticated status, and a temporary current-user request
  failure does not discard an already authenticated in-memory user. An
  explicit 401 still transitions to unauthenticated; existing logout behavior
  continues to clear the server cookie.

## Section Navigation Fix

- Navbar links for **আমাদের সম্পর্কে** and **রক্ত খুঁজুন** now smoothly scroll
  to the existing Home sections (`#about` and `#find-blood`). They work from
  Home and other routes, including the public donor-experiences page, without
  adding duplicate sections or reloading the application.
- Home section navigation accounts for the sticky Navbar offset, and the
  existing section scroll margin keeps headings visible after navigation.

## Live Impact Statistics

- The Home banner's **Live Impact** panel loads its total registered-user count,
  distribution across all eight valid blood groups, and registration counts
  grouped by UTC year and month from the public `GET /api/stats/live-impact`
  endpoint. MongoDB performs the aggregation; the endpoint returns only
  aggregate values and no user records.
- The panel fetches current database statistics when the Home page loads, and
  chart values are never substituted with demo values. It shows loading and
  retryable error states when data cannot be retrieved.
- Responsive Chart.js doughnut and bar charts present blood-group and
  year-specific monthly data side by side on larger screens and stacked on
  mobile.

## Top Blood Donor Leaderboard

- The public Top 10 leaderboard ranks donors who opted into public search by
  lifetime donations: their pre-registration donation count plus unique
  donation dates logged on the website. Duplicate dates count once.
- Equal donation totals are ordered by newest registration date, then stable
  database ID order. The backend returns only opted-in public profile fields
  and aggregate donation counts; users with no donations are excluded.
- The leaderboard is available to logged-in and logged-out visitors at
  `/top-donors`, linked from the Navbar, and is no longer shown on the Home page.
- The page displays only each donor's profile photo, name, and total lifetime
  donation count. Selecting the photo or name opens the existing public donor
  profile. The leaderboard is refreshed when `/top-donors` loads, so newly
  logged donation dates affect the next displayed ranking.

## Multilingual Support

- The interface supports Bangla and English, with Bangla selected by default
  for first-time visitors.
- A language toggle remains beside the account controls in the Navbar for both
  signed-in and public visitors.
- The selected language is saved in `localStorage` under `language` and is
  restored on the next visit or page refresh.
- Language changes update the current React view immediately without changing
  the route, reloading the page, or modifying the authentication session.
- Shared translation dictionaries provide Bangla and English UI copy across
  the Navbar, Home and donor search, authentication and profile forms, donor
  directory and public profiles, donation badges, and donor stories. Names,
  locations, blood-group values, donation counts, and other donor-supplied
  profile data are not translated.

## Shared Footer

- All application routes use the shared responsive footer, with an animated
  donor-to-recipient blood-flow illustration and Bangla/English messages.
- The lightweight CSS animation respects `prefers-reduced-motion`, where the
  visual becomes static.
- The footer includes developer information for Md. Shakil Ahammed, including
  role, education, and a short project description. No unverified social links
  or profile image are shown.

### Donor registration, profiles, and search

- Extended the existing `/register` and `/profile` forms with optional
  WhatsApp contact details, a separate opt-in for public contact visibility,
  donation history, and district-dependent upazila selection. Registration can
  optionally include a profile photo, stored with the existing image-processing
  and avatar-storage flow.
- Added an explicit browser-geolocation action to registration and profile
  editing. Coordinates are saved to the signed-in user's account and are not
  included in public donor search or public donor profiles. No geocoder is
  configured, so donors enter a readable address in the existing location
  field.
- Donor availability is now calculated by the backend from the last donation
  date: a donor becomes available after 120 complete UTC calendar days. The
  frontend cannot submit an availability override.
- Search results and public donor profiles reuse the existing MongoDB donor
  API and display profile-photo fallbacks, upazila, donation history, and
  availability. Contact details remain private by default (including for
  existing accounts); a separate donor opt-in is required before phone or
  supplied WhatsApp numbers appear publicly. The existing card/profile then
  provide call/copy actions and WhatsApp when supplied. Email, coordinates,
  and authentication secrets are not included in public donor data.
- Added a shared Bangladesh upazila lookup with 64 districts and 494 upazilas.
  Its source and MIT license notice are recorded in
  [`shared/BANGLADESH-GEOCODE-LICENSE.txt`](./shared/BANGLADESH-GEOCODE-LICENSE.txt).
- Relevant existing UI/API files include
  `frontend/src/pages/RegisterPage.jsx`,
  `frontend/src/pages/ProfilePage.jsx`,
  `frontend/src/components/landing/BloodSearch.jsx`,
  `frontend/src/components/landing/DonorCard.jsx`,
  `frontend/src/pages/DonorProfilePage.jsx`,
  `backend/src/models/User.js`, and
  `backend/src/services/donor.service.js`. No replacement authentication,
  profile, or donor-data system was added.

### Donor Badge System

- Added four backend-calculated donation badges: **Bronze Donor** at 1
  donation, **Silver Donor** at 3, **Gold Donor** at 5, and **Platinum Donor**
  at 10. Zero donations show **New Donor**. Totals use the sum of the
  pre-registration `previousBloodDonations` count and unique donation dates
  explicitly logged on the authenticated profile; donor-story dates and their
  optional story counts do not affect this total.
- The authenticated profile API calculates and returns the badge, lifetime
  total, pre-registration/logged count breakdown, progress to the next level,
  and newest-first logged donation dates. Public donor cards and profiles
  receive only the compact badge summary and total, not donation history.
- The profile's **Your Donor Badge** section appears below **আমার অনুভূতি** and
  shows the level, lifetime count, dynamic progress, and actual logged
  donation dates. Donor cards show a compact badge; searchable public donor
  profiles show the badge and total only.

### Donation Logging System

- Users can record their last donation date from **Log or Update Donation
  Date** on their own profile. The authenticated `POST
  /api/users/profile/donation-history` endpoint derives ownership from the
  session, accepts a strict `YYYY-MM-DD` date, and rejects malformed, future,
  and pre-registration dates.
- Each UTC calendar date can be logged only once for a user. Re-submitting the
  same date is idempotent; dates are stored in the user's donation history and
  shown newest first. The profile's `lastDonationDate` advances only when a
  newer date is logged, so older history entries cannot incorrectly reset the
  availability clock.
- Registration-time `previousBloodDonations` remains the pre-joining total.
  Profile edits cannot directly change this count or `lastDonationDate`; new
  post-registration donations must be recorded through the authenticated
  logging endpoint. No donation-history removal control is exposed.
- Donor availability continues to be calculated by the backend from the
  authoritative latest donation date and existing 120-day eligibility rule.

## Technology stack

- **Frontend:** React 19, Vite 8, Tailwind CSS 4
- **Backend:** Node.js, Express 5
- **Database:** MongoDB via Mongoose 9
- **Authentication:** JWT cookie sessions, `bcryptjs` password hashing, and
  protected React routes.
- **Development:** `concurrently`, Node.js built-in watch mode, and Oxlint

Use Node.js `20.19+` or `22.12+` (the configured Vite toolchain requires a
supported modern Node version).

## Project structure

```text
.
├── .env.example
├── .gitignore
├── README.md
├── package.json
├── package-lock.json
├── backend/
│   ├── package.json
│   ├── package-lock.json
│   ├── test/
│   │   ├── auth.integration.test.js
│   │   ├── auth-validation.test.js
│   │   ├── donation-eligibility.test.js
│   │   ├── donor-badge.test.js
│   │   └── health.service.test.js
│   └── src/
│       ├── app.js
│       ├── server.js
│       ├── controllers/
│       │   ├── auth.controller.js
│       │   ├── donor.controller.js
│       │   ├── experience.controller.js
│       │   ├── experience-social.controller.js
│       │   ├── health.controller.js
│       │   └── user.controller.js
│       ├── config/
│       │   └── database.js
│       ├── errors/
│       │   └── http-error.js
│       ├── middleware/
│       │   ├── authenticate.js
│       │   ├── experience-upload.js
│       │   ├── error-handler.js
│       │   ├── optional-authenticate.js
│       │   ├── profile-photo-upload.js
│       │   └── verify-origin.js
│       ├── models/
│       │   ├── Experience.js
│       │   ├── ExperienceComment.js
│       │   ├── ExperienceReaction.js
│       │   └── User.js
│       ├── routes/
│       │   ├── auth.routes.js
│       │   ├── donor.routes.js
│       │   ├── experience-comment.routes.js
│       │   ├── experience.routes.js
│       │   ├── health.routes.js
│       │   └── user.routes.js
│       ├── services/
│       │   ├── auth.service.js
│       │   ├── donor-badge.service.js
│       │   ├── donor.service.js
│       │   ├── experience-image-storage.js
│       │   ├── experience-social.service.js
│       │   ├── experience.service.js
│       │   ├── health.service.js
│       │   └── user.service.js
│       └── utils/
│           ├── auth-validation.js
│           ├── bangladesh-locations.js
│           ├── donor-badge.js
│           ├── donation-eligibility.js
│           └── experience-validation.js
├── shared/
│   ├── BANGLADESH-GEOCODE-LICENSE.txt
│   └── bangladesh-upazilas.json
└── frontend/
    ├── package.json
    ├── package-lock.json
    ├── vite.config.js
    ├── public/
    │   └── images/
    │       └── ahoban-logo.png
    └── src/
        ├── App.jsx
        ├── auth.css
        ├── index.css
        ├── landing.css
        ├── reference-theme.css
        ├── main.jsx
        ├── components/
        │   ├── profile/
        │   │   └── DonorBadgeSection.jsx
        │   ├── auth/
        │   │   ├── AuthField.jsx
        │   │   ├── AuthLayout.jsx
        │   │   ├── AuthSelect.jsx
        │   │   └── ProtectedRoute.jsx
        │   ├── Navbar.jsx
        │   ├── landing/
        │   │   ├── BloodGroupCard.jsx
        │   │   ├── BloodGroups.jsx
        │   │   ├── BloodSearch.jsx
        │   │   ├── DonorCard.jsx
        │   │   ├── DonorContactActions.jsx
        │   │   ├── DonorExperienceCard.jsx
        │   │   ├── DonorExperiences.jsx
        │   │   ├── Hero.jsx
        │   │   ├── HeroIllustration.jsx
        │   │   ├── HowItWorks.jsx
        │   │   ├── ImpactStats.jsx
        │   │   └── RecentDonors.jsx
        │   ├── health/
        │   │   └── HealthStatusCard.jsx
        │   └── shared/
        │       ├── DetailCard.jsx
        │       ├── Reveal.jsx
        │       ├── SectionHeading.jsx
        │       └── StatusBadge.jsx
        ├── contexts/
        │   ├── AuthProvider.jsx
        │   ├── auth-context.js
        │   └── useAuth.js
        ├── hooks/
        │   └── useApiHealth.js
        ├── layouts/
        │   └── AppLayout.jsx
        ├── pages/
        │           ├── ProfilePage.jsx
        │   ├── DonorProfilePage.jsx
        │   ├── DonorsPage.jsx
        │   ├── HomePage.jsx
        │   ├── LoginPage.jsx
        │   └── RegisterPage.jsx
        ├── services/
        │   └── api/
        │       ├── apiRequest.js
        │       ├── authApi.js
        │       ├── donorApi.js
        │       ├── experienceApi.js
        │       ├── healthApi.js
        │       └── profileApi.js
        └── utils/
            ├── bangladeshLocations.js
            ├── bangladeshUpazilas.js
            ├── currentLocation.js
            ├── formatDonationDate.js
            └── healthStatus.js
```

The backend uses separate auth models, routes, controllers, services,
middleware, and validation modules.

The Vite scaffold's unused `App.css` and starter assets remain in the frontend;
the current page does not import or depend on them.

## Reusable architecture

- `AppLayout` provides the shared page container and accepts page content as
  children.
- `HomePage` composes the landing page from the reusable `Navbar` and `Hero`
  components. `HeroIllustration` keeps the original custom illustration
  separate from its copy and calls to action.
- `Navbar` owns accessible mobile-menu and profile-menu state, reuses the
  existing login, registration, profile, profile-edit, and logout flows, and
  uses the supplied organization logo as an image asset.
- `reference-theme.css` defines the dark palette, red action color, high-contrast
  type, and shared component states based on the supplied visual reference.
- Design tokens use near-black `#080a10` page surfaces, charcoal cards, and
  signal red `#ec2633` for primary actions. Bengali text uses the installed
  system fallback stack; Latin UI prefers Inter when available.
- `.button`, `.button-primary`, `.button-secondary`, `.section-container`,
  `.section-heading`, `.form-field`, and shared card patterns establish reusable
  button, container, form, heading, and card styling.
- `SectionHeading` provides consistent title, kicker, and description
  hierarchy across the landing page.
- The independent landing sections are `BloodSearch`, `RecentDonors`,
  `HowItWorks`, `BloodGroups`, and `ImpactStats`.
  `BloodGroupCard` is reused for all eight blood groups; `Reveal` provides
  shared scroll-entry animation.
- `HealthStatusCard` remains reusable for the health page and exposes retry as a
  callback prop. `StatusBadge` and `DetailCard` are configurable shared
  components.
- `useApiHealth` owns request lifecycle, cancellation, and retry state;
  `healthApi` owns the HTTP request; `healthStatus` owns status labels.
- `AuthProvider` bootstraps the signed-in user from `/api/auth/me` and exposes
  registration, login, logout, account deletion, refresh, and in-memory profile
  updates. `ProtectedRoute` guards `/profile`; `/dashboard` redirects there.
  Auth pages share `AuthLayout`,
  `AuthField`, and `AuthSelect`.
- `apiRequest` centralizes credentialed API requests and error parsing;
  `authApi`, `profileApi`, and `donorApi` provide domain-specific methods. The
  browser does not store session tokens in localStorage or sessionStorage.
- Shared Bangladesh division/district values are reused by donor search and
  registration. The backend independently validates submitted locations.
- `config/database.js` owns MongoDB setup. Auth routes, controllers, services,
  validation, JWT middleware, and the timestamped `User` model are separated
  into their own modules. Public user serialization excludes password hashes.

## Implemented features

- Responsive Bangla navbar branded as **আহ্বান রক্তদান সংস্থা**, with the
  supplied logo, accessible animated mobile menu, navigation links, and a
  prominent donor CTA.
- Responsive blood-donation hero/banner with the requested Bangla message,
  donor and blood-request CTAs, and an original vector illustration.
- Subtle entrance, floating, hover, and menu animations with reduced-motion
  preferences respected. Smooth page scrolling is enabled.
- Donor registration CTAs link to the implemented registration page; other
  landing navigation items link to page sections or future content.
- Blood search queries MongoDB for opted-in donors by blood group, division,
  district, location, and availability, with paginated results and safe public
  profile details.
- The homepage's recent-donor section requests the six newest public profiles
  from MongoDB. It shows donor status, blood group, generated User ID, division,
  district, location, and registration date. The full `/donors` directory lists
  opted-in donors newest first and uses pagination; each card links to a
  privacy-safe `/donors/:id` public profile.
- Blood-request emergency information panel and CTA. The CTA only explains
  online requests are not connected; it does not submit an application.
- Four-step "How it works" section and all eight major blood-group cards.
- Impact metrics are shown as em-dash placeholders with explicit demo and
  no-data disclaimers; no statistics are claimed as real.
- Shared viewport reveal animations, card hover feedback, responsive layouts,
  and reduced-motion handling for the new sections.
- Reference-aligned visual system: near-black/navy backgrounds, bright red
  actions, high-contrast typography, fine borders, restrained glow, and light
  elevated search/impact panels.
- Reusable frontend health-check components and hook are retained; the current
  landing page does not display them.
- MongoDB-backed donor registration; email or generated User ID login; current
  user retrieval; logout; and a protected personal profile.
- Donor experiences have a dedicated `/donor-experiences` page. Submissions
  include 1–5 optimized photos and explicit public consent, start as pending,
  and appear publicly only after approval. Images are size/type checked and
  stored on disk by a replaceable storage adapter; MongoDB stores only image
  references. Configure `EXPERIENCE_IMAGE_DIR` when local uploads should live
  outside the default backend uploads folder.
- Experience moderation is restricted to accounts explicitly listed by their
  generated Ahoban User ID or MongoDB ID in the backend-only
  `EXPERIENCE_MODERATOR_USER_IDS` environment variable (comma-separated).
  Moderators can review pending public stories from the donor-experience page;
  unconfigured accounts cannot approve or reject stories.
  To identify the currently signed-in account's MongoDB ID without displaying
  other profile fields, run this in the browser console while signed in:
  `fetch('/api/auth/me', { credentials: 'include' }).then(r => r.json()).then(({ user }) => console.log(user.id))`.
  Add that ID to the root `.env`, for example
  `EXPERIENCE_MODERATOR_USER_IDS=<trusted-user-id>`, then restart the backend.
  Multiple trusted accounts can be comma-separated. Do not add an account
  unless its owner is trusted to review donor stories.
- Each donor keeps one account/profile. Approved experiences appear both in
  the public experience feed and on the author's public profile. A profile
  photo is optional, uploaded through the authenticated profile endpoint, and
  stored as an optimized WebP file outside MongoDB. Donors can also review all
  of their own approved and pending posts on their private profile.
- Approved public posts support one `like` or `love` reaction per user, with
  repeat clicks toggling it off and changing type updating the same record.
  Authenticated users can post comments, edit/delete their own comments, and
  view paginated public comments. Public APIs expose counts and only safe
  author fields; contact details and credentials are never serialized.
- Public donor profiles continue to honor donor-search consent. A donor who
  publishes an approved experience has a public profile with the information
  consented to in that post; a donor who only comments on a public post gets a
  limited name/photo profile while other profile details remain private.
- Individual profile retrieval and editing for each authenticated user.
  Editable fields are name, phone, blood group, division, district, location,
  donor availability, and public-search consent. User ID and email are
  protected from profile updates.
- Profile deletion requires explicit confirmation, deletes only the
  authenticated user's account, and clears the session cookie.
- The Profile page places account deletion in a dedicated Danger Zone at the
  bottom of its content. The delete action explains that profile data, donation
  history, and badge progress will be permanently removed, then requires
  explicit confirmation. It reuses the existing authenticated profile-delete
  API; on success the session is cleared, frontend auth state is reset, and
  the user is redirected to Home with a success notice.
- Donor search requires explicit opt-in. Public donor cards and profile
  responses contain only name, User ID, blood group, division, district,
  location, and availability; email and phone remain private.
- Donor search supports blood group, division, district, escaped location
  substring matching, availability filtering, and bounded pagination.
- Password hashes use bcryptjs. Auth inputs and terms acceptance are validated
  on client and server. Email and generated User ID have database unique
  indexes.
- JWTs are signed with HS256 and sent only in a 7-day HttpOnly, SameSite=Lax
  cookie scoped to `/api` so authenticated profile routes receive it; the
  Secure flag is enabled in production.
  Responses do not include JWTs or password hashes.
- Login and registration are rate-limited; CORS allows credentials only from
  the configured `CLIENT_URL`.
- Express health endpoint, JSON error responses, configurable CORS, and
  `/api` proxy from Vite to the backend.
- Mongoose connection setup from `MONGODB_URI`. The server remains available if
  MongoDB is not configured or unreachable; health then returns HTTP 503 and
  clearly reports the database as disconnected.
- `.env.example` template and Git ignore rules for real environment files.

## API endpoints

| Method | Path | Behavior |
|---|---|---|
| `GET` | `/api/health` | Returns API and MongoDB status. Returns HTTP 200 when connected and HTTP 503 when disconnected. |
| `POST` | `/api/auth/register` | Validates donor details, creates an account and generated User ID, hashes the password, and sets the session cookie. |
| `POST` | `/api/auth/login` | Accepts email or User ID and password; sets the session cookie on success. |
| `GET` | `/api/auth/me` | Returns the authenticated user's safe profile; requires a valid session cookie. |
| `POST` | `/api/auth/logout` | Clears the session cookie. |
| `GET` | `/api/users/profile` | Returns the signed-in user's profile; requires a valid session cookie. |
| `PUT` | `/api/users/profile/photo` | Authenticated one-photo profile image upload; accepts JPG, PNG, or WebP up to 5 MB. |
| `PATCH` | `/api/users/profile` | Updates allowed fields on the signed-in user's own profile; protected fields are rejected. |
| `DELETE` | `/api/users/profile` | Permanently deletes the signed-in user's account and clears the session cookie. |
| `GET` | `/api/users/:id/profile` | Returns a public, privacy-filtered donor profile by MongoDB ID or generated User ID. |
| `GET` | `/api/experiences/moderation/queue` | Lists pending public stories; requires authentication and moderator allowlisting. |
| `PATCH` | `/api/experiences/:id/moderation` | Approves or rejects a pending public story; requires authentication and moderator allowlisting. |
| `GET` | `/api/users/:id/experiences` | Lists that donor's approved, consented public experiences with pagination. |
| `GET` | `/api/experiences` | Lists only experiences with `isPublic: true` and `status: approved`, newest post first, with bounded pagination. |
| `GET` | `/api/experiences/:id` | Returns one approved, public experience. |
| `GET` | `/api/experiences/mine` | Lists the authenticated user's experience submissions and moderation states. |
| `POST` | `/api/experiences` | Authenticated multipart submission with donor-profile snapshot, 1–5 `photos` files and explicit public consent; starts pending review. |
| `PATCH` | `/api/experiences/:id` | Updates the authenticated user's own experience and returns it to pending review. |
| `DELETE` | `/api/experiences/:id` | Deletes only the authenticated user's own experience and stored photos. |
| `GET` | `/api/experiences/:id/reactions` | Returns the public post's reaction count and the optional current user's reaction. |
| `POST` | `/api/experiences/:id/reactions` | Authenticated `like`/`love` toggle; unique per user and post. |
| `DELETE` | `/api/experiences/:id/reactions` | Removes the authenticated user's reaction from the post. |
| `GET` | `/api/experiences/:id/comments` | Lists public comments with pagination and safe author/profile-photo data. |
| `POST` | `/api/experiences/:id/comments` | Adds a validated comment as the authenticated user. |
| `PATCH` | `/api/comments/:id` | Edits only the authenticated user's own comment. |
| `DELETE` | `/api/comments/:id` | Deletes only the authenticated user's own comment. |
| `GET` | `/api/donors` | Lists only donors who opted in to public search; filters by blood group, division, district, location, availability, page, and limit. |
| `GET` | `/api/donors/:id` | Returns an opted-in donor profile or a profile made public by an approved experience/comment. |
| `*` | `/api/uploads/avatars/:filename` | Serves generated, optimized public-profile image files. |
| `*` | Other paths | Returns a JSON 404 error. |

Experience submissions and updates include a stable `{ success, message, data }`
response envelope while retaining the legacy response fields used by the
current frontend. Validation failures return HTTP 400 with `errors` and the
backward-compatible `fieldErrors`; duplicate email returns 409; invalid
credentials and unauthenticated protected routes return 401.
Unsearchable donor details return 404. Auth, profile, and donor operations
return 503 while MongoDB is unavailable.

Example healthy response:

```json
{
  "status": "ok",
  "service": "api",
  "database": "connected"
}
```

## Database models

`User` stores generated `userId`, full name, normalized unique email, phone,
blood group, division, district, location, donor availability, public-search
consent, `passwordHash`, and Mongoose timestamps. Unique indexes protect email
and user ID; a compound index supports donor filtering. `passwordHash` is
excluded from normal queries and is never included in API responses.

`Experience` stores the authenticated user reference, a donor profile snapshot,
message, donation date, optional donation count and location, public-visibility
consent, one to five optimized image URLs, and moderation status. Only records
with both `isPublic: true` and `status: approved` appear publicly. At database
connection, documents from the earlier `publicConsent` field are migrated to
the canonical `isPublic` field. Older records with a single
`photoUrl` remain readable during the image-array migration. The donor location
is optional so older accounts without that profile field can still submit an
experience.

`User.profilePhotoUrl` references an optional optimized WebP avatar in local
image storage. `ExperienceReaction` stores a user, experience, and `like` or
`love` type with a unique compound index on `(userId, experienceId)`, ensuring
one active reaction per user per post. `ExperienceComment` stores a user,
experience, bounded comment text, and timestamps; its `(experienceId,
createdAt)` index supports chronological pagination. Deleting an experience or
account also removes its related reactions, comments, and stored images.

New accounts default to unavailable and hidden from public search unless the
registrant explicitly enables the corresponding preferences. The search API
defaults to page 1 and 12 results, with a maximum page size of 50; availability
may be `available`, `unavailable`, or `all`. Use `sort=recent` to order by
registration date descending. Every result still requires `isSearchable: true`.

## Installation and environment configuration

From the workspace root in PowerShell:

```powershell
npm.cmd install
npm.cmd --prefix backend install
npm.cmd --prefix frontend install
Copy-Item .env.example .env
```

Edit the root `.env` and provide:

| Variable | Purpose |
|---|---|
| `PORT` | API port; defaults to `5000`. |
| `MONGODB_URI` | MongoDB connection string, for example `mongodb://127.0.0.1:27017/blood-bank`. |
| `JWT_SECRET` | Required, unique random value at least 32 bytes long. The API refuses to start with a missing, short, or example placeholder value. |
| `CLIENT_URL` | Allowed browser origin for CORS; defaults to `http://localhost:5173`. |
| `EXPERIENCE_IMAGE_DIR` | Optional local directory for donor experience photos; defaults to `backend/uploads/experiences`. |

Generate a development secret in PowerShell and set the output as `JWT_SECRET`
in the root `.env`:

```powershell
node -e "process.stdout.write(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Never commit `.env`; it is ignored by Git. `.env.example` contains placeholders,
not working credentials. Configure a reachable MongoDB instance in
`MONGODB_URI`; without MongoDB the API reports degraded health and auth
endpoints respond with HTTP 503.

## Run commands

Run both development servers from the root:

```powershell
npm.cmd run dev
```

Before starting, configure the root `.env` with `JWT_SECRET` and `MONGODB_URI`.
The frontend uses the Vite `/api` proxy; no frontend token setting is needed.

Other available commands:

```powershell
npm.cmd run dev:server
npm.cmd run dev:client
npm.cmd run build
npm.cmd --prefix frontend run lint
npm.cmd --prefix backend test
```

The frontend is at <http://localhost:5173>, the backend at
<http://localhost:5000>, and the health endpoint at
<http://localhost:5000/api/health>.

## Validation

Previously verified during setup:

- Frontend production build: passed.
- Frontend Oxlint: passed.
- Backend JavaScript syntax checks: passed.
- Backend health endpoint and Vite `/api` proxy: returned HTTP 200 with MongoDB
  connected.
- Unknown API route: returned HTTP 404.
- Local MongoDB ping and connection: passed.
- Backend and frontend npm audits: reported zero vulnerabilities after replacing
  the optional `nodemon` dependency with Node's built-in watch mode.

Landing page implementation verification:

- Frontend production build and Oxlint: passed after the landing page changes.
- Browser opened the Bangla-titled page; provided logo loaded successfully.
- Responsive viewport sweep (244–1080 CSS px): no horizontal overflow; desktop
  navigation/CTA and mobile navigation both displayed at their breakpoints.
- Mobile hero content and illustration rendered.
- Mobile menu opened and closed with Escape; `aria-expanded` changed correctly
  and the closed menu became hidden.
- Reduced-motion emulation shortened hero entrance animation to `0.00001s`.
- No browser page errors were reported.
- Frontend returned HTTP 200; backend test remained passing (1/1).

Home page section verification:

- Production build and Oxlint: passed with no warnings.
- Browser checked desktop and mobile viewports; sections rendered without
  horizontal overflow.
- Division selection populates district choices; changing division clears the
  previous district selection.
- Donor search now calls the real `/api/donors` endpoint and shows only
  discoverable MongoDB profiles; availability, district, group, and location
  filters are applied by the backend.
- Blood request CTA is frontend-only; it does not submit or create a request.
- Eight blood-group cards and four impact placeholders render; placeholder
  labels explicitly state that data is not connected.
- Scroll reveal activates as sections enter view; reduced-motion styling
  removes reveal transitions.

Reference design alignment:

- The supplied image was analyzed for its dark surfaces, bright red primary
  color, compact controls, high-contrast hierarchy, restrained glow, and
  elevated light panels. The implementation adapts those principles without
  copying its text, logo, or imagery.
- Navbar, existing Hero, search, request, process, blood-group, and impact
  surfaces use a consistent color and component language.
- Desktop retains horizontal navigation and multi-column layouts; tablet/mobile
  switch to the animated navigation menu and reorganized stacked/two-column
  section grids. Search and impact panels remain light for contrast.
- Responsive browser checks found no horizontal overflow; the supplied
  organization logo remained loaded.
- The live development server applied the shared theme stylesheet; no browser
  page or console errors were observed.

Profile and donor search verification:

- Backend test suite passed 2/2 tests, covering registration, profile
  persistence and editing, protected fields, unauthenticated access, donor
  search consent/availability filters, location matching, pagination, and
  public contact-data redaction.
- Frontend production build and Oxlint passed.
- The local API health endpoint returned HTTP 200 with MongoDB connected; Vite
  and the `/api` donor-search proxy returned HTTP 200.
- Browser search displayed the correct empty state because the configured
  database contained no opted-in donor profiles. Registration showed required
  location and separate availability/search-consent controls.
- Responsive viewport checks found no horizontal overflow, and no browser
  JavaScript page errors occurred during search. Unauthenticated `/api/auth/me`
  requests return the expected 401 response while the visitor is signed out.
- Recent donor results request six records ordered by descending registration
  time; the integration test verifies ordering and excludes a newer profile
  that has not opted in. The `/donors` page uses API pagination metadata for
  the complete public listing.
- Browser verification rendered a live recent donor card from MongoDB,
  followed its public profile link, and confirmed no horizontal overflow at
  desktop, tablet, and mobile viewport widths.

The MongoDB-backed integration test verifies validation, rejected foreign
origins, registration and duplicate email, unique generated User IDs, password
hashing and response redaction, email/User ID login, protected auth/profile
routes, profile edits and protected fields, availability and discoverability
filters, location/group search, pagination, public-data redaction, invalid
credentials, and cookie clearing on logout. It uses a dedicated test database
and removes its test users. The current backend suite passed 2/2 tests;
frontend production build and Oxlint passed. A frontend automated test runner
is not configured.

## Known issues and limitations

- Database connectivity requires a reachable MongoDB URI in the root `.env`.
  Without it, the API starts but reports degraded health.
- Blood request submission and impact statistics remain frontend placeholders;
  no blood-request workflow or statistics API is implemented.
- Donor contact details are intentionally not exposed by the public directory.
  A privacy-preserving contact workflow is not implemented yet.
- Logout clears the browser cookie. JWT sessions are stateless, so a copied
  token would remain valid until expiry; tokens are not exposed to application
  JavaScript and there is no token-revocation store.
- The frontend has lint/build validation but no configured automated test
  runner.

## Project status

### Completed

- Full-stack frontend/backend project setup and development scripts.
- Reusable frontend component, page, layout, hook, service, and utility
  organization.
- Initial landing page navbar and hero/banner for আহ্বান রক্তদান সংস্থা.
- Supplied logo integrated into the navbar and responsive mobile navigation.
- Purpose-built donation illustration and accessible, reduced-motion-aware
  animations.
- Home page blood search UI, emergency blood request panel, four-step process,
  eight blood group cards, and clearly marked impact placeholders.
- Shared reveal animation utility with reduced-motion support for home sections.
- Reference-based design tokens and shared dark/red color, surface, button,
  form, heading, and card patterns.
- Backend route/controller/service/configuration/middleware organization.
- Health-check UI modules and endpoint, MongoDB status reporting, CORS, and
  error handling. The current landing page does not display the health UI.
- MongoDB-backed registration/login, safe current-user endpoint, cookie
  logout, protected dashboard, password hashing, auth validation, and unique
  user identity indexes.
- Editable MongoDB profiles with ownership enforced by authenticated identity,
  registration location and donor preferences, and public donor search with
  opt-in privacy, safe profile cards, filters, and pagination.
- Homepage recent donor cards with newest-first ordering, loading/empty/error
  handling, a paginated complete public donor listing, and individual
  privacy-safe public donor profile pages.
- Credentialed CORS, HttpOnly JWT session cookies, required JWT-secret
  validation, rate-limited login/registration, and backend auth integration
  test coverage.
- Environment template, secret ignore rules, root documentation, and a backend
  health-service test.

### In Progress

- None.

### Pending

- Connect blood request UI to a validated backend workflow.
- Implement an optional privacy-preserving donor contact workflow.
- Build out any additional About Us and Contact page content.
- Add frontend automated tests.
- Configure deployment environments and production database credentials when
  deployment is in scope.
