const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');

passport.serializeUser((user, done) => {
  done(null, user.id || user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user || false);
  } catch (error) {
    done(error, null);
  }
});

/**
 * Configure Google OAuth strategy
 */
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user already exists
          let user = await User.findOne({ googleId: profile.id });
          
          if (user) {
            return done(null, user);
          }
          
          // Check if email is already registered
          user = await User.findOne({ email: profile.emails[0].value });
          
          if (user) {
            // Link Google account to existing user
            user.googleId = profile.id;
            await user.save();
            return done(null, user);
          }
          
          // Create new user
          let baseUsername = profile.displayName.replace(/\s+/g, '').toLowerCase();
          if (baseUsername.length < 3) {
            baseUsername = profile.emails[0].value.split('@')[0].replace(/[^a-z0-9]/g, '').toLowerCase();
          }
          if (baseUsername.length < 3) {
            baseUsername = `user${profile.id.slice(-6)}`;
          }
          // Ensure username is unique
          let username = baseUsername;
          let counter = 1;
          while (await User.findOne({ username })) {
            username = `${baseUsername}${counter++}`;
          }
          user = await User.create({
            googleId: profile.id,
            username,
            email: profile.emails[0].value,
            avatar: profile.photos[0]?.value || null,
            isOnline: true
          });
          
          done(null, user);
        } catch (error) {
          done(error, null);
        }
      }
    )
  );
} else {
  console.warn('[passport] Google OAuth is disabled because GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_CALLBACK_URL are missing.');
}
