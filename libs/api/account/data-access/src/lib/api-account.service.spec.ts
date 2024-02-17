import { ApiAppDataAccessModule } from '@kinny/kinetic-api/app/data-access'
import { ApiCoreDataAccessModule } from '@kinny/kinetic-api/core/data-access'
import { ApiKineticDataAccessModule } from '@kinny/kinetic-api/kinetic/data-access'
import { Test } from '@nestjs/testing'
import { ApiAccountService } from './api-account.service'

describe('ApiAccountService', () => {
  let service: ApiAccountService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ApiAppDataAccessModule, ApiCoreDataAccessModule, ApiKineticDataAccessModule],
      providers: [ApiAccountService],
    }).compile()

    service = module.get(ApiAccountService)
  })

  it('should be defined', () => {
    expect(service).toBeTruthy()
  })
})
