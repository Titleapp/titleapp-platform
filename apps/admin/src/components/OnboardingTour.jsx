import React, { useState, useEffect } from 'react';
import './OnboardingTour.css';

/**
 * OnboardingTour - GPT-guided walkthrough for first-time users
 * Consumer/Individual version
 */
export default function OnboardingTour({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has seen the tour
    const hasSeenTour = localStorage.getItem('hasSeenOnboardingTour');
    if (!hasSeenTour) {
      // Delay tour start to let the dashboard load
      setTimeout(() => setIsVisible(true), 1000);
    }
  }, []);

  const steps = [
    {
      title: 'Welcome to TitleApp! 🎉',
      content: 'Your personal digital vault for all your important records and documents. Let me show you around.',
      action: 'Get Started',
    },
    {
      title: 'Your Dashboard',
      content: 'This is your home base. See all your digital title certificates, credentials, and important documents at a glance.',
      highlight: '.pageHeader',
    },
    {
      title: 'Upload Your Documents 📄',
      content: 'Start by uploading your important documents:\n\n• Vehicle titles & registrations\n• Student ID & transcripts\n• Professional licenses\n• Property deeds\n• Medical records\n\nWe\'ll help you organize and verify everything.',
      action: 'Upload Now',
    },
    {
      title: 'AI Chat Assistant 💬',
      content: 'Click the chat button anytime to ask questions about your records, get help finding documents, or request verifications.',
      highlight: '.floating-chat-button',
      action: 'Try It',
    },
    {
      title: 'Pilot Records',
      content: 'If you\'re a pilot, upload your logbooks to automatically generate FAA 8710 and ICAO experience summaries. We\'ll track all your flight time and certificates.',
      highlight: null,
    },
    {
      title: 'Digital Credentials',
      content: 'All your credentials are stored securely and can be shared with verified requests. Your data stays private and under your control.',
      highlight: null,
    },
    {
      title: 'You\'re All Set! ✨',
      content: 'That\'s it! Start uploading your documents and the AI will help you organize everything. Remember, you can always ask the chat assistant for help.',
      action: 'Start Using TitleApp',
    },
  ];

  const step = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const handleSkip = () => {
    completeTour();
  };

  const completeTour = () => {
    localStorage.setItem('hasSeenOnboardingTour', 'true');
    setIsVisible(false);
    if (onComplete) onComplete();
  };

  const handleAction = () => {
    if (step.action === 'Try It') {
      // Open chat
      const chatButton = document.querySelector('.floating-chat-button');
      if (chatButton) chatButton.click();
      handleNext();
    } else {
      handleNext();
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Overlay */}
      <div className="onboarding-overlay" />

      {/* Tour card */}
      <div className="onboarding-card">
        <div className="onboarding-header">
          <div className="onboarding-progress">
            Step {currentStep + 1} of {steps.length}
          </div>
          <button className="onboarding-skip" onClick={handleSkip}>
            Skip Tour
          </button>
        </div>

        <div className="onboarding-content">
          <h2 className="onboarding-title">{step.title}</h2>
          <p className="onboarding-text" style={{ whiteSpace: 'pre-line' }}>
            {step.content}
          </p>
        </div>

        <div className="onboarding-footer">
          <div className="onboarding-dots">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`onboarding-dot ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
              />
            ))}
          </div>
          <div className="onboarding-actions">
            {currentStep > 0 && (
              <button className="onboarding-btn onboarding-btn-secondary" onClick={() => setCurrentStep(currentStep - 1)}>
                Back
              </button>
            )}
            {step.action ? (
              <button className="onboarding-btn onboarding-btn-primary" onClick={handleAction}>
                {step.action}
              </button>
            ) : (
              <button className="onboarding-btn onboarding-btn-primary" onClick={handleNext}>
                {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
