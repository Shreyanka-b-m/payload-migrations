import type { CollectionConfig } from 'payload'
import { isAdminUser, type PluginMigrationsOptions } from './types.js'

export const SITE_MIGRATIONS_SLUG = 'site-migrations'

/** Log of created backups. Its admin list view is replaced by the backup dashboard. */
export function createSiteMigrationsCollection(
  access: NonNullable<PluginMigrationsOptions['access']> = isAdminUser,
): CollectionConfig {
  const allowed = ({ req }: { req: any }) => access({ req })

  return {
    slug: SITE_MIGRATIONS_SLUG,
    labels: {
      singular: 'Site Backup & Migration',
      plural: 'Site Backups & Migrations',
    },
    admin: {
      useAsTitle: 'name',
      defaultColumns: ['name', 'filename', 'sizeBytes', 'actions', 'createdAt'],
      components: {
        views: {
          list: {
            Component: '@novel/payload-migrations/client#MigrationDashboard',
          },
        },
      },
    },
    access: {
      // Entries are only created by the backup endpoint (which uses overrideAccess),
      // so hide the admin's "Create New" button.
      create: () => false,
      delete: allowed,
      read: allowed,
      update: allowed,
    },
    fields: [
      {
        name: 'name',
        type: 'text',
        required: true,
        label: 'Backup / Migration Name',
      },
      {
        name: 'filename',
        type: 'text',
        label: 'Archive Filename',
      },
      {
        name: 'sizeBytes',
        type: 'number',
        label: 'File Size (Bytes)',
        admin: {
          components: {
            Cell: '@novel/payload-migrations/client#SizeCell',
          },
        },
      },
      {
        name: 'actions',
        type: 'ui',
        label: 'Download Action',
        admin: {
          components: {
            Cell: '@novel/payload-migrations/client#DownloadCell',
          },
        },
      },
      {
        name: 'notes',
        type: 'textarea',
        label: 'Notes / Description',
      },
    ],
  }
}
