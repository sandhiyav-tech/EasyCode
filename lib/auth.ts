import crypto from "crypto";

export interface SavedSnippet {
  id: string;
  title: string;
  code: string;
  updatedAt: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: "student" | "teacher" | "explorer";
  avatar: string;
  createdAt: string;
  savedSnippets: SavedSnippet[];
}

export interface StoredUser extends User {
  passwordHash: string;
  salt: string;
}

const AUTH_SECRET = process.env.AUTH_SECRET || "easycode-super-secret-key-for-beginners-2026";

// Hash password with salt
export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
}

// Generate random salt
export function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

// Create signed session token: userId.timestamp.signature
export function createSessionToken(userId: string): string {
  const timestamp = Date.now().toString();
  const payload = `${userId}:${timestamp}`;
  const hmac = crypto.createHmac("sha256", AUTH_SECRET);
  hmac.update(payload);
  const signature = hmac.digest("hex");
  return Buffer.from(`${payload}:${signature}`).toString("base64");
}

// Verify signed session token
export function verifySessionToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const parts = decoded.split(":");
    if (parts.length !== 3) return null;
    const [userId, timestamp, signature] = parts;

    // Check expiration (7 days)
    const age = Date.now() - parseInt(timestamp, 10);
    if (isNaN(age) || age > 7 * 24 * 60 * 60 * 1000) return null;

    const payload = `${userId}:${timestamp}`;
    const hmac = crypto.createHmac("sha256", AUTH_SECRET);
    hmac.update(payload);
    const expected = hmac.digest("hex");

    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return userId;
    }
    return null;
  } catch {
    return null;
  }
}

// In-memory user database initialized with friendly demo users
const usersStore = new Map<string, StoredUser>();

// Initialize default demo users
function initializeDefaultUsers() {
  if (usersStore.size === 0) {
    const salt1 = generateSalt();
    const studentUser: StoredUser = {
      id: "user-student-1",
      username: "alex_coder",
      email: "alex@easycode.dev",
      name: "Alex Rivera",
      role: "student",
      avatar: "🎒",
      createdAt: new Date().toISOString(),
      passwordHash: hashPassword("password123", salt1),
      salt: salt1,
      savedSnippets: [
        {
          id: "snip-1",
          title: "My Pizza Calculator",
          code: `# Alex's Pizza Calculator\nset slicesPerPizza to 8\nset people to 4\nset totalSlices to slicesPerPizza * 2\nsay "Each person gets " + text(totalSlices / people) + " slices!"`,
          updatedAt: new Date().toISOString(),
        },
        {
          id: "snip-2",
          title: "Rocket Countdown",
          code: `# Rocket Countdown\nset seconds to 5\nwhile seconds is greater than 0:\n    say text(seconds) + "..."\n    set seconds to seconds - 1\nsay "Liftoff! 🚀"`,
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    const salt2 = generateSalt();
    const teacherUser: StoredUser = {
      id: "user-teacher-1",
      username: "ms_taylor",
      email: "taylor@easycode.dev",
      name: "Ms. Taylor",
      role: "teacher",
      avatar: "👩‍🏫",
      createdAt: new Date().toISOString(),
      passwordHash: hashPassword("teacher123", salt2),
      salt: salt2,
      savedSnippets: [
        {
          id: "snip-3",
          title: "Class Lesson 1: Variables",
          code: `# Lesson 1 - Variables\nset score to 100\nsay "Initial score: " + text(score)\nset score to score + 50\nsay "New score: " + text(score)`,
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    usersStore.set(studentUser.id, studentUser);
    usersStore.set(teacherUser.id, teacherUser);
  }
}

initializeDefaultUsers();

// Helper functions for user storage
export function findUserById(id: string): User | null {
  initializeDefaultUsers();
  const u = usersStore.get(id);
  if (!u) return null;
  // Return user without sensitive fields
  const { passwordHash, salt, ...safeUser } = u;
  return safeUser;
}

export function findUserByEmailOrUsername(identifier: string): StoredUser | null {
  initializeDefaultUsers();
  const lower = identifier.toLowerCase().trim();
  for (const user of usersStore.values()) {
    if (user.email.toLowerCase() === lower || user.username.toLowerCase() === lower) {
      return user;
    }
  }
  return null;
}

export function registerUser(params: {
  name: string;
  email: string;
  username: string;
  password: string;
  role: "student" | "teacher" | "explorer";
}): User {
  initializeDefaultUsers();
  const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const salt = generateSalt();
  const passwordHash = hashPassword(params.password, salt);

  const avatars: Record<string, string> = {
    student: "🎒",
    teacher: "👩‍🏫",
    explorer: "🚀",
  };

  const newUser: StoredUser = {
    id,
    name: params.name,
    email: params.email.toLowerCase().trim(),
    username: params.username.toLowerCase().trim(),
    role: params.role,
    avatar: avatars[params.role] || "⭐",
    createdAt: new Date().toISOString(),
    passwordHash,
    salt,
    savedSnippets: [],
  };

  usersStore.set(id, newUser);

  const { passwordHash: _, salt: __, ...safeUser } = newUser;
  return safeUser;
}

export function addSnippetToUser(userId: string, title: string, code: string): SavedSnippet | null {
  initializeDefaultUsers();
  const u = usersStore.get(userId);
  if (!u) return null;

  const snippet: SavedSnippet = {
    id: `snip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: title || "Untitled Program",
    code,
    updatedAt: new Date().toISOString(),
  };

  u.savedSnippets = [snippet, ...u.savedSnippets];
  usersStore.set(userId, u);
  return snippet;
}

export function deleteSnippetFromUser(userId: string, snippetId: string): boolean {
  initializeDefaultUsers();
  const u = usersStore.get(userId);
  if (!u) return false;

  const lenBefore = u.savedSnippets.length;
  u.savedSnippets = u.savedSnippets.filter((s) => s.id !== snippetId);
  return u.savedSnippets.length < lenBefore;
}

