import { useEffect, useId, useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

export type TaskShellBreadcrumb = {
  label: string
  to?: string
}

export type TaskShellNavItem = {
  key: string
  label: string
  to?: string
  onClick?: () => void
  meta?: string
  leading?: ReactNode
  current?: boolean
  disabled?: boolean
  end?: boolean
}

type TaskLayoutShellProps = {
  sidebar?: {
    label: string
    meta?: string
    ariaLabel: string
    items: TaskShellNavItem[]
  }
  breadcrumbs?: TaskShellBreadcrumb[]
  title: string
  description?: string
  showTopBar?: boolean
  headerContent?: ReactNode
  pageClassName?: string
  contentClassName?: string
  children: ReactNode
}

export function TaskLayoutShell({
  sidebar,
  breadcrumbs,
  title,
  description,
  showTopBar,
  headerContent,
  pageClassName,
  contentClassName,
  children,
}: TaskLayoutShellProps) {
  const navId = useId()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const hasSidebar = Boolean(sidebar)
  const hasBreadcrumbs = Boolean(breadcrumbs && breadcrumbs.length > 0)
  const shouldShowTopBar = showTopBar ?? hasBreadcrumbs

  useEffect(() => {
    if (!hasSidebar) {
      return
    }

    const mediaQuery = window.matchMedia('(max-width: 960px)')

    const syncSidebarState = (isCompact: boolean) => {
      setIsSidebarOpen(!isCompact)
    }

    syncSidebarState(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => {
      syncSidebarState(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [hasSidebar])

  function collapseSidebarOnCompactViewport() {
    if (!hasSidebar) {
      return
    }

    if (window.matchMedia('(max-width: 960px)').matches) {
      setIsSidebarOpen(false)
    }
  }

  function renderNavItem(item: TaskShellNavItem) {
    const baseClassName = [
      'task-layout__nav-item',
      item.meta ? 'task-layout__nav-item--detailed' : '',
      item.current ? 'task-layout__nav-item--current' : '',
    ].filter(Boolean).join(' ')

    const content = (
      <>
        {item.leading ? <span className="task-layout__nav-leading">{item.leading}</span> : null}
        <span className="task-layout__nav-copy">
          <span className="task-layout__nav-label">{item.label}</span>
        </span>
      </>
    )

    if (item.to) {
      return (
        <NavLink
          key={item.key}
          to={item.to}
          end={item.end}
          className={({ isActive }) => {
            const classNames = [baseClassName]

            if (isActive) {
              classNames.push('task-layout__nav-item--active')
            }

            return classNames.join(' ')
          }}
          onClick={collapseSidebarOnCompactViewport}
        >
          {content}
        </NavLink>
      )
    }

    return (
      <button
        key={item.key}
        type="button"
        className={baseClassName}
        onClick={() => {
          if (!item.disabled) {
            item.onClick?.()
            collapseSidebarOnCompactViewport()
          }
        }}
        disabled={item.disabled}
        aria-current={item.current ? 'page' : undefined}
      >
        {content}
      </button>
    )
  }

  return (
    <section className={[ 'task-layout-page', pageClassName ?? '' ].filter(Boolean).join(' ')}>
      <div className={[
        'task-layout',
        hasSidebar ? '' : 'task-layout--no-sidebar',
        hasSidebar && !isSidebarOpen ? 'task-layout--sidebar-collapsed' : '',
      ].filter(Boolean).join(' ')}>
        {hasSidebar ? (
          <aside className="task-layout__sidebar" aria-label={sidebar!.ariaLabel}>
            <div className="task-layout__sidebar-title-block">
              <h1>{sidebar!.label}</h1>
              {sidebar!.meta ? <p>{sidebar!.meta}</p> : null}
            </div>

            <nav id={navId} className="task-layout__nav">
              {sidebar!.items.map((item) => renderNavItem(item))}
            </nav>
          </aside>
        ) : null}

        <div className="task-layout__main">
          {shouldShowTopBar ? (
            <header className="task-layout__topbar">
              <div className="task-layout__topbar-leading">
                {hasSidebar ? (
                  <button
                    type="button"
                    className="task-layout__menu-button"
                    onClick={() => {
                      setIsSidebarOpen((currentValue) => !currentValue)
                    }}
                    aria-expanded={isSidebarOpen}
                    aria-controls={navId}
                  >
                    Menu
                  </button>
                ) : null}

                {hasBreadcrumbs ? (
                  <nav className="task-layout__breadcrumbs" aria-label="Breadcrumb">
                    {breadcrumbs?.map((breadcrumb, index) => (
                      <span key={`${breadcrumb.label}-${index}`} className="task-layout__breadcrumb-item">
                        {index > 0 ? <span className="task-layout__breadcrumb-separator">/</span> : null}
                        {breadcrumb.to ? (
                          <NavLink className="task-layout__breadcrumb-link" to={breadcrumb.to}>
                            {breadcrumb.label}
                          </NavLink>
                        ) : (
                          <span className="task-layout__breadcrumb-current">{breadcrumb.label}</span>
                        )}
                      </span>
                    ))}
                  </nav>
                ) : null}
              </div>
            </header>
          ) : null}

          <div className="task-layout__surface">
            <div className="task-layout__header">
              <div className="task-layout__title-block">
                <h2>{title}</h2>
                {description ? <p>{description}</p> : null}
              </div>
              {headerContent}
            </div>

            <div className={[ 'task-layout__content', contentClassName ?? '' ].filter(Boolean).join(' ')}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}