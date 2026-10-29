import {
  block,
  blocks,
  boolean,
  button,
  collection,
  color,
  date,
  datetime,
  defineSchema,
  email,
  file, videoFile,
  gallery,
  image,
  list,
  multiSelect,
  note,
  number,
  page,
  panel,
  phone,
  relation,
  relations,
  richText,
  row,
  section,
  select,
  seo,
  singleton,
  slug,
  tab,
  text,
  textarea,
  url,
  video
} from '@linkcharsoft/cms/core'
import { openingHours } from '@linkcharsoft/cms/core/opening-hours'
import { rating } from './fields/rating'

// Mosaic sketches the panel draws as cards: 1-based grid cells, like CSS grid lines.
const GALLERY_LAYOUTS = [
  { label: { es: 'Mosaico', en: 'Mosaic' }, value: 'mosaic', preview: { grid: { columns: 3, rows: 2, cells: [{ column: 1, row: 1, columnSpan: 2, rowSpan: 2 }, { column: 3, row: 1 }, { column: 3, row: 2 }] } } },
  { label: { es: 'Grilla', en: 'Grid' }, value: 'grid', preview: { grid: { columns: 3, rows: 2, cells: [{ column: 1, row: 1 }, { column: 2, row: 1 }, { column: 3, row: 1 }, { column: 1, row: 2 }, { column: 2, row: 2 }, { column: 3, row: 2 }] } } },
  { label: { es: 'Una por fila', en: 'One per row' }, value: 'stack', preview: { grid: { columns: 1, rows: 2, cells: [{ column: 1, row: 1 }, { column: 1, row: 2 }] } } }
] as const

const BUTTON_VARIANTS = [
  { label: 'Principal', value: 'primary' },
  { label: 'Secundario', value: 'secondary' }
] as const

