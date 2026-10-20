import AboutScreen, { aboutMetadata } from '@/screens/AboutScreen'

export const generateMetadata = () => aboutMetadata('en')

const AboutPage = () => <AboutScreen locale='en' />

export default AboutPage
