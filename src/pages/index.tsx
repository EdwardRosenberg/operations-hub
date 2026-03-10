import React from 'react';
import Layout from '@theme/Layout';
import FeatureMatrix from '../components/FeatureMatrix';

const featuresIndex = require('../../content/features-index.json');
const servicesMeta  = require('../../generated/services-meta.json');

export default function Home(): JSX.Element {
  return (
    <Layout title="Feature Matrix" description="All features across all registered services">
      <main style={{ padding: '2rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ marginBottom: '0.25rem' }}>Feature Matrix</h1>
          <p style={{ color: 'var(--ifm-color-emphasis-600)', margin: 0 }}>
            All features across all registered services — click any row for docs, code, and test details.
          </p>
        </div>
        <FeatureMatrix features={featuresIndex} services={servicesMeta} />
      </main>
    </Layout>
  );
}
