import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import passport from "passport";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { Strategy as LocalStrategy } from "passport-local";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

// Extend Express user interface
declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

// Set up app
const app = express();

// Configure CORS to work with credentials
// Set 'trust proxy' at the top level before any middleware
app.set("trust proxy", 1);

app.use(cors({
  origin: function(origin, callback) {
    // Allow any origin (the browser will enforce CORS)
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['set-cookie'],
}));

// Parse cookies
app.use(cookieParser());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// IMPORTANT: Set up session middleware BEFORE passport
const sessionSettings: session.SessionOptions = {
  secret: process.env.SESSION_SECRET || 'hedera-token-redemption-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true,        // Force HTTPS-only cookies
    sameSite: 'none',    // Allow cross-origin cookies
    maxAge: 604800000    // 7 days
  },
  store: storage.sessionStore
};
app.use(session(sessionSettings));

// Passport initialization - MUST come after session middleware
app.use(passport.initialize());
app.use(passport.session());

// Passport configuration
const scryptAsync = promisify(scrypt);

async function comparePasswords(supplied: string, stored: string | null) {
  if (!stored) return false;
  
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Configure local strategy
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user || !user.password || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    } catch (error) {
      return done(error);
    }
  })
);

// This is the key part - serialization/deserialization needs to handle both wallet and regular users
passport.serializeUser((user, done) => {
  console.log("Serializing user:", user.id, user.accountId || '(no accountId)');
  if (user.accountId) {
    // For wallet users, serialize the accountId as a string with prefix
    done(null, `wallet:${user.accountId}`);
  } else {
    // For regular users, serialize the numeric ID
    done(null, `id:${user.id}`);
  }
});

passport.deserializeUser(async (serialized: string, done) => {
  try {
    console.log("Deserializing user from:", serialized);
    
    // Extract the type and value from the serialized string
    const [type, value] = serialized.split(':');
    
    let user;
    if (type === 'wallet') {
      // Handle wallet users - deserialize by accountId
      user = await storage.getUserByAccountId(value);
      console.log("Deserializing wallet user:", value, "Result:", user ? "Found" : "Not found");
    } else if (type === 'id') {
      // Handle regular users - deserialize by ID
      const id = parseInt(value, 10);
      user = await storage.getUser(id);
      console.log("Deserializing ID user:", id, "Result:", user ? "Found" : "Not found");
    } else {
      return done(new Error(`Unknown serialization type: ${type}`));
    }
    
    if (!user) {
      return done(new Error('User not found'));
    }
    
    return done(null, user);
  } catch (error) {
    console.error("Error deserializing user:", error);
    done(error);
  }
});

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
