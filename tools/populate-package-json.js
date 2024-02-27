const { createProjectGraphAsync, readCachedProjectGraph, detectPackageManager } = require('@nx/devkit')
const { createLockFile, createPackageJson, getLockFileName } = require('@nx/js')
const { writeFileSync, mkdirSync, readFileSync } = require('fs')
const { join } = require('path')

async function main() {
  const pm = detectPackageManager()
  let projectGraph = readCachedProjectGraph()
  if (!projectGraph) {
    projectGraph = await createProjectGraphAsync()
  }

  const projectName = process.env.NX_TASK_TARGET_PROJECT // Set this to your project name
  if (!projectGraph.nodes[projectName]) {
    console.error(`Project '${projectName}' not found in the Nx project graph.`)
    return
  }

  const projectRoot = projectGraph.nodes[projectName].data.root
  const existingPackageJsonPath = join(projectRoot, 'package.json')
  const existingPackageJson = JSON.parse(readFileSync(existingPackageJsonPath, 'utf8'))

  const outputDir = join('dist/libs', projectName)
  mkdirSync(outputDir, { recursive: true })

  const generatedPackageJson = createPackageJson(projectName, projectGraph, {
    isProduction: true,
    root: projectRoot,
  })

  // Merge settings, but keep certain fields from the existing package.json
  const finalPackageJson = {
    ...generatedPackageJson,
    ...existingPackageJson, // This ensures 'name', 'version', etc., are preserved
    dependencies: { ...generatedPackageJson.dependencies, ...existingPackageJson.dependencies },
  }

  const lockFile = createLockFile(finalPackageJson, projectGraph, pm)
  const lockFileName = getLockFileName(pm)

  writeFileSync(join(outputDir, 'package.json'), JSON.stringify(finalPackageJson, null, 2))
  writeFileSync(join(outputDir, lockFileName), JSON.stringify(lockFile, null, 2), {
    encoding: 'utf8',
  })
}

main()