// A small architecture studio: site pages, projects, blog, team and FAQ. Different on purpose from Hologramas.
export const schema = defineSchema({
  settings: singleton({ es: 'Datos del sitio', en: 'Site settings' }, {
    general: tab('General', {
      siteName: text({ label: 'Nombre del sitio', required: true, localized: false, default: 'Estudio Norte' }),
      tagline: textarea({ label: 'Bajada', rows: 2, default: { es: 'Arquitectura e interiores', en: 'Architecture and interiors' } }),
      logo: image({ label: 'Logo', folder: 'sitio' }),
      brandColor: color({ label: 'Color de marca', default: '#1f5fa8', presets: ['#1f5fa8', '#0e0e13', '#6e14be', '#d92d20'] })
    }),
    contact: tab('Contacto', {
      info: note('Se muestran en el pie y en la página de contacto.'),
      channels: row({
        email: email({ label: 'Email', required: true }),
        phone: phone({ label: 'Teléfono' })
      }),
      address: textarea({ label: 'Dirección', rows: 2, localized: false }),
      map: url({ label: 'Link a Google Maps' }),
      hours: openingHours({ label: 'Horarios de atención' })
    }),
    social: tab('Redes', {
      networks: list({ label: 'Redes sociales', max: 6, itemLabel: 'network' }, {
        network: select({ label: 'Red', options: [{ label: 'Instagram', value: 'instagram' }, { label: 'LinkedIn', value: 'linkedin' }, { label: 'Behance', value: 'behance' }] }),
        link: url({ label: 'Link', required: true })
      })
    })
  }, { anchor: 'pie', icon: 'pi-cog' }),

  home: page({ es: 'Inicio', en: 'Home' }, {
    hero: section('Portada', {
      eyebrow: text({ label: 'Antetítulo', maxLength: 40 }),
      title: text({ label: 'Título', required: true, maxLength: 80, default: { es: 'Arquitectura que se habita', en: 'Architecture to live in' } }),
      intro: textarea({ label: 'Introducción', rows: 3, maxLength: 280 }),
      cover: image({ label: 'Imagen de portada', required: true, focalPoint: true, folder: 'sitio' }),
      showreel: video({ label: 'Video del estudio', help: 'Link de YouTube o Vimeo.' }),
      cta: button({ label: 'Botón', variants: BUTTON_VARIANTS })
    }, { anchor: 'inicio', icon: 'pi-home' }),
    services: section('Servicios', {
      title: text({ label: 'Título', default: { es: 'Qué hacemos', en: 'What we do' } }),
      items: list({ label: 'Servicios', min: 1, max: 6, itemLabel: 'name', singularLabel: { es: 'servicio', en: 'service' }, default: [{ name: { es: 'Arquitectura', en: 'Architecture' } }, { name: { es: 'Interiores', en: 'Interiors' } }] }, {
        name: text({ label: 'Nombre', required: true }),
        description: textarea({ label: 'Descripción', rows: 3 }),
        icon: select({ label: 'Ícono', options: [{ label: 'Casa', value: 'pi-home' }, { label: 'Edificio', value: 'pi-building' }, { label: 'Lápiz', value: 'pi-pencil' }] }),
        image: image({ label: 'Imagen', folder: 'sitio' })
      })
    }, { anchor: 'servicios', icon: 'pi-th-large' }),
    projects: section('Proyectos destacados', {
      title: text({ label: 'Título', default: { es: 'Proyectos', en: 'Projects' } }),
      featured: relations({ label: 'Proyectos', to: 'projects', help: 'En el orden en que se muestran.' })
    }, { anchor: 'proyectos', uses: ['projects'], hideable: true }),
    extra: blocks({ label: 'Bloques al final', max: 8 }, {
      texto: block('Texto', { body: richText({ label: 'Texto', headings: [2, 3] }) }, { icon: 'pi-align-left' }),
      galeria: block('Galería', {
        layout: select({ label: { es: 'Disposición', en: 'Layout' }, display: 'cards', options: GALLERY_LAYOUTS, default: 'grid' }),
        images: gallery({ label: 'Imágenes', max: 12, folder: 'proyectos' })
      }, { icon: 'pi-images' }),
      cita: block('Cita', { quote: textarea({ label: 'Cita', required: true }), author: text({ label: 'Autor' }) }, { icon: 'pi-comment' })
    })
  }, {
    path: '/',
    seo: { title: { es: 'Estudio Norte · Arquitectura', en: 'Estudio Norte · Architecture' } },
    sitemap: { priority: 1, changeFrequency: 'weekly' }
  }),

  about: page('Estudio', {
    story: section('Historia', {
      title: text({ label: 'Título', required: true }),
      body: richText({ label: 'Texto', headings: [2, 3] }),
      founded: number({ label: 'Año de fundación', min: 1900, max: 2100, localized: false })
    }, { anchor: 'historia' }),
    team: section('Equipo', {
      title: text({ label: 'Título' }),
      intro: textarea({ label: 'Introducción' })
    }, { anchor: 'equipo', uses: ['team'], hideable: true })
  }, { path: { es: '/estudio', en: '/studio' }, sitemap: { priority: 0.6, changeFrequency: 'monthly' } }),

  notFound: page('Página no encontrada', {
    content: section('Contenido', {
      title: text({ label: 'Título', default: { es: 'No encontramos esta página', en: 'We could not find this page' } }),
      back: button({ label: 'Botón para volver', variants: BUTTON_VARIANTS })
    })
  }),

  projects: collection('Proyectos', {
    main: tab('Proyecto', {
      title: text({ label: 'Nombre', required: true, maxLength: 90 }),
      slug: slug({ label: 'Dirección', from: 'title', required: true }),
      facts: panel('Ficha', {
        dates: row({
          year: number({ label: 'Año', min: 1990, max: 2100 }),
          area: number({ label: 'Superficie (m²)', min: 0, step: 1 })
        }),
        client: text({ label: 'Cliente', localized: false }),
        satisfaction: rating({ label: { es: 'Satisfacción del cliente', en: 'Client satisfaction' }, stars: 5 }),
        location: text({ label: 'Ubicación' }),
        category: relation({ label: 'Categoría', to: 'categories' })
      }),
      summary: textarea({ label: 'Resumen', rows: 3, maxLength: 200 }),
      cover: image({ label: 'Foto principal', required: true, focalPoint: true, folder: 'proyectos' }),
      photos: gallery({ label: 'Fotos', max: 24, folder: 'proyectos' }),
      body: richText({ label: 'Descripción', headings: [2, 3] }),
      brochure: file({ label: 'Ficha en PDF', folder: 'proyectos' }),
      video: videoFile({ label: 'Video', help: 'MP4 o WebM hasta 25 MB, con portada.', folder: 'proyectos' }),
      featured: boolean({ label: 'Destacado' })
    }),
    seo: seo({ titleFrom: 'title', descriptionFrom: 'summary' })
  }, { singularLabel: 'Proyecto', titleField: 'title', slugField: 'slug', path: { es: '/proyectos/:slug', en: '/projects/:slug' }, icon: 'pi-building' }),

  posts: collection('Blog', {
    title: text({ label: 'Título', required: true, maxLength: 120 }),
    slug: slug({ label: 'Dirección', from: 'title', required: true }),
    publishedAt: datetime({ label: 'Fecha de publicación' }),
    excerpt: textarea({ label: 'Resumen', rows: 3, maxLength: 220 }),
    lead: richText({ label: 'Bajada', inline: true, marks: ['bold', 'link'] }),
    cover: image({ label: 'Imagen', folder: 'blog' }),
    body: richText({ label: 'Texto', required: true, headings: [2, 3, 4] }),
    author: relation({ label: 'Autor', to: 'team' }),
    category: relation({ label: 'Categoría', to: 'categories' }),
    topics: multiSelect({ label: 'Temas', max: 3, options: [{ label: 'Obra', value: 'obra' }, { label: 'Materiales', value: 'materiales' }, { label: 'Estudio', value: 'estudio' }] }),
    seo: seo({ titleFrom: 'title', descriptionFrom: 'excerpt' })
  }, {
    singularLabel: { es: 'Artículo', en: 'Post' },
    tabLabel: 'Artículos',
    titleField: 'title',
    slugField: 'slug',
    path: '/blog/:slug',
    icon: 'pi-book'
  }),

  categories: collection('Categorías', {
    name: text({ label: 'Nombre', required: true }),
    slug: slug({ label: 'Dirección', from: 'name' }),
    accent: color({ label: 'Color' })
  }, { singularLabel: 'Categoría', newLabel: 'Nueva categoría', titleField: 'name', slugField: 'slug', under: 'posts', referenceOnly: true }),

  team: collection('Equipo', {
    name: text({ label: 'Nombre', required: true, localized: false }),
    role: text({ label: 'Rol' }),
    photo: image({ label: 'Foto', folder: 'equipo' }),
    bio: textarea({ label: 'Bio', rows: 4 }),
    contact: row({
      email: email({ label: 'Email' }),
      linkedin: url({ label: 'LinkedIn' })
    }),
    since: date({ label: 'En el estudio desde' })
  }, { singularLabel: 'Integrante', titleField: 'name', orderable: true, referenceOnly: true, icon: 'pi-users' }),

  faq: collection('Preguntas frecuentes', {
    question: text({ label: 'Pregunta', required: true }),
    answer: richText({ label: 'Respuesta', required: true }),
    topic: select({ label: 'Tema', options: [{ label: 'Presupuestos', value: 'budget' }, { label: 'Obra', value: 'works' }, { label: 'Plazos', value: 'timing' }] })
  }, { singularLabel: 'Pregunta', newLabel: 'Nueva pregunta', titleField: 'question', orderable: true, icon: 'pi-question-circle' })
})
