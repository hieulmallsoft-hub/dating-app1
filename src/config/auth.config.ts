import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
  },
  apple: {
    clientId: process.env.APPLE_CLIENT_ID,
    teamId: process.env.APPLE_TEAM_ID,
    keyId: process.env.APPLE_KEY_ID,
    keyFilePath: process.env.APPLE_KEY_FILE_PATH,
    callbackUrl: process.env.APPLE_CALLBACK_URL || 'http://localhost:3000/auth/apple/callback',
  },
}));
