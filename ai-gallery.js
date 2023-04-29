'use strict';

const express = require('express');
const morgan = require('morgan');
const session = require('express-session');
const flash = require('express-flash');
const dotenv = require('dotenv').config();
const { Configuration, OpenAIApi } = require('openai');
const store = require('connect-loki');
const { body, query, validationResult } = require('express-validator');

const catchError = require('./lib/catch-error');
const PgPersistence = require('./lib/pg-persistence');

const app = express();
const HOST = process.env.HOST;
const PORT = process.env.PORT;
const LokiStore = store(session);
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

app.set('views', './views');
app.set('view engine', 'pug');

app.use(morgan('common'));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(session({
  cookie: {
    httpOnly: true,
    maxAge: 7 * (86400000), // days x ms per day
    path: '/',
    secure: false,
  },
  name: 'ai-gallery',
  resave: false,
  saveUninitialized: true,
  secret: process.env.SESSION_SECRET,
  store: new LokiStore(),
}));

app.use(flash());

// Delete any session data not needed after redirect
app.use((req, res, next) => {
  res.locals.tempImages = req.session.tempImages;
  res.locals.flash = req.session.flash;
  res.locals.signedIn = req.session.signedIn;
  delete req.session.flash;
  delete req.session.tempImages;
  next();
});

// Store originalUrl and redirect user to sign in if not already
app.use((req, res, next) => {
  let signedIn = req.session.signedIn;
  if (!signedIn && req.originalUrl !== '/sign_in') {
    if (req.originalUrl !== '/')  {
      req.flash('error', 'You must sign in to access a page.');
    }
    req.session.originalUrl = req.originalUrl;
    res.redirect('/sign_in');
  } else {
    next();
  }
});

app.use((req, res, next) => {
  res.locals.store = new PgPersistence(req.session);
  next();
});

// Store generated image until user decides to save or make new request
const cacheImage = (req, res, image) => {
  req.session.tempImages = [];
  req.session.tempImages.push(image);
};

// Use openAI image creation API to generate image
const generateImageUrl = async (req, res) => {
  let { imagePrompt } = req.body;
  const response = await openai.createImage({
    prompt: imagePrompt,
    n: 1,
    size: '512x512',
  });

  return response.data.data[0].url;
};

app.get('/sign_in', (req, res) => {
  res.render('sign-in');
});

app.get('/', (req, res) => {
  res.redirect('/generate');
});

app.get('/generate',
  catchError(async (req, res) => {
    let store = res.locals.store;

    res.render('generate-image', {
      albums: await store.sortedAlbums()
    });
  })
);

app.get('/albums',
  query('page')
    .optional()
    .isInt({ min: 1 }),
  catchError(async (req, res) => {

    let errors = validationResult(req);
    if (!errors.isEmpty()) throw new Error('Page not found.');

    let store = res.locals.store;
    let { page } = req.query;

    let pageCount = await store.countAlbumPages();

    page = Number(page) || 1;
    if (page > pageCount) throw new Error('Page not found.');

    let albums = await store.sortedAlbums(page);

    res.render('albums', {
      albums,
      page,
      pageCount,
    });
  })
);

app.get('/new_album', (req, res) => {
  res.render('new-album');
});

app.get('/albums/:albumId',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
  ],
  catchError(async (req, res) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) throw new Error('Page not found.');


    let store = res.locals.store;
    let { page } = req.query;
    let { albumId } = req.params;
    
    let pageCount = await store.countImagePages(+albumId);
    if (!pageCount) throw new Error('Not found.')

    // If no page is specified, send to page 1
    page = Number(page) || 1;

    if (page > pageCount) throw new Error('Page not found.');

    let resultAlbum = store.loadAlbum(+albumId);
    let resultImages = store.sortedImages(+albumId, page);
    let resultBoth = await Promise.all([resultAlbum, resultImages]);

    if (!resultBoth[0]) throw new Error('Page not found.');

    res.render('gallery', {
      album: resultBoth[0],
      images: resultBoth[1],
      page,
      pageCount
    });
  })
);

