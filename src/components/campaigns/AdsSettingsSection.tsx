/**
 * AdsSettingsSection - Sibling section under CampaignSetupColumn.
 *
 * Renders one "Ad set for {AngleName}" block per distinct angle present in
 * the selected media, plus a "Default" block for items with no angle.
 *
 * Each block has its own Ad Preset dropdown — options are filtered to presets
 * whose angle matches the block's angle. The "Default" block lists presets
 * with no angle. Selection is local-only state for now.
 */

import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import TuneIcon from '@mui/icons-material/Tune';
import LinkIcon from '@mui/icons-material/Link';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { textMd, textSm } from '../../theme/typography';
import type { SelectableVideo, SelectableImage } from '../../features/campaigns/launch/types';

/** Preset shape needed by this component (id/name for the dropdown + full content for the collapse). */
export interface AdsSettingsPresetOption {
  id: string;
  name: string;
  /** Linked angle id; undefined means the preset has no angle. */
  angleId?: string;
  primaryTexts: string[];
  headlines: string[];
  descriptions: string[];
  callToAction: string;
  beneficiaryName: string;
  payerName: string;
}

/** Minimal advertorial shape needed by this component. */
export interface AdsSettingsAdvertorialOption {
  id: string;
  name: string;
  /** Final advertorial URL. May be missing on draft advertorials. */
  link?: string;
  /** Linked angle id; undefined means the advertorial has no angle. */
  angleId?: string;
}

interface AdsSettingsSectionProps {
  /** Selected videos for this launch — drives the section list. */
  selectedVideos: SelectableVideo[];
  /** Selected images for this launch — drives the section list. */
  selectedImages: SelectableImage[];
  /** Map of angle id → name for labelling. */
  anglesById: Record<string, string>;
  /** All ad presets for the current product. */
  adPresets: AdsSettingsPresetOption[];
  /** All advertorials for the current product. */
  advertorials: AdsSettingsAdvertorialOption[];
}

const DEFAULT_SECTION_KEY = '__default__';

