/**
 * SchedulesPage - View and manage scheduled campaign actions.
 *
 * Features:
 * - Two-tab view (Tonight / Log)
 * - Schedule new actions via dialog
 * - Cancel pending actions
 * - View execution history with status chips
 */

import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';

import AddIcon from '@mui/icons-material/Add';

import { ToggleTabs } from '../../ui/ToggleTabs';
import { TonightTab } from '../../components/schedules/TonightTab';
import { LogTab } from '../../components/schedules/LogTab';
import { ScheduleActionDialog } from '../../components/schedules/ScheduleActionDialog';
import { fetchPendingActions, fetchActionLog, cancelScheduledAction, createScheduledAction } from '../../features/schedules/data';
import { formStateToFields } from '../../features/schedules/types';
import type { ScheduledAction, ScheduleFormState } from '../../features/schedules/types';

// =============================================================================
// TYPES
// =============================================================================

type TabValue = 'tonight' | 'log';

// =============================================================================
// COMPONENT
// =============================================================================

export function SchedulesPage() {
  // Data
  const [pending, setPending] = useState<ScheduledAction[]>([]);
  const [log, setLog] = useState<ScheduledAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<TabValue>('tonight');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pendingData, logData] = await Promise.all([
        fetchPendingActions(),
        fetchActionLog(),
      ]);
      setPending(pendingData);
      setLog(logData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers
  const handleAdd = () => {
    setDialogOpen(true);
  };

  const handleSave = async (form: ScheduleFormState) => {
    setSaving(true);
    try {
      const fields = formStateToFields(form);
      await createScheduledAction(fields);
      setDialogOpen(false);
      await loadData();
    } catch (err) {
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (action: ScheduledAction) => {
    try {
      await cancelScheduledAction(action.id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel action');
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Schedules
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View and manage scheduled campaign actions
          </Typography>
        </Box>
        {activeTab === 'tonight' && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Schedule Action
          </Button>
        )}
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ mb: 2.5 }}>
        <ToggleTabs<TabValue>
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: 'tonight', label: 'Tonight', count: pending.length },
            { value: 'log', label: 'Log', count: log.length },
          ]}
        />
      </Box>

      {/* Tab content */}
      {activeTab === 'tonight' && (
        <TonightTab
          actions={pending}
          loading={loading}
          onCancel={handleCancel}
          onAdd={handleAdd}
        />
      )}
      {activeTab === 'log' && (
        <LogTab actions={log} loading={loading} />
      )}

      {/* Schedule Dialog */}
      <ScheduleActionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        saving={saving}
      />
    </Box>
  );
}
