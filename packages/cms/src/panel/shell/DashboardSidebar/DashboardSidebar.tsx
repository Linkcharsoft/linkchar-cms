'use client'
import './DashboardSidebar.sass'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { classNames } from 'primereact/utils'
import { useState } from 'react'
import { usePaths, useT } from '../../client/context'
import BrandMark from '../BrandMark/BrandMark'
import ProductIcon from '../ProductIcon/ProductIcon'
import type { NavGroupType, NavItemType } from '../navigation'
import type { Route } from 'next'

const isUnder = (pathname: string, href: string, home: string) =>
  href === home ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)

const isActive = (pathname: string, item: NavItemType, home: string) =>
  !item.external && (isUnder(pathname, item.href, home) || !!item.matches?.some(href => isUnder(pathname, href, home)))

interface Props {
  groups: NavGroupType[]
  brand: { name: string, icon?: string, footer?: string }
}

const DashboardSidebar = ({ groups, brand }: Props) => {
  const { t } = useT()
  const paths = usePaths()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <aside className={classNames('DashboardSidebar', { 'DashboardSidebar--Open': isOpen })}>
      <div className='DashboardSidebar__Top'>
        <Link href={paths.home as Route} className='DashboardSidebar__Product'>
          <ProductIcon name={brand.name} icon={brand.icon} />
          <span className='DashboardSidebar__ProductName'>{brand.name}</span>
        </Link>

        <button
          type='button'
          className='DashboardSidebar__Toggle'
          aria-label={isOpen ? t('shell.closeMenu') : t('shell.openMenu')}
          aria-expanded={isOpen}
          aria-controls='cms-panel-nav'
          onClick={() => setIsOpen(open => !open)}
        >
          <i className={classNames('pi', isOpen ? 'pi-times' : 'pi-bars')} aria-hidden='true' />
        </button>
      </div>

      <div id='cms-panel-nav' className='DashboardSidebar__Drawer'>
        <nav data-tour='nav' aria-label={t('shell.sections')} className='DashboardSidebar__Nav'>
          {groups.map((group, index) => (
            <div key={group.label ?? `group-${index}`} className='DashboardSidebar__Group'>
              {group.label && <p className='DashboardSidebar__GroupLabel'>{group.label}</p>}
              <ul className='DashboardSidebar__List'>
                {group.items.map(item => {
                  const active = isActive(pathname, item, paths.home)
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href as Route}
                        aria-current={active ? 'page' : undefined}
                        className={classNames('DashboardSidebar__Item', { 'DashboardSidebar__Item--Active': active })}
                        target={item.external ? '_blank' : undefined}
                        rel={item.external ? 'noopener noreferrer' : undefined}
                        onClick={() => setIsOpen(false)}
                      >
                        <i className={classNames('pi', item.icon)} aria-hidden='true' />
                        {item.label}
                        {item.external && <i className='pi pi-external-link DashboardSidebar__External' aria-hidden='true' />}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className='DashboardSidebar__Footer'>
          {brand.footer && <p className='DashboardSidebar__FooterText'>{brand.footer}</p>}
          <BrandMark tag={t('shell.brandTag')} />
        </div>
      </div>
    </aside>
  )
}

export default DashboardSidebar
