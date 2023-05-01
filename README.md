## Specifications
- v16.16.0
- Browsers tested: Chrome and Edge
  - Chrome version: 112.0.5615.138
  - Edge version: 112.0.1722.58
- Postgres version: 12.14

## Getting started
1. Install dependencies
```
npm install
```
2. Set up database from main directory (You will have to start the pg service first)
```
createdb ai-gallery
psql -d ai-gallery < schema.sql
psql -d ai-gallery < ./lib/seed-data.sql
```
3. Make sure environment variables are populated
```
code .env
```

They should look like this:
- You may have to tweak the postgres variables. These are the ones required to run for WSL2.
- I beleive only the user's name needs to be changed
- You can find the relevant info using \conninfo meta-command in psql terminal
```
OPENAI_API_KEY=<OPENAI_API_KEY>
SESSION_SECRET=<SESSION_SECRET>
PORT='3000'
HOST='localhost'

POSTRGRES_USER='<Insert postgres user name>'
POSTGRES_PORT=5432
POSTGRES_DB='ai-gallery'
POSTGRES_HOST='/var/run/postgresql'
```

4. Start the application
```
npm start
```

5. Logging in
- There are three different logins
- The first account, `admin` has pre-seeded albums/images, the others do not
```
username: admin
password: secret
```
```
username: bcorey
password: password
```
```
username: guest
password: login
```

## Additional information
If you are signed in on a user that does not have any albums, a warning will be displayed stating that images can only be saved if an album is created
- On the same note, the buttons that allow you to save an image will be disabled if no albums are present

- Albums are sorted by number of images in them (descendering)
- Images are sorted by creaetion date (recent --> old)

The relevant views, as well as the ability to sign out, are contained in the nav bar in the top left, which can be toggled on click

I became aware that submitting the form to generate the image asynchornously is preferable in this context, but that fell into the *too complicated* category, so I left it alone.

Also, my CSS is horrific. It improved as I went on and learned more, but its all over the place.
