#!/usr/bin/env node
import { runResolve } from './lib/npm-publish-version.mjs'

const code = await runResolve()
process.exit(code)
