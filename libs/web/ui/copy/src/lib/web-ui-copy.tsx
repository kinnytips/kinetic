import { Button, Text, Tooltip, useClipboard, useToast } from '@chakra-ui/react'
import { IconCopy } from '@tabler/icons'
import { ReactNode } from 'react'

export interface WebUiCopyProps {
  disabled?: boolean
  label?: ReactNode
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  text?: string
}

export function WebUiCopy({ disabled, label, size = 'sm', text = '' }: WebUiCopyProps) {
  const { onCopy } = useClipboard(text)
  const toast = useToast()

  const handleCopy = () => {
    onCopy()
    toast({
      status: 'info',
      title: `Copied ${text.length} characters to clipboard`,
      duration: 2000,
      isClosable: true,
    })
  }

  return (
    <Tooltip label={`Copy ${text.length} characters to clipboard`} placement="top">
      <Button p={size} variant="outline" disabled={disabled} size={size} onClick={handleCopy}>
        <IconCopy color="gray" size={16} />
        {label ? (typeof label === 'string' ? <Text ml={2}>{label}</Text> : label) : null}
      </Button>
    </Tooltip>
  )
}
