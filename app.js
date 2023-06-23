
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");

const app = express();




const mongoose = require('mongoose');
const { name } = require('ejs')
const port = 5000;
mongoose.connect('mongodb://127.0.0.1:27017/TurnerFentonDeca') // Moved database connection code here
  .then(() => {
    console.log("Connected to the database");
    app.listen(port, () => console.log("Express server listening {port}."));
  })
  .catch(err => console.error(err));

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


app.get("/", (req,res)=> {
  res.render("homePage", {});
});


