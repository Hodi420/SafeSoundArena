# Next.js Example

This example shows how to mount the governance router behind a catch-all Next.js API route and render the portable React control room.

Files:

- `pages/api/ai-admin/[...path].js`
- `pages/ai-control-room.jsx`

The example page does not embed token values in public environment variables. For a real deployment, put the control room behind your application auth layer and pass short-lived authorization only through trusted admin UI flows.
