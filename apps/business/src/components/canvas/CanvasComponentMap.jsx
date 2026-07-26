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
import ClinicalEvalCard from "./ClinicalEvalCard";
import OerContentCard from "./OerContentCard";
import TitleAbstractCard from "./TitleAbstractCard";
import RevenueDashboardCard from "./RevenueDashboardCard";
import AviationCurrencyCard from "./AviationCurrencyCard";
import AviationWeatherCard from "./AviationWeatherCard";
import AviationNavDbCard from "./AviationNavDbCard";
import RealEstateClosingCard from "./RealEstateClosingCard";
import WorkProductCard from "./WorkProductCard";
import ChartCard from "./ChartCard";
import ImageCard from "./ImageCard";
import VideoCard from "./VideoCard";
import MapCard from "./MapCard";
import AircraftCard from "./AircraftCard";
import FlightPlanningCard from "./FlightPlanningCard";
import PatentPortfolioCard from "./PatentPortfolioCard";
import EsignAnchorCard from "./EsignAnchorCard";
import StudentTranscriptCard from "./StudentTranscriptCard";
import BundleOfferCard from "./BundleOfferCard";
import ShopifyCommerceCard from "./ShopifyCommerceCard";
import ListingScorecardCard from "./ListingScorecardCard";
import SiteReconCanvas from "./SiteReconCanvas";
import ShowingScheduleCard from "./ShowingScheduleCard";
import PropertyManagerCanvas from "./PropertyManagerCanvas";
import Valuation409ACard from "./Valuation409ACard";

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
  ClinicalEvalCard,
  OerContentCard,
  TitleAbstractCard,
  RevenueDashboardCard,
  AviationCurrencyCard,
  AviationWeatherCard,
  AviationNavDbCard,
  RealEstateClosingCard,
  WorkProductCard,
  ChartCard,
  ImageCard,
  VideoCard,
  MapCard,
  AircraftCard,
  FlightPlanningCard,
  PatentPortfolioCard,
  EsignAnchorCard,
  StudentTranscriptCard,
  BundleOfferCard,
  ShopifyCommerceCard,
  ListingScorecardCard,
  SiteReconCanvas,
  ShowingScheduleCard,
  PropertyManagerCanvas,
  Valuation409ACard,
};

/**
 * Resolve a component name string to a React component.
 * @param {string} componentName — e.g. "PLSummaryCard"
 * @returns {React.ComponentType|null}
 */
// eslint-disable-next-line react-refresh/only-export-components
export function resolveComponent(componentName) {
  return CANVAS_COMPONENT_MAP[componentName] || null;
}

export default CANVAS_COMPONENT_MAP;
