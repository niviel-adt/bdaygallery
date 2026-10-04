# Birthday Memory Lane V4 — Romantic Edition

Railway-ready Node/Express birthday gallery with PostgreSQL + Cloudinary.

## Routes
- `/` romantic landing page
- `/admin` create a lane / upload photos
- `/m/:slug` public memory gallery
- `/api/health` deployment + database health check

## Railway variables
`DATABASE_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `ADMIN_KEY`, `NODE_ENV=production`.

For Railway PostgreSQL, set `DATABASE_URL` in the web service as a reference to the Postgres service, commonly `${{Postgres.DATABASE_URL}}`.
