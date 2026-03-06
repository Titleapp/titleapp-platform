/**
 * government.js — Government In A Box suite defaults
 *
 * Layer 1 defaults applied to all workers in each sub-suite.
 * Loaded by raas.engine.js before worker-specific rules.
 * Cannot be overridden without explicit compliance justification.
 */

const DMV_SUITE_DEFAULTS = {
  jurisdiction_scope:     "state",
  title_standard:         "UCC Article 9 + state motor vehicle code",
  elt_required:           true,
  nmvtis_check:           true,
  real_id_validation:     true,
  vin_format:             "ISO_3779",
  odometer_disclosure:    true,
  dppa_consent_required:  true,
  fee_collection:         "stripe_only",
  duplicate_title_hold:   "3_business_days",
};

const PERMITTING_SUITE_DEFAULTS = {
  jurisdiction_scope:      "municipal_or_county",
  building_code:           "IBC_2021",
  fire_code:               "IFC_2021",
  completeness_check:      true,
  contractor_verification: true,
  fee_collection:          "stripe_only",
  public_notice_required:  true,
  co_required_before_occupancy: true,
  plan_review_sla_days:    10,
  appeal_window_days:      30,
};

const INSPECTOR_SUITE_DEFAULTS = {
  jurisdiction_scope:       "municipal_or_county",
  human_in_the_loop:        true,
  observation_window_min:   90,
  photo_required:           true,
  gps_lock_required:        true,
  life_safety_escalation:   true,
  notice_delivery:          "email_sms_portal",
  reinspection_window_days: 30,
  court_ready_format:       true,
  wearable_api_stub:        "/api/wearable/v1/visual-query",
};

const RECORDER_SUITE_DEFAULTS = {
  jurisdiction_scope:      "county",
  audit_trail_level:       "immutable",
  ecords_standard:         "PRIA_eCORDS_v3",
  urpera_compliance:       true,
  chain_append_only:       true,
  recording_timestamp:     "UTC_ISO8601",
  document_hash:           "SHA-256",
  ron_provider:            "proof",
  valuation_sync_trigger:  true,
  backlog_target_days:     1,
  public_chain_query:      true,
};

module.exports = {
  DMV_SUITE_DEFAULTS,
  PERMITTING_SUITE_DEFAULTS,
  INSPECTOR_SUITE_DEFAULTS,
  RECORDER_SUITE_DEFAULTS,
};
