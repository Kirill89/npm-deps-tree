'use strict';

const config = require('./config');
const express = require('express');
const asyncHandler = require('express-async-handler');
const app = express();
const npmController = require('./lib/npm');

app.use(express.static(config.clientFiles));

app.get(
  '/npm/:name',
  asyncHandler(async (req, res) => {
    res.json(
      await npmController.getDependencyTree(req.params.name, req.query.version)
    );
  })
);

/**
 * Error handler.
 */
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send({});
  next();
});

app.listen(process.env.PORT || 3000);
