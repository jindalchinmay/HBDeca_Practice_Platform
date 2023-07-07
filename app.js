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
const app = express();
const port = 5000;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));
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

  app.get("/login", (req,res) =>{
    if(req.isAuthenticated()){
      res.redirect("/landing-page")
    } else{
      res.redirect('/auth/google')
    }

  });

  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email']}));

  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
      // Successful authenlogouttication, redirect to profile page
      res.redirect('/landing-page');
    }
  );



  app.get("/landing-page", async (req, res) => {
    res.set(
      'Cache-Control',
      'no-cache, private, no-store, must-revalidate, max-stal e=0, post-check=0, pre-check=0'
    );

    if (req.isAuthenticated()) {
      //console.log(req.user)
      const clientname = req.user.username;
      const getUserProfile = async (name) =>{
        var profile = await User.find({displayName: name}).exec();
        //await console.log(profile)
        return profile
      }

      const clientProfile = await getUserProfile(clientname)
      //console.log(clientProfile[0])
      const questionsCorrect = clientProfile[0].userProfile.questionsCorrect;
      const questionsWrong = clientProfile[0].userProfile.questionsWrong;
      const totalQuestions = (questionsCorrect + questionsWrong);

      res.render("landingpage", { username: getName(clientname), questionsCorrect: questionsCorrect, questionsIncorrect: questionsWrong, totalQuestions: totalQuestions});
    } else {
      res.redirect("/login");
    }
  });

  app.get("/choice", async (req,res) => {

    if(req.isAuthenticated()){

    const clientname = req.user.username;
    res.render("clusters", {username: getName(clientname)})
    } else{
      res.redirect("/login");
    }
  })

  app.get("/questions", async (req,res)=>{

    if(req.isAuthenticated()){

      const numberofQuestions = JSON.parse(req.query.number)
      const clientname = getName(req.user.username);
      const questionsId = JSON.parse(req.query.questionIds);
      const db = JSON.parse(req.query.db);

      const getQuestionsFromId = async () => {
        questionsArray = [];
        for(var i = 0; i < numberofQuestions; i++){
          const questionFromDatabase = await mongoose.model(db).find({_id:questionsId[i]}).exec();
          await questionsArray.push(questionFromDatabase[0]);
        }
        return questionsArray;
      }
      const questionsArrayfromID = await getQuestionsFromId();

      res.render("questions",
      {username: clientname, questions: questionsArrayfromID, number:numberofQuestions, cluster:db})

    } else{
      res.redirect("/login");
    }
  })


  app.get("/submit", async (req,res)=>{

    if(req.isAuthenticated()){

      const clientname = getName(req.user.username);

      questionsId = JSON.parse(req.query.questionIds);
      userAnswers = JSON.parse(req.query.userAnswers);
      number = JSON.parse(req.query.number);
      db = JSON.parse(req.query.db);


      const getQuestionsFromId = async () => {
        questionsArray = [];

        for(var i = 0; i < number; i++){
          const questionFromDatabase = await mongoose.model(db).find({_id:questionsId[i]}).exec();
          await questionsArray.push(questionFromDatabase[0]);
        }
        return questionsArray;
      }
      const questionsArrayfromID = await getQuestionsFromId();

      await res.render("submit", { username: clientname, questions:questionsArrayfromID, answers: userAnswers, number: number});

      } else {
      res.redirect("/login");
    }
  })

  app.post('/logout', (req, res) => {
    req.logout(() =>{
      res.redirect('/');
    });
  });

  app.post("/l", (req,res)=>{
    res.redirect("/login")
  })


  app.post("/questions", (req,res) =>{
    const questionIdsArray = JSON.parse(req.body.questionIds);
    number = JSON.parse(req.body.number);
    db = JSON.parse(req.body.cluster);
    const questionsAnswers = [];

    function getUserAnswers(request){
      var userAnswers = [];
      for(var i = 0; i < number; i++){
        userAnswers.push(request['' + i])
      }
      return userAnswers;
    }

    function checkAnswers(userAnswers, questionsAnswers) {
      var results = {
        correct:0,
        incorect:0,
        wrongQuestions: []
      }

      for(var k = 0; k  < number; k++){
        if(userAnswers[k] == questionsAnswers[k]){
          results.correct++;
        }else{
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

        async function updateUserStats(results){
          var user = await User.find({displayName:req.user.username}).exec()
          var userProfileNew = user[0].userProfile;
          userProfileNew.questionsCorrect += results.correct;
          userProfileNew.questionsWrong += results.incorect;
          userProfileNew.questionsAttempted += (results.correct + results.incorect)
          userProfileNew.pastScores.push(results.correct/100)
          results.wrongQuestions.forEach((question) =>{
            userProfileNew.wrongQuestions.push(question);
          })
          //console.log(userProfileNew)
          await User.findOneAndUpdate({displayName: req.user.username}, {userProfile: userProfileNew})
        }

        updateUserStats(results)

        const queryParams = querystring.stringify({
          questionIds: JSON.stringify(questionIdsArray),
          userAnswers: JSON.stringify(userAnswers),
          results: JSON.stringify(results),
          number:JSON.stringify(number),
          db: JSON.stringify(db)

        });
        res.redirect("/submit?" + queryParams);
      })
      .catch((error) => {
        console.error(error);
        res.redirect("/landing-page")
      });
})

app.post("/choice", async (req,res) => {

    var cluster = req.body.cluster;
    var questionNumbers = req.body.question;
    var timeLimit = req.body.timeLimit;
    var questionsToRender = [];

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

    if(cluster == "Wrong Questions"){
      const client = await User.find({displayName: req.user.username}).exec();
      const clientProfileWrongQuestions = client[0].userProfile.wrongQuestions

      if(clientProfileWrongQuestions.length >= questionNumbers){
        var length = clientProfileWrongQuestions.length;

          chosen = [];
          for (var i = 0; i < questionNumbers; i++) {
            randomNumber = getRandomNumber(0, length - 1);
            var numberChosen = checkIfNumberIsInArray(randomNumber, chosen);
            while (numberChosen) {
              randomNumber = getRandomNumber(0, length-1);
              numberChosen = checkIfNumberIsInArray(randomNumber, chosen);
            }
            chosen.push(randomNumber);
            questionsToRender.push(questions[randomNumber]);
          }

      }
      // else{

      //   var length = clientProfileWrongQuestions.length;
      //   var remainder = questionNumbers - length;
      //   chosen = [];
      //   for (var i = 0; i < questionNumbers; i++) {
      //     randomNumber = getRandomNumber(0, length - 1);
      //     var numberChosen = checkIfNumberIsInArray(randomNumber, chosen);
      //     while (numberChosen) {
      //       randomNumber = getRandomNumber(0, length-1);
      //       numberChosen = checkIfNumberIsInArray(randomNumber, chosen);
      //     }
      //     chosen.push(randomNumber);
      //     questionsToRender.push(questions[randomNumber]);
      //   }

      //   questions = await db.find({}).exec();
      //   for(var i = 0; i < remainder; i++){

      //   }

      // }


    }else{
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
            randomNumber = getRandomNumber(0, length-1);
            numberChosen = checkIfNumberIsInArray(randomNumber, chosen);
          }
          chosen.push(randomNumber);
          hundredQuestions.push(questions[randomNumber]._id);
        }
        return hundredQuestions;
      };

      questionsToRender = await populateQuestions();
    }

    const queryParams = querystring.stringify({
      questionIds: JSON.stringify(questionsToRender),
      number: JSON.stringify(questionNumbers),
      db: JSON.stringify(cluster + "Question")
    })

    console.log(questionsToRender)
    res.redirect("/questions?" + queryParams);
    // await res.render("questions", { username: getName(clientname), questions:questionsToRender});
})

app.post("/done", (req,res)=>{
  res.redirect("/landing-page");
})
