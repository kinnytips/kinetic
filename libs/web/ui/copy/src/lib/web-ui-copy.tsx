import { Tooltip } from '@kin-kinetic/web/ui/tooltip'
import { Button, Text, useClipboard } from '@chakra-ui/react'
import { toaster } from '@kin-kinetic/web/ui/toaster'
import { IconCopy } from '@tabler/icons'
import { ReactNode } from 'react'

export interface WebUiCopyProps {
  isDisabled?: boolean
  label?: ReactNode
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  text?: string
}

export function WebUiCopy({ isDisabled, label, size = 'sm', text = '' }: WebUiCopyProps) {
  const { onCopy } = useClipboard(text)

  const handleCopy = () => {
    onCopy()
    toaster.create({
      type: 'info',
      description: `Copied ${text.length} characters to clipboard`,
    })
  }

  return (
    <Tooltip content={`Copy ${text.length} characters to clipboard`} placement="top" showArrow>
      <Button p={size} variant="outline" disabled={isDisabled} size={size} onClick={handleCopy}>
        <IconCopy color="gray" size={16} />
        {label && (typeof label === 'string' ? <Text ml={2}>{label}</Text> : label)}
      </Button>
    </Tooltip>
  )
}
