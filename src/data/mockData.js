import { ROLES } from "../config/roles";

export const MOCK_USERS = [
  { id: "u1", name: "Aarav Shah", email: "superadmin@propertyserch.com", role: ROLES.SUPER_ADMIN, agency: "PropertySerch HQ", avatarColor: "#11142B" },
  { id: "u2", name: "Meera Nair", email: "admin@propertyserch.com", role: ROLES.ADMIN, agency: "PropertySerch HQ", avatarColor: "#2B3A67" },
  { id: "u3", name: "Rohan Kapoor", email: "agency@propertyserch.com", role: ROLES.AGENCY_ADMIN, agency: "Skyline Realty", avatarColor: "#DC2626" },
  { id: "u4", name: "Priya Menon", email: "broker@propertyserch.com", role: ROLES.BROKER, agency: "Skyline Realty", avatarColor: "#FF7A59" },
  { id: "u5", name: "Vikram Desai", email: "builder@propertyserch.com", role: ROLES.BUILDER, agency: "Desai Developers", avatarColor: "#D97706" },
  { id: "u6", name: "Sana Iyer", email: "sales@propertyserch.com", role: ROLES.SALES, agency: "PropertySerch HQ", avatarColor: "#5C6BB8" },
];

export const LEADS = [
  { id: "LD-1042", name: "Karan Mehta", phone: "+91 98200 11223", source: "Website", property: "Orchid Heights, 3BHK", budget: "1.4 Cr", score: "hot", status: "Contacted", owner: "Priya Menon", updated: "2 hrs ago" },
  { id: "LD-1041", name: "Neha Bansal", phone: "+91 90040 88221", source: "WhatsApp", property: "Lakeview Residency, 2BHK", budget: "85 L", score: "warm", status: "New", owner: "Sana Iyer", updated: "4 hrs ago" },
  { id: "LD-1040", name: "Suresh Iyer", phone: "+91 88888 43219", source: "Campaign", property: "Palm Grove Villas", budget: "3.2 Cr", score: "hot", status: "Site Visit", owner: "Priya Menon", updated: "yesterday" },
  { id: "LD-1039", name: "Ananya Rao", phone: "+91 99887 55210", source: "Referral", property: "Orchid Heights, 2BHK", budget: "95 L", score: "cold", status: "New", owner: "Unassigned", updated: "yesterday" },
  { id: "LD-1038", name: "Farhan Sheikh", phone: "+91 97654 32109", source: "Website", property: "Riverstone Towers", budget: "2.1 Cr", score: "warm", status: "Negotiation", owner: "Sana Iyer", updated: "2 days ago" },
  { id: "LD-1037", name: "Divya Prakash", phone: "+91 96543 21098", source: "WhatsApp", property: "Palm Grove Villas", budget: "3.0 Cr", score: "hot", status: "Booking", owner: "Priya Menon", updated: "3 days ago" },
  { id: "LD-1036", name: "Manoj Pillai", phone: "+91 95432 10987", source: "Website", property: "Lakeview Residency", budget: "78 L", score: "cold", status: "Lost", owner: "Sana Iyer", updated: "5 days ago" },
];

export const PROPERTIES = [
  { id: "PR-501", title: "Orchid Heights", type: "Apartment", txn: "Sale", location: "Whitefield, Bengaluru", price: "1.2 - 1.6 Cr", units: 48, status: "Active", listedBy: "Skyline Realty" },
  { id: "PR-498", title: "Lakeview Residency", type: "Apartment", txn: "Rent", location: "Powai, Mumbai", price: "65k / mo", units: 20, status: "Active", listedBy: "Desai Developers" },
  { id: "PR-492", title: "Palm Grove Villas", type: "Villa", txn: "Sale", location: "ECR, Chennai", price: "2.8 - 3.4 Cr", units: 12, status: "Pending Approval", listedBy: "Skyline Realty" },
  { id: "PR-487", title: "Riverstone Towers", type: "Apartment", txn: "Sale", location: "Gachibowli, Hyderabad", price: "1.8 - 2.4 Cr", units: 64, status: "Active", listedBy: "Desai Developers" },
  { id: "PR-480", title: "Cedar Business Park", type: "Commercial", txn: "Lease", location: "Baner, Pune", price: "₹90/sqft", units: 8, status: "Inactive", listedBy: "PropertySerch HQ" },
];

export const BROKERS = [
  { id: "BR-21", name: "Priya Menon", agency: "Skyline Realty", leads: 34, deals: 6, conversion: "18%", status: "Active" },
  { id: "BR-22", name: "Anil Kumar", agency: "Skyline Realty", leads: 21, deals: 3, conversion: "14%", status: "Active" },
  { id: "BR-23", name: "Ritika Suri", agency: "Urban Nest", leads: 15, deals: 1, conversion: "6%", status: "Inactive" },
  { id: "BR-24", name: "Devraj Singh", agency: "Urban Nest", leads: 28, deals: 5, conversion: "17%", status: "Active" },
];

