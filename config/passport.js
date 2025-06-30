const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const AppleStrategy = require('passport-apple').Strategy;
const getDatabase = require('./database');
const jwt = require('jsonwebtoken');

// Serialização do usuário para a sessão
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialização do usuário da sessão
passport.deserializeUser(async (id, done) => {
    try {
        const db = await getDatabase();
        const user = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Função auxiliar para criar ou encontrar usuário
async function findOrCreateUser(profile, provider) {
    const db = await getDatabase();
    
    // Primeiro, tenta encontrar usuário pelo email
    const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
    
    if (email) {
        const existingUser = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (existingUser) {
            // Atualiza informações do provider se necessário
            await new Promise((resolve, reject) => {
                db.run(
                    `UPDATE users SET 
                     ${provider}_id = ?, 
                     avatar_url = COALESCE(?, avatar_url),
                     updated_at = CURRENT_TIMESTAMP 
                     WHERE id = ?`,
                    [profile.id, profile.photos && profile.photos[0] ? profile.photos[0].value : null, existingUser.id],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
            return existingUser;
        }
    }
    
    // Se não encontrou, cria novo usuário
    const newUser = {
        full_name: profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim(),
        email: email,
        [`${provider}_id`]: profile.id,
        avatar_url: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
        email_verified: email ? 1 : 0, // Assume que email de provider social é verificado
        is_active: 1,
        auth_provider: provider
    };
    
    const userId = await new Promise((resolve, reject) => {
        const columns = Object.keys(newUser).join(', ');
        const placeholders = Object.keys(newUser).map(() => '?').join(', ');
        const values = Object.values(newUser);
        
        db.run(
            `INSERT INTO users (${columns}, created_at) VALUES (${placeholders}, CURRENT_TIMESTAMP)`,
            values,
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
    
    return { id: userId, ...newUser };
}

// Estratégia do Google (apenas se as credenciais estiverem disponíveis)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback'
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const user = await findOrCreateUser(profile, 'google');
            return done(null, user);
        } catch (error) {
            return done(error, null);
        }
    }));
}

// Estratégia do Facebook (apenas se as credenciais estiverem disponíveis)
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: process.env.FACEBOOK_CALLBACK_URL || '/api/auth/facebook/callback',
        profileFields: ['id', 'displayName', 'photos', 'email', 'name']
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const user = await findOrCreateUser(profile, 'facebook');
            return done(null, user);
        } catch (error) {
            return done(error, null);
        }
    }));
}

// Estratégia do GitHub (apenas se as credenciais estiverem disponíveis)
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL || '/api/auth/github/callback'
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const user = await findOrCreateUser(profile, 'github');
            return done(null, user);
        } catch (error) {
            return done(error, null);
        }
    }));
}

// Estratégia da Apple (apenas se as credenciais estiverem disponíveis)
if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY_PATH) {
    passport.use(new AppleStrategy({
        clientID: process.env.APPLE_CLIENT_ID,
        teamID: process.env.APPLE_TEAM_ID,
        callbackURL: process.env.APPLE_CALLBACK_URL || '/api/auth/apple/callback',
        keyID: process.env.APPLE_KEY_ID,
        privateKeyLocation: process.env.APPLE_PRIVATE_KEY_PATH,
        scope: ['name', 'email']
    }, async (accessToken, refreshToken, idToken, profile, done) => {
        try {
            const user = await findOrCreateUser(profile, 'apple');
            return done(null, user);
        } catch (error) {
            return done(error, null);
        }
    }));
}

module.exports = passport;