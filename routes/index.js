const express = require("express");
const session = require("express-session");
const passport = require("passport");
const localStrategy = require("passport-local");
const upload = require("./multer");

var router = express.Router();
const userModel = require("./users");
const postModel = require("./post");

passport.use(new localStrategy(userModel.authenticate()));

router.get("/", function (req, res) {
  res.render("index", { nav: false });
});

router.get("/profile", isLoggedIn, async function (req, res) {
  const user = await userModel
    .findOne({
      username: req.session.passport.user,
    })
    .populate("posts");

  // user.posts.forEach((post) => {
  //   console.log(post.images);
  // });

  res.render("profile", { user, nav: true });
});

router.get("/show/post", isLoggedIn, async function (req, res) {
  const user = await userModel
    .findOne({
      username: req.session.passport.user,
    })
    .populate("posts");

  res.render("show", { user, nav: true });
});

router.get("/feed", isLoggedIn, async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const posts = await postModel.find().populate("user");
  console.log;

  res.render("feed", { user, posts, nav: true });
});

router.post(
  "/fileupload",
  isLoggedIn,
  upload.single("image"),
  async function (req, res, next) {
    const user = await userModel.findOne({
      username: req.session.passport.user,
    });
    user.profileImage = req.file.filename;
    await user.save();
    res.redirect("/profile");
  }
);

router.get("/add", isLoggedIn, function (req, res) {
  res.render("add", { nav: true, error: req.flash("error") });
});

router.post(
  "/cratepost",
  isLoggedIn,
  upload.single("postimage"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).send("No files were uploaded");
    }

    try {
      const user = await userModel.findOne({
        username: req.session.passport.user,
      });

      // Save the filename of the uploaded image
      const filename = req.file.filename;

      // Create a new post with the image filename and other data
      const post = await postModel.create({
        user: user._id,
        postimage: filename,
        title: req.body.title,
        description: req.body.description,
      });

      // Push the ID of the newly created post to the user's posts array
      user.posts.push(post._id);

      // Save the updated user document
      await user.save();

      res.redirect("/profile");
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).send("An error occurred while creating the post.");
    }
  }
);

router.get("/login", function (req, res) {
  res.render("login", { nav: false, error: req.flash("error") });
});

router.get("/feed", function (req, res) {
  res.render("feed", {});
});

// Register route
router.post("/register", function (req, res) {
  var userdata = new userModel({
    fullname: req.body.fullname,
    username: req.body.username,
    email: req.body.email,
    contact: req.body.contact,
    password: req.body.password,
    // Add email field from request body
  });

  userModel.register(
    userdata,
    req.body.password,
    function (err, registeredUser) {
      if (err) {
        console.error(err);
        return res.send("An error occurred during registration.");
      }

      passport.authenticate("local")(req, res, function () {
        res.redirect("/profile");
      });
    }
  );
});

router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/profile",
    failureRedirect: "/login",
    failureFlash: true,
  }),
  function (req, res) {}
);

router.get("/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/login");
  });
});

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

module.exports = router;
