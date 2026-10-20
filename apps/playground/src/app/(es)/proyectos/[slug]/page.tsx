import ProjectScreen, { projectMetadata, projectParams } from '@/screens/ProjectScreen'
import type { SlugParamsType } from '@/screens/PostScreen'

export const generateStaticParams = () => projectParams('es')

export const generateMetadata = ({ params }: SlugParamsType) => projectMetadata('es', params)

const ProjectPage = ({ params }: SlugParamsType) => <ProjectScreen locale='es' params={params} />

export default ProjectPage
