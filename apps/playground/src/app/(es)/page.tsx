import HomeScreen, { homeMetadata } from '@/screens/HomeScreen'

export const generateMetadata = () => homeMetadata('es')

const HomePage = () => <HomeScreen locale='es' />

export default HomePage
