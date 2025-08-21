import { Tree } from '@nx/devkit'
import { Linter } from '@nx/linter'
import { libraryGenerator } from '@nx/react'

export function generateReactLib(
  tree: Tree,
  app: string,
  name: string,
  type: 'data-access' | 'feature' | 'ui' | 'util',
) {
  return libraryGenerator(tree, {
    name: type,
    directory: `${app}/${name}`,
    tags: `scope:${app},type:${type}`,
    skipFormat: true,
    linter: Linter.EsLint,
    skipTsConfig: false,
    style: 'none',
    unitTestRunner: 'jest',
  })
}
