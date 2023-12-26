import type { Config } from "@jest/types"

const config: Config.InitialOptions = {
  preset: "ts-jest",
  testEnvironment: "node",
  verbose: true,
  //automock: true,
	//testPathIgnorePatterns: ["<rootDir>/dist/", "<rootDir>/node_modules/"],
}
export default config
