import type { CollectionConfig } from 'payload'
import { isAdminUser, type BackupsPluginOptions } from './types.js'

// Kept as 'site-migrations' (the plugin's original name) on purpose: the slug is the database
// table name, so changing it would need a database migration and would orphan existing entries.
export const BACKUPS_COLLECTION_SLUG = 'site-migrations'

/** Log of created backups. Its admin list view is replaced by the backup dashboard. */
export function createBackupsCollection(
  access: NonNullable<BackupsPluginOptions['access']> = isAdminUser,
): CollectionConfig {
  const allowed = ({ req }: { req: any }) => access({ req })

  return {
    slug: BACKUPS_COLLECTION_SLUG,
    labels: {
      singular: 'Site Backup',
      plural: 'Site Backups',
    },
    admin: {
      useAsTitle: 'name',
      defaultColumns: ['name', 'filename', 'sizeBytes', 'actions', 'createdAt'],
      components: {
        views: {
          list: {
            Component: '@novel/payload-plugin-backups/client#BackupDashboard',
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
        label: 'Backup Name',
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
            Cell: '@novel/payload-plugin-backups/client#SizeCell',
          },
        },
      },
      {
        name: 'actions',
        type: 'ui',
        label: 'Download Action',
        admin: {
          components: {
            Cell: '@novel/payload-plugin-backups/client#DownloadCell',
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
