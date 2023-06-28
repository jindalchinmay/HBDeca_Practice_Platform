require('dotenv').config(); //dotenv file
const express = require("express");
const bodyParser = require("body-parser");
const { name } = require("ejs");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const hash = process.env.HASH;
const mongoose = require('mongoose');
const port = 5000;
const app = express();
const mailVerify = require('./send'); //send google authentication
const getName = require("./nameTruncator") //profile name simplifier
const speakeasy = require('speakeasy'); //verification token

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); //public directory for loading files

//establish session
app.use(session({
  secret: hash,
  resave: false,
  saveUninitialized: false
}))

//authenticate session
app.use(passport.initialize());
app.use(passport.session());

//connect to database
mongoose.connect('mongodb+srv://' + process.env.MONGODBIDENTIFICATION + '.vtqujxr.mongodb.net/TurnerFentonDECA?retryWrites=true&w=majority')
  .then(() => {
    console.log("Connected to the database");
    app.listen(port, () => console.log(`Express server listening ${port}.`));
  })
  .catch(err => console.error(err));

//schema of user connected to database
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  name: String,
  userProfile: JSON
});

//schema of question
const questionSchema = {
    Question: String,
    OptionOne: String,
    OptionTwo: String,
    OptionThree: String,
    OptionFour: String,
    Answer: String
}

const Question = mongoose.model("question", questionSchema);

userSchema.plugin(passportLocalMongoose);
const User = mongoose.model("user", userSchema);
passport.use(User.createStrategy());

passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    cb(null, { id: user.id, username: user.username });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

app.get("/", (req, res) => {
  res.render("homePage", {});
});

app.post("/l", (req, res) => {
  res.redirect("/login");
})

app.post("/r", (req, res) => {
  res.redirect("/register");
})

app.get("/login", (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect("/landing-page");
  } else {
    res.render("login", {});
  }
});

app.get("/register", (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect("/landing-page");
  } else { res.render("register", {}); }
});

app.get("/form", async (req, res) => {
  const foundUsers = (await User.find({ username: req.session.email }).exec()).length;
  console.log(foundUsers);
  if (req.session.email != null && !req.isAuthenticated() && foundUsers === 0) {
    res.render("form", { email: req.session.email });
  } else if (foundUsers != 0 && !req.isAuthenticated()) {
    res.redirect("/login");
  }
});

app.get("/information", (req, res) => {
  if (req.session.verified) {
    res.render("information", {});
  } else {
    res.redirect("/register");
  }
});


app.get("/landing-page", async (req, res) => {
  res.set(
    'Cache-Control',
    'no-cache, private, no-store, must-revalidate, max-stal e=0, post-check=0, pre-check=0'
  );

  if (req.isAuthenticated()) {
    const userNamefromStorage = await User.find({ username: req.user.username }).exec();
    const clientname = getName(userNamefromStorage[0].name);
    res.render("landingpage", { username: clientname});
  } else {
    res.redirect("/login");
  }
});

app.get("/questions", async (req,res) => {

  if(req.isAuthenticated()){

  const userNamefromStorage = await User.find({ username: req.user.username }).exec();
  const clientname = getName(userNamefromStorage[0].name);

  function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  function checkIfNumberIsInArray(number, array){
    for(var i = 0; i < array.length; i++){
      if(array[i] == number){
        return true;
      }
    }

    return false
  }

  var length = await Question.estimatedDocumentCount();
  questions = await Question.find({}).exec();

  const populateQuestions = async () => {
    const hundredQuestions = [];
    chosen = [];
    for (var i = 0; i < 100; i++) {
      randomNumber = getRandomNumber(0, length - 1);
      var numberChosen = checkIfNumberIsInArray(randomNumber, chosen);
      while (numberChosen) {
        randomNumber = getRandomNumber(0, length-1);
        numberChosen = checkIfNumberIsInArray(randomNumber, chosen);
      }
      chosen.push(randomNumber);
      hundredQuestions.push(questions[randomNumber]);
    }
    return hundredQuestions;
  };

  questionsToRender = await populateQuestions();
  await res.render("questions", { username: clientname, questions:questionsToRender});
  } else{
    res.redirect("/login");
  }
})

app.post('/logout', function (req, res, next) {
  req.logout(function (err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

app.post("/register", async (req, res) => {
  var secret = speakeasy.generateSecret();
  console.log(secret);

  const options = {
    to: req.body.username,
    subject: 'Verification Code for Turner Fenton',
    text: `Your verification code is: ${secret.base32}`,
    textEncoding: 'base64',
  };

  mailVerify(options);

  req.session.email = req.body.username;
  req.session.key = secret.base32;
  req.session.keyExpiration = Date.now() + (10 * 60 * 1000);

  secret = null;
  res.redirect('/form')
});

app.post("/form", (req, res) => {
  const userCode = req.body.code;
  const currentTime = Date.now();
  const expirationTime = req.session.keyExpiration;

  if (currentTime > expirationTime) {
    req.session.key = "null";
    console.log("key is null")
  }

  if (userCode === req.session.key) {
    req.session.verified = true;
    req.session.key = null;
    res.redirect("/information")
  }else {
    req.session.secret = null;
    req.session.email = null;
    res.redirect("/register");
  }
})

app.post("/information", (req, res) => {
  console.log(req.body);
  const newUserProfile = {
    questionsAttempted: 0,
    questionsCorrect: 0,
    questionsWrong: 0,
  };

  User.register(
    {
      username: req.session.email,
      name: req.body.name,
      userProfile: newUserProfile,
    },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        req.login(user, function (err) {
          if (err) { return next(err); }
          return res.redirect('/landing-page');
        });
      }
    }
  );
})


app.post("/login", (req, res, next) => {
  passport.authenticate("local", {
    successRedirect: "/landing-page",
    failureRedirect: "/login",
  })(req, res, next);
});
