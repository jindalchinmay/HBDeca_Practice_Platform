require('dotenv').config();
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config(); //dotenv file
const express = require("express");
const bodyParser = require("body-parser");
const { name } = require("ejs");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const mongoose = require('mongoose');
const mailVerify = require('./send'); //send google authentication
const getName = require("./nameTruncator") //profile name simplifier
const speakeasy = require('speakeasy'); //verification token
const querystring = require('querystring');
const { time } = require('console');
const app = express();
const MongoDBStore = require('connect-mongodb-session')(session);
const port = process.env.PORT || 5000;

const store = new MongoDBStore({
  uri: 'mongodb+srv://' + process.env.MONGODBIDENTIFICATION + '.vtqujxr.mongodb.net/TurnerFentonDECA?retryWrites=true&w=majority',
  collection: 'sessions', // Collection to store sessions
});

store.on('error', (error) => {
  console.error('Session store error:', error);
});


app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // Set a suitable session duration
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static('public'));

// Connect to MongoDB
mongoose.connect('mongodb+srv://' + process.env.MONGODBIDENTIFICATION + '.vtqujxr.mongodb.net/TurnerFentonDECA?retryWrites=true&w=majority')
  .then(() => {
    console.log("Connected to the database");
    app.listen(port, () => console.log(`Express server listening ${port}.`));
  })
  .catch(err => console.error(err));

const userSchema = new mongoose.Schema({
  googleId: String,
  displayName: String,
  email: String,
  userProfile: JSON
});
const User = mongoose.model('User', userSchema);

const questionSchema = {
  Question: String,
  OptionOne: String,
  OptionTwo: String,
  OptionThree: String,
  OptionFour: String,
  Answer: String
}


const BAQuestion = mongoose.model("BAQuestion", questionSchema);
const EntrepreneurshipQuestion = mongoose.model("EntrepreneurshipQuestion", questionSchema);
const FinanceQuestion = mongoose.model("FinanceQuestion", questionSchema);
const HospitalityQuestion = mongoose.model("HospitalityQuestion", questionSchema);
const MarketingQuestion = mongoose.model("MarketingQuestion", questionSchema);
const PrincipleQuestion = mongoose.model("PrincipleQuestion", questionSchema);

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.CALLBACK_URL,
      scope: ['profile', 'email'] // Include 'email' scope
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          return done(null, user);
        } else {
          const newUserProfile = {
            questionsAttempted: 0,
            questionsCorrect: 0,
            questionsWrong: 0,
            pastScores: [],
            wrongQuestions: []
          };

          const newUser = new User({
            googleId: profile.id,
            displayName: profile.displayName,
            email: profile._json.email, // Retrieve the email from the profile
            userProfile: newUserProfile
          });

          await newUser.save();
          return done(null, newUser);
        }
      } catch (error) {
        return done(error);
      }
    }
  )
);


passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    cb(null, { id: user.googleId, username: user.displayName, email: user.email });
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

app.get("/login", (req, res) => {
  try {
    if (req.isAuthenticated()) {
      res.redirect("/landing-page")
    } else {
      res.redirect('/auth/google')
    }
  } catch (error) {
    console.log(error)
    res.redirect("/")
  }

});

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {

      req.session.save(() => {

      res.redirect('/landing-page');
      });
  }
);


app.get("/landing-page", async (req, res) => {

  try {
    res.set(
      'Cache-Control',
      'no-cache, private, no-store, must-revalidate, max-stal e=0, post-check=0, pre-check=0'
    );


    if (req.isAuthenticated()) {
      const client = await User.find({ email: req.user.email }).exec();
      const clientname = client[0].displayName
      console.log(req);

      const questionsCorrect = client[0].userProfile.questionsCorrect;
      const questionsWrong = client[0].userProfile.questionsWrong;
      const totalQuestions = client[0].userProfile.questionsAttempted;

      const wrongQArray = client[0].userProfile.wrongQuestions;
      const randomIndex = Math.floor((Math.random() * wrongQArray.length));
      const randomQ = wrongQArray[randomIndex];

      if (randomQ == undefined) {
        const questionRandom = "no question"
        res.render("landingpage", { username: getName(clientname), questionsCorrect: questionsCorrect, questionsIncorrect: questionsWrong, totalQuestions: totalQuestions, questionRandom: questionRandom });
      } else {
        const questionRandom = await mongoose.model(randomQ.db).find({ _id: randomQ.questionId }).exec();
        res.render("landingpage", { username: getName(clientname), questionsCorrect: questionsCorrect, questionsIncorrect: questionsWrong, totalQuestions: totalQuestions, questionRandom: questionRandom[0] });
      }
    } else {
      res.redirect("/login");
    }

  } catch (error) {
    console.log(error)
    res.redirect("/")
  }
});

