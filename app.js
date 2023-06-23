
const express = require("express");
const bodyParser = require("body-parser");
const {name} = require("ejs");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const hash = "54c7d01f9d64ceba37ea909ed7d0bddee155a29182d3780b2c5c6ea152a5fd41"
const bcrypt = require('bcrypt');
const saltRounds = 10;
const mongoose = require('mongoose');
const ejs = require('ejs')
const port = 5000;
const app = express();
const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
const speakeasy = require('speakeasy');

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(session({
  secret: hash,
  resave: false,
  saveUninitialized: false
}))

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb://127.0.0.1:27017/TurnerFentonDECA') // Moved database connection code here
  .then(() => {
    console.log("Connected to the database");
    app.listen(port, () => console.log("Express server listening {port}."));
  })
  .catch(err => console.error(err));

  const userProfile = {};

  const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    name: String,
    userProfile: userProfile
  })

  userSchema.plugin(passportLocalMongoose);

  const User = mongoose.model("user", userSchema);

  passport.use(User.createStrategy());
  passport.serializeUser(User.serializeUser());
  passport.deserializeUser(User.deserializeUser());

app.get("/", (req,res)=> {
  res.render("homePage", {});
});

app.post("/l", (req,res) => {

  res.redirect("/login");
})

app.post("/r", (req,res) => {

  res.redirect("/register");
})

app.get("/login", (req,res) => {

  res.render("login", {});
});

app.get("/register", (req,res) => {

  res.render("register", {});
});

app.post("/register", async (req, res) => {

const secret = speakeasy.generateSecret();

  // Compose the email message
  const email = req.body.email;
  const subject = 'Two-Factor Authentication Secret Key';
  const message = `Your two-factor authentication secret key is: ${secret.base32}`;

  // Configure the email options
  const mailOptions = {
    from: 'blueishfiend692@gmail.com',
    to: email,
    subject: subject,
    text: message
  };

  // Send the email using Nodemailer
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });

  console.log("Secret key sent to user:", secret.base32);
});



