interface Props {
  data: Record<string, unknown>
}

// "<" is escaped so a text that contains "</script>" can't close the tag.
const JsonLd = ({ data }: Props) => (
  <script type='application/ld+json' dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
)

export default JsonLd