app.get('/albums/:albumId/edit',
  catchError(async (req, res, next) => {
    let store = res.locals.store;
    let { albumId } = req.params;
    let album = await store.loadAlbum(+albumId);

    if (!album) throw new Error('Page not found.');

    res.render('edit-album', { albumId });
  })
);

app.get('/albums/:albumId/images/:imageId/edit',
  catchError(async (req, res) => {
    let store = res.locals.store;
    let { albumId, imageId } = req.params;

    let resultAlbum = store.loadAlbum(+albumId);
    let resultImages = store.loadImage(+albumId, +imageId);

    let resultBoth = await Promise.all([resultAlbum, resultImages]);

    if (!resultBoth[0] || !resultBoth[1]) throw new Error('Page not found.');

    res.render('edit-image', {
      albumId,
      image: resultBoth[1],
    });
  })
);

app.post('/sign_in',
  async (req, res) => {
    let store = res.locals.store;
    let { username, password } = req.body;
    let authenticated = await store.authenticateUser(username, password);

    if (!authenticated) {
      req.flash('error', 'Invalid Credentials.');
      res.render('sign-in', {
        flash: req.flash(),
        username
      });
    } else {
      req.session.username = username;
      req.session.signedIn = true;

      let originalUrl = req.session.originalUrl || '/';
      if (originalUrl === '/sign_in')  {
        res.redirect('/generate');
      } else {
        delete req.session.originalUrl;
        res.redirect(originalUrl);
      }
    }
  });

app.post('/sign_out', (req, res) => {
  req.session.signedIn = false;
  delete req.session.username;
  res.redirect('/sign_in');
});


app.post('/generate',
  [
    body('imagePrompt')
      .trim()
      .isLength({ min: 1 })
      .withMessage('A prompt is rquired to generate an image.')
      .bail()
      .isLength({max: 100})
      .withMessage('Prompt must be less than 100 characters long.')
  ],
  catchError(async (req, res) => {
    let store = res.locals.store;
    let { imagePrompt }  = req.body;
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      errors.array().forEach(error => req.flash('error', error.msg));
      res.render('generate-image', {
        flash: req.flash(),
        albums: await store.sortedAlbums(),
        imagePrompt
      });
    } else {
      let imageUrl = await generateImageUrl(req, res);

      if (!imageUrl) {
        let error = new Error('Bad request.');
        error.statusCode = 400;
        throw error;
      } else {
        let image = { imagePrompt, imageUrl };

        cacheImage(req, res, image);
        req.flash('success', 'Your image was generated successfully!');

        res.render('generate-image', {
          imageUrl,
          flash: req.flash(),
          albums: await store.sortedAlbums(),
        });
      }
    }
  })
);

app.post('/new_album',
  [
    body('albumName')
      .trim()
      .isLength({ min: 1 })
      .withMessage('Album name is required.')
      .bail()
      .isLength({ max:100 })
      .withMessage('Album name must be less than 100 characters.')
  ],
  catchError(async (req, res) => {
    let store = res.locals.store;
    let { albumName } = req.body;

    let errors = validationResult(req);
    const reRenderPage = () => {
      res.render('new-album', {
        flash: req.flash(),
        albumName,
      });
    };

    if (!errors.isEmpty()) {
      errors.array().forEach(error => req.flash('error', error.msg));
      reRenderPage();
    } else if (await store.existsAlbumName(albumName)) {
      req.flash('error', 'Album name must be unique.');
      reRenderPage();
    } else {
      let created = await store.createAlbum(albumName);
      if (!created) {
        req.flash('error', 'Album name must be unique.');
        reRenderPage();
      } else {
        req.flash('success', `"${albumName}" was succesfully created!`);
        res.redirect('/albums');
      }
    }
  })
);

