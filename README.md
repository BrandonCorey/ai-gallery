# This app lets you:
- Create users
- Create albums
  - Edit albums
  - Delete albums
- Create AI generate images
  - Save images to albums
  - Edit generated images
  - Delete images
 
![ai-gallery-preview](https://github.com/BrandonCorey/ai-gallery/assets/93304067/738d783b-5f09-4242-bf90-c87207696b49)

![ai-gallery-preview-2](https://github.com/BrandonCorey/ai-gallery/assets/93304067/ca8d1840-43bc-44ca-93d6-1330eaeb741c)

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