export const DEALS = [
  { id: "DL-88", customer: "Divya Prakash", property: "Palm Grove Villas", stage: "Booking", value: "3.0 Cr", owner: "Priya Menon", closing: "Aug 12" },
  { id: "DL-87", customer: "Farhan Sheikh", property: "Riverstone Towers", stage: "Negotiation", value: "2.1 Cr", owner: "Sana Iyer", closing: "Aug 20" },
  { id: "DL-86", customer: "Suresh Iyer", property: "Palm Grove Villas", stage: "Site Visit", value: "3.2 Cr", owner: "Priya Menon", closing: "Sept 02" },
  { id: "DL-85", customer: "Karan Mehta", property: "Orchid Heights", stage: "Documentation", value: "1.4 Cr", owner: "Priya Menon", closing: "Aug 06" },
];

export const CUSTOMERS = [
  { id: "CU-301", name: "Karan Mehta", phone: "+91 98200 11223", requirement: "3BHK, Whitefield", budget: "1.4 Cr", stage: "Documentation" },
  { id: "CU-300", name: "Divya Prakash", phone: "+91 96543 21098", requirement: "Villa, ECR", budget: "3.0 Cr", stage: "Booking" },
  { id: "CU-299", name: "Farhan Sheikh", phone: "+91 97654 32109", requirement: "2BHK, Gachibowli", budget: "2.1 Cr", stage: "Negotiation" },
];

export const AGENCIES = [
  { id: "AG-11", name: "Skyline Realty", brokers: 8, activeListings: 42, city: "Bengaluru", status: "Active" },
  { id: "AG-12", name: "Urban Nest", brokers: 5, activeListings: 21, city: "Pune", status: "Active" },
  { id: "AG-13", name: "Coastal Homes", brokers: 3, activeListings: 9, city: "Chennai", status: "Inactive" },
];

export const BUILDERS = [
  { id: "BD-04", name: "Desai Developers", projects: 4, units: 320, city: "Mumbai", status: "Active" },
  { id: "BD-05", name: "Greenline Infra", projects: 2, units: 140, city: "Hyderabad", status: "Active" },
];

export const DASHBOARD_STATS = {
  [ROLES.SUPER_ADMIN]: [
    { label: "Total Tenants", value: "18", delta: "+2 this month", tone: "up" },
    { label: "Active Leads", value: "1,204", delta: "+8.4%", tone: "up" },
    { label: "Platform Revenue", value: "₹42.8 L", delta: "+12%", tone: "up" },
    { label: "System Uptime", value: "99.98%", delta: "Stable", tone: "flat" },
  ],
  [ROLES.ADMIN]: [
    { label: "New Leads (7d)", value: "186", delta: "+14%", tone: "up" },
    { label: "Active Listings", value: "312", delta: "+6", tone: "up" },
    { label: "Deals Closed", value: "24", delta: "+3", tone: "up" },
    { label: "Revenue (MTD)", value: "₹6.2 Cr", delta: "+9%", tone: "up" },
  ],
  [ROLES.AGENCY_ADMIN]: [
    { label: "Agency Leads", value: "96", delta: "+11%", tone: "up" },
    { label: "Active Brokers", value: "8", delta: "0", tone: "flat" },
    { label: "Deals in Pipeline", value: "17", delta: "+2", tone: "up" },
    { label: "Conversion Rate", value: "16.4%", delta: "+1.2%", tone: "up" },
  ],
  [ROLES.BROKER]: [
    { label: "My Leads", value: "34", delta: "+5", tone: "up" },
    { label: "Follow-ups Due", value: "7", delta: "Today", tone: "warn" },
    { label: "Deals Won", value: "6", delta: "This quarter", tone: "flat" },
    { label: "Commission (MTD)", value: "₹1.8 L", delta: "+22%", tone: "up" },
  ],
  [ROLES.BUILDER]: [
    { label: "Active Projects", value: "4", delta: "1 launching", tone: "flat" },
    { label: "Units Available", value: "212 / 320", delta: "66%", tone: "flat" },
    { label: "Inquiries (7d)", value: "58", delta: "+9%", tone: "up" },
    { label: "Bookings (MTD)", value: "11", delta: "+4", tone: "up" },
  ],
  [ROLES.SALES]: [
    { label: "Assigned Leads", value: "42", delta: "+6", tone: "up" },
    { label: "Overdue Follow-ups", value: "3", delta: "Act now", tone: "warn" },
    { label: "Site Visits Booked", value: "9", delta: "This week", tone: "flat" },
    { label: "Conversion Rate", value: "19%", delta: "+2%", tone: "up" },
  ],
};

export const PIPELINE_CHART = [
  { stage: "Inquiry", value: 420 },
  { stage: "Contacted", value: 310 },
  { stage: "Site Visit", value: 180 },
  { stage: "Negotiation", value: 96 },
  { stage: "Booking", value: 52 },
  { stage: "Closed", value: 38 },
];

export const LEAD_TREND = [
  { day: "Mon", leads: 24, deals: 3 },
  { day: "Tue", leads: 31, deals: 4 },
  { day: "Wed", leads: 22, deals: 2 },
  { day: "Thu", leads: 40, deals: 6 },
  { day: "Fri", leads: 35, deals: 5 },
  { day: "Sat", leads: 46, deals: 7 },
  { day: "Sun", leads: 28, deals: 3 },
];
