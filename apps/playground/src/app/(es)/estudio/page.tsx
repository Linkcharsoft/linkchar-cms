import AboutScreen, { aboutMetadata } from '@/screens/AboutScreen'

export const generateMetadata = () => aboutMetadata('es')

const AboutPage = () => <AboutScreen locale='es' />

export default AboutPage
