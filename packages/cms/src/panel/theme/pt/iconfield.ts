import { classNames } from 'primereact/utils'
import type { IconFieldPassThroughMethodOptions, IconFieldPassThroughOptions } from 'primereact/iconfield'

// IconField doesn't hand its iconPosition to InputIcon, so the icon is placed from the container.
const iconfield: IconFieldPassThroughOptions = {
  root: ({ props }: IconFieldPassThroughMethodOptions) => ({
    className: classNames(
      'relative block',
      props.iconPosition === 'left' ? '[&>[data-pc-name=inputicon]]:left-3' : '[&>[data-pc-name=inputicon]]:right-3'
    )
  })
}

export default iconfield
