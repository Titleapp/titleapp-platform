import React, { useState, useEffect } from 'react';
import './OnboardingTour.css';

/**
 * OnboardingTour - GPT-guided walkthrough for first-time users
 * Shows interactive tour of key features with step-by-step guidance
 */
export default function OnboardingTour({ onComplete, vertical = 'auto' }) {
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

  // Define tour steps based on vertical
  const getTourSteps = () => {
    const commonSteps = [
      {
        title: 'Welcome to TitleApp AI! 🎉',
        content: 'Let me show you around. This quick tour will help you get started with your AI-powered business platform.',
        action: 'Get Started',
        highlight: null,
      },
      {
        title: 'Your Dashboard',
        content: 'This is your command center. Here you\'ll see key metrics, recent activity, and quick actions.',
        highlight: '.pageHeader',
        section: 'dashboard',
      },
      {
        title: 'AI Chat Assistant 💬',
        content: 'Click the chat button in the bottom right to talk to your AI assistant. Ask about customers, inventory, records, or get help with any task.',
        highlight: '.floating-chat-button',
        action: 'Try It',
      },
      {
        title: 'Navigation Sidebar',
        content: 'Access all your tools here. Each section is designed to help you manage different aspects of your business.',
        highlight: '.sidebar',
      },
    ];

    // Vertical-specific steps
    const verticalSteps = {
      auto: [
        {
          title: 'Upload Your Data 📁',
          content: 'To get the most out of TitleApp, upload your business data:\n\n• Customer database\n• Current inventory\n• Service schedules\n• Financial products\n• Warranty offerings\n\nWe\'ll use AI to analyze and help you sell more effectively.',
          action: 'Upload Now',
          highlight: null,
        },
        {
          title: 'Inventory & Customers',
          content: 'Manage your vehicle inventory and customer relationships. The AI will help you match customers to vehicles and suggest optimal pricing.',
          highlight: null,
        },
      ],
      analyst: [
        {
          title: 'Upload Deal Memos 📄',
          content: 'Upload 2-3 sample deals you\'re interested in. Our AI will analyze them against your investment criteria and help you identify your sweet spot.',
          action: 'Upload Deals',
          highlight: null,
        },
        {
          title: 'Deal Analysis',
          content: 'The Analyst section uses AI to screen deals, identify risks, and recommend investment structures. All analysis follows your custom criteria.',
          section: 'analyst',
          highlight: null,
        },
      ],
      'real-estate': [
        {
          title: 'Upload Property Docs 📋',
          content: 'Upload property titles, inspection reports, and transaction records. We\'ll help you track ownership and identify opportunities.',
          action: 'Upload Now',
          highlight: null,
        },
      ],
    };

    const finalSteps = [
      {
        title: 'You\'re All Set! ✨',
        content: 'That\'s it! Remember, you can always ask the AI chat assistant for help. It knows your business context and can guide you through any task.',
        action: 'Start Using TitleApp',
        highlight: null,
      },
    ];

    return [
      ...commonSteps,
      ...(verticalSteps[vertical] || []),
      ...finalSteps,
    ];
  };

  const steps = getTourSteps();
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
    } else if (step.action === 'Upload Now' || step.action === 'Upload Deals') {
      // Navigate to appropriate section
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

      {/* Highlight spotlight */}
      {step.highlight && (
        <div
          className="onboarding-spotlight"
          style={{
            '--spotlight-target': step.highlight,
          }}
        />
      )}

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
