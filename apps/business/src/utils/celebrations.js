import confetti from 'canvas-confetti';

const CELEBRATIONS = {
  subtle: () => confetti({
    particleCount: 30, spread: 45,
    origin: { x: 0.85, y: 0.15 },
    colors: ['#7c3aed', '#a78bfa', '#34d399'],
    disableForReducedMotion: true,
  }),
  medium: () => confetti({
    particleCount: 60, spread: 60,
    origin: { x: 0.85, y: 0.15 },
    colors: ['#7c3aed', '#a78bfa', '#c4b5fd', '#fbbf24', '#34d399'],
    disableForReducedMotion: true,
  }),
  big: () => {
    confetti({
      particleCount: 150, spread: 100, ticks: 300,
      gravity: 0.6, scalar: 1.2,
      origin: { x: 0.5, y: 0.4 },
      colors: ['#7c3aed', '#a78bfa', '#c4b5fd', '#fbbf24', '#34d399'],
      disableForReducedMotion: true,
    });
    setTimeout(() => confetti({
      particleCount: 80, spread: 120, ticks: 250,
      gravity: 0.5, scalar: 1.1,
      origin: { x: 0.3, y: 0.3 },
      colors: ['#7c3aed', '#fbbf24', '#34d399'],
      disableForReducedMotion: true,
    }), 400);
    setTimeout(() => confetti({
      particleCount: 60, spread: 80, ticks: 200,
      gravity: 0.7, scalar: 1.0,
      origin: { x: 0.7, y: 0.35 },
      colors: ['#a78bfa', '#c4b5fd', '#fbbf24'],
      disableForReducedMotion: true,
    }), 800);
  },
};

const MILESTONES = {
  onboarding_complete:       { level: 'big',    message: 'Your workspace is ready!' },
  first_data_import:         { level: 'medium', message: 'First data imported! Alex is already analyzing it.' },
  first_csv_upload:          { level: 'subtle', message: 'Data uploaded! Let me take a look...' },
  first_rule_created:        { level: 'medium', message: 'First rule set! I\'m now watching for this 24/7.' },
  tenth_chat_message:        { level: 'subtle', message: 'We\'re getting into a groove!' },
  first_report_generated:    { level: 'medium', message: 'First report generated!' },
  first_subscriber:          { level: 'big',    message: 'You got your first subscriber!' },
  first_revenue:             { level: 'big',    message: 'First revenue! Money in the bank.' },
  ten_subscribers:           { level: 'big',    message: '10 subscribers! Your AI service is gaining traction.' },
  first_deal_closed:         { level: 'big',    message: 'First deal closed!' },
  first_listing_sold:        { level: 'big',    message: 'Listing sold!' },
  first_investment_received: { level: 'big',    message: 'First investment received! Your raise is live.' },
  first_title_minted:        { level: 'medium', message: 'Title minted on Polygon!' },
};

export function fireCelebration(level) {
  const fn = CELEBRATIONS[level];
  if (fn) fn();
}

export function fireMilestone(milestoneKey) {
  const milestone = MILESTONES[milestoneKey];
  if (!milestone) return null;

  // Check sessionStorage to prevent repeats within session
  const firedKey = `ta_milestone_${milestoneKey}`;
  if (sessionStorage.getItem(firedKey)) return milestone.message;

  CELEBRATIONS[milestone.level]?.();
  sessionStorage.setItem(firedKey, 'true');
  return milestone.message;
}

export { MILESTONES };
