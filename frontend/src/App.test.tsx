import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

jest.mock('./Graph', () => () => <div data-testid="graph">Graph Component</div>);

jest.mock('./AuthContext', () => ({
  useAuth: () => ({
    user: { username: 'tester' },
    loading: false,
    logout: jest.fn(),
  }),
}));

jest.mock('./api', () => ({
  useEntities: () => ({ entities: [], refetch: jest.fn() }),
  useRelations: () => ({ relations: [], refetch: jest.fn() }),
  createEntity: jest.fn(),
  updateEntity: jest.fn(),
  deleteEntity: jest.fn(),
  createRelation: jest.fn(),
  updateRelation: jest.fn(),
  deleteRelation: jest.fn(),
  resetAllData: jest.fn(),
  exportData: jest.fn(),
  importData: jest.fn(),
  fetchEntityTypes: jest.fn().mockResolvedValue([]),
  fetchRelationTypes: jest.fn().mockResolvedValue([]),
  fetchEntitiesList: jest.fn().mockResolvedValue([]),
  createEntityType: jest.fn(),
  createRelationType: jest.fn(),
  deleteEntityTypeOnly: jest.fn(),
  deleteRelationTypeOnly: jest.fn(),
}));

describe('App', () => {
  it('renders header with title', async () => {
    render(<App />);

    expect(screen.getByText('Relation Map')).toBeInTheDocument();
    
    // Wait for async effects to complete
    await waitFor(() => {
      expect(screen.getByText('Relation Map')).toBeInTheDocument();
    });
  });

  it('renders graph component', async () => {
    render(<App />);

    expect(screen.getByTestId('graph')).toBeInTheDocument();
    
    // Wait for async effects to complete
    await waitFor(() => {
      expect(screen.getByTestId('graph')).toBeInTheDocument();
    });
  });
});
