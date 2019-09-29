const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

const {
	CLIENT_ID,
	CLIENT_SECRET
} = process.env

module.exports = (passport) => {
	passport.serializeUser((user, done) => {
		done(null, user);
	});
	passport.deserializeUser((user, done) => {
		done(null, user);
	});
	passport.use(new GoogleStrategy({
			clientID: CLIENT_ID,
			clientSecret: CLIENT_SECRET,
			callbackURL: 'https://tiiime.now.sh/login/callback'
		},
		(token, refreshToken, profile, done) => {
			return done(null, {
				profile: profile,
				token: token
			});
		}));
};
