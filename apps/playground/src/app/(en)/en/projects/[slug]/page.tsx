import ProjectScreen, { projectMetadata, projectParams } from '@/screens/ProjectScreen'
import type { SlugParamsType } from '@/screens/PostScreen'

export const generateStaticParams = () => projectParams('en')

export const generateMetadata = ({ params }: SlugParamsType) => projectMetadata('en', params)

const ProjectPage = ({ params }: SlugParamsType) => <ProjectScreen locale='en' params={params} />

export default ProjectPage
