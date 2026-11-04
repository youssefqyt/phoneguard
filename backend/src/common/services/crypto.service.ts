import { Injectable } from '@nestjs/common';
import { randomBytes, createHash } from 'node:crypto';
import { customAlphabet } from 'nanoid';

const pairingAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Small helper for generating opaque tokens, pairing codes and stable hashes.
 */
@Injectable()
export class CryptoService {
  private readonly nanoid = customAlphabet(pairingAlphabet, 8);

  /** Human-friendly pairing code, e.g. `K7QM4XPT`. */
  generatePairingCode(): string {
    return this.nanoid();
  }

  /** URL-safe random token (used for household invites). */
  generateToken(bytes = 24): string {
    return randomBytes(bytes).toString('base64url');
  }

  /** Stable SHA-256 hex digest — used to store refresh tokens at rest. */
  sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
