import Link from './Link'
import siteMetadata from '@/data/siteMetadata'
import SocialIcon from '@/components/social-icons'

export default function Footer() {
  return (
    <footer className="mt-8 flex flex-col items-center">
      <div className="mb-3 flex space-x-4">
        <SocialIcon kind="mail" href={`mailto:${siteMetadata.email}`} size="6" />
        <SocialIcon kind="github" href={siteMetadata.github} size="6" />
        <SocialIcon kind="linkedin" href={siteMetadata.linkedin} size="6" />
      </div>
    </footer>
  )
}
