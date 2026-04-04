export type BookingStatus = "new" | "contacted" | "converted" | "closed" | "NEW" | "CONFIRMED" | "COMPLETED";
export type LeadScore = "high" | "medium" | "low";

export interface Booking {
  _id: string;
  name: string;
  email: string;
  phone: string;
  businessType: string;
  bookingId?: string;
  message?: string;
  budget?: number | null;
  score?: LeadScore;
  proposalUrl?: string;
  teamSize?: string;
  monthlyLeads?: string;
  budgetRange?: string;
  service: string;
  servicePriceSnapshot: number;
  date: string;
  status: BookingStatus;
  createdAt: string;
}

export interface ServiceItem {
  _id: string;
  title: string;
  price: number;
  isActive: boolean;
}

export interface AnalyticsResponse {
  kpis: {
    totalBookings: number;
    revenue: number;
    growthPercent: number;
    activeCustomers: number;
    highValueLeads: number;
    conversionRate: number;
    repeatCustomers: number;
    topService: string;
  };
  charts: {
    bookingsOverTime: { date: string; count: number }[];
    revenueTrend: { date: string; amount: number }[];
    servicePerformance: { service: string; count: number }[];
  };
}
