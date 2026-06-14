export interface BusinessPortalNavItem {
  readonly id: string;
  readonly label: string;
  readonly iconPath: string;
  readonly route: string;
  readonly exact?: boolean;
  readonly badgeCount?: number;
}

export interface BusinessPortalNavSection {
  readonly id: string;
  readonly label: string;
  readonly breadcrumbLabel: string;
  readonly pathPrefix: string;
  readonly items: ReadonlyArray<BusinessPortalNavItem>;
}

export const BUSINESS_PORTAL_NAV_SECTIONS: ReadonlyArray<BusinessPortalNavSection> = [
  {
    id: 'overview',
    label: 'Overview',
    breadcrumbLabel: 'Overview',
    pathPrefix: 'dashboard',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        route: '/dashboard',
        exact: true,
        iconPath: 'M3 12h8V3H3v9Zm0 9h8v-7H3v7Zm10 0h8V12h-8v9Zm0-18v7h8V3h-8Z',
      },
      {
        id: 'dashboard-analytics',
        label: 'Analytics',
        route: '/dashboard',
        exact: true,
        iconPath: 'M5 20V10m7 10V4m7 16v-7',
      },
    ],
  },
  {
    id: 'clients',
    label: 'Client Management',
    breadcrumbLabel: 'Clients',
    pathPrefix: 'clients',
    items: [
      {
        id: 'client-invite-onboard',
        label: 'Invite & Onboard',
        route: '/clients/invite-onboarding',
        iconPath:
          'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2m15-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm5 8-3-3m0 0-3 3m3-3v6',
      },
      {
        id: 'client-list',
        label: 'Client List',
        route: '/clients',
        exact: true,
        iconPath:
          'M17 21v-2a4 4 0 0 0-3-3.87M9 21v-2a4 4 0 0 0-4-4H3m16-4a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM9 11A4 4 0 1 0 9 3a4 4 0 0 0 0 8Z',
      },
    ],
  },
  {
    id: 'projects',
    label: 'Project Management',
    breadcrumbLabel: 'Projects',
    pathPrefix: 'projects',
    items: [
      {
        id: 'project-list-detail',
        label: 'Projects',
        route: '/projects',
        iconPath: 'M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z',
      },
      {
        id: 'project-analytics',
        label: 'Project Analytics',
        route: '/projects/analytics',
        iconPath: 'M5 20V10m7 10V4m7 16v-7',
      },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    breadcrumbLabel: 'Finance',
    pathPrefix: 'finance',
    items: [
      {
        id: 'rfq-list',
        label: 'Client RFQs',
        route: '/finance/rfqs',
        iconPath: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2',
      },
      {
        id: 'quote-builder',
        label: 'Quotes',
        route: '/finance/quotes',
        iconPath: 'M4 4h16v16H4V4Zm4 4h8M8 12h8M8 16h5',
      },
      {
        id: 'purchase-orders',
        label: 'Purchase Orders',
        route: '/finance/purchase-orders',
        iconPath: 'M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm3 6h6M9 12h6',
      },
      {
        id: 'invoice-list-detail',
        label: 'Invoices',
        route: '/finance',
        iconPath: 'M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm8 1v5h5',
      },
      {
        id: 'financial-summary',
        label: 'Financial Summary',
        route: '/finance/summary',
        iconPath: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm0 3h18',
      },
    ],
  },
  // {
  //   id: 'documents',
  //   label: 'Documents & Contracts',
  //   breadcrumbLabel: 'Documents',
  //   pathPrefix: 'documents',
  //   items: [
  //     {
  //       id: 'document-library',
  //       label: 'Document Library',
  //       route: '/documents',
  //       iconPath: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 0v6h6',
  //     },
  //     {
  //       id: 'contracts-signing',
  //       label: 'Contracts & E-Sign',
  //       route: '/documents',
  //       iconPath:
  //         'M8 2h8m-9 4h10M7 10h10M7 14h10M7 18h6M5 2h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z',
  //     },
  //     {
  //       id: 'contract-expiry',
  //       label: 'Expiry Tracking',
  //       route: '/documents',
  //       iconPath:
  //         'M8 2v4m8-4v4M3 10h18M5 5h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
  //     },
  //   ],
  // },
  {
    id: 'communication',
    label: 'Communication & Meetings',
    breadcrumbLabel: 'Communication',
    pathPrefix: 'communication',
    items: [
      {
        id: 'messages-inbox',
        label: 'Inbox & Threads',
        route: '/communication',
        iconPath:
          'M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.4 8.4 0 0 1-3.5-.8L3 21l1.8-5.3A8.5 8.5 0 1 1 21 11.5Z',
      },
      {
        id: 'notices-manager',
        label: 'Notices',
        route: '/communication/notices',
        iconPath: 'M19 8A7 7 0 1 0 5 8c0 7-3 9-3 9h20s-3-2-3-9ZM10.73 21a2 2 0 0 0 3.54 0',
      },
      {
        id: 'meetings-calendar',
        label: 'Meetings Calendar',
        route: '/communication/meetings',
        iconPath:
          'M8 2v4m8-4v4M3 10h18M5 5h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
      },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    breadcrumbLabel: 'Reports',
    pathPrefix: 'reports',
    items: [
      {
        id: 'financial-reports',
        label: 'Financial Reports',
        route: '/reports',
        iconPath: 'M4 19h16M7 16V8m5 8V5m5 11v-6',
      },
      {
        id: 'project-reports',
        label: 'Project Status Reports',
        route: '/reports',
        iconPath: 'M3 3h18v18H3V3Zm4 12 3-3 2 2 5-5',
      },
      {
        id: 'client-activity-reports',
        label: 'Client Activity Reports',
        route: '/reports',
        iconPath: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2m15-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
      },
      {
        id: 'exports',
        label: 'Exports',
        route: '/reports',
        iconPath: 'M12 3v12m0 0 4-4m-4 4-4-4M5 21h14',
      },
    ],
  },
  {
    id: 'settings',
    label: 'Settings & Branding',
    breadcrumbLabel: 'Settings',
    pathPrefix: 'settings',
    items: [
      {
        id: 'company-branding',
        label: 'Company Branding',
        route: '/settings',
        iconPath: 'M12 3 3 8l9 5 9-5-9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5',
      },
      {
        id: 'team-users',
        label: 'Team & Users',
        route: '/settings',
        iconPath:
          'M17 21v-2a4 4 0 0 0-3-3.87M9 21v-2a4 4 0 0 0-4-4H3m16-4a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM9 11A4 4 0 1 0 9 3a4 4 0 0 0 0 8Z',
      },
      {
        id: 'notification-preferences',
        label: 'Notification Preferences',
        route: '/settings',
        iconPath: 'M19 8A7 7 0 1 0 5 8c0 7-3 9-3 9h20s-3-2-3-9Z',
      },
      {
        id: 'tax-currency',
        label: 'Tax & Currency',
        route: '/settings',
        iconPath: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H7',
      },
      {
        id: 'tenant-runtime-config',
        label: 'Tenant Branding Runtime',
        route: '/settings',
        iconPath: 'M4 4h16v16H4V4Zm3 3h4v4H7V7Zm6 0h4v10h-4V7ZM7 13h4v4H7v-4Z',
      },
    ],
  },
];