export function AdsSettingsSection({
  selectedVideos,
  selectedImages,
  anglesById,
  adPresets,
  advertorials,
}: AdsSettingsSectionProps) {
  // Per-angle selected preset id and advertorial id. Local state — not persisted.
  const [selectedPresetByAngle, setSelectedPresetByAngle] = useState<Record<string, string>>({});
  const [selectedAdvertorialByAngle, setSelectedAdvertorialByAngle] = useState<Record<string, string>>({});
  // Per-section expanded flag for the preset details collapse.
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  // Per-section text overrides after {{link}} replacement. Keyed by section.
  const [replacedTextsByAngle, setReplacedTextsByAngle] = useState<Record<string, {
    primaryTexts: string[];
    headlines: string[];
    descriptions: string[];
  }>>({});

  // One section per distinct angle in selected media, plus "Default" if any
  // selected item has no angle.
  const sections = useMemo(() => {
    const angleIds = new Set<string>();
    let hasNoAngle = false;
    for (const m of [...selectedVideos, ...selectedImages]) {
      if (m.angleId) angleIds.add(m.angleId);
      else hasNoAngle = true;
    }
    const named: Array<{ key: string; name: string; angleId: string | null }> = Array.from(angleIds)
      .map((id) => ({ key: id, name: anglesById[id] ?? 'Unknown', angleId: id }))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (hasNoAngle) named.push({ key: DEFAULT_SECTION_KEY, name: 'Default', angleId: null });
    return named;
  }, [selectedVideos, selectedImages, anglesById]);

  /**
   * For an angle section: presets where preset.angleId === section.angleId.
   * For the Default section: presets with no angle.
   */
  const presetsForSection = (sectionAngleId: string | null): AdsSettingsPresetOption[] => {
    if (sectionAngleId === null) {
      return adPresets.filter((p) => !p.angleId);
    }
    return adPresets.filter((p) => p.angleId === sectionAngleId);
  };

  /** Same filtering rule as presets, applied to advertorials. */
  const advertorialsForSection = (sectionAngleId: string | null): AdsSettingsAdvertorialOption[] => {
    if (sectionAngleId === null) {
      return advertorials.filter((a) => !a.angleId);
    }
    return advertorials.filter((a) => a.angleId === sectionAngleId);
  };

  const handleSelectPreset = (sectionKey: string, presetId: string) => {
    setSelectedPresetByAngle((prev) => ({ ...prev, [sectionKey]: presetId }));
  };

  const handleSelectAdvertorial = (sectionKey: string, advertorialId: string) => {
    setSelectedAdvertorialByAngle((prev) => ({ ...prev, [sectionKey]: advertorialId }));
  };

  const toggleExpanded = (sectionKey: string) => {
    setExpandedSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  /**
   * True only when every section has BOTH a preset and an advertorial
   * selected, validated against the currently filtered options for that
   * section (so a stale selection that's no longer available doesn't count).
   */
  const allSectionsSelected = useMemo(() => {
    if (sections.length === 0) return false;
    return sections.every((s) => {
      const presetOpts = presetsForSection(s.angleId);
      const advOpts = advertorialsForSection(s.angleId);
      const presetId = selectedPresetByAngle[s.key];
      const advId = selectedAdvertorialByAngle[s.key];
      return (
        !!presetId && presetOpts.some((p) => p.id === presetId) &&
        !!advId && advOpts.some((a) => a.id === advId)
      );
    });
    // presetsForSection/advertorialsForSection are stable closures over props,
    // so we depend on the underlying inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, selectedPresetByAngle, selectedAdvertorialByAngle, adPresets, advertorials]);

  /**
   * For each section, find the selected preset + advertorial, replace
   * `{{link}}` occurrences in the preset's primaryTexts/headlines/descriptions
   * with the advertorial's link, and store the resulting text per section.
   * Sections whose advertorial has no link are skipped.
   */
  const handleReplaceLink = () => {
    const next: Record<string, { primaryTexts: string[]; headlines: string[]; descriptions: string[] }> = {};
    for (const s of sections) {
      const preset = presetsForSection(s.angleId).find((p) => p.id === selectedPresetByAngle[s.key]);
      const adv = advertorialsForSection(s.angleId).find((a) => a.id === selectedAdvertorialByAngle[s.key]);
      const link = adv?.link;
      if (!preset || !link) continue;
      const replace = (arr: string[]) => arr.map((t) => t.replaceAll('{{link}}', link));
      next[s.key] = {
        primaryTexts: replace(preset.primaryTexts),
        headlines: replace(preset.headlines),
        descriptions: replace(preset.descriptions),
      };
    }
    setReplacedTextsByAngle(next);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <TuneIcon sx={{ fontSize: 20, color: 'primary.main' }} />
        <Typography sx={textMd}>
          Ads Settings
        </Typography>
        <Typography sx={{ ...textSm, color: 'text.secondary', ml: 0.5 }}>
          ({sections.length})
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button
          size="small"
          variant="contained"
          startIcon={<LinkIcon sx={{ fontSize: 16 }} />}
          onClick={handleReplaceLink}
          disabled={!allSectionsSelected}
          sx={{ textTransform: 'none' }}
        >
          Replace Link
        </Button>
      </Box>

      {/* Content */}
      <Box sx={{ p: 2.5 }}>
        {sections.length === 0 ? (
          <Typography sx={{ ...textSm, color: 'text.disabled' }}>
            Select videos or images to generate ad sets.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {sections.map((s) => {
              const presetOptions = presetsForSection(s.angleId);
              const advertorialOptions = advertorialsForSection(s.angleId);

              const selectedPresetId = selectedPresetByAngle[s.key] ?? '';
              const safePresetValue = presetOptions.some((o) => o.id === selectedPresetId) ? selectedPresetId : '';
              const selectedPreset = presetOptions.find((o) => o.id === safePresetValue);

              const selectedAdvertorialId = selectedAdvertorialByAngle[s.key] ?? '';
              const safeAdvertorialValue = advertorialOptions.some((o) => o.id === selectedAdvertorialId) ? selectedAdvertorialId : '';

              const isExpanded = expandedSections[s.key] ?? false;
              const override = replacedTextsByAngle[s.key];
              const displayedPrimaryTexts = override?.primaryTexts ?? selectedPreset?.primaryTexts ?? [];
              const displayedHeadlines = override?.headlines ?? selectedPreset?.headlines ?? [];
              const displayedDescriptions = override?.descriptions ?? selectedPreset?.descriptions ?? [];
              const isReplaced = !!override;

              return (
                <Box
                  key={s.key}
                  sx={{
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'background.paper',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                  }}
                >
                  {/* Clickable header: title + chevron — toggles the preset details collapse */}
                  <Box
                    onClick={() => toggleExpanded(s.key)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ ...textSm, fontWeight: 500 }}>
                        Ad set for {s.name}
                      </Typography>
                      {isReplaced && (
                        <Chip
                          label="{{link}} replaced"
                          color="success"
                          size="small"
                          sx={{ height: 18, fontSize: '0.65rem' }}
                        />
                      )}
                    </Box>
                    <IconButton size="small" sx={{ p: 0.25 }}>
                      {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </IconButton>
                  </Box>

                  {/* Ad Preset (angle-filtered) */}
                  <FormControl size="small" fullWidth>
                    <Select
                      value={safePresetValue}
                      onChange={(e) => handleSelectPreset(s.key, e.target.value)}
                      displayEmpty
                      sx={{ '& .MuiSelect-select': textSm }}
                    >
                      <MenuItem value="">
                        <em>Select a preset...</em>
                      </MenuItem>
                      {presetOptions.length === 0 ? (
                        <MenuItem disabled value="__no_presets__">
                          {s.angleId === null
                            ? 'No presets without an angle'
                            : `No presets for ${s.name}`}
                        </MenuItem>
                      ) : (
                        presetOptions.map((opt) => (
                          <MenuItem key={opt.id} value={opt.id}>
                            {opt.name}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>

                  {/* Preset details (read-only) — visible when expanded AND a preset is selected */}
                  <Collapse in={isExpanded && !!selectedPreset}>
                    {selectedPreset && (
                      <Box
                        sx={{
                          mt: 1,
                          p: 1.5,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          bgcolor: 'action.hover',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1.5,
                        }}
                      >
                        {displayedPrimaryTexts.length > 0 && (
                          <PresetFieldGroup label={`Primary Text (${displayedPrimaryTexts.length})`} values={displayedPrimaryTexts} />
                        )}
                        {displayedHeadlines.length > 0 && (
                          <PresetFieldGroup label={`Headlines (${displayedHeadlines.length})`} values={displayedHeadlines} />
                        )}
                        {displayedDescriptions.length > 0 && (
                          <PresetFieldGroup label={`Descriptions (${displayedDescriptions.length})`} values={displayedDescriptions} />
                        )}
                        {selectedPreset.callToAction && (
                          <Box>
                            <Typography sx={{ ...textSm, color: 'text.secondary', mb: 0.25 }}>Call to Action</Typography>
                            <Typography sx={textSm}>{selectedPreset.callToAction}</Typography>
                          </Box>
                        )}
                        {(selectedPreset.beneficiaryName || selectedPreset.payerName) && (
                          <Box>
                            <Typography sx={{ ...textSm, color: 'text.secondary', mb: 0.25 }}>Compliance</Typography>
                            {selectedPreset.beneficiaryName && (
                              <Typography sx={textSm}>Beneficiary: {selectedPreset.beneficiaryName}</Typography>
                            )}
                            {selectedPreset.payerName && (
                              <Typography sx={textSm}>Payer: {selectedPreset.payerName}</Typography>
                            )}
                          </Box>
                        )}
                      </Box>
                    )}
                  </Collapse>

                  {/* Advertorial (angle-filtered) */}
                  <FormControl size="small" fullWidth>
                    <Select
                      value={safeAdvertorialValue}
                      onChange={(e) => handleSelectAdvertorial(s.key, e.target.value)}
                      displayEmpty
                      sx={{ '& .MuiSelect-select': textSm }}
                    >
                      <MenuItem value="">
                        <em>Select an advertorial...</em>
                      </MenuItem>
                      {advertorialOptions.length === 0 ? (
                        <MenuItem disabled value="__no_advertorials__">
                          {s.angleId === null
                            ? 'No advertorials without an angle'
                            : `No advertorials for ${s.name}`}
                        </MenuItem>
                      ) : (
                        advertorialOptions.map((opt) => (
                          <MenuItem key={opt.id} value={opt.id}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, width: '100%' }}>
                              <Typography sx={{ ...textSm, fontWeight: 500 }} noWrap>
                                {opt.name}
                              </Typography>
                              {opt.link && (
                                <Typography
                                  sx={{
                                    fontSize: '0.7rem',
                                    color: 'text.secondary',
                                  }}
                                  noWrap
                                >
                                  {opt.link}
                                </Typography>
                              )}
                            </Box>
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Paper>
  );
}

interface PresetFieldGroupProps {
  label: string;
  values: string[];
}

function PresetFieldGroup({ label, values }: PresetFieldGroupProps) {
  return (
    <Box>
      <Typography sx={{ ...textSm, color: 'text.secondary', mb: 0.5 }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {values.map((v, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <Typography sx={{ ...textSm, color: 'text.disabled', flexShrink: 0, minWidth: 16 }}>
              {i + 1}.
            </Typography>
            <Typography sx={{ ...textSm, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {v}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
