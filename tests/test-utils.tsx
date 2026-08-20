// Test utilities — JSX-dependent helpers for all feature page tests

import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

export const renderWithProviders = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: ({ children }) => <BrowserRouter>{children}</BrowserRouter>, ...options }),
  };
};

// ======== Sample data helpers ========
export const createSampleLeads = (count = 5) =>
  Array.from({ length: count }, (_, i) => ({
    id: `lead-${i}`,
    name: `Lead ${i}`,
    phone: `+91${9000000000 + i}`,
    email: `lead${i}@test.com`,
    company: `Company ${i}`,
    source: 'website',
    tags: ['hot'],
    location: 'Mumbai',
    product: 'Widget',
    dealValue: 5000 + i * 1000,
    status: 'new',
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
  }));

export const createSampleAppointments = (count = 5) =>
  Array.from({ length: count }, (_, i) => ({
    id: `apt-${i}`,
    title: `Appointment ${i}`,
    contactName: `Contact ${i}`,
    phone: `+91${9000000000 + i}`,
    date: new Date(Date.now() + i * 86400000).toISOString().split('T')[0],
    time: `${10 + i}:00`,
    duration: 30,
    status: 'scheduled',
    type: 'meeting',
  }));

export const createSampleReviews = (count = 3) =>
  Array.from({ length: count }, (_, i) => ({
    id: `rev-${i}`,
    customerName: `Customer ${i}`,
    rating: 5 - i,
    text: `Review text ${i}`,
    source: 'google',
    date: new Date(Date.now() - i * 86400000).toISOString(),
    replied: false,
  }));

export const createSampleDocuments = (count = 3) =>
  Array.from({ length: count }, (_, i) => ({
    id: `doc-${i}`,
    documentNumber: `DOC-${1000 + i}`,
    title: `Document ${i}`,
    type: 'quote',
    contactName: `Contact ${i}`,
    amount: 5000 + i * 1000,
    status: 'draft',
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    items: [{ description: 'Item 1', qty: 1, rate: 5000, amount: 5000 }],
  }));

export const createSampleOrders = (count = 3) =>
  Array.from({ length: count }, (_, i) => ({
    id: `ord-${i}`,
    orderNumber: `ORD-${1000 + i}`,
    customerName: `Customer ${i}`,
    phone: `+91${9000000000 + i}`,
    items: [{ productId: `p-${i}`, name: `Product ${i}`, price: 1000, quantity: 2 }],
    subtotal: 2000,
    discount: 0,
    total: 2000,
    status: 'pending',
    date: new Date(Date.now() - i * 86400000).toISOString(),
    paymentMethod: 'COD',
  }));
