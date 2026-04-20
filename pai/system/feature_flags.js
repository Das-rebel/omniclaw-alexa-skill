/**
 * PAI Feature Flags
 * Part of PAI Control Plane Overlay
 */

const PAI_CONTROL_PLANE_ENABLED = process.env.PAI_CONTROL_PLANE_ENABLED !== 'false';

/**
 * Check if PAI control plane is enabled
 * @returns {boolean}
 */
function isPaiEnabled() {
  return PAI_CONTROL_PLANE_ENABLED;
}

/**
 * Check if a specific feature is enabled
 * @param {string} feature - Feature name
 * @returns {boolean}
 */
function isFeatureEnabled(feature) {
  if (!isPaiEnabled()) return false;

  const featureFlags = {
    telos: process.env.PAI_TELOS_ENABLED !== 'false',
    hooks: process.env.PAI_HOOKS_ENABLED !== 'false',
    skills: process.env.PAI_SKILLS_ENABLED !== 'false',
    logging: process.env.PAI_LOGGING_ENABLED !== 'false',
    metrics: process.env.PAI_METRICS_ENABLED !== 'false'
  };

  return featureFlags[feature] ?? false;
}

module.exports = {
  isPaiEnabled,
  isFeatureEnabled,
  PAI_CONTROL_PLANE_ENABLED
};
