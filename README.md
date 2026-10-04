# Birthday Memory Lane — V1

A simple birthday memory gallery designed for GitHub + Railway.

## V1 features

- Create a birthday Memory Lane with a unique slug.
- Upload multiple images.
- Images are stored permanently in Cloudinary.
- Photo metadata is stored in PostgreSQL.
- Add contributor, caption, and date.
- Responsive gallery.
- Public shareable Memory Lane URL.
- Admin-only creation/deletion controls.
- Railway-ready Docker deployment.

## Architecture

- Node.js + Express
- PostgreSQL (Railway)
- Cloudinary (image/object storage)
- Vanilla HTML/CSS/JS frontend

Railway is used to run the app and database. Cloudinary stores the actual image files so the app does not depend on Railway's ephemeral local filesystem.

## Local setup

1. Install Node.js 20+.
2. Create a PostgreSQL database.
3. Create a Cloudinary account.
4. Copy `.env.example` to `.env`.
5. Fill in:
   - DATABASE_URL
   - CLOUDINARY_CLOUD_NAME
   - CLOUDINARY_API_KEY
   - CLOUDINARY_API_SECRET
   - ADMIN_KEY
6. Run:

```bash
npm install
npm start
```

Open http://localhost:3000

## Railway deployment

1. Push this folder to a new GitHub repository.
2. In Railway, create a new project.
3. Deploy the GitHub repository.
4. Add a PostgreSQL service to the same Railway project.
5. Add these variables to the app service:
   - DATABASE_URL — reference Railway PostgreSQL's DATABASE_URL
   - CLOUDINARY_CLOUD_NAME
   - CLOUDINARY_API_KEY
   - CLOUDINARY_API_SECRET
   - ADMIN_KEY
   - NODE_ENV=production
6. Railway will build the included Dockerfile and start `npm start`.
7. Generate a Railway public domain.
8. Open `/admin.html`.
9. Create your first Memory Lane.

## Cloudinary

Create a Cloudinary account and use the API credentials from the Cloudinary dashboard.

Do NOT commit `.env` or expose the API secret in frontend JavaScript.

## Important V1 security note

The public upload endpoint is intentionally simple for V1. Anyone who knows a Memory Lane slug can upload to it.

For a production/public launch, V2 should add:
- upload invite/token links
- rate limiting
- image moderation
- file count/size quotas per Memory Lane
- admin login
- signed upload URLs
- private/unlisted memories
- photo deletion UI
- audit logging

## V2: Memory Video

The planned video feature should use the stored Cloudinary images and generate a slideshow:
- 9:16 or 16:9
- automatic photo ordering
- captions
- birthday title
- transitions
- background music
- downloadable MP4

Keep the gallery/storage system independent so video generation can be added without changing how memories are stored.

## Railway build fix
This version intentionally uses `npm install --omit=dev` in Docker and does not require a package-lock.json. Upload the extracted project files to the root of your GitHub repository.
