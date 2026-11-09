import dotenv from "dotenv";
import fs from "fs";

// Load default .env first
dotenv.config();

// If .env.local exists, override with .env.local
if (fs.existsSync(".env.local")) {
  dotenv.config({ path: ".env.local", override: true });
}

export const ENV = {
  PORT: process.env.PORT || 5000,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.HOSTELEASE_SECRET_JWT || process.env.HOSTELHUB_SECRET_JWT
};
