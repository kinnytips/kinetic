import React from 'react';
import { Box, Tag, TagLabel } from '@chakra-ui/react';
import { Maybe } from 'graphql/jsutils/Maybe';
import { CellProps } from 'react-table';
import { WebUiDataTable, WebUiDataTableLink } from '@kin-kinetic/web/ui/table';
import { AppEnv, Wallet } from '@kin-kinetic/web/util/sdk';

const AppEnvCell = ({ value }: CellProps<Wallet, Maybe<AppEnv[] | undefined>>) => {
  return (
    <Box>
      {!value?.length ? <Tag>None</Tag> : null}
      {value?.map((item) => (
        <Tag key={item.key} size="sm" variant="subtle" colorScheme="primary">
          <TagLabel>{item.key}</TagLabel>
        </Tag>
      ))}
    </Box>
  );
};
export function WebAdminUiWalletTable({ wallets }: { wallets: Wallet[] }) {
  return (
    <WebUiDataTable<Wallet>
      data={wallets}
      columns={[
        {
          accessor: 'type',
          Header: 'Type',
        },
        {
          accessor: 'publicKey',
          Header: 'PublicKey',
          Cell: ({ row, value }: CellProps<Wallet>) => (
            <WebUiDataTableLink to={row.original.id || ''} value={value} />
          ),
        },
        {
          accessor: 'appEnvs',
          Header: 'App Envs',
          Cell: AppEnvCell
        },
      ]}
    />
  );
}
