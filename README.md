# Semausu

Multi-tenant supermarket navigation and operations platform.

## Access model

- Customers browse active supermarkets and build indoor routes without accounts.
- Supermarket owners register publicly and verify their email.
- Owners invite multiple managers or staff. Managers may invite staff.
- Platform employees join only through invitations from the platform owner.
- Team and platform login URLs are configured privately and are never linked publicly.

Hidden URLs reduce casual discovery but are not the security boundary. Semausu also uses password hashing, verified email, invite-only employee onboarding, role authorization, rate limits, CSRF protection, secure cookies, account suspension and audit logs.

## Supermarket workflow

Owners and managers configure store information, map dimensions, aisles, departments, services and entrances. The catalogue stores SKU, barcode, category, price, stock, aisle, bay, shelf and map coordinates. Customers only see active, in-stock products.

## Local setup

```powershell
Copy-Item .env.example .env
npm install
npm start
```

No supermarkets or accounts are seeded. Set the platform-owner environment variables before the first start to bootstrap the first platform owner. In development, verification emails print to the terminal when SMTP is not configured.

## Production requirements

- Configure SMTP so verification and invitation emails can be delivered.
- Keep `SESSION_SECRET`, both private portal paths and platform-owner credentials out of source control.
- Semausu uses a dedicated PostgreSQL database. Never point `DATABASE_URL` at another application's database.
- For Gmail SMTP, enable Google two-step verification and use a Google App Password as `SMTP_PASS`; never use the normal Gmail password.
