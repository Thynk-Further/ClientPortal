export interface ClientPortalNavItemConfig {
  readonly id: string;
  readonly label: string;
  readonly route: string;
  readonly iconPath: string;
  readonly exact?: boolean;
  readonly showUnreadBadge?: boolean;
}

export const CLIENT_PORTAL_NAV_ITEMS: ReadonlyArray<ClientPortalNavItemConfig> = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    route: '/dashboard',
    exact: true,
    iconPath: 'M3 12h8V3H3v9Zm0 9h8v-7H3v7Zm10 0h8V12h-8v9Zm0-18v7h8V3h-8Z',
  },
  {
    id: 'projects',
    label: 'Projects',
    route: '/projects',
    iconPath: 'M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z',
  },
  {
    id: 'requests',
    label: 'Requests',
    route: '/requests',
    iconPath:
      'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9h6m-6 4h4',
  },
  {
    id: 'rfqs',
    label: 'RFQs',
    route: '/rfqs',
    iconPath: 'M4 4h16v16H4V4Zm4 4h8M8 12h8M8 16h5',
  },
  {
    id: 'invoices',
    label: 'Invoices',
    route: '/invoices',
    iconPath: 'M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm8 1v5h5',
  },
  {
    id: 'documents',
    label: 'Documents',
    route: '/documents',
    iconPath: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 0v6h6',
  },
  {
    id: 'messages',
    label: 'Messages',
    route: '/messages',
    showUnreadBadge: true,
    iconPath: 'M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z',
  },
  {
    id: 'meetings',
    label: 'Meetings',
    route: '/meetings',
    iconPath: 'M8 2v4m8-4v4M3 10h18M5 6h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z',
  },
  {
    id: 'notices',
    label: 'Notices',
    route: '/notices',
    showUnreadBadge: true,
    iconPath: 'M19 8A7 7 0 1 0 5 8c0 7-3 9-3 9h20s-3-2-3-9ZM10.73 21a2 2 0 0 0 3.54 0',
  },
  {
    id: 'profile',
    label: 'Profile',
    route: '/profile',
    iconPath: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2m15-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  },
];
