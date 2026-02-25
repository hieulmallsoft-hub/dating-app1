import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthProvider } from '../../../user/domain/entities/users.model';
import * as path from 'path';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('auth.apple.clientId') || 'apple-id',
      teamID: configService.get<string>('auth.apple.teamId') || 'apple-team',
      keyID: configService.get<string>('auth.apple.keyId') || 'apple-key',
      keyFilePath: configService.get<string>('auth.apple.keyFilePath') || 'path/to/key.p8',
      callbackURL: configService.get<string>('auth.apple.callbackUrl') || 'http://localhost:3000/auth/apple/callback',
      scope: ['email', 'name'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    idToken: string,
    profile: any,
    done: (err: any, user?: any) => void,
  ): Promise<any> {
    // Apple only sends name on first login
    const user = {
      email: profile.email,
      fullName: profile.name ? `${profile.name.firstName} ${profile.name.lastName}` : null,
      socialId: profile.id,
      provider: AuthProvider.APPLE,
    };
    done(null, user);
  }
}
