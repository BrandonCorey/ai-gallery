const dbQuery = require('./db-query');
const bcrypt = require('bcrypt');

class PgPersistence {

  constructor(session) {
    this.username = session.username;
  }

  async addImageToAlbum(albumId, image) {
    const ADD_IMAGE = `INSERT INTO images
                         (prompt, url, album_id, username)
                       VALUES
                         ($1, $2, $3, $4);`;

    let { imagePrompt, imageUrl } = image;
    let resultAddImage = await dbQuery(ADD_IMAGE,
                                      imagePrompt,
                                      imageUrl,
                                      albumId,
                                      this.username);

    return resultAddImage.rowCount > 0;
  }

  async authenticateUser(username, password) {
    const FIND_USER = `SELECT *
                         FROM users
                         WHERE username = $1`;
    
    const FIND_HASHED_PASS = `SELECT password
                                FROM users
                                WHERE username = $1`;
    
    const [userResult, hashedPassResult] = await Promise.all([
      dbQuery(FIND_USER, username),
      dbQuery(FIND_HASHED_PASS, username)
    ]);
  
    if (!userResult.rowCount) return { userExists: false, passwordMatches: false };
    if (!hashedPassResult.rowCount) return { userExists: true, passwordMatches: false };
 
    const hashedPass = hashedPassResult.rows[0].password;
    const passwordMatches = await bcrypt.compare(password, hashedPass);
  
    return { exists: true, passwordMatches };
  }
  

  async countAlbumPages() {
    const ALL_ALBUMS = `SELECT *
                        FROM albums
                        WHERE username = $1`;

    let result = await dbQuery(ALL_ALBUMS, this.username);

    let albumsPerPage = 5;

    // If no albums, page count is 1
    result.rowCount = result.rowCount || 1;
    return Math.ceil(result.rowCount / albumsPerPage);
  }

  async countImagePages(albumId) {
    const ALL_IMAGES = `SELECT *
                        FROM images
                        WHERE album_id = $1
                          AND username = $2`;

    let imagesPerPage = 3;
    let result = await dbQuery(ALL_IMAGES, albumId, this.username);

    // If no images in album, page count is 1
    result.rowCount = result.rowCount || 1;
    return Math.ceil(result.rowCount / imagesPerPage);
  }

  async createAlbum(name) {
    const CREATE_ALBUM = `INSERT INTO albums
                            (name, username)
                          VALUES
                            ($1, $2)`;

    try {
      let result = await dbQuery(CREATE_ALBUM, name, this.username);
      return result.rowCount > 0;
    } catch (error) {
      if (this.isUniqueConstraintViolation(error)) return false;
      throw error;
    }
  }

  async deleteAlbum(albumId) {
    const DELETE_ALBUM = `DELETE FROM albums
                          WHERE id = $1
                            AND username = $2`;

    let result = await dbQuery(DELETE_ALBUM, albumId, this.username);
    return result.rowCount > 0;
  }

  async deleteImage(albumId, imageId) {
    const DELETE_IMAGE = `DELETE FROM images
                          WHERE album_id = $1
                            AND id = $2
                            AND username = $3`;

    let result = await dbQuery(DELETE_IMAGE, albumId, imageId, this.username);
    return result.rowCount > 0;
  }

  async existsAlbumName(name) {
    const ALBUMS = `SELECT *
                    FROM albums
                    WHERE name = $1
                      AND username = $2`;

    let result = await dbQuery(ALBUMS, name, this.username);
    return result.rowCount > 0;
  }

  isInvalidInput(error) {
    return /invalid input syntax/.test(String(error));
  }

  isUniqueConstraintViolation(error) {
    return /duplicate key value violates unique constraint/.test(String(error));
  }

  async loadAlbum(albumId) {
    const FIND_ALBUM = `SELECT *
                        FROM albums
                        WHERE id = $1
                          AND username = $2`;

    const FIND_IMAGES = `SELECT *
                         FROM images
                         WHERE album_id = $1
                           AND username = $2`;

    let [ resultAlbum, resultImages ] = await Promise.all([
      dbQuery(FIND_ALBUM, albumId, this.username),
      dbQuery(FIND_IMAGES, albumId, this.username)
    ]);

    let album = resultAlbum.rows[0];
    if (!album) return false;

    album.images = resultImages.rows;
    return album;
  }

  async loadImage(albumId, imageId) {
    const FIND_IMAGE = `SELECT *
                         FROM images
                         WHERE id = $2
                           AND album_id = $1
                           AND username = $3`;

    let result = await dbQuery(FIND_IMAGE, albumId, imageId, this.username);
    let image = result.rows[0];

    if (!image) return false;
    return image;
  }

  async setAlbumName(albumId, name) {
    const UPDATE_ALBUM = `UPDATE albums
                          SET name = $2
                          WHERE id = $1
                            AND username = $3`;

    try {
      let result = await dbQuery(UPDATE_ALBUM, albumId, name, this.username);
      return result.rowCount > 0;
    } catch (error) {
      if (this.isUniqueConstraintViolation(String(error))) return false;
      throw error;
    }
  }

  async setImageCaption(albumId, imageId, caption) {
    const UPDATE_IMAGE = `UPDATE images
                          SET prompt = $3
                          WHERE id = $2
                            AND album_id = $1
                            AND username = $4`;

    try {
      let result = await dbQuery(UPDATE_IMAGE, albumId, imageId, caption, this.username);
      return result.rowCount > 0;
    } catch (error) {
      if (this.isUniqueConstraintViolation(String(error))) return false;
      throw error;
    }
  }

  // Joined this data so entire collecton could be sorted for pagination
  async sortedAlbums(pageNumber = 1) {
    const ALL_ALBUMS = `SELECT *
                        FROM albums
                        WHERE username = $2
                        ORDER BY (
                          SELECT COUNT(id)
                          FROM images
                          WHERE
                            album_id = albums.id
                              AND username = $2) DESC,
                            LOWER(name) ASC
                        LIMIT 5
                        OFFSET $1;`;

    const ALL_IMAGES = `SELECT *
                       FROM images
                       WHERE username = $1`;

    let offset = (pageNumber - 1) * 5;

    let [ resultAlbums, resultImages ] = await Promise.all([
      dbQuery(ALL_ALBUMS, offset, this.username),
      dbQuery(ALL_IMAGES, this.username)
    ]);

    let allAlbums = resultAlbums.rows;
    let allImages = resultImages.rows;

    if (!allAlbums || !allImages) return false;

    allAlbums.forEach(album => {
      album.images = allImages.filter(image => {
        return album.id === image.album_id;
      });
    });

    return [...allAlbums].sort((albumA, albumB) => { // sort by number of images in album
      return albumB.images.length - albumA.images.length;
    });
  }

  async sortedImages(albumId, pageNumber = 1) { // sort by data created
    const SORTED_IMAGES = `SELECT *
                           FROM images
                           WHERE album_id = $1
                             AND username = $3
                           ORDER BY created_at DESC
                           LIMIT 3
                           OFFSET $2`;

    let offset = (pageNumber - 1) * 3;

    let result = await dbQuery(SORTED_IMAGES, albumId, offset, this.username);
    let images = result.rows;

    return images;
  }
}

module.exports = PgPersistence;