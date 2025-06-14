import { render } from '@testing-library/react'

import WebUiToaster from './web-ui-toaster'

describe('WebUiToaster', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<WebUiToaster />)
    expect(baseElement).toBeTruthy()
  })
})
