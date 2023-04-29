INSERT INTO users
  (username, "password")
VALUES
  ('admin', '$2b$10$xlqRDOuSYqxomsmvi/i8..Gl55X2.bd9nRprxsRAqiVndvPQ4ZyOy'),
  ('bcorey', '$2b$10$SZsbjju/gwg.wsusMm/Iguhr5dH/cjHTe/F86bit/ED2jswT/EDom'),
  ('guest', '$2b$10$HbXo67sMxxmDLBSRtrLbaObfdlktVxfi9d2FAtloYHHni0bOtm3aC');

INSERT INTO albums
  (name, username)
VALUES
  ('cats', 'admin'),
  ('videogames', 'admin'),
  ('emojis' ,'admin'),
  ('sports', 'admin'),
  ('logos', 'admin'),
  ('misc', 'admin');

INSERT INTO images
  (prompt, url, album_id, created_at, username)
VALUES
  ('scared kitty', '/images/scared-kitty.jpg', 1, '2023-04-22 17:11:20.617139', 'admin'),
  ('laughing emoji', '/images/laugh-emoji.png', 3, '2023-04-26 17:13:20.617139', 'admin'),
  ('minecraft block', '/images/minecraft-block.jpg', 2, '2023-04-22 17:12:20.617139', 'admin'),
  ('angry emoji', '/images/angry-emoji.png', 3, '2023-04-22 17:13:20.617139', 'admin'),
  ('crying emoji', '/images/crying-emoji.png', 3, '2023-04-26 17:13:20.617139', 'admin'),
  ('sleepy emoji', '/images/sleep-emoji.png', 3, '2023-04-27 17:13:20.617139', 'admin');