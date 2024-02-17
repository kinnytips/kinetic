import { ApiCoreDataAccessModule } from '@kinny/kinetic-api/core/data-access'
import { ApiKineticDataAccessModule } from '@kinny/kinetic-api/kinetic/data-access'
import { Module } from '@nestjs/common'

import { ApiTransactionService } from './api-transaction.service'
import { ApiTransactionUserService } from './api-transaction-user.service'

@Module({
  imports: [ApiCoreDataAccessModule, ApiKineticDataAccessModule],
  providers: [ApiTransactionService, ApiTransactionUserService],
  exports: [ApiTransactionService, ApiTransactionUserService],
})
export class ApiTransactionDataAccessModule {}
