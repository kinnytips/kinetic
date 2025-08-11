const { getJestProjects } = require('@nx/jest')

module.exports = {
  projects: getJestProjects(),
  testTimeout: 20000,
}
