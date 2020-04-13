'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const url = 'mongodb://localhost:27017';
const dbName = 'guessing_game';
const client = new MongoClient(url, {useUnifiedTopology: true});
const PORT = 80;
const HOST = '0.0.0.0';
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs')

client.connect(function(err) {
  assert.equal(null, err);
  console.log("Connected successfully to server");

  const db = client.db(dbName);
  const col_games = db.collection('collection');

  app.get('/', (req, res) => {
    col_games.find().sort({ $natural: -1 }).toArray(function (err, docs) {     
      assert.equal(null, err);
      let game = {};
      if (docs.length != 0) {
        game = {
          start: docs[0].start,
          level: docs[0].level,
          question: docs[0].question.join(" "),
          guessing: docs[0].guessing.join(" "),
          answer: docs[0].answer.join(" "),
          fail: docs[0].fail,
          score: docs[0].score,

        };
      } else {
        game = {
          start: 0,
          level: 0,
          question: "",
          guessing: "",
          answer: "",
          fail: 0,
          score: 0,
        }
      }
      res.render('index.ejs', game);
    });
  });

  app.post('/start', (req, res) => {
    const schema = {
      start: 0,
      level: 0,
      question: ["_", "_", "_", "_"],
      guessing: ["*", "*", "*", "*"],
      answer: [],
      fail: 0,
      score: 0,
    }
    col_games.insertOne(schema, (err, docs) => {
      col_games.updateOne({ start: 0 }, { $inc: { start: 1 } });
      res.redirect('/')
    })
  });

  app.post('/set_question', (req, res) => {
    const choose = req.body.button_q;
    col_games.updateOne({ 
      question: "_" }, { 
      $set: { 'question.$': choose }, 
      $inc: { level: 1 } })
    res.redirect('/')
  });

  app.post('/guessing', (req, res) => {
    const choose = req.body.button_g;
    col_games.find({}).limit(1).sort({ $natural: -1 }).toArray(function (err, docs) {
      const level = docs[0].level;
      if (docs[0].question[level-4] == choose) {
        col_games.updateOne({ guessing: "*" }, {
          $push: { answer: choose },
          $pop: { guessing: 1 },
          $inc: { level: 1, score: 10 }
        });
      } 
      else { 
        col_games.updateOne({ 
          guessing: "*" }, { 
          $inc: { fail: 1, score: -5 } 
        }); 
      }
    });
    res.redirect('/')
  });
});

app.listen(PORT, HOST);

console.log(`Running on http://${HOST}:${PORT}`);