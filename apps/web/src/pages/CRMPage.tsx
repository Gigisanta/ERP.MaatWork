import React from 'react';
import Layout from '../components/Layout';
import CRM from './CRM';

const CRMPage: React.FC = () => {
  console.log('wtf')
  return (
    <Layout 
      pageTitle="CRM - Gestión de Contactos"
      pageDescription="Administra y da seguimiento a todos tus contactos comerciales de manera eficiente"
    >
      <CRM />
    </Layout>
  );
};

export default CRMPage;