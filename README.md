# Night Seder

Attendance for the night seder program and the daf yomi shiur. One user, one
phone, meant to be used standing in the room with one thumb.

- **Tonight** — one card per pair, tap a name to mark him present.
- **Daf** — the same thing as a flat list for the morning shiur.
- **Contact** — who to call: missed streaks, follow-ups, and a log of what you said.
- **Reports** — attendance per person and per pair, plus the nights nobody recorded.
- **More** — people, zmanim, payments, Daf days off, settings, sign out.

Some of the men are paid. Tick **Gets paid** on a person and give him a usual
monthly amount; then under **More → Payments** add a period (usually a Jewish
month — the name fills itself in from the date) and record what each man
actually got. A payment can be more or less than the usual amount, and a month
can be settled in more than one go.

Next.js (App Router) and TypeScript, Tailwind for styling, Supabase for the
database and sign-in, deployed on Vercel.

## Setup

Do these in order. Steps 1 to 5 get it running on your laptop; 6 to 9 put it on
your phone.

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com), sign in, and create a new project.
Give it a name ("night-seder" is fine), pick a region near New York, and save
the database password somewhere — you won't need it for this app, but you will
want it eventually. The project takes a minute or two to finish setting up.

### 2. Run the schema

In your new project, open **SQL Editor** in the left sidebar and click
**New query**. Open [`supabase/001_schema.sql`](supabase/001_schema.sql) in this
repo, copy the whole file, paste it in, and press **Run**.

That creates every table, turns on row level security, and inserts the single
settings row. You should see "Success. No rows returned."

If a later change is ever needed, it goes in a new numbered file
(`supabase/002_....sql`) for you to paste the same way. Nothing in this app
alters the live database on its own.

### 3. Add your user and close the door behind you

Still in Supabase:

1. **Authentication → Users → Add user → Create new user.** Put in your email
   and a password, and tick "Auto Confirm User" so you don't have to click a
   confirmation email.
2. **Authentication → Sign In / Providers → Email.** Turn **off** "Allow new
   users to sign up".

That second step matters: the whole security model is "there is exactly one
account, and anybody signed in is you". With sign-ups open, anyone could make
themselves an account and read everything.

### 4. Copy your keys into `.env.local`

In Supabase go to **Project Settings → API keys**. You need two values:

- the **Project URL**, which looks like `https://abcdefgh.supabase.co`
- the **anon** / **publishable** key, a long string

In this folder, copy `.env.example` to `.env.local` and fill both in:

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Never put the **service role** key anywhere. It bypasses row level security.
The anon key is safe to ship to the browser — that's what it's for.

### 5. Run it and log in

```bash
npm install
npm run dev
```

Open <http://localhost:3000>, sign in with the email and password from step 3.
You'll land on Tonight with nothing in it. Add a zman under **More → Zmanim**,
add people under **More → People**, pair them up on the zman's page, and Tonight
fills in.

### 6. Push to GitHub

Make an empty repository on GitHub (no README, no .gitignore — this folder
already has both), then:

```bash
git remote add origin https://github.com/YOUR-USERNAME/night-seder.git
git push -u origin main
```

### 7. Deploy on Vercel

Go to [vercel.com](https://vercel.com), sign in with GitHub, and **Add New →
Project**. Import the `night-seder` repository.

Before you click Deploy, open **Environment Variables** and add the same two
values from step 4:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Then deploy. You'll get a URL like `https://night-seder.vercel.app`.

### 8. Add it to your iPhone home screen

On the phone, open the Vercel URL **in Safari** (not Chrome — only Safari can
install a home-screen app). Tap the **Share** button, scroll down, tap **Add to
Home Screen**, and tap **Add**.

### 9. Log in once more, inside the app

Open it from the home-screen icon and sign in again. This is not a bug: a
home-screen app has its own storage, separate from Safari, so the session you
created in Safari isn't there. Once you've signed in inside the app, it stays
signed in.

## A note about the free Supabase plan

A free Supabase project pauses itself after about a week with no database
activity. If you come back from a long break and the app can't load anything,
go to the Supabase dashboard and click **Restore project**. It comes back with
all your data. Using the app at all counts as activity, so during a zman this
will never happen.

## Working on it

```bash
npm run dev     # http://localhost:3000
npm run build   # production build, fails on any type error
npm test        # unit tests for the date and attendance rules
npm run lint
```

The rules that are easy to get wrong live in `lib/` and are unit-tested:

- `lib/dates.ts` — calendar dates in America/New_York. The night program starts
  at 8:30 pm Eastern, which is already tomorrow in UTC, so "today" is computed
  in New York and calendar dates never pass through a timestamp.
- `lib/attendance.ts` — derived schedules, which sessions count as held, what
  each person was expected at, and missed streaks.
- `lib/contact.ts` — who lands in "Needs attention" and why.
- `lib/money.ts` — amounts as whole cents. Money is never a float, so a ledger
  can't drift a cent at a time.

Run `npm test` after touching any of them.
