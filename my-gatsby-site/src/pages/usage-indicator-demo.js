import React from 'react';
import Layout from '../components/layout';
import Seo from '../components/seo';
import UsageIndicatorDemo from '../components/UsageIndicatorDemo';

const UsageIndicatorDemoPage = () => {
  return (
    <Layout>
      <UsageIndicatorDemo />
    </Layout>
  );
};

export const Head = () => <Seo title="Usage Indicator Demo" />;

export default UsageIndicatorDemoPage; 