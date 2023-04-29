CREATE TABLE users (
  username text PRIMARY KEY,
  password text NOT NULL
);

CREATE TABLE albums (
  id serial PRIMARY KEY,
  name text UNIQUE NOT NULL,
  username text REFERENCES users (username) ON DELETE CASCADE
);

CREATE TABLE images (
  id serial PRIMARY KEY,
  prompt text NOT NULL,
  url text NOT NULL,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  album_id integer NOT NULL REFERENCES albums (id) ON DELETE CASCADE,
  username text REFERENCES users (username) ON DELETE CASCADE
);