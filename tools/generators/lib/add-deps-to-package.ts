// pre-build.js
const { createProjectGraphAsync } = require('@nrwl/workspace/src/core/project-graph')
const fs = require('fs')
const path = require('path')

async function main() {
  const projectGraph = await createProjectGraphAsync()
  const libraryName = 'your-library-name' // Replace with your library name
  const libraryRoot = projectGraph.nodes[libraryName].data.root
  const packageJsonPath = path.join(libraryRoot, 'package.json')

  // Backup the original package.json
  fs.copyFileSync(packageJsonPath, `${packageJsonPath}.bak`)

  const libraryDependencies = Object.keys(projectGraph.dependencies[libraryName] || {})
    .filter((depName) => projectGraph.nodes[depName].type === 'npm')
    .reduce((acc, depName) => {
      const packageName = depName.replace('npm:', '')
      acc[packageName] = 'latest' // Replace 'latest' with your version resolution logic
      return acc
    }, {})

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  packageJson.dependencies = { ...packageJson.dependencies, ...libraryDependencies }
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))

  console.log('package.json has been updated')
}

main()
