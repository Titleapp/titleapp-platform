// PLACEHOLDER — wire Stripe here when ready
// For now, all workspaces get unlimited trial

async function checkBillingStatus(userId, workspaceId) {
  return { status: 'active', canUse: true };
}

async function createSubscription(userId, workspaceId) {
  return { checkoutUrl: null, message: 'Billing coming soon. Enjoy your free trial.' };
}

async function cancelSubscription(userId, workspaceId) {
  return { success: true };
}

module.exports = { checkBillingStatus, createSubscription, cancelSubscription };
