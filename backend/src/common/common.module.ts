import { Global, Module } from '@nestjs/common';
import { CryptoService } from './services/crypto.service';
import { HouseholdAccessService } from './services/household-access.service';

/**
 * Cross-cutting helpers shared by every feature module.
 */
@Global()
@Module({
  providers: [CryptoService, HouseholdAccessService],
  exports: [CryptoService, HouseholdAccessService],
})
export class CommonModule {}
