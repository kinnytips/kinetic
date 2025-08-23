import { JestExecutorOptions } from '@nx/jest/src/executors/jest/schema'

export interface BuildExecutorSchema extends JestExecutorOptions {
  devServerTarget: string
}
