/**
 * title-escrow.js — Title & Escrow suite defaults
 *
 * Layer 1 defaults applied to all workers in the Title & Escrow suite.
 * Loaded by raas.engine.js before worker-specific rules.
 * Cannot be overridden without explicit compliance justification.
 */

const ESCROW_LOCKER_DEFAULTS = {
  lifecycle_stages:          8,
  identity_verification:     "stripe_identity",
  offer_chain:               "immutable_append_only",
  bank_account_link:         "stripe_financial_connections",
  notarization:              "ron_preferred",
  escrow_hold:               "stripe_treasury",
  disbursement_auth:         "human_required",
  recording_method:          "erecording_where_available",
  dtc_transfer:              "vault_to_vault",
  seven_year_retention:      true,
  pii_handling:              "masked_in_logs",
  wire_fraud_protection:     "callback_required",
  ofac_check:                "on_party_add_and_disbursement",
  ron_states_phase_1:        ["TX", "FL", "AZ", "NV", "WA", "CO", "OR", "CA"],
};

const TITLE_SEARCH_DEFAULTS = {
  title_standard:            "alta_2024",
  exception_classification:  true,
  curative_action_tracking:  true,
  lien_search:               true,
  chain_of_title:            true,
  endorsement_identification: true,
  commitment_parsing:        "schedule_a_b1_b2",
  recording_verification:    true,
};

const CLOSING_DEFAULTS = {
  cd_standard_residential:   "trid",
  cd_standard_commercial:    "alta",
  proration_calculation:     true,
  settlement_verification:   true,
  fund_transfer_schedule:    true,
  post_closing_tracking:     true,
  document_distribution:     true,
  escrow_reconciliation:     true,
};

module.exports = {
  ESCROW_LOCKER_DEFAULTS,
  TITLE_SEARCH_DEFAULTS,
  CLOSING_DEFAULTS,
};
