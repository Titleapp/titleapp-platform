/**
 * CanvasComponentMap.jsx — Maps component names from canvasTypes registry to React components (44.9)
 *
 * The registry stores component names as strings. This map resolves them
 * to actual React components at render time.
 */

import WorkerListCanvas from "./WorkerListCanvas";
import PLSummaryCard from "./PLSummaryCard";
import InvoiceListCard from "./InvoiceListCard";
import ChartOfAccountsCard from "./ChartOfAccountsCard";
import EmployeeRegisterCard from "./EmployeeRegisterCard";
import ChecklistCard from "./ChecklistCard";
import PerformanceCard from "./PerformanceCard";
import ContentCalendarCard from "./ContentCalendarCard";
import EmailCampaignCard from "./EmailCampaignCard";
import RevenueDashboardCard from "./RevenueDashboardCard";
import AviationCurrencyCard from "./AviationCurrencyCard";
import RealEstateClosingCard from "./RealEstateClosingCard";

const CANVAS_COMPONENT_MAP = {
  WorkerListCanvas,
  PLSummaryCard,
  InvoiceListCard,
  ChartOfAccountsCard,
  EmployeeRegisterCard,
  ChecklistCard,
  PerformanceCard,
  ContentCalendarCard,
  EmailCampaignCard,
  RevenueDashboardCard,
  AviationCurrencyCard,
  RealEstateClosingCard,
};

/**
 * Resolve a component name string to a React component.
 * @param {string} componentName — e.g. "PLSummaryCard"
 * @returns {React.ComponentType|null}
 */
export function resolveComponent(componentName) {
  return CANVAS_COMPONENT_MAP[componentName] || null;
}

export default CANVAS_COMPONENT_MAP;
