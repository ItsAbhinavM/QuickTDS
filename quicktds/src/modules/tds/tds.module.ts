import { Module } from '@nitrostack/core';
import { TdsService } from './tds.service.js';
import { TdsTools } from './tds.tools.js';

@Module({
  name: 'tds-recovery',
  description: 'Deterministic TDS reconciliation and recovery case workflow',
  controllers: [TdsTools],
  providers: [TdsService],
  exports: [TdsService]
})
export class TdsModule {}
