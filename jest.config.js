// eslint-disable-next-line no-undef
module.exports = {
  collectCoverage: true,
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testRegex: 'test',
  moduleFileExtensions: ['ts', 'js'],
  testPathIgnorePatterns: [],
}