app.post("/more", (req, res) => {
  try {
    res.redirect("/choice");
  } catch (error) {
    console.log(error)
    res.redirect("/")
  }
})

app.get("/choice", async (req, res) => {
  try {
    if (req.isAuthenticated()) {

      client = await User.find({ email: req.user.email }).exec();
      clientname = client[0].displayName;
      res.render("clusters", { username: getName(clientname) })
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    console.log(error)
    res.redirect("/")
  }
})

app.get("/userInformation", async (req, res) => {
  try {
    if (req.isAuthenticated()) {

      const client = await User.find({ email: req.user.email }).exec();
      const clientname = client[0].displayName;

      const questionsCorrect = client[0].userProfile.questionsCorrect;
      const questionsWrong = client[0].userProfile.questionsWrong;
      const totalQuestions = client[0].userProfile.questionsAttempted;

      const pastScores = client[0].userProfile.pastScores;

      res.render("userInformation", { username: getName(clientname), questionsCorrect: questionsCorrect, questionsWrong: questionsWrong, totalQuestions: totalQuestions, latestResults: pastScores })

    } else {
      res.redirect("/login");
    }
  } catch (error) {
    console.log(error)
    res.redirect("/")
  }
});

app.get("/questions", async (req, res) => {
  try {
    if (req.isAuthenticated()) {

      try {
        const numberofQuestions = JSON.parse(req.query.number)
        const client = await User.find({ email: req.user.email }).exec()
        const clientname = client[0].displayName;
        const questionsId = JSON.parse(req.query.questionIds);
        const db = JSON.parse(req.query.db);

        const getQuestionsFromId = async () => {
          questionsArray = [];
          for (var i = 0; i < numberofQuestions; i++) {
            const questionFromDatabase = await mongoose.model(db).find({ _id: questionsId[i] }).exec();
            await questionsArray.push(questionFromDatabase[0]);
          }
          return questionsArray;
        }

        const questionsArrayfromID = await getQuestionsFromId();
        const timer = JSON.parse(req.query.timer);
        console.log()
        res.render("questions",
          { username: getName(clientname), questions: questionsArrayfromID, number: numberofQuestions, cluster: db, timerBoolean: timer, time: JSON.parse(req.query.time) })

      } catch (error) {
        res.redirect("/choice");
      }

    } else {
      res.redirect("/login");
    }
  } catch (error) {
    console.log(error)
    res.redirect("/homePage");
  }
})


app.get("/submit", async (req, res) => {
  try {
    if (req.isAuthenticated()) {
      try {
        const client = await User.find({ email: req.user.email }).exec();
        const clientname = client[0].displayName;

        questionsId = JSON.parse(req.query.questionIds);
        userAnswers = JSON.parse(req.query.userAnswers);
        number = JSON.parse(req.query.number);
        db = JSON.parse(req.query.db);
        results = JSON.parse(req.query.results);

        const getQuestionsFromId = async () => {
          questionsArray = [];

          for (var i = 0; i < number; i++) {
            const questionFromDatabase = await mongoose.model(db).find({ _id: questionsId[i] }).exec();
            await questionsArray.push(questionFromDatabase[0]);
          }
          return questionsArray;
        }
        const questionsArrayfromID = await getQuestionsFromId();

        await res.render("submit", { username: getName(clientname), questions: questionsArrayfromID, answers: userAnswers, number: number, results: results });
      } catch (error) {
        res.redirect("/choice")
      }
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    console.log(error)
    res.redirect("/")
  }
})

app.get('/logout', (req, res) => {
  try {
    req.logout(() => {
      res.redirect('/');
    });
  } catch (error) {
    console.log(error)
    res.redirect("/")
  }
});

app.post("/l", (req, res) => {
  try {
    res.redirect("/login")
  } catch (error) {
    console.log(error)
    res.redirect("/")
  }
})

app.post("/questions", (req, res) => {
  try {
    const questionIdsArray = JSON.parse(req.body.questionIds);
    const number = JSON.parse(req.body.number);
    const db = JSON.parse(req.body.cluster);
    const questionsAnswers = [];

    console.log(req.body)

    function getUserAnswers(request) {
      var userAnswers = [];
      for (var i = 0; i < number; i++) {
        userAnswers.push(request['' + i])
      }
      return userAnswers;
    }

    function checkAnswers(userAnswers, questionsAnswers) {
      var results = {
        correct: 0,
        incorect: 0,
        wrongQuestions: []
      }

      for (var k = 0; k < number; k++) {
        if (userAnswers[k] == questionsAnswers[k]) {
          results.correct++;
        } else {
          results.incorect++;
          results.wrongQuestions.push(questionIdsArray[k])
        }
      }
      return results;
    }

    Promise.all(questionIdsArray.map((id) => {
      return mongoose.model(db).findById(id, 'Answer').exec();
    }))
      .then((results) => {
        results.forEach((question) => {
          questionsAnswers.push(question.Answer);
        });

        const userAnswers = getUserAnswers(req.body);
        var results = checkAnswers(userAnswers, questionsAnswers);

        async function updateUserStats(results) {
          var user = await User.find({ email: req.user.email }).exec()
          var userProfileNew = user[0].userProfile;
          userProfileNew.questionsCorrect += results.correct;
          userProfileNew.questionsWrong += results.incorect;
          userProfileNew.questionsAttempted += (results.correct + results.incorect)
          userProfileNew.pastScores.push(results.correct / number)
          results.wrongQuestions.forEach((question) => {
            userProfileNew.wrongQuestions.push({ questionId: question, db: db });
          })
          //console.log(userProfileNew)
          await User.findOneAndUpdate({ email: req.user.email }, { userProfile: userProfileNew })
        }

        updateUserStats(results)

        const queryParams = querystring.stringify({
          questionIds: JSON.stringify(questionIdsArray),
          userAnswers: JSON.stringify(userAnswers),
          results: JSON.stringify(results),
          number: JSON.stringify(number),
          db: JSON.stringify(db)

        });
        res.redirect("/submit?" + queryParams);
      })
      .catch((error) => {
        console.error(error);
        res.redirect("/landing-page")
      });
  } catch (error) {
    console.log(error)
    res.redirect("/")
  }
})

app.post("/choice", async (req, res) => {

  try {
    var cluster = req.body.cluster;
    var questionNumbers = req.body.question;
    var timeLimit = req.body.timeLimit;
    var questionsToRender = [];

    function getRandomNumber(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function checkIfNumberIsInArray(number, array) {
      for (var i = 0; i < array.length; i++) {
        if (array[i] == number) {
          return true;
        }
      }
      return false
    }

    const db = cluster + "Question"
    var length = await mongoose.model(db).estimatedDocumentCount();
    const questions = await mongoose.model(db).find({}).exec();

    const populateQuestions = async () => {
      const hundredQuestions = [];
      chosen = [];
      for (var i = 0; i < questionNumbers; i++) {
        randomNumber = getRandomNumber(0, length - 1);
        var numberChosen = checkIfNumberIsInArray(randomNumber, chosen);
        while (numberChosen) {
          randomNumber = getRandomNumber(0, length - 1);
          numberChosen = checkIfNumberIsInArray(randomNumber, chosen);
        }
        chosen.push(randomNumber);
        hundredQuestions.push(questions[randomNumber]._id);
      }
      return hundredQuestions;
    };


    questionsToRender = await populateQuestions();
    const time = new Date().getTime();
    console.log(time)
    const queryParams = querystring.stringify({
      questionIds: JSON.stringify(questionsToRender),
      number: JSON.stringify(questionNumbers),
      db: JSON.stringify(cluster + "Question"),
      timer: JSON.stringify(timeLimit === 'none' ? "false" : "true"),
      time: JSON.stringify(time)
    })
    res.redirect("/questions?" + queryParams);
  } catch (error) {
    console.log(error)
    res.redirect("/")
  }
})

app.post("/done", (req, res) => {
  try {
    res.redirect("/landing-page")
  }
  catch (error) {
    console.log(error)
    res.redirect("/")
  }
})



app.post("/userInformation", async (req, res) => {
  try {
    const newName = req.body.newName

    await User.findOneAndUpdate({ email: req.user.email }, { displayName: newName })
      .then(() => {
        req.user.username = newName;
        res.redirect("/userInformation");
      });
  } catch (error) {
    console.log(error)
    res.redirect("/")
  }
})

app.use((req, res) => {
  res.redirect('/');
});
