import { formatFiles, installPackagesTask, Tree } from '@nx/devkit'
import { ReactFeatureSchema, generateReactFeature } from '../lib'

export default async function (tree: Tree, schema: ReactFeatureSchema) {
  await generateReactFeature(tree, schema)
  await formatFiles(tree)

  return () => {
    installPackagesTask(tree)
  }
}
