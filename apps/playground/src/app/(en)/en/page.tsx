import HomeScreen, { homeMetadata } from '@/screens/HomeScreen'

export const generateMetadata = () => homeMetadata('en')

const HomePage = () => <HomeScreen locale='en' />

export default HomePage
