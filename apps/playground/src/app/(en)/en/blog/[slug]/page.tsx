import PostScreen, { postMetadata, postParams } from '@/screens/PostScreen'
import type { SlugParamsType } from '@/screens/PostScreen'

export const generateStaticParams = () => postParams('en')

export const generateMetadata = ({ params }: SlugParamsType) => postMetadata('en', params)

const PostPage = ({ params }: SlugParamsType) => <PostScreen locale='en' params={params} />

export default PostPage
