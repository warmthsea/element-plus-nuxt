import { createUnplugin } from 'unplugin'
import MagicString from 'magic-string'
import { allImportsWithStyle } from '../config'
import {
  camelize,
  genLibraryImport,
  genSideEffectsImport,
  toArray,
  toRegExp
} from '../utils'
import type { PresetImport, TransformOptions } from '../types'

type Style = string | string[]

interface PluginOptions extends TransformOptions {
  sourcemap?: boolean
  transformStyles?: (name: string) => undefined | Style
  transformDirectives?: (name: string) => undefined | [name: string, styles?: Style]
}

const componentsRegExp = /(?<=[ (])_?resolveComponent\(\s*["'](lazy-|Lazy)?([^'"]*?)["'][\s,]*[^)]*\)/g
const directivesRegExp = /(?<=[ (])_?resolveDirective\(\s*["']([^'"]*?)["'][\s,]*[^)]*\)/g
const importsRegExp = toRegExp(allImportsWithStyle, 'g')

export const transformPlugin = createUnplugin((options: PluginOptions) => {
  const { include, exclude, transformStyles, transformDirectives } = options

  return {
    name: 'element-plus:transform',
    enforce: 'post',
    transformInclude (id) {
      if (exclude.some(pattern => id.match(pattern))) {
        return false
      }
      if (include.some(pattern => id.match(pattern))) {
        return true
      }
    },
    transform (code, id) {
      const imports = new Set<string>()
      const directives: PresetImport[] = []
      const s = new MagicString(code)
      let no = 0

      const addStyles = (styles?: Style) => {
        styles && toArray(styles).forEach((item) => {
          imports.add(genSideEffectsImport(item))
        })
      }

      transformStyles && s.replace(componentsRegExp, (full, lazy, name) => {
        addStyles(transformStyles(camelize(name)))
        return full
      })

      transformStyles && s.replace(importsRegExp, (full, name) => {
        addStyles(transformStyles(camelize(name)))
        return full
      })

      transformDirectives && s.replace(directivesRegExp, (full, name) => {
        const directiveConfig = transformDirectives(camelize(name))

        if (directiveConfig) {
          const [directive, styles] = directiveConfig
          const aliasName = `__el_directive_${no}`

          no += 1
          addStyles(styles)
          directives.push([directive, aliasName])
          return aliasName
        }

        return full
      })

      if (directives.length) {
        imports.add(genLibraryImport(directives))
      }

      if (imports.size) {
        s.prepend([...imports, ''].join('\n'))
      }

      if (s.hasChanged()) {
        return {
          code: s.toString(),
          map: options.sourcemap
            ? s.generateMap({ source: id, includeContent: true })
            : undefined
        }
      }
    }
  }
})
