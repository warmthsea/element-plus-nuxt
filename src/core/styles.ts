import {
  allComponents,
  allImportsWithStyle,
  allNoStylesComponents,
  libraryName
} from '../config'
import { hyphenate } from '../utils'
import type { ElementPlusModuleOptions } from '../types'

export function getStyleDir (config: ElementPlusModuleOptions, name: string) {
  const dir = hyphenate(name.slice(2))
  const type = config.importStyle === 'sass' ? 'index' : 'css'

  return `${libraryName}/es/components/${dir}/style/${type}`
}

export function resolveStyles (config: ElementPlusModuleOptions, name: string) {
  const components = new Set([
    ...allComponents,
    ...allImportsWithStyle
  ])
  const noStylesComponents = new Set([
    ...allNoStylesComponents,
    ...config.noStylesComponents || []
  ])

  if (
    !components.has(name) ||
    noStylesComponents.has(name)
  ) {
    return undefined
  }

  return /^El[A-Z]/.test(name) ? getStyleDir(config, name) : undefined
}
