/**
 * CreateAIVideoDialog
 *
 * Modal for creating a new AI Video record in the "AI Videos" Airtable table.
 * Fields: Video Name, Editor, Video File (uploaded to Cloudflare R2).
 */

import { useState, useEffect, useRef } from 'react';
import { hiddenInputStyle } from '../../ui';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { AppDialog } from '../../core/dialog';
import { createAIVideo } from '../../features/ai-videos/data';
import { uploadVideoWithFolder } from '../../features/videos/drive';
import type { FilterOption } from '../../core/list';

interface CreateAIVideoDialogProps {
  open: boolean;
  onClose: () => void;
  editorOptions: FilterOption[];
  /** Angle options for the selected product (active angles only). */
  angleOptions: { value: string; label: string }[];
  productId: string;
  productName: string;
}

export function CreateAIVideoDialog({
  open,
  onClose,
  editorOptions,
  angleOptions,
  productId,
  productName,
}: CreateAIVideoDialogProps) {
  const [name, setName] = useState('');
  const [editorId, setEditorId] = useState('');
  const [angleId, setAngleId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form on open
  useEffect(() => {
    if (open) {
      setName('');
      setEditorId('');
      setAngleId('');
      setFile(null);
      setUploadProgress(0);
      setError(null);
    }
  }, [open]);

  const canSubmit = name.trim() && editorId && file && !isSubmitting;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setUploadProgress(0);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!canSubmit || !file) return;

    setIsSubmitting(true);
    setError(null);
    setUploadProgress(0);

    try {
      // 1. Upload to R2 via global upload path
      const result = await uploadVideoWithFolder({
        videoName: name.trim(),
        file,
        productStorageKey: productName,
        subfolder: 'AI-Videos',
        onProgress: (p) => setUploadProgress(p.percentage),
      });

      // 2. Create Airtable record with the R2 URL and metadata
      await createAIVideo(
        name.trim(),
        editorId,
        result.url,
        productId,
        result.metadata ? JSON.stringify(result.metadata) : undefined,
        angleId || undefined
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create AI video');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title="Create AI Video"
      size="sm"
      actions={
        <>
          <Button onClick={onClose} color="inherit" disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!canSubmit}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : undefined}
          >
            {isSubmitting ? 'Uploading...' : 'Create'}
          </Button>
        </>
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
        {/* Video Name */}
        <TextField
          label="Video Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          size="small"
          disabled={isSubmitting}
          autoFocus
        />

        {/* Editor */}
        <FormControl fullWidth size="small">
          <InputLabel>Editor</InputLabel>
          <Select
            value={editorId}
            label="Editor"
            onChange={(e) => setEditorId(e.target.value)}
            disabled={isSubmitting}
          >
            {editorOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Angle (optional, filtered by selected product) */}
        <FormControl fullWidth size="small">
          <InputLabel id="ai-video-angle-label">Angle</InputLabel>
          <Select
            labelId="ai-video-angle-label"
            value={angleId}
            label="Angle"
            onChange={(e) => setAngleId(e.target.value)}
            disabled={isSubmitting}
            displayEmpty
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {angleOptions.length === 0 ? (
              <MenuItem disabled value="__no_angles__">
                No active angles for this product
              </MenuItem>
            ) : (
              angleOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>

        {/* Video File Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          style={hiddenInputStyle}
        />
        <Button
          variant="outlined"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSubmitting}
          startIcon={file ? <CheckCircleIcon color="success" /> : <CloudUploadIcon />}
          sx={{ textTransform: 'none', justifyContent: 'flex-start' }}
        >
          {file ? file.name : 'Choose Video File'}
        </Button>

        {/* Upload Progress */}
        {isSubmitting && uploadProgress > 0 && uploadProgress < 100 && (
          <Box sx={{ width: '100%' }}>
            <LinearProgress variant="determinate" value={uploadProgress} />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              Uploading... {Math.round(uploadProgress)}%
            </Typography>
          </Box>
        )}

        {/* Error */}
        {error && (
          <Typography variant="caption" color="error">
            {error}
          </Typography>
        )}
      </Box>
    </AppDialog>
  );
}
