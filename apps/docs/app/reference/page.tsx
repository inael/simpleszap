'use client';

import { ApiReferenceReact } from '@scalar/api-reference-react';
import '@scalar/api-reference-react/style.css';

export default function ReferencePage() {
  return (
    <ApiReferenceReact
      configuration={{
        url: '/openapi.yaml',
        theme: 'purple',
        darkMode: true,
        hideDarkModeToggle: false,
        hideClientButton: false,
        layout: 'modern',
        showSidebar: true,
        metaData: {
          title: 'SimplesZap API Reference',
          description: 'API REST do SimplesZap',
          ogTitle: 'SimplesZap API Reference',
          ogDescription: 'Envie WhatsApp em escala via REST',
        },
        defaultHttpClient: {
          targetKey: 'shell',
          clientKey: 'curl',
        },
        hiddenClients: [],
        servers: [
          { url: 'https://back.simpleszap.com/api', description: 'Produção' },
        ],
      }}
    />
  );
}
