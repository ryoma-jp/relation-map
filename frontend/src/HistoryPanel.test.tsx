import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HistoryPanel from './HistoryPanel';
import * as versionApi from './api';

jest.mock('./api');

const mockVersions = [
  {
    id: 1,
    version_number: 1,
    created_at: '2024-01-15T10:00:00Z',
    description: 'Initial version',
    created_by: 'system',
  },
  {
    id: 2,
    version_number: 2,
    created_at: '2024-01-15T10:30:00Z',
    description: 'Added entity',
    created_by: 'system',
  },
];

describe('HistoryPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (versionApi.fetchVersions as jest.Mock).mockResolvedValue(mockVersions);
    (versionApi.restoreVersion as jest.Mock).mockResolvedValue({
      ok: true,
      message: 'Restored',
      new_version_id: 3,
    });
    (versionApi.createCheckpoint as jest.Mock).mockResolvedValue(mockVersions[1]);
  });

  test('renders history panel', () => {
    render(<HistoryPanel />);
    expect(screen.getByText('Version History')).toBeInTheDocument();
    expect(screen.getByText('+ Checkpoint')).toBeInTheDocument();
  });

  test('displays versions', async () => {
    render(<HistoryPanel />);
    
    await waitFor(() => {
      expect(screen.getByText('v1')).toBeInTheDocument();
      expect(screen.getByText('v2')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Initial version')).toBeInTheDocument();
    expect(screen.getByText('Added entity')).toBeInTheDocument();
  });

  test('displays empty state when no versions', async () => {
    (versionApi.fetchVersions as jest.Mock).mockResolvedValue([]);
    
    render(<HistoryPanel />);
    
    await waitFor(() => {
      expect(screen.getByText('No versions yet')).toBeInTheDocument();
    });
  });

  test('creates checkpoint with description', async () => {
    const user = userEvent.setup();
    render(<HistoryPanel />);
    
    // Click + Checkpoint button
    const checkpointBtn = screen.getByText('+ Checkpoint');
    await user.click(checkpointBtn);
    
    // Type description
    const input = screen.getByPlaceholderText('Checkpoint description');
    await user.type(input, 'Test Checkpoint');
    
    // Click Save
    const saveBtn = screen.getAllByText('Save')[0];
    await user.click(saveBtn);
    
    await waitFor(() => {
      expect(versionApi.createCheckpoint).toHaveBeenCalledWith('Test Checkpoint');
    });
  });

  test('warns before restoring version', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    
    render(<HistoryPanel />);
    
    await waitFor(() => {
      expect(screen.getByText('v1')).toBeInTheDocument();
    });
    
    const restoreBtn = screen.getAllByText('Restore')[0];
    await user.click(restoreBtn);
    
    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringContaining('Are you sure you want to restore')
    );
    
    confirmSpy.mockRestore();
  });

  test('calls restoreVersion API', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    
    render(<HistoryPanel />);
    
    await waitFor(() => {
      expect(screen.getByText('v1')).toBeInTheDocument();
    });
    
    const restoreBtn = screen.getAllByText('Restore')[0];
    await user.click(restoreBtn);
    
    await waitFor(() => {
      expect(versionApi.restoreVersion).toHaveBeenCalledWith(1, true);
    });
    
    confirmSpy.mockRestore();
  });

  test('calls onRefresh after restore', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    const mockRefresh = jest.fn();
    const user = userEvent.setup();
    
    render(<HistoryPanel onRefresh={mockRefresh} />);
    
    await waitFor(() => {
      expect(screen.getByText('v1')).toBeInTheDocument();
    });
    
    const restoreBtn = screen.getAllByText('Restore')[0];
    await user.click(restoreBtn);
    
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
    
    confirmSpy.mockRestore();
  });

  test('cancels checkpoint creation', async () => {
    const user = userEvent.setup();
    render(<HistoryPanel />);
    
    // Click + Checkpoint button
    const checkpointBtn = screen.getByText('+ Checkpoint');
    await user.click(checkpointBtn);
    
    // Click Cancel
    const cancelBtn = screen.getByText('Cancel');
    await user.click(cancelBtn);
    
    // Input should be hidden
    expect(screen.queryByPlaceholderText('Checkpoint description')).not.toBeInTheDocument();
  });

  test('displays loading state', async () => {
    (versionApi.fetchVersions as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockVersions), 100))
    );
    
    render(<HistoryPanel />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('v1')).toBeInTheDocument();
    });
  });

  test('displays error message on fetch failure', async () => {
    const errorMsg = 'Failed to fetch versions';
    (versionApi.fetchVersions as jest.Mock).mockRejectedValue(new Error(errorMsg));
    
    render(<HistoryPanel />);
    
    await waitFor(() => {
      expect(screen.getByText(errorMsg)).toBeInTheDocument();
    });
  });

  test('disables button during loading', async () => {
    (versionApi.fetchVersions as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockVersions), 200))
    );
    
    render(<HistoryPanel />);
    
    const checkpointBtn = screen.getByText('+ Checkpoint');
    expect(checkpointBtn).toBeDisabled();
  });
});
