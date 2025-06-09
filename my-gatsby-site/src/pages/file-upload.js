import React from 'react';
import Layout from '../components/layout';
import Seo from '../components/seo';
import FileUploadInterface from '../components/FileUploadInterface';

const FileUploadPage = () => {
  return (
    <Layout>
      <FileUploadInterface />
    </Layout>
  );
};

export const Head = () => <Seo title="File Upload" />;

export default FileUploadPage; 