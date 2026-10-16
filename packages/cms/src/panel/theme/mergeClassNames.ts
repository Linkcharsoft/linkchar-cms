import { extendTailwindMerge } from 'tailwind-merge'

const TYPOGRAPHY_TOKEN = /^(extrabold|bold|semibold|medium|regular|light)-\d+$/

// The preset's `cms-text-{weight}-{size}` set size and weight together: a later one replaces an earlier one.
const mergeClassNames = extendTailwindMerge<'cms-typography'>({
  extend: {
    classGroups: {
      'cms-typography': [{ 'cms-text': [(value: string) => TYPOGRAPHY_TOKEN.test(value)] }]
    },
    conflictingClassGroups: {
      'cms-typography': ['font-size', 'font-weight']
    }
  }
})

export default mergeClassNames