app.post('/albums/:albumId/update',
  [
    body('newName')
      .trim()
      .isLength({ min: 1 })
      .withMessage('Album name is required.')
      .bail()
      .isLength({ max:100 })
      .withMessage('Album name must be less than 100 characters.')
  ],
  catchError(async (req, res) => {
    let store = res.locals.store;
    let { albumId } = req.params;
    let { newName } = req.body;

    let errors = validationResult(req);

    const reRenderPage = () =>  {
      res.render('edit-album', {
        flash: req.flash(),
        newName
      });
    };

    if (!errors.isEmpty()) {
      errors.array().forEach(error => req.flash('error', error.msg));
      reRenderPage();
    } else if (await store.existsAlbumName(newName)) {
      req.flash('error', 'Album name must be unique.');
      reRenderPage();
    } else {
      let updated = await store.setAlbumName(+albumId, newName);
      if (!updated) {
        req.flash('error', 'Album name must be unique.');
        reRenderPage();
      } else {
        req.flash('success', `"${newName}" was succesfully updated!`);
        res.redirect('/albums');
      }
    }
  })
);

app.post('/albums/:albumId/images/:imageId/update',
  [
    body('newName')
      .trim()
      .isLength({ min: 1 })
      .withMessage('Image caption is required.')
      .bail()
      .isLength({ max:100 })
      .withMessage('Image caption must be less than 100 characters.')
  ],
  catchError(async (req, res) => {
    let store = res.locals.store;
    let { albumId, imageId } = req.params;
    let { newName } = req.body;

    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      let image = await store.loadImage(+albumId, imageId);

      errors.array().forEach(error => req.flash('error', error.msg));

      res.render('edit-image', {
        albumId, image,
        flash: req.flash(),
        newName,
      });

    } else {
      let updated = await store.setImageCaption(+albumId, +imageId, newName);

      if (!updated) throw new Error('Page not found.');
      req.flash('success', `"${newName}" updated successfully`);
      res.redirect(`/albums/${albumId}`);
    }
  })
);

app.post('/albums/:albumId/delete',
  catchError(async (req, res) => {
    let store = res.locals.store;
    let { albumId } = req.params;

    let resultAlbum = store.loadAlbum(+albumId);
    let resultDeleted = store.deleteAlbum(+albumId);
    let resultBoth = await Promise.all([resultAlbum, resultDeleted]);

    if (!resultBoth[0] || !resultBoth[1]) throw new Error('Page not found.');
    req.flash('success', `"${resultBoth[0].name}" was successfully deleted!`);
    res.redirect('/albums');
  })
);

app.post('/save_image',
  catchError(async (req, res) => {
    let store = res.locals.store;
    let { albumId } = req.body;
    let image = res.locals.tempImages[0];

    let resultAlbum = store.loadAlbum(+albumId);
    let resultSaved = store.addImageToAlbum(+albumId, image);
    let resultBoth = await Promise.all([resultAlbum, resultSaved]);

    if ((!resultBoth[0] || !resultBoth[1])) throw new Error('Page not found.');
    req.flash('success', `Your image was added to "${resultBoth[0].name}"!`);
    res.redirect(`/generate`);
  })
);

app.post('/albums/:albumId/images/:imageId/delete',
  catchError(async (req, res) => {
    let store = res.locals.store;
    let { albumId, imageId } = req.params;

    let deleted = await store.deleteImage(+albumId, +imageId);

    if (!deleted) throw new Error('Page not found.');
    req.flash('success', `Image was successfully deleted!`);
    res.redirect(`/albums/${albumId}`);
  })
);

// Error handler for those thrown from within a defined route
app.use((err, req, res, _next) => {
  let store = res.locals.store;
  console.log(err);

  if (store.isInvalidInput(err)) {
    err.statusCode = 400;
    err.message = 'Bad request.';
  }

  if (err.statusCode !== 404 && err.statusCode !== 400) {
    err.statusCode = 500;
    err.message = 'Internal server error.';
  }

  req.flash('error', err.message);
  res.status(err.statusCode || 404);
  res.render('error', { flash: req.flash() });
});

// Serves 404's for any requests not routed
app.use((req, res, next) => {
  req.flash('error', 'Page not found.');
  res.status(404);
  res.render('error', { flash: req.flash() });
});

app.listen(PORT, HOST, () => {
  console.log(`Server is listening on port ${PORT}`);
});