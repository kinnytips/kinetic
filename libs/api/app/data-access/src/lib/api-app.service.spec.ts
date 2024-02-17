import { ApiCoreDataAccessModule } from '@kinny/kinetic-api/core/data-access'
import { ApiKineticDataAccessModule } from '@kinny/kinetic-api/kinetic/data-access'
import { ApiWalletDataAccessModule } from '@kinny/kinetic-api/wallet/data-access'
import { Test } from '@nestjs/testing'
import { ApiAppService } from './api-app.service'

describe('ApiAppService', () => {
  let service: ApiAppService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ApiCoreDataAccessModule, ApiKineticDataAccessModule, ApiWalletDataAccessModule],
      providers: [ApiAppService],
    }).compile()

    service = module.get(ApiAppService)
  })

  it('should be defined', () => {
    expect(service).toBeTruthy()
  })
})
