import autocomplete from './autocomplete'
import button from './button'
import calendar from './calendar'
import checkbox from './checkbox'
import confirmdialog from './confirmdialog'
import datatable from './datatable'
import dialog from './dialog'
import dropdown from './dropdown'
import iconfield from './iconfield'
import inputicon from './inputicon'
import inputmask from './inputmask'
import inputnumber from './inputnumber'
import inputswitch from './inputswitch'
import inputtext from './inputtext'
import inputtextarea from './inputtextarea'
import menu from './menu'
import multiselect from './multiselect'
import paginator from './paginator'
import panel from './panel'
import password from './password'
import progressbar from './progressbar'
import selectbutton from './selectbutton'
import sidebar from './sidebar'
import tabpanel from './tabpanel'
import tabview from './tabview'
import tag from './tag'
import toast from './toast'
import tooltip from './tooltip'
import type { PrimeReactPTOptions } from 'primereact/api'

// IconField and InputIcon are read by key at runtime but missing from PrimeReactPTOptions.
const UNTYPED_SECTIONS = { iconfield, inputicon } as PrimeReactPTOptions

// Unstyled mode: only components listed here get styles. Add a section (start from the Tailwind preset) before using a new one.
const PRIME_PT: PrimeReactPTOptions = {
  ...UNTYPED_SECTIONS,
  autocomplete,
  button,
  calendar,
  checkbox,
  confirmdialog,
  datatable,
  dialog,
  dropdown,
  inputmask,
  inputnumber,
  inputswitch,
  inputtext,
  inputtextarea,
  menu,
  multiselect,
  panel,
  paginator,
  password,
  progressbar,
  selectbutton,
  sidebar,
  tabpanel,
  tabview,
  tag,
  toast,
  tooltip
}

export default PRIME_PT
