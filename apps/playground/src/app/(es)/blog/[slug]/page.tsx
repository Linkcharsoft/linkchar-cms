import PostScreen, { postMetadata, postParams } from '@/screens/PostScreen'
import type { SlugParamsType } from '@/screens/PostScreen'

export const generateStaticParams = () => postParams('es')

export const generateMetadata = ({ params }: SlugParamsType) => postMetadata('es', params)

const PostPage = ({ params }: SlugParamsType) => <PostScreen locale='es' params={params} />

export default PostPage
