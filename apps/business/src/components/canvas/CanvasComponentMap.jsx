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
import BalanceSheetCard from "./BalanceSheetCard";
import CashFlowStatementCard from "./CashFlowStatementCard";
import EmployeeRegisterCard from "./EmployeeRegisterCard";
import ChecklistCard from "./ChecklistCard";
import PerformanceCard from "./PerformanceCard";
import ContentCalendarCard from "./ContentCalendarCard";
import EmailCampaignCard from "./EmailCampaignCard";
import MarketingCampaignBoardCard from "./MarketingCampaignBoardCard";
import VetDosingCard from "./VetDosingCard";
import EduCohortCard from "./EduCohortCard";
import StaffRosterCard from "./StaffRosterCard";
import RevenueDashboardCard from "./RevenueDashboardCard";
import AviationCurrencyCard from "./AviationCurrencyCard";
import RealEstateClosingCard from "./RealEstateClosingCard";
import ContactCard from "./ContactCard";
import BusinessAssetCard from "./BusinessAssetCard";
import TransactionCard from "./TransactionCard";
import WorkProductCard from "./WorkProductCard";
import ChartCard from "./ChartCard";
import ImageCard from "./ImageCard";
import VideoCard from "./VideoCard";
import MapCard from "./MapCard";
import AircraftCard from "./AircraftCard";
import FlightPlanningCard from "./FlightPlanningCard";

const CANVAS_COMPONENT_MAP = {
  WorkerListCanvas,
  PLSummaryCard,
  InvoiceListCard,
  ChartOfAccountsCard,
  BalanceSheetCard,
  CashFlowStatementCard,
  EmployeeRegisterCard,
  ChecklistCard,
  PerformanceCard,
  ContentCalendarCard,
  EmailCampaignCard,
  MarketingCampaignBoardCard,
  VetDosingCard,
  EduCohortCard,
  StaffRosterCard,
  RevenueDashboardCard,
  AviationCurrencyCard,
  RealEstateClosingCard,
  ContactCard,
  BusinessAssetCard,
  TransactionCard,
  WorkProductCard,
  ChartCard,
  ImageCard,
  VideoCard,
  MapCard,
  AircraftCard,
  FlightPlanningCard,
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
