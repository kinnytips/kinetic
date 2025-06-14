import { Table } from '@chakra-ui/react'
import { useColorModeValue } from '@chakra-ui/system'
import { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

export interface WebUiTableColumn<T> {
  key: keyof T
  isNumeric?: boolean
  label: string
  render?: (tx: T) => ReactNode
  width?: string
}

export function tableColumn<T>(
  key: keyof T,
  label: string,
  options: Omit<WebUiTableColumn<T>, 'key' | 'label'> = {},
): WebUiTableColumn<T> {
  return {
    key,
    label,
    ...options,
  }
}

export function WebUiTable<T extends { id?: string | null | undefined; [key: string]: unknown }>({
  data,
  columns,
}: {
  data: T[]
  columns: WebUiTableColumn<T>[]
}) {
  const navigate = useNavigate()
  const rowBgColor = useColorModeValue('primary.100', 'whiteAlpha.100')

  return (
    <Table.Root size="sm">
      <Table.Header>
        <WebUiTableHeader<T> columns={columns} />
      </Table.Header>

      <Table.Body>
        {data.map((item: T) => (
          <Table.Row
            onClick={() => navigate(item.id || '')}
            key={item.id}
            _hover={{
              bg: rowBgColor,
              cursor: 'pointer',
            }}
          >
            {columns.map((field) => (
              <Table.Cell key={field.key as string} w={field.width} p={2}>
                {field.render ? field.render(item) : (item[field.key as string] as ReactNode)}
              </Table.Cell>
            ))}
          </Table.Row>
        ))}
      </Table.Body>

      <Table.Footer>
        <WebUiTableHeader<T> columns={columns} />
      </Table.Footer>
    </Table.Root>
  )
}

function WebUiTableHeader<T>({ columns }: { columns: WebUiTableColumn<T>[] }) {
  return (
    <Table.Row>
      {columns?.map((field) => (
        <Table.ColumnHeader key={field.label} textAlign={field.isNumeric ? 'end' : 'start'} p={2}>
          {field.label}
        </Table.ColumnHeader>
      ))}
    </Table.Row>
  )
}
